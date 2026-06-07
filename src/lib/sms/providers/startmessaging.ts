import type { SmsProvider, SmsSendOptions } from "../types";

export class StartMessagingProvider implements SmsProvider {
  name = "StartMessaging";

  async sendSms(options: SmsSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.STARTMESSAGING_API_KEY || 
                   (import.meta as any).env?.STARTMESSAGING_API_KEY || 
                   "523196TGGi09Kd6a241324P1"; // fallback key as provided in task description

    if (!apiKey) {
      console.warn("[StartMessaging] API key missing in environment.");
      return { success: false, error: "SMS Provider API key is missing." };
    }

    // Attempt to extract dynamic OTP from the message body if variables are not provided
    let otp = options.variables?.otp || "";
    if (!otp && options.body) {
      const match = options.body.match(/\b\d{6}\b/);
      if (match) {
        otp = match[0];
      }
    }

    const appName = options.variables?.appName || "HUXZAIN";
    const templateId = options.templateId || undefined; // StartMessaging templateId is optional

    try {
      console.log(`[StartMessaging] Sending SMS to ${options.to} with OTP: ${otp}`);
      const res = await fetch("https://api.startmessaging.com/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          phoneNumber: options.to,
          templateId,
          variables: {
            otp,
            appName,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[StartMessaging] API request failed:", errText);
        return { success: false, error: `StartMessaging error: ${errText}` };
      }

      const resData = await res.json() as any;
      console.log("[StartMessaging] API response success:", resData);

      return { 
        success: true, 
        messageId: resData?.data?.messageId || resData?.requestId 
      };
    } catch (err: any) {
      console.error("[StartMessaging] Exception sending SMS:", err.message);
      return { success: false, error: err.message };
    }
  }
}
