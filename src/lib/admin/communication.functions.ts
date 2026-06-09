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
