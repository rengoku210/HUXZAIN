"use server";

import type { SmsProvider, SmsSendOptions } from "../types";

/**
 * MSG91 SMS Provider
 * Uses MSG91 OTP API — https://docs.msg91.com/reference/send-otp
 * Provider key: SMS_PROVIDER=msg91
 */
export class Msg91Provider implements SmsProvider {
  name = "MSG91";

  async sendSms(options: SmsSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = options.templateId || process.env.MSG91_TEMPLATE_ID;

    if (!authKey) {
      console.warn("[MSG91] MSG91_AUTH_KEY not set in environment.");
      return { success: false, error: "MSG91 API key (MSG91_AUTH_KEY) is missing from environment." };
    }

    // Extract OTP from variables or body
    let otp = options.variables?.otp || "";
    if (!otp && options.body) {
      const match = options.body.match(/\b\d{6}\b/);
      if (match) otp = match[0];
    }

    if (!otp) {
      return { success: false, error: "OTP value is missing for MSG91 provider." };
    }

    // Remove leading + for MSG91 (it expects only digits with country code)
    const mobile = options.to.replace(/^\+/, "");

    try {
      console.log(`[MSG91] Sending OTP to ${mobile}`);

      const payload: Record<string, string> = {
        authkey: authKey,
        mobile,
        otp,
      };

      if (templateId) {
        payload.template_id = templateId;
      }

      const res = await fetch("https://api.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify(payload),
      });

      const resData = (await res.json()) as any;
      console.log("[MSG91] API response:", JSON.stringify(resData));

      if (!res.ok || resData?.type === "error") {
        const errMsg = resData?.message || resData?.msg || "MSG91 API error";
        console.error("[MSG91] Error:", errMsg);
        return { success: false, error: `MSG91: ${errMsg}` };
      }

      return {
        success: true,
        messageId: resData?.request_id || resData?.message,
      };
    } catch (err: any) {
      console.error("[MSG91] Exception:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Verify OTP via MSG91 (optional – we use our own DB-based verification as primary)
   */
  async verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) return { success: false, error: "MSG91_AUTH_KEY missing" };

    const cleanMobile = mobile.replace(/^\+/, "");
    try {
      const res = await fetch(
        `https://api.msg91.com/api/v5/otp/verify?authkey=${authKey}&mobile=${cleanMobile}&otp=${otp}`,
        { method: "GET" }
      );
      const data = (await res.json()) as any;
      if (data?.type === "success") return { success: true };
      return { success: false, error: data?.message || "OTP verification failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
