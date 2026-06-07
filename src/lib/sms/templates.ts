export const SMS_TEMPLATES = {
  phone_verify: (otp: string) => `HUXZAIN Security Verification\nYour code is: ${otp}\nUse to verify your new number. Expires 5 min.`,
  login: (otp: string) => `HUXZAIN Login\nYour login code is: ${otp}\nExpires in 5 minutes. If this wasn't you, ignore.`,
  reset: (otp: string) => `HUXZAIN Password Reset\nYour reset code is: ${otp}\nExpires in 5 minutes. Do not share.`,
};
