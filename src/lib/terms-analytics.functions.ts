"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Log a terms acceptance event.
 */
export const logTermsAcceptance = createServerFn({ method: "POST" })
  .inputValidator((d: {
    userId?: string;
    termsVersion: string;
    page: string;
    accepted: boolean;
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

    const { error } = await supabaseAdmin
      .from("terms_acceptance_logs")
      .insert({
        user_id: data.userId || null,
        terms_version: data.termsVersion,
        page: data.page,
        accepted: data.accepted,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) {
      console.error("[Terms] Log terms acceptance error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
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
