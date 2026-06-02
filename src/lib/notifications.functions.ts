"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { emailTemplates } from "./email-templates";

export const triggerNotification = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      userId: string;
      kind: string;
      title: string;
      body: string;
      emailPayload?: {
        template: keyof typeof emailTemplates;
        args: any[];
      };
    }) => d
  )
  .handler(async ({ data }) => {
    const { userId, kind, title, body, emailPayload } = data;
    console.log(`[Notification] Triggering kind: ${kind} for user: ${userId}`);

    const apiKey = process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY || (import.meta as any).env?.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || (import.meta as any).env?.VITE_RESEND_FROM_EMAIL || "noreply@huxzain.shop";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      console.error("[Notification] Supabase configuration missing");
      return { success: false, error: "Auth config missing" };
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // 1. Insert notification in db
      const { data: dbData, error: dbErr } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          kind,
          title,
          body,
          read_at: null,
        })
        .select()
        .single();

      if (dbErr) {
        console.error("[Notification] Database insert error:", dbErr.message);
      } else {
        console.log("[Notification] Database entry created:", dbData?.id);
      }

      // 2. If email payload provided, dispatch Resend email
      if (emailPayload && apiKey) {
        const { template, args } = emailPayload;
        const templateFn = emailTemplates[template];
        if (templateFn) {
          // Fetch user email
          const { data: profile, error: profErr } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();

          const targetEmail = profile?.email;
          if (targetEmail) {
            console.log(`[Notification] Sending Resend email to: ${targetEmail} using template: ${template}`);
            // Generate templated HTML
            const { subject, html } = (templateFn as any)(...args);

            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: `HUXZAIN <${fromEmail}>`,
                to: [targetEmail],
                subject,
                html,
              }),
            });

            if (!emailRes.ok) {
              const errBody = await emailRes.text();
              console.error(`[Notification] Resend API error: ${errBody}`);
            } else {
              console.log("[Notification] Transactional email sent successfully.");
            }
          } else {
            console.warn(`[Notification] User profile email not found for ID: ${userId}`);
          }
        } else {
          console.error(`[Notification] Template ${template} not found in emailTemplates`);
        }
      }

      return { success: true };
    } catch (e: any) {
      console.error("[Notification] Exception in triggerNotification:", e);
      return { success: false, error: e.message || "Internal server error" };
    }
  });
