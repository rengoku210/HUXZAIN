"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Get auto-segmented audience groups from profiles + user_roles tables.
 */
export const getAudienceSegments = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesRes,
      buyerRolesRes,
      sellersRes,
      verifiedSellersRes,
      proSellersRes,
      enterpriseSellersRes,
      newUsersRes,
      suspendedUsersRes,
      staffRolesRes,
      ordersRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "buyer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_seller", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_seller", true).eq("is_verified", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("seller_tier", "pro"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("seller_tier", "enterprise"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("suspended_at", "is", null),
      supabase.from("user_roles").select("user_id", { count: "exact", head: true }).in("role", ["staff", "admin", "moderator"]),
      supabase.from("orders").select("buyer_id, amount_inr, created_at"),
    ]);

    // Compute inactive users: users with no orders in last 60 days
    const recentBuyerIds = new Set(
      (ordersRes.data || [])
        .filter((o: any) => o.created_at >= sixtyDaysAgo)
        .map((o: any) => o.buyer_id)
    );
    const allBuyerIds = new Set((ordersRes.data || []).map((o: any) => o.buyer_id));
    const inactiveCount = [...allBuyerIds].filter((id) => !recentBuyerIds.has(id)).length;

    // High spending buyers: total order amount > 5000
    const buyerTotals: Record<string, number> = {};
    (ordersRes.data || []).forEach((o: any) => {
      buyerTotals[o.buyer_id] = (buyerTotals[o.buyer_id] || 0) + Number(o.amount_inr || 0);
    });
    const highSpendingCount = Object.values(buyerTotals).filter((total) => total > 5000).length;

    const segments = [
      { segment: "All Users", count: profilesRes.count || 0, description: "Total registered users on the platform" },
      { segment: "All Buyers", count: buyerRolesRes.count || 0, description: "Users with the buyer role" },
      { segment: "All Sellers", count: sellersRes.count || 0, description: "Users who are registered sellers" },
      { segment: "Verified Sellers", count: verifiedSellersRes.count || 0, description: "Sellers with verified identity" },
      { segment: "Pro Sellers", count: proSellersRes.count || 0, description: "Sellers on the Pro tier" },
      { segment: "Enterprise Sellers", count: enterpriseSellersRes.count || 0, description: "Sellers on the Enterprise tier" },
      { segment: "New Users", count: newUsersRes.count || 0, description: "Users who joined in the last 30 days" },
      { segment: "Inactive Users", count: inactiveCount, description: "Users with no orders in the last 60 days" },
      { segment: "High Spending Buyers", count: highSpendingCount, description: "Buyers with total order amount exceeding ₹5,000" },
      { segment: "Suspended Users", count: suspendedUsersRes.count || 0, description: "Users currently suspended" },
      { segment: "Staff/Employees", count: staffRolesRes.count || 0, description: "Users with staff, admin, or moderator roles" },
    ];

    return segments;
  });

/**
 * Fetch all email templates.
 */
export const getEmailTemplates = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Communication] Fetch email templates error:", error.message);
      throw new Error("Failed to fetch email templates.");
    }

    return data;
  });

/**
 * Create or update an email template.
 */
export const saveEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    name: string;
    slug: string;
    subject: string;
    body: string;
    variables: string[];
    is_active: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id, name, slug, subject, body, variables, is_active } = data;

    const record: any = { name, slug, subject, body, variables, is_active };
    if (id) record.id = id;

    const { data: result, error } = await supabase
      .from("email_templates")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[Communication] Save email template error:", error.message);
      throw new Error("Failed to save email template.");
    }

    return { success: true, template: result };
  });

/**
 * Fetch all campaigns with creator profile info.
 */
export const getCampaigns = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        profiles:created_by (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Communication] Fetch campaigns error:", error.message);
      throw new Error("Failed to fetch campaigns.");
    }

    return data;
  });

/**
 * Create a new campaign.
 */
export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: {
    name: string;
    channel: string;
    audience_segment: string;
    template_id?: string;
    subject: string;
    body: string;
    scheduled_for?: string;
    created_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { name, channel, audience_segment, template_id, subject, body, scheduled_for, created_by } = data;

    const { data: result, error } = await supabase
      .from("campaigns")
      .insert({
        name,
        channel,
        audience_segment,
        template_id: template_id || null,
        subject,
        body,
        scheduled_for: scheduled_for || null,
        created_by,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("[Communication] Create campaign error:", error.message);
      throw new Error("Failed to create campaign.");
    }

    return { success: true, campaign: result };
  });

/**
 * Update campaign status.
 */
export const updateCampaignStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) {
      console.error("[Communication] Update campaign status error:", error.message);
      throw new Error("Failed to update campaign status.");
    }

    return { success: true };
  });

/**
 * Fetch all announcements.
 */
export const getAnnouncements = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Communication] Fetch announcements error:", error.message);
      throw new Error("Failed to fetch announcements.");
    }

    return data;
  });

