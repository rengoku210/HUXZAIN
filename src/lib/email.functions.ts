"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Server function to send verification emails via Resend.
 * Uses Supabase Admin to generate a secure verification link.
 */
export const sendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { email } = data;
    console.log(`[Email] Request to send verification to: ${email}`);

    // Access environment variables safely. 
    // In some server environments (like Cloudflare), process.env might not be the source.
    // In Vite/TanStack Start, secrets are usually in process.env or import.meta.env.
    const apiKey = process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY || (import.meta as any).env?.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || (import.meta as any).env?.VITE_RESEND_FROM_EMAIL || "noreply@huxzain.shop";
    
    // Use VITE_SITE_URL for absolute redirects to ensure consistency across local and production.
    const appUrl = process.env.VITE_SITE_URL || 
                   (import.meta as any).env?.VITE_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   (process.env.VITE_VERCEL_URL ? `https://${process.env.VITE_VERCEL_URL}` : 
                   "http://localhost:8080"));
    
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;

    console.log(`[Email] Env Check: apiKey=${!!apiKey}, from=${fromEmail}, appUrl=${appUrl}, supabaseUrl=${!!supabaseUrl}, serviceKey=${!!serviceKey}`);

    if (!apiKey) {
      console.error("[Email] RESEND_API_KEY is missing from environment.");
      return { success: false, error: "Email service not configured (API Key missing)" };
    }

    if (!serviceKey || !supabaseUrl) {
      console.error("[Email] SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL is missing.");
      return { success: false, error: "Email service not configured (Auth missing)" };
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      console.log(`[Email] Generating verification link for ${email}...`);
      
      // Since user already signed up, generate a 'magiclink' (which functions as a verification/login link)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${appUrl}/auth/verified`
        }
      });

      if (linkError) {
        console.error(`[Email] Supabase Link Generation Error: ${linkError.message}`);
        return { success: false, error: `Auth link failed: ${linkError.message}` };
      }

      if (!linkData || !linkData.properties || !linkData.properties.action_link) {
        console.error(`[Email] Link properties are missing`);
        return { success: false, error: "Failed to generate action link properties" };
      }

      const actionLink = linkData.properties.action_link;
      console.log(`[Email] Link generated. Sending to Resend API...`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `HUXZAIN <${fromEmail}>`,
          to: [email],
          subject: "Verify your email for HUXZAIN",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #333;">Welcome to HUXZAIN!</h2>
              <p style="color: #555; line-height: 1.5;">Please verify your email address to access your account and start trading on the marketplace.</p>
              <div style="margin: 30px 0;">
                <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
              </div>
              <p style="color: #888; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #aaa; font-size: 10px;">HUXZAIN Marketplace</p>
            </div>
          `
        })
      });

      const resStatus = res.status;
      const resData = await res.text();
      console.log(`[Email] Resend Response (${resStatus}): ${resData}`);

      if (!res.ok) {
        return { success: false, error: `Resend API error (${resStatus}): ${resData}` };
      }

      console.log(`[Email] Verification email sent successfully to ${email}`);
      return { success: true };
    } catch (e: any) {
      console.error("[Email] Fatal exception in sendVerificationEmail:", e);
      return { success: false, error: e.message || "Internal server error" };
    }
  });
