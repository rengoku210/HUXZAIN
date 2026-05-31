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

export const sendPromotionalEmailCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: { 
    featuredListingId: string | null; 
    discountBanner: string; 
    weeklyDeal: string; 
  }) => d)
  .handler(async ({ data }) => {
    const { featuredListingId, discountBanner, weeklyDeal } = data;
    console.log(`[Email Campaign] Broadcaster request. Featured Listing: ${featuredListingId}`);

    const apiKey = process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY || (import.meta as any).env?.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || (import.meta as any).env?.VITE_RESEND_FROM_EMAIL || "noreply@huxzain.shop";
    const appUrl = process.env.VITE_SITE_URL || "http://localhost:8080";
    
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;

    if (!apiKey) {
      throw new Error("Resend API key missing");
    }
    if (!serviceKey || !supabaseUrl) {
      throw new Error("Supabase credentials missing");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch all user profiles with valid emails
    const { data: profiles, error: profsErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .not("email", "is", null);

    if (profsErr) throw profsErr;
    const emails = (profiles?.map(p => p.email).filter(Boolean) as string[]) || [];

    if (emails.length === 0) {
      return { success: true, count: 0, message: "No registered user emails found to broadcast to." };
    }

    // 2. Fetch featured listing if selected
    let listing: any = null;
    if (featuredListingId) {
      const { data: lst } = await supabaseAdmin
        .from("listings")
        .select("*")
        .eq("id", featuredListingId)
        .maybeSingle();
      listing = lst;
    }

    // 3. Construct HTML Campaign Email
    const listingImage = listing?.cover_url || "https://huxzain.shop/wp-content/uploads/2026/logo.png";
    const listingLink = `${appUrl}/product/${listing?.id || ""}`;
    const listingPrice = listing ? `₹${Number(listing.price_cents / 100).toFixed(0)}` : "";

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1a1a24; border-radius: 16px; background-color: #0b0b0f; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #D4AF37; font-size: 28px; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">HUXZAIN</h1>
          <p style="color: #8f90a6; font-size: 12px; margin-top: 5px;">Secure Digital Products & Services Escrow</p>
        </div>

        ${discountBanner ? `
        <div style="background: linear-gradient(135deg, #D4AF37, #b8860b); color: #000000; padding: 15px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(212,175,55,0.2);">
          ${discountBanner}
        </div>
        ` : ""}

        ${weeklyDeal ? `
        <div style="margin-bottom: 25px; border-bottom: 1px solid #222; padding-bottom: 15px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 8px;">Weekly Deal Announcement</h2>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.5; margin: 0;">${weeklyDeal}</p>
        </div>
        ` : ""}

        ${listing ? `
        <div style="border: 1px solid #22222f; border-radius: 12px; background-color: #121217; padding: 20px; text-align: center; margin-bottom: 25px;">
          <span style="display: inline-block; background-color: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.3); color: #D4AF37; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">
            Best Deal This Week / Limited Time Offer
          </span>
          <h3 style="color: #ffffff; font-size: 20px; margin: 0 0 10px 0;">${listing.title}</h3>
          
          ${listing.cover_url ? `
          <div style="margin: 15px auto; max-width: 400px; border-radius: 8px; overflow: hidden; border: 1px solid #222;">
            <a href="${listingLink}">
              <img src="${listingImage}" style="width: 100%; display: block; object-fit: cover;" alt="${listing.title}" />
            </a>
          </div>
          ` : ""}
          
          <div style="color: #D4AF37; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
            ${listingPrice}
          </div>
          
          <div>
            <a href="${listingLink}" style="display: inline-block; padding: 12px 30px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
              View Deal & Purchase
            </a>
          </div>
        </div>
        ` : ""}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #222; color: #555566; font-size: 11px; line-height: 1.5;">
          <p>You received this promotional email because you are a registered user of HUXZAIN.</p>
          <p>© 2026 HUXZAIN. All rights reserved.</p>
        </div>
      </div>
    `;

    console.log(`[Email Campaign] Broadcasting to ${emails.length} users...`);
    
    for (const email of emails) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `HUXZAIN Deals <${fromEmail}>`,
            to: [email],
            subject: weeklyDeal ? `HUXZAIN Spotlight: ${weeklyDeal}` : "Exclusive Weekly Deals on HUXZAIN",
            html: htmlContent
          })
        });
      } catch (err: any) {
        console.warn(`[Email Campaign] Failed to send to ${email}:`, err.message);
      }
    }

    return { success: true, count: emails.length, message: `Successfully broadcasted promotional campaign to ${emails.length} users!` };
  });
