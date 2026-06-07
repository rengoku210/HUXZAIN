import { getSupabase } from "@/lib/supabase-client";

/**
 * Log OTP lifecycle events for audit purposes.
 * event: requested | verified | failed | expired | rate_limit
 */
export async function logOtpEvent(event: "requested" | "verified" | "failed" | "expired" | "rate_limit", phone: string) {
  const sb = getSupabase();
  if (!sb) {
    console.warn("[PhoneVerification] Database client not initialized, skipping logOtpEvent.");
    return;
  }
  await sb.from("phone_otp_audit_logs").insert({
    phone,
    event,
    created_at: new Date().toISOString(),
  });
}
