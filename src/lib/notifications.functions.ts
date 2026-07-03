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
      link?: string;
      category?: string;
      emailPayload?: {
        template: keyof typeof emailTemplates;
        args: any[];
      };
    }) => d
  )
  .handler(async ({ data }) => {
    const { userId, kind, title, body, link, category, emailPayload } = data;
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
          link: link || null,
          category: category || "platform"
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
          // Fetch user email (prefer Supabase Auth admin API; fall back to profiles.email if present)
          let targetEmail: string | undefined;
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
            targetEmail = u?.user?.email ?? undefined;
          } catch (e) {
            // ignore and try profiles fallback
          }
          if (!targetEmail) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("email")
              .eq("id", userId)
              .maybeSingle();
            targetEmail = (profile as any)?.email ?? undefined;
          }

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

export const triggerRoleNotification = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      roles: string[]; // roles in user_roles.role
      kind: string;
      title: string;
      body: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { roles, kind, title, body } = data;
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

      const { data: roleRows, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("role", roles);
      if (error) throw error;

      const userIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      if (userIds.length === 0) return { success: true, notified: 0 };

      const rows = userIds.map((id) => ({
        user_id: id,
        kind,
        title,
        body,
        read_at: null,
      }));

      const { error: insErr } = await supabaseAdmin.from("notifications").insert(rows);
      if (insErr) throw insErr;

      return { success: true, notified: userIds.length };
    } catch (e: any) {
      console.error("[Notification] Exception in triggerRoleNotification:", e);
      return { success: false, error: e.message || "Internal server error" };
    }
  });

export const submitSubscriptionReupload = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      userId: string;
      latestProofId: string;
      filePath: string;
      selectedPlan: string;
      userEmail: string;
    }) => d
  )
  .handler(async ({ data }) => {
    const { userId, latestProofId, filePath, selectedPlan, userEmail } = data;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      console.error("[Reupload] Supabase configuration missing");
      return { success: false, error: "Auth config missing" };
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // 1. Fetch unified payment_proofs row
      const { data: unifiedProofs } = await supabaseAdmin
        .from("payment_proofs")
        .select("*")
        .eq("user_id", userId)
        .eq("payment_type", "subscription")
        .order("created_at", { ascending: false })
        .limit(1);

      const unifiedProof = unifiedProofs?.[0];
      if (unifiedProof) {
        // Fetch current version count for archiving
        const { count } = await supabaseAdmin
          .from("payment_proof_history")
          .select("id", { count: "exact", head: true })
          .eq("payment_proof_id", unifiedProof.id);

        const nextVersion = (count ?? 0) + 1;

        // Archive
        await supabaseAdmin
          .from("payment_proof_history")
          .insert({
            payment_proof_id: unifiedProof.id,
            version: nextVersion,
            screenshot_url: unifiedProof.screenshot_url,
            reason: unifiedProof.rejection_reason || "Re-upload required",
            uploader_id: userId,
          });

        // Update unified
        await supabaseAdmin
          .from("payment_proofs")
          .update({
            screenshot_url: filePath,
            status: "pending",
            updated_at: new Date().toISOString()
          })
          .eq("id", unifiedProof.id);
      }

      // 2. Update legacy subscription_payment_proofs row
      const { error: updateErr } = await supabaseAdmin
        .from("subscription_payment_proofs")
        .update({
          screenshot_url: filePath,
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", latestProofId);

      if (updateErr) throw updateErr;

      // 3. Insert notification for admin/staff
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "staff"]);

      const userIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      if (userIds.length > 0) {
        const rows = userIds.map((id) => ({
          user_id: id,
          kind: "staff.payment_verification",
          title: "New subscription payment screenshot",
          body: `Seller ${userEmail} uploaded a new subscription screenshot for plan ${selectedPlan}.`,
          read_at: null,
        }));
        await supabaseAdmin.from("notifications").insert(rows);
      }

      return { success: true };
    } catch (e: any) {
      console.error("[Reupload] Exception in submitSubscriptionReupload:", e);
      return { success: false, error: e.message || "Internal server error" };
    }
  });