/**
 * Create or update an announcement.
 */
export const saveAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    title: string;
    content: string;
    type: string;
    placement: string;
    audience: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    created_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id, title, content, type, placement, audience, starts_at, ends_at, is_active, created_by } = data;

    const record: any = { title, content, type, placement, audience, starts_at, ends_at, is_active, created_by };
    if (id) record.id = id;

    const { data: result, error } = await supabase
      .from("announcements")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[Communication] Save announcement error:", error.message);
      throw new Error("Failed to save announcement.");
    }

    return { success: true, announcement: result };
  });

/**
 * Delete an announcement.
 */
export const deleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", data.id);

    if (error) {
      console.error("[Communication] Delete announcement error:", error.message);
      throw new Error("Failed to delete announcement.");
    }

    return { success: true };
  });

/**
 * Fetch all emergency alerts.
 */
export const getEmergencyAlerts = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Communication] Fetch emergency alerts error:", error.message);
      throw new Error("Failed to fetch emergency alerts.");
    }

    return data;
  });

/**
 * Create a new emergency alert.
 */
export const createEmergencyAlert = createServerFn({ method: "POST" })
  .inputValidator((d: {
    message: string;
    priority: string;
    show_popup: boolean;
    show_banner: boolean;
    created_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { message, priority, show_popup, show_banner, created_by } = data;

    const { data: result, error } = await supabase
      .from("emergency_alerts")
      .insert({
        message,
        priority,
        show_popup,
        show_banner,
        created_by,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Communication] Create emergency alert error:", error.message);
      throw new Error("Failed to create emergency alert.");
    }

    return { success: true, alert: result };
  });

/**
 * Toggle an emergency alert's active state.
 */
export const toggleEmergencyAlert = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("emergency_alerts")
      .update({ is_active: data.is_active })
      .eq("id", data.id);

    if (error) {
      console.error("[Communication] Toggle emergency alert error:", error.message);
      throw new Error("Failed to toggle emergency alert.");
    }

    return { success: true };
  });

function getEmailWrapper(title: string, bodyContent: string): string {
  const siteUrl = process.env.VITE_SITE_URL || "https://huxzain.shop";
  return `
    <div style="background-color: #0A0A0C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #1A1A22; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <!-- Top Accent Bar -->
      <div style="height: 4px; background: linear-gradient(90deg, #D4AF37, #F3E5AB, #D4AF37); border-radius: 4px 4px 0 0; margin: -40px -20px 30px -20px;"></div>
      
      <!-- Header Logo -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1A1A22; padding-bottom: 20px;">
        <h1 style="color: #D4AF37; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0; text-transform: uppercase;">HUXZAIN</h1>
        <p style="color: #8F8F9A; font-size: 10px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Secure Digital Products & Escrow Escort</p>
      </div>
      
      <!-- Main Card -->
      <div style="background-color: #121216; border: 1px solid #1D1D26; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
        <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; border-left: 3px solid #D4AF37; padding-left: 12px;">
          ${title}
        </h2>
        <div style="color: #C0C0C6; font-size: 14px; line-height: 1.6; font-weight: 400;">
          ${bodyContent}
        </div>
      </div>
      
      <!-- Support Footer Notice -->
      <div style="background-color: rgba(212,175,55,0.03); border: 1px solid rgba(212,175,55,0.1); border-radius: 8px; padding: 12px 15px; margin-bottom: 30px; text-align: center;">
        <span style="color: #D4AF37; font-size: 11px; font-weight: 600;">🛡️ HUXZAIN Protection Active:</span>
        <span style="color: #8F8F9A; font-size: 11px; margin-left: 4px;">Never share your password, API keys, or OTP code with anyone.</span>
      </div>
      
      <!-- Footer Links & Info -->
      <div style="text-align: center; border-top: 1px solid #1A1A22; padding-top: 25px; color: #60606A; font-size: 11px; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;">This email is sent automatically by the HUXZAIN secure operations dispatch network.</p>
        <p style="margin: 0 0 15px 0;">© 2026 HUXZAIN Operations. All rights reserved.</p>
        <div>
          <a href="${siteUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 600;">Marketplace Portal</a>
          <span style="color: #33333C; margin: 0 10px;">•</span>
          <a href="${siteUrl}/privacy" style="color: #D4AF37; text-decoration: none; font-weight: 600;">Privacy Network</a>
          <span style="color: #33333C; margin: 0 10px;">•</span>
          <a href="${siteUrl}/account?tab=support" style="color: #D4AF37; text-decoration: none; font-weight: 600;">24/7 Assistance Desk</a>
        </div>
      </div>
    </div>
  `;
}

