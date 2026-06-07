import { StartMessagingProvider } from "./providers/startmessaging";
import { Msg91Provider } from "./providers/msg91";
import type { SmsProvider, SmsSendOptions } from "./types";

/** Provider‑agnostic SMS service */
class SmsServiceClass {
  private provider: SmsProvider;

  constructor() {
    // Dynamically choose SMS provider based on SMS_PROVIDER env var.
    // Set SMS_PROVIDER=msg91 to use MSG91, otherwise falls back to StartMessaging.
    switch (process.env.SMS_PROVIDER) {
      case "msg91":
        this.provider = new Msg91Provider();
        break;
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
