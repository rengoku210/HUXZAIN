"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Server function to verify the phone OTP access token from MSG91 Widget
 * and update the user's profile status.
 */
export const verifyPhoneOtpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string; phone: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { accessToken, phone: rawPhone, userId } = data;
    const cleanPhone = rawPhone.trim();

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
      throw new Error("Server configuration error: Missing MSG91_AUTH_KEY");
    }

    // 1. Call MSG91 Widget verification endpoint
    const msg91Res = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "authkey": authKey,
        "access-token": accessToken
      })
    });

    let msg91Data;
    try {
      msg91Data = await msg91Res.json();
    } catch (e) {
      throw new Error("Invalid response from MSG91 verification service.");
    }

    if (msg91Data.type !== "success") {
      console.error("[PhoneVerification] MSG91 Verification Failed:", msg91Data);
      throw new Error(msg91Data.message || "Failed to verify phone number via MSG91.");
    }

    // 2. Success! MSG91 confirmed the token. Update user's profile status in DB.
    const supabase = getAdminClient();
    if (!supabase) {
      throw new Error("Database service offline.");
    }

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
