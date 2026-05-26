// scripts/check-smtp.ts
// Validate Resend SMTP configuration by sending a test email.
// Requires environment variables:
//   RESEND_API_KEY - your Resend API key
//   RESEND_FROM_EMAIL - sender email (e.g., noreply@huxzain.shop)
//   RESEND_TO_EMAIL - destination email for test (your own address)

import fetch from "node-fetch";
import { env } from "../src/lib/env";

async function main() {
  const apiKey = env.resend?.apiKey;
  const from = env.resend?.fromEmail;
  const to = env.resend?.testRecipient;

  if (!apiKey || !from || !to) {
    console.error(
      "Missing RESEND configuration. Ensure RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_TO_EMAIL are set.",
    );
    process.exit(1);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: "[HUXZAIN] SMTP Test Email",
      html: "<p>This is a test email to verify Resend SMTP configuration for HUXZAIN marketplace.</p>",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(
      `Resend test email failed: ${response.status} ${response.statusText}\n${errText}`,
    );
    process.exit(1);
  }

  console.log("✅ Resend SMTP test email sent successfully.");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
