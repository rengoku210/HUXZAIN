"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import crypto from "crypto";
import { SmsService } from "./sms-service";
import { SMS_TEMPLATES } from "./templates";

/**
 * Server function to generate and send a 6-digit OTP code to a user's phone number.
 */
export const sendPhoneOtpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; userId: string; ipAddress?: string }) => d)
  .handler(async ({ data }) => {
    const { phone: rawPhone, userId, ipAddress } = data;
    const cleanPhone = rawPhone.trim();

    // Validate phone number format (E.164 format: must start with '+' and have country code)
    if (!/^\+[1-9]\d{1,14}$/.test(cleanPhone)) {
      throw new Error("Invalid phone number format. Must start with + and include country code (e.g. +91XXXXXXXXXX).");
    }

    const supabase = getAdminClient();
    if (!supabase) {
      throw new Error("Database service offline.");
    }

    // 1. Rate Limiting Check: Max 5 sends per hour per phone number or user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("phone_otp_logs")
      .select("id", { count: "exact", head: true })
      .or(`phone_number.eq.${cleanPhone},user_id.eq.${userId}`)
      .gt("created_at", oneHourAgo);

    if (countErr) {
      console.warn("[PhoneVerification] Error fetching rate limit logs:", countErr.message);
    } else if (count !== null && count >= 5) {
      throw new Error("Too many OTP requests. Please try again in an hour.");
    }

    // 2. Fetch latest log to check cooldown and resend limits
    const { data: latestLog, error: latestErr } = await supabase
      .from("phone_otp_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("phone_number", cleanPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      console.warn("[PhoneVerification] Error fetching latest log:", latestErr.message);
    }

    if (latestLog) {
      // Cooldown check (30 seconds)
      const timeSinceLast = Date.now() - new Date(latestLog.last_sent_at).getTime();
      if (timeSinceLast < 30 * 1000) {
        throw new Error("Please wait 30 seconds before requesting another code.");
      }

      // Max resends check (max 3 resends, i.e. 4 total sends per session)
      if (latestLog.status === "pending" && latestLog.resend_count >= 3) {
        throw new Error("Maximum resend limit reached for this session. Please request a new OTP after some time.");
      }
    }

    // 3. Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

    // Log the generated OTP to the server console for dev only — NEVER in production
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n========================================\n[DEV SMS OTP FOR ${cleanPhone}]: ${code}\n========================================\n`);
    }

    // 4. Store in database
    if (latestLog && latestLog.status === "pending") {
      // Update existing session
      const { error: updateErr } = await supabase
        .from("phone_otp_logs")
        .update({
          otp_hash: hash,
          expires_at: expiresAt,
          last_sent_at: new Date().toISOString(),
          resend_count: latestLog.resend_count + 1,
          attempts: 0, // reset attempts on resend
        })
        .eq("id", latestLog.id);

      if (updateErr) {
        throw new Error("Failed to update verification session: " + updateErr.message);
      }
    } else {
      // Create new session
      const { error: insertErr } = await supabase
        .from("phone_otp_logs")
        .insert({
          user_id: userId,
          phone_number: cleanPhone,
          otp_hash: hash,
          purpose: "phone_verify",
          status: "pending",
          expires_at: expiresAt,
          ip_address: ipAddress || null,
        });

      if (insertErr) {
        throw new Error("Failed to initiate verification session: " + insertErr.message);
      }
    }

    // 5. Send SMS via SmsService
    const body = SMS_TEMPLATES.phone_verify(code);
    const sendRes = await SmsService.sendSms({
      to: cleanPhone,
      body,
      variables: {
        otp: code,
        appName: "HUXZAIN",
      }
    });

    if (!sendRes.success) {
      throw new Error(sendRes.error || "Failed to deliver SMS verification code.");
    }

    return { 
      success: true, 
      resendCount: latestLog && latestLog.status === "pending" ? latestLog.resend_count + 1 : 0 
    };
  });

/**
 * Server function to verify the phone OTP code and update the user's profile status.
 */
export const verifyPhoneOtpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { phone: rawPhone, code, userId } = data;
    const cleanPhone = rawPhone.trim();
    const cleanCode = code.trim();

    const supabase = getAdminClient();
    if (!supabase) {
      throw new Error("Database service offline.");
    }

    // 1. Fetch latest pending log for this phone number and user
    const { data: latestLog, error: latestErr } = await supabase
      .from("phone_otp_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("phone_number", cleanPhone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr || !latestLog) {
      throw new Error("No active phone verification session found. Please request a code first.");
    }

    // 2. Check expiration
    if (Date.now() > new Date(latestLog.expires_at).getTime()) {
      await supabase
        .from("phone_otp_logs")
        .update({ status: "expired" })
        .eq("id", latestLog.id);
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // 3. Verify hash (SHA-256)
    const targetHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
    if (targetHash !== latestLog.otp_hash) {
      const nextAttempts = latestLog.attempts + 1;

      // Invalidate session if attempts exceed 3
      if (nextAttempts >= 3) {
        await supabase
          .from("phone_otp_logs")
          .update({ status: "failed", attempts: nextAttempts })
          .eq("id", latestLog.id);
        throw new Error("Too many failed attempts. This verification session has been locked. Please request a new OTP.");
      }

      // Update attempts in database
      await supabase
        .from("phone_otp_logs")
        .update({ attempts: nextAttempts })
        .eq("id", latestLog.id);

      throw new Error(`Incorrect verification code. ${3 - nextAttempts} attempts remaining.`);
    }

    // 4. Success! Mark log as verified
    await supabase
      .from("phone_otp_logs")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", latestLog.id);

    // 5. Update user's profile status in DB
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        phone: cleanPhone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("[PhoneVerification] Profile update failed:", profileErr.message);
      throw new Error("Verification succeeded but failed to update profile status.");
    }

    return { success: true };
  });
