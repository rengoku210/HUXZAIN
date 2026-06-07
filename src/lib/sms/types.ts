export interface SmsSendOptions {
  to: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface SmsProvider {
  name: string;
  sendSms(options: SmsSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
