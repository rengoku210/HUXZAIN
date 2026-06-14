"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// LIVE MONITORING — all conversations with risk scores for admin view
// ─────────────────────────────────────────────────────────────────────────────
export const getConversationsMonitor = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        chat_number,
        order_id,
        buyer_id,
        seller_id,
        subject,
        last_message_at,
        last_message_preview,
        message_count,
        risk_score,
        risk_level,
        is_flagged,
        is_reported,
        created_at,
        buyer:buyer_id (display_name, username, email),
        seller:seller_id (display_name, username, email),
        order:order_id (order_number, status, amount_inr, amount_total)
      `)
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[Monitor] getConversationsMonitor error:", error.message);
      throw new Error("Failed to load monitoring data.");
    }

    return data ?? [];
  });

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW QUEUE — flagged + reported conversations for moderation
// ─────────────────────────────────────────────────────────────────────────────
export const getReviewQueue = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Fetch reported conversations
    const { data: reports, error: rErr } = await supabase
      .from("chat_reports")
      .select(`
        *,
        conversation:conversation_id (
          id, chat_number, order_id, risk_score, risk_level,
          buyer:buyer_id (id, display_name, username, email),
          seller:seller_id (id, display_name, username, email)
        ),
        reporter:reporter_id (display_name, email)
      `)
      .in("status", ["open", "under_review"])
      .order("created_at", { ascending: false });

    if (rErr) {
      console.error("[Queue] getReviewQueue reports error:", rErr.message);
      throw new Error("Failed to load review queue.");
    }

    // Fetch flagged chats (existing table)
    const { data: flagged, error: fErr } = await supabase
      .from("flagged_chats")
      .select(`
        *,
        buyer:buyer_id (id, display_name, email),
        seller:seller_id (id, display_name, email)
      `)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (fErr) {
      console.error("[Queue] getReviewQueue flagged error:", fErr.message);
    }

    return {
      reports: reports ?? [],
      flagged: flagged ?? [],
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT CHAT REPORT (from user-facing Report Conversation button)
// ─────────────────────────────────────────────────────────────────────────────
export const submitChatReport = createServerFn({ method: "POST" })
  .inputValidator((d: {
    conversation_id: string;
    chat_number: string;
    order_id?: string;
    reporter_id: string;
    buyer_id: string;
    seller_id: string;
    reason: string;
    additional_notes?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Insert report
    const { error: rErr } = await supabase.from("chat_reports").insert({
      conversation_id: data.conversation_id,
      chat_number: data.chat_number,
      order_id: data.order_id || null,
      reporter_id: data.reporter_id,
      buyer_id: data.buyer_id,
      seller_id: data.seller_id,
      reason: data.reason,
      additional_notes: data.additional_notes || null,
    });

    if (rErr) {
      console.error("[Report] submitChatReport error:", rErr.message);
      throw new Error("Failed to submit report.");
    }

    // Mark conversation as reported
    await supabase
      .from("conversations")
      .update({ is_reported: true })
      .eq("id", data.conversation_id);

    // Log to moderation audit
    await supabase.from("moderation_audit_logs").insert({
      action: "CHAT_REPORTED",
      target_user_id: null,
      target_conversation_id: data.conversation_id,
      chat_number: data.chat_number,
      reason: data.reason,
      metadata: { reporter_id: data.reporter_id },
    });

    return { success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD EVENTS — paginated feed for admin
// ─────────────────────────────────────────────────────────────────────────────
export const getFraudEvents = createServerFn({ method: "POST" })
  .inputValidator((d: { page?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const page = data.page ?? 0;
    const limit = data.limit ?? 50;
    const from = page * limit;

    const { data: events, error } = await supabase
      .from("fraud_events")
      .select(`
        *,
        user:user_id (display_name, username, email),
        conversation:conversation_id (chat_number, order_id)
      `)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      console.error("[Fraud] getFraudEvents error:", error.message);
      throw new Error("Failed to load fraud events.");
    }

    return events ?? [];
  });

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CONVERSATION VIEWER — full conversation with messages for moderators
// ─────────────────────────────────────────────────────────────────────────────
export const getLiveConversation = createServerFn({ method: "POST" })
  .inputValidator((d: { conversation_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const [convRes, messagesRes, fraudRes, strikesRes, reportsRes] =
      await Promise.all([
        // Conversation with parties
        supabase
          .from("conversations")
          .select(`
            *,
            buyer:buyer_id (id, display_name, username, email, strikes_count, suspended_at),
            seller:seller_id (id, display_name, username, email, strikes_count, suspended_at),
            order:order_id (id, order_number, status, amount_inr, amount_total)
          `)
          .eq("id", data.conversation_id)
          .single(),

        // Messages
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", data.conversation_id)
          .order("created_at", { ascending: true }),

        // Fraud events for this conversation
        supabase
          .from("fraud_events")
          .select("*")
          .eq("conversation_id", data.conversation_id)
          .order("created_at", { ascending: true }),

        // Recent strikes for buyer and seller (fetched after conv)
        supabase
          .from("user_strikes")
          .select("*")
          .in("conversation_id", [data.conversation_id])
          .order("created_at", { ascending: false }),

        // Reports for this conversation
        supabase
          .from("chat_reports")
          .select("*, reporter:reporter_id (display_name, email)")
          .eq("conversation_id", data.conversation_id)
          .order("created_at", { ascending: false }),
      ]);

    if (convRes.error || !convRes.data)
      throw new Error("Conversation not found.");

    return {
      conversation: convRes.data,
      messages: messagesRes.data ?? [],
      fraud_events: fraudRes.data ?? [],
      strikes: strikesRes.data ?? [],
      reports: reportsRes.data ?? [],
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE STRIKE — formal 4-strike system
// ─────────────────────────────────────────────────────────────────────────────
export const issueStrike = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    reason: string;
    evidence?: string;
    moderator_id: string;
    conversation_id?: string;
    chat_number?: string;
    fraud_event_id?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Get current strike count
    const { data: profile } = await supabase
      .from("profiles")
      .select("strikes_count, display_name")
      .eq("id", data.user_id)
      .single();

    const currentStrikes = profile?.strikes_count ?? 0;
    const newStrikeNumber = currentStrikes + 1;

    // Determine automatic consequences
    let restriction_ends_at: string | null = null;
    let suspension_ends_at: string | null = null;
    const is_permanent_ban = newStrikeNumber >= 4;

    if (newStrikeNumber === 2) {
      restriction_ends_at = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    if (newStrikeNumber === 3) {
      suspension_ends_at = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    // Insert strike (trigger handles profile updates)
    const { data: strike, error: sErr } = await supabase
      .from("user_strikes")
      .insert({
        user_id: data.user_id,
        strike_number: newStrikeNumber,
        reason: data.reason,
        evidence: data.evidence || null,
        moderator_id: data.moderator_id,
        conversation_id: data.conversation_id || null,
        chat_number: data.chat_number || null,
        fraud_event_id: data.fraud_event_id || null,
        restriction_ends_at,
        suspension_ends_at,
        is_permanent_ban,
      })
      .select()
      .single();

    if (sErr) {
      console.error("[Strike] issueStrike error:", sErr.message);
      throw new Error("Failed to issue strike.");
    }

    // Log moderation action (immutable)
    const { data: mod } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.moderator_id)
      .single();

    await supabase.from("moderation_audit_logs").insert({
      moderator_id: data.moderator_id,
      moderator_display_name: mod?.display_name ?? "Unknown Moderator",
      action: is_permanent_ban
        ? "PERMANENT_BAN"
        : newStrikeNumber === 3
        ? "SUSPENSION_7D"
        : newStrikeNumber === 2
        ? "RESTRICTION_3D"
        : "STRIKE_WARNING",
      target_user_id: data.user_id,
      target_conversation_id: data.conversation_id || null,
      chat_number: data.chat_number || null,
      reason: data.reason,
      evidence: { evidence: data.evidence, fraud_event_id: data.fraud_event_id },
      metadata: { strike_number: newStrikeNumber, strike_id: strike?.id },
    });

    // Also log to existing user_warnings table for backwards compatibility
    await supabase.from("user_warnings").insert({
      user_id: data.user_id,
      reason: data.reason,
      details: `Strike ${newStrikeNumber}: ${data.evidence || "No additional evidence"}`,
      action_taken: is_permanent_ban
        ? "ban"
        : newStrikeNumber === 3
        ? "suspension"
        : newStrikeNumber === 2
        ? "restriction"
        : "warning",
      issued_by: data.moderator_id,
    });

    return {
      success: true,
      strike_number: newStrikeNumber,
      is_permanent_ban,
      restriction_ends_at,
      suspension_ends_at,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// GET STRIKE HISTORY — all strikes for a user
// ─────────────────────────────────────────────────────────────────────────────
export const getStrikeHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data: strikes, error } = await supabase
      .from("user_strikes")
      .select(`
        *,
        moderator:moderator_id (display_name, email),
        conversation:conversation_id (chat_number, subject)
      `)
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Strike] getStrikeHistory error:", error.message);
      throw new Error("Failed to load strike history.");
    }

    return strikes ?? [];
  });

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE / DISMISS REPORT
// ─────────────────────────────────────────────────────────────────────────────
export const resolveReport = createServerFn({ method: "POST" })
  .inputValidator((d: {
    report_id: string;
    status: "resolved" | "dismissed";
    reviewed_by: string;
    review_notes?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("chat_reports")
      .update({
        status: data.status,
        reviewed_by: data.reviewed_by,
        reviewed_at: new Date().toISOString(),
        review_notes: data.review_notes || null,
      })
      .eq("id", data.report_id);

    if (error) {
      console.error("[Report] resolveReport error:", error.message);
      throw new Error("Failed to update report.");
    }

    await supabase.from("moderation_audit_logs").insert({
      moderator_id: data.reviewed_by,
      action: data.status === "resolved" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
      reason: data.review_notes || null,
      metadata: { report_id: data.report_id },
    });

    return { success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// CREATE APPEAL
// ─────────────────────────────────────────────────────────────────────────────
export const createAppeal = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    strike_id?: string;
    reason: string;
    additional_info?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Check no pending appeal already exists for this strike
    if (data.strike_id) {
      const { data: existing } = await supabase
        .from("appeals")
        .select("id")
        .eq("strike_id", data.strike_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) throw new Error("An appeal is already pending for this strike.");
    }

    const { data: appeal, error } = await supabase
      .from("appeals")
      .insert({
        user_id: data.user_id,
        strike_id: data.strike_id || null,
        reason: data.reason,
        additional_info: data.additional_info || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Appeal] createAppeal error:", error.message);
      throw new Error("Failed to create appeal.");
    }

    return { success: true, appeal };
  });

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW APPEAL — moderator approve/reject
// ─────────────────────────────────────────────────────────────────────────────
export const reviewAppeal = createServerFn({ method: "POST" })
  .inputValidator((d: {
    appeal_id: string;
    status: "approved" | "rejected";
    reviewed_by: string;
    review_notes?: string;
    outcome?: string;
    reverse_strike?: boolean;
    strike_id?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error: aErr } = await supabase
      .from("appeals")
      .update({
        status: data.status,
        reviewed_by: data.reviewed_by,
        reviewed_at: new Date().toISOString(),
        review_notes: data.review_notes || null,
        outcome: data.outcome || null,
      })
      .eq("id", data.appeal_id);

    if (aErr) {
      console.error("[Appeal] reviewAppeal error:", aErr.message);
      throw new Error("Failed to review appeal.");
    }

    // If approved and reverse_strike, mark strike as reversed
    if (data.status === "approved" && data.reverse_strike && data.strike_id) {
      await supabase
        .from("user_strikes")
        .update({
          reversed: true,
          reversed_by: data.reviewed_by,
          reversed_at: new Date().toISOString(),
        })
        .eq("id", data.strike_id);
    }

    // Log
    await supabase.from("moderation_audit_logs").insert({
      moderator_id: data.reviewed_by,
      action: data.status === "approved" ? "APPEAL_APPROVED" : "APPEAL_REJECTED",
      reason: data.review_notes || null,
      metadata: {
        appeal_id: data.appeal_id,
        reverse_strike: data.reverse_strike,
        strike_id: data.strike_id,
      },
    });

    return { success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCED PLATFORM HEALTH SNAPSHOT (replaces the one in warnings.functions.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformHealthFull = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      disputesRes,
      verificationsRes,
      withdrawalsRes,
      ticketsRes,
      suspendedRes,
      bannedRes,
      flaggedChatsRes,
      reportedChatsRes,
      highRiskChatsRes,
      lowTrustRes,
      alertsRes,
      fraudToday,
      fraudUpiToday,
      fraudContactToday,
      msgToday,
      activeOrdersRes,
      activeChatsRes,
      restrictedRes,
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_seller", true).eq("is_verified", false),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("suspended_at", "is", null).is("banned_at", null),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("banned_at", "is", null),
      supabase.from("flagged_chats").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("chat_reports").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      supabase.from("conversations").select("id", { count: "exact", head: true }).in("risk_level", ["high_risk", "critical"]),
      supabase.from("profiles").select("id", { count: "exact", head: true }).lt("trust_score", 30),
      supabase.from("emergency_alerts").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("fraud_events").select("id", { count: "exact", head: true }).gte("created_at", last24h),
      supabase.from("fraud_events").select("id", { count: "exact", head: true }).gte("created_at", last24h).eq("detection_type", "payment_evasion"),
      supabase.from("fraud_events").select("id", { count: "exact", head: true }).gte("created_at", last24h).in("detection_type", ["contact_sharing", "phone_sharing"]),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", last24h).eq("is_system", false),
      supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "delivered", "in_progress"]),
      supabase.from("conversations").select("id", { count: "exact", head: true }).gte("last_message_at", last1h),
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("restricted_until", "is", null).gt("restricted_until", now.toISOString()),
    ]);

    return {
      // Core
      open_disputes: disputesRes.count ?? 0,
      pending_verifications: verificationsRes.count ?? 0,
      pending_withdrawals: withdrawalsRes.count ?? 0,
      open_support_tickets: ticketsRes.count ?? 0,
      low_trust_users: lowTrustRes.count ?? 0,
      active_emergency_alerts: alertsRes.count ?? 0,
      // Account status
      suspended_users: suspendedRes.count ?? 0,
      banned_users: bannedRes.count ?? 0,
      account_restrictions: restrictedRes.count ?? 0,
      // Chat
      active_chats: activeChatsRes.count ?? 0,
      active_orders: activeOrdersRes.count ?? 0,
      pending_flagged_chats: flaggedChatsRes.count ?? 0,
      reported_chats: reportedChatsRes.count ?? 0,
      high_risk_chats: highRiskChatsRes.count ?? 0,
      // Fraud today
      fraud_attempts_today: fraudToday.count ?? 0,
      upi_sharing_today: fraudUpiToday.count ?? 0,
      contact_sharing_today: fraudContactToday.count ?? 0,
      messages_today: msgToday.count ?? 0,
      // Trends (raw counts for display)
      _since_1h: last1h,
      _since_24h: last24h,
      _since_7d: last7d,
      _since_30d: last30d,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING FUNCTIONS (re-exported for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export {
  getFlaggedChats,
  reviewFlaggedChat,
  updateFlaggedChatStatus,
  getSecurityIncidents,
  createSecurityIncident,
  resolveSecurityIncident,
} from "./chats.functions";