async function resolveSegmentUsers(supabase: any, segmentName: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  if (segmentName === "All Users") {
    const { data } = await supabase.from("profiles").select("id, email, display_name");
    return data || [];
  }
  
  if (segmentName === "All Buyers") {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "buyer");
    const uids = (roleRows || []).map((r: any) => r.user_id);
    if (uids.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", uids);
    return data || [];
  }

  if (segmentName === "All Sellers") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").eq("is_seller", true);
    return data || [];
  }

  if (segmentName === "Verified Sellers") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").eq("is_seller", true).eq("is_verified", true);
    return data || [];
  }

  if (segmentName === "Pro Sellers") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").eq("seller_tier", "pro");
    return data || [];
  }

  if (segmentName === "Enterprise Sellers") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").eq("seller_tier", "enterprise");
    return data || [];
  }

  if (segmentName === "New Users") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").gte("created_at", thirtyDaysAgo);
    return data || [];
  }

  if (segmentName === "Suspended Users") {
    const { data } = await supabase.from("profiles").select("id, email, display_name").not("suspended_at", "is", null);
    return data || [];
  }

  if (segmentName === "Staff/Employees") {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").in("role", ["staff", "admin", "moderator", "owner", "super_admin"]);
    const uids = (roleRows || []).map((r: any) => r.user_id);
    if (uids.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", uids);
    return data || [];
  }

  if (segmentName === "Inactive Users") {
    const { data: orders } = await supabase.from("orders").select("buyer_id, created_at");
    const recentBuyerIds = new Set((orders || []).filter((o: any) => o.created_at >= sixtyDaysAgo).map((o: any) => o.buyer_id));
    const allBuyerIds = (orders || []).map((o: any) => o.buyer_id);
    const inactiveIds = Array.from(new Set(allBuyerIds.filter((id: any) => !recentBuyerIds.has(id))));
    if (inactiveIds.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", inactiveIds);
    return data || [];
  }

  if (segmentName === "High Spending Buyers") {
    const { data: orders } = await supabase.from("orders").select("buyer_id, amount_inr");
    const buyerTotals: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      buyerTotals[o.buyer_id] = (buyerTotals[o.buyer_id] || 0) + Number(o.amount_inr || 0);
    });
    const highSpendingIds = Object.keys(buyerTotals).filter((id) => buyerTotals[id] > 5000);
    if (highSpendingIds.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", highSpendingIds);
    return data || [];
  }

  // Default fallback
  const { data } = await supabase.from("profiles").select("id, email, display_name");
  return data || [];
}

/**
 * Dispatch a campaign broadcast (Email or In-App).
 */
export const sendCampaignBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id } = data;

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (cErr || !campaign) {
      throw new Error("Campaign not found.");
    }

    if (campaign.status === "sent") {
      throw new Error("Campaign has already been sent.");
    }

    await supabase.from("campaigns").update({ status: "sending" }).eq("id", id);

    try {
      const users = await resolveSegmentUsers(supabase, campaign.audience_segment);

      if (users.length === 0) {
        await supabase.from("campaigns").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          stats: { delivered: 0, failed: 0 }
        }).eq("id", id);
        return { success: true, count: 0 };
      }

      let delivered = 0;
      let failed = 0;

      const { data: domainConfig } = await supabase
        .from("smtp_configurations")
        .select("*")
        .limit(1)
        .maybeSingle();

      const apiKey = domainConfig?.api_key || process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY;
      const fromEmail = domainConfig?.from_email || "noreply@huxzain.shop";

      if (campaign.channel === "email") {
        if (!apiKey) {
          throw new Error("Resend API Key is not configured. Please setup Domain settings.");
        }

        for (const u of users) {
          if (!u.email) {
            failed++;
            continue;
          }

          const nameToUse = u.display_name || u.email.split("@")[0];
          const emailSubject = campaign.subject.replace(/\{username\}|\{display_name\}/g, nameToUse);
          const emailBody = campaign.body.replace(/\{username\}|\{display_name\}/g, nameToUse);

          const premiumHtml = getEmailWrapper(emailSubject, emailBody);

          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: `HUXZAIN <${fromEmail}>`,
                to: [u.email],
                subject: emailSubject,
                html: premiumHtml
              })
            });
            if (res.ok) {
              delivered++;
            } else {
              failed++;
            }
          } catch (err) {
            console.error(`Failed to send campaign email to ${u.email}:`, err);
            failed++;
          }
        }
      } else {
        const notificationRows = users.map((u: any) => ({
          user_id: u.id,
          kind: "campaign",
          event_key: "platform.announcement",
          title: campaign.subject,
          body: campaign.body.replace(/<[^>]*>/g, ""),
          category: "platform",
          priority: "normal",
          channels: ["in_app"],
          read_at: null
        }));

        const { error: insErr } = await supabase.from("notifications").insert(notificationRows);
        if (insErr) {
          console.error("Failed to insert notifications:", insErr.message);
          failed += users.length;
        } else {
          delivered += users.length;
        }
      }

      await supabase.from("campaigns").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        stats: { delivered, failed }
      }).eq("id", id);

      return { success: true, count: users.length, delivered, failed };
    } catch (err: any) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", id);
      throw err;
    }
  });
