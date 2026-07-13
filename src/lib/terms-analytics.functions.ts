"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Log a terms/policy acceptance event.
 */
export const logTermsAcceptance = createServerFn({ method: "POST" })
  .inputValidator((d: {
    userId?: string;
    termsVersion: string;
    page: string;
    accepted: boolean;
    productId?: string | null;
    orderId?: string | null;
    policyType?: string | null;
  }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) return { success: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve IP address
    const ip =
      request?.headers?.get("cf-connecting-ip") ||
      request?.headers?.get("x-real-ip") ||
      request?.headers?.get("x-forwarded-for")?.split(",")[0] ||
      "127.0.0.1";

    // Resolve User-Agent
    const userAgent = request?.headers?.get("user-agent") || "Unknown";

    // Parse browser
    let browser = "Unknown";
    if (userAgent.includes("Firefox/")) browser = "Firefox";
    else if (userAgent.includes("Chrome/")) browser = "Chrome";
    else if (userAgent.includes("Safari/")) browser = "Safari";
    else if (userAgent.includes("Edge/")) browser = "Edge";
    else if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) browser = "Opera";

    // Parse device
    let device = "Desktop";
    if (/mobi|android|iphone|ipad|ipod/i.test(userAgent)) {
      device = "Mobile";
    }

    const { error } = await supabaseAdmin
      .from("terms_acceptance_logs")
      .insert({
        user_id: data.userId || null,
        terms_version: data.termsVersion,
        page: data.page,
        accepted: data.accepted,
        ip_address: ip,
        user_agent: userAgent,
        product_id: data.productId || null,
        order_id: data.orderId || null,
        policy_type: data.policyType || 'general',
        browser: browser,
        device: device
      });

    if (error) {
      console.error("[Terms] Log terms acceptance error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  });

/**
 * Check if a policy has already been accepted by the user.
 */
export const checkPolicyAcceptance = createServerFn({ method: "POST" })
  .inputValidator((d: {
    userId?: string | null;
    policyType: string;
    policyVersion: string;
    page: string;
    productId?: string | null;
    orderId?: string | null;
  }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    if (!data.userId) return { accepted: false };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) return { accepted: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let query = supabaseAdmin
      .from("terms_acceptance_logs")
      .select("id")
      .eq("user_id", data.userId)
      .eq("policy_type", data.policyType)
      .eq("terms_version", data.policyVersion)
      .eq("page", data.page)
      .eq("accepted", true);

    if (data.productId) {
      query = query.eq("product_id", data.productId);
    }
    if (data.orderId) {
      query = query.eq("order_id", data.orderId);
    }

    const { data: logs, error } = await query.limit(1);

    if (error) {
      console.error("[Terms] checkPolicyAcceptance error:", error.message);
      return { accepted: false };
    }

    return { accepted: logs && logs.length > 0 };
  });

/**
 * Track a user activity event (page view, click, etc.).
 */
export const trackUserActivity = createServerFn({ method: "POST" })
  .inputValidator((d: {
    pagePath: string;
    eventType: string;
    listingId?: string;
  }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) return { success: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve IP address
    const ip =
      request?.headers?.get("cf-connecting-ip") ||
      request?.headers?.get("x-real-ip") ||
      request?.headers?.get("x-forwarded-for")?.split(",")[0] ||
      "127.0.0.1";

    // Resolve User-Agent
    const userAgent = request?.headers?.get("user-agent") || "Unknown";

    // Resolve userId from auth header if present
    let userId: string | null = null;
    const authHeader = request?.headers?.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const { data: activity, error } = await supabaseAdmin
      .from("user_activities")
      .insert({
        user_id: userId,
        page_path: data.pagePath,
        event_type: data.eventType,
        listing_id: data.listingId || null,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Terms] Track user activity error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, activityId: activity?.id };
  });

/**
 * Update the duration of a tracked activity.
 */
export const updateActivityDuration = createServerFn({ method: "POST" })
  .inputValidator((d: {
    activityId: string;
    durationSeconds: number;
  }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) return { success: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { error } = await supabaseAdmin
      .from("user_activities")
      .update({ duration_seconds: data.durationSeconds })
      .eq("id", data.activityId);

    if (error) {
      console.error("[Terms] Update activity duration error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  });

/**
 * Fetch terms acceptance logs with user profile info.
 */
export const getTermsAcceptanceLogs = createServerFn({ method: "GET" })
  .handler(async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) throw new Error("Database keys missing.");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabaseAdmin
      .from("terms_acceptance_logs")
      .select(`
        *,
        profiles:user_id (
          display_name,
          email,
          username
        )
      `)
      .order("accepted_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Terms] Fetch acceptance logs error:", error.message);
      throw new Error("Failed to fetch terms acceptance logs.");
    }

    return data;
  });
