"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Fetch all warnings for a specific user.
 */
export const getUserWarnings = createServerFn({ method: "POST" })
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data: warnings, error } = await supabase
      .from("user_warnings")
      .select(`
        *,
        issued_by_profile:issued_by (
          display_name,
          email
        )
      `)
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Warnings] Fetch user warnings error:", error.message);
      throw new Error("Failed to fetch user warnings.");
    }

    return warnings;
  });

/**
 * Issue a warning to a user. Handles suspension/ban actions and logs the action.
 */
export const issueWarning = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    reason: string;
    details: string;
    action_taken: string;
    issued_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { user_id, reason, details, action_taken, issued_by } = data;

    // 1. Insert the warning
    const { data: warning, error: warningErr } = await supabase
      .from("user_warnings")
      .insert({
        user_id,
        reason,
        details,
        action_taken,
        issued_by,
      })
      .select()
      .single();

    if (warningErr) {
      console.error("[Warnings] Issue warning error:", warningErr.message);
      throw new Error("Failed to issue warning.");
    }

    // 2. Increment warnings_count on profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("warnings_count")
      .eq("id", user_id)
      .single();

    const currentCount = profile?.warnings_count || 0;

    await supabase
      .from("profiles")
      .update({ warnings_count: currentCount + 1 })
      .eq("id", user_id);

    // 3. Handle suspension or ban
    if (action_taken === "suspension" || action_taken === "ban") {
      await supabase
        .from("profiles")
        .update({ suspended_at: new Date().toISOString() })
        .eq("id", user_id);
    }

    // 4. Log the staff action
    await supabase.from("staff_action_logs").insert({
      staff_id: issued_by,
      action: "ISSUE_WARNING",
      target_type: "user",
      target_id: user_id,
      new_value: JSON.stringify({ reason, action_taken, details }),
    });

    return { success: true, warning };
  });

/**
 * Remove a strike from a user's record.
 */
export const removeStrike = createServerFn({ method: "POST" })
  .inputValidator((d: {
    warning_id: string;
    user_id: string;
    issued_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { warning_id, user_id, issued_by } = data;

    // 1. Insert a strike removal record
    const { error: insertErr } = await supabase
      .from("user_warnings")
      .insert({
        user_id,
        reason: "Strike removal",
        details: `Strike removed for warning ID: ${warning_id}`,
        action_taken: "strike_removal",
        issued_by,
      });

    if (insertErr) {
      console.error("[Warnings] Remove strike error:", insertErr.message);
      throw new Error("Failed to remove strike.");
    }

    // 2. Decrement strikes_count (minimum 0)
    const { data: profile } = await supabase
      .from("profiles")
      .select("strikes_count")
      .eq("id", user_id)
      .single();

    const currentStrikes = profile?.strikes_count || 0;
    const newStrikes = Math.max(0, currentStrikes - 1);

    await supabase
      .from("profiles")
      .update({ strikes_count: newStrikes })
      .eq("id", user_id);

    return { success: true };
  });

/**
 * Get a snapshot of platform health metrics.
 */
export const getPlatformHealthSnapshot = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const [
      disputesRes,
      verificationsRes,
      withdrawalsRes,
      ticketsRes,
      suspendedRes,
      flaggedChatsRes,
      lowTrustRes,
      alertsRes,
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_seller", true).eq("is_verified", false),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("suspended_at", "is", null),
      supabase.from("flagged_chats").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).lt("trust_score", 30),
      supabase.from("emergency_alerts").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    return {
      open_disputes: disputesRes.count || 0,
      pending_verifications: verificationsRes.count || 0,
      pending_withdrawals: withdrawalsRes.count || 0,
      open_support_tickets: ticketsRes.count || 0,
      suspended_users: suspendedRes.count || 0,
      pending_flagged_chats: flaggedChatsRes.count || 0,
      low_trust_users: lowTrustRes.count || 0,
      active_emergency_alerts: alertsRes.count || 0,
    };
  });

/**
 * Fetch maintenance mode configuration.
 */
export const getMaintenanceMode = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("maintenance_mode")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("[Warnings] Fetch maintenance mode error:", error.message);
      throw new Error("Failed to fetch maintenance mode.");
    }

    return data;
  });

/**
 * Update maintenance mode settings.
 */
export const updateMaintenanceMode = createServerFn({ method: "POST" })
  .inputValidator((d: {
    is_enabled: boolean;
    message: string;
    expected_back_at: string;
    allowed_roles: string[];
    updated_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { is_enabled, message, expected_back_at, allowed_roles, updated_by } = data;

    const { error } = await supabase
      .from("maintenance_mode")
      .update({
        is_enabled,
        message,
        expected_back_at,
        allowed_roles,
        updated_by,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("[Warnings] Update maintenance mode error:", error.message);
      throw new Error("Failed to update maintenance mode.");
    }

    return { success: true };
  });
