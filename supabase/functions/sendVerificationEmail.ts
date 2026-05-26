// supabase/functions/sendVerificationEmail.ts
import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "dotenv";

env.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Edge Function to send verification status emails to users.
 * Expected payload (JSON):
 * {
 *   "verificationId": string,
 *   "status": "approved" | "rejected",
 *   "userEmail": string,
 *   "orderId": string,
 *   "details"?: string // optional additional message
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { verificationId, status, userEmail, orderId, details } = req.body ?? {};
  if (!verificationId || !status || !userEmail || !orderId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const subject =
    status === "approved" ? "Payment Verification Approved" : "Payment Verification Rejected";
  const headline =
    status === "approved"
      ? "Your payment has been approved!"
      : "Your payment verification was rejected";
  const message =
    status === "approved"
      ? `We have successfully verified your payment for order <strong>${orderId}</strong>. You can now proceed with the transaction.`
      : `Unfortunately, we could not verify your payment for order <strong>${orderId}</strong>. ${details ? `<br/>Reason: ${details}` : ""}`;

  const html = `
    <html>
      <head>
        <style>
          body { background:#0a0a0a; color:#f5f5f5; font-family: Inter, sans-serif; padding: 2rem; }
          .container { max-width: 600px; margin: auto; background:#111; border-radius:8px; padding:2rem; box-shadow:0 0 10px rgba(0,0,0,0.5); }
          .header { font-size:1.8rem; color:#D4AF37; margin-bottom:1rem; }
          .content { margin-top:1rem; line-height:1.5; }
          .footer { margin-top:2rem; font-size:0.85rem; color:#888; }
          a.button { display:inline-block; margin-top:1.5rem; background:#D4AF37; color:#000; padding:0.75rem 1.5rem; border-radius:4px; text-decoration:none; font-weight:bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">${headline}</div>
          <div class="content">
            ${message}
            <br/><br/>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout/verify-payment?orderId=${orderId}" class="button">View Verification Details</a>
          </div>
          <div class="footer">HUXZAIN Marketplace – Premium Payments</div>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "HUXZAIN <no-reply@huxzain.com>",
      to: userEmail,
      subject,
      html,
    });
    if (error) throw error;
    console.log("Verification email sent", { verificationId, status, userEmail, data });
    res.status(200).json({ success: true, data });
  } catch (e) {
    console.error("Error sending verification email", e);
    res.status(500).json({ error: "Failed to send email" });
  }
}
