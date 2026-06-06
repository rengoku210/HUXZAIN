import { StartMessagingProvider } from "./providers/startmessaging";
import type { SmsProvider, SmsSendOptions } from "./types";
import { getSupabase } from "@/lib/supabase-client";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";
import { logOtpEvent } from "./audit-logs";

/** Provider‑agnostic SMS service */
class SmsServiceClass {
  private provider: SmsProvider;

  constructor() {
    // Dynamically choose SMS provider based on env var
    switch (process.env.SMS_PROVIDER) {
      case "startmessaging":
      default:
        this.provider = new StartMessagingProvider();
        break;
    }
  }

  async sendSms(options: SmsSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.provider.sendSms(options);
  }
}

export const SmsService = new SmsServiceClass();

/** ---------------------------------------------------------------------
 *  OTP service abstraction – requestOtp & verifyOtp
 *  --------------------------------------------------------------------- */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function canRequestOtp(phone: string, userId: string): Promise<boolean> {
  const sb = getSupabase();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await sb
    .from("phone_otp_logs")
    .select("id", { count: "exact", head: true })
    .or(`phone_number.eq.${phone},user_id.eq.${userId}`)
    .gt("created_at", oneHourAgo);
  if (error) {
    console.warn("[PhoneVerification] Rate limit check error:", error.message);
    return true; // fallback allow
  }
  return !(count && count >= 5);
}

export const smsService = {
  async requestOtp(phone: string, userId: string, ipAddress?: string) {
    if (!(await canRequestOtp(phone, userId))) {
      await logOtpEvent("rate_limit", phone);
      throw new Error("Too many OTP requests. Please try again later.");
    }
    const otp = generateOtp();
    const otpHash = await hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Insert OTP log
    const { error: insertErr } = await getSupabase()
      .from("phone_otp_logs")
      .insert({
        user_id: userId,
        phone_number: phone,
        otp_hash: otpHash,
        purpose: "phone_verify",
        status: "pending",
        expires_at: expiresAt,
        ip_address: ipAddress || null,
      });
    if (insertErr) throw new Error("Failed to create OTP entry: " + insertErr.message);

    // Send SMS via provider
    const body = `Your verification code is ${otp}`;
    const sendRes = await SmsService.sendSms({ to: phone, body });
    if (!sendRes.success) {
      await logOtpEvent("failed", phone);
      throw new Error(sendRes.error || "Failed to send OTP via SMS provider.");
    }
    await logOtpEvent("requested", phone);
    return { success: true };
  },

  async verifyOtp(phone: string, userId: string, code: string) {
    const sb = getSupabase();
    const { data: log, error } = await sb
      .from("phone_otp_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("phone_number", phone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !log) {
      await logOtpEvent("failed", phone);
      throw new Error("No active OTP session found.");
    }
    if (new Date(log.expires_at) < new Date()) {
      await sb.from("phone_otp_logs").update({ status: "expired" }).eq("id", log.id);
      await logOtpEvent("expired", phone);
      throw new Error("OTP has expired.");
    }
    const hashVal = crypto.createHash("sha256").update(code).digest("hex");
    if (hashVal !== log.otp_hash) {
      const attempts = (log.attempts ?? 0) + 1;
      await sb.from("phone_otp_logs").update({ attempts }).eq("id", log.id);
      await logOtpEvent("failed", phone);
      if (attempts >= 3) {
        await sb.from("phone_otp_logs").update({ status: "failed" }).eq("id", log.id);
        throw new Error("Maximum attempts exceeded.");
      }
      throw new Error(`Incorrect code. ${3 - attempts} attempts left.`);
    }
    // Success – mark verified and update profile
    await sb.from("phone_otp_logs").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", log.id);
    await sb
      .from("profiles")
      .update({ phone: phone, phone_verified: true, phone_verified_at: new Date().toISOString() })
      .eq("id", userId);
    await logOtpEvent("verified", phone);
    return { success: true };
  },
};
