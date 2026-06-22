"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONSHIP HYDRATION HELPERS
// conversations.buyer_id/seller_id, chat_reports/fraud_events/flagged_chats.*_id
// and orders all reference auth.users, so PostgREST cannot embed public.profiles
// or public.orders through them (it returns PGRST200 "no relationship", which
// fails the whole query). We batch-fetch each related table by id and stitch the
// rows together in JS — the exact approach the user-facing /messages inbox uses.
// ─────────────────────────────────────────────────────────────────────────────
async function hydrateProfiles(supabase: any, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, email, strikes_count, suspended_at")
    .in("id", unique);
  return new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
}

async function hydrateOrders(supabase: any, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, amount_inr")
    .in("id", unique);
  return new Map<string, any>((data ?? []).map((o: any) => [o.id, o]));
}

async function hydrateConversations(supabase: any, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from("conversations")
    .select("id, chat_number, order_id, buyer_id, seller_id, risk_score, risk_level, subject")
    .in("id", unique);
  const rows = data ?? [];
  const profiles = await hydrateProfiles(supabase, rows.flatMap((c: any) => [c.buyer_id, c.seller_id]));
  return new Map<string, any>(
    rows.map((c: any) => [
      c.id,
      { ...c, buyer: profiles.get(c.buyer_id) ?? null, seller: profiles.get(c.seller_id) ?? null },
    ])
  );
}

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
        created_at
      `)
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[Monitor] getConversationsMonitor error:", error.message);
      throw new Error("Failed to load monitoring data.");
    }

    const rows = data ?? [];
    const profiles = await hydrateProfiles(supabase, rows.flatMap((c: any) => [c.buyer_id, c.seller_id]));
    const orders = await hydrateOrders(supabase, rows.map((c: any) => c.order_id));

    return rows.map((c: any) => ({
      ...c,
      buyer: profiles.get(c.buyer_id) ?? null,
      seller: profiles.get(c.seller_id) ?? null,
      order: c.order_id ? orders.get(c.order_id) ?? null : null,
    }));
  });

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW QUEUE — flagged + reported conversations for moderation
// ─────────────────────────────────────────────────────────────────────────────
export const getReviewQueue = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Fetch reported conversations (manual hydration — *_id cols reference auth.users)
    const { data: reportRows, error: rErr } = await supabase
      .from("chat_reports")
      .select("*")
      .in("status", ["open", "under_review"])
      .order("created_at", { ascending: false });

    if (rErr) {
      console.error("[Queue] getReviewQueue reports error:", rErr.message);
      throw new Error("Failed to load review queue.");
    }

    const reportList = reportRows ?? [];
    const convMap = await hydrateConversations(supabase, reportList.map((r: any) => r.conversation_id));
    const reporterMap = await hydrateProfiles(supabase, reportList.map((r: any) => r.reporter_id));
    const reports = reportList.map((r: any) => ({
      ...r,
      conversation: convMap.get(r.conversation_id) ?? null,
      reporter: reporterMap.get(r.reporter_id) ?? null,
    }));

    // Fetch flagged chats (existing table)
    const { data: flaggedRows, error: fErr } = await supabase
      .from("flagged_chats")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (fErr) {
      console.error("[Queue] getReviewQueue flagged error:", fErr.message);
    }

    const flaggedList = flaggedRows ?? [];
    const flaggedProfiles = await hydrateProfiles(
      supabase,
      flaggedList.flatMap((f: any) => [f.buyer_id, f.seller_id])
    );
    const flagged = flaggedList.map((f: any) => ({
      ...f,
      buyer: flaggedProfiles.get(f.buyer_id) ?? null,
      seller: flaggedProfiles.get(f.seller_id) ?? null,
    }));

    return {
      reports,
      flagged,
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

    const { data: eventRows, error } = await supabase
      .from("fraud_events")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      console.error("[Fraud] getFraudEvents error:", error.message);
      throw new Error("Failed to load fraud events.");
    }

    const events = eventRows ?? [];
    const userMap = await hydrateProfiles(supabase, events.map((e: any) => e.user_id));
    const convMap = await hydrateConversations(supabase, events.map((e: any) => e.conversation_id));

    const fraudFeed = events.map((e: any) => ({
      ...e,
      user: userMap.get(e.user_id) ?? null,
      conversation: convMap.get(e.conversation_id) ?? null,
    }));

    // The feed shows automated fraud detections AND user-submitted chat reports.
    // Reports are only merged on the first page to avoid duplication across pages.
    if (page !== 0) return fraudFeed;

    const { data: reportRows } = await supabase
      .from("chat_reports")
      .select("*")
      .order("created_at", { ascending: false });
    const reports = reportRows ?? [];
    const reporterMap = await hydrateProfiles(supabase, reports.map((r: any) => r.reporter_id));
    const reportConvMap = await hydrateConversations(supabase, reports.map((r: any) => r.conversation_id));

    const reportEvents = reports.map((r: any) => ({
      id: `report-${r.id}`,
      conversation_id: r.conversation_id,
      chat_number: r.chat_number,
      conversation: reportConvMap.get(r.conversation_id) ?? null,
      user: reporterMap.get(r.reporter_id) ?? null,
      detection_type: "user_report",
      matched_pattern: r.reason,
      message_preview: r.additional_notes || r.reason,
      risk_tier: ["open", "under_review"].includes(r.status) ? "high" : "warning",
      confidence_score: 100,
      created_at: r.created_at,
      _source: "report",
    }));

    return [...fraudFeed, ...reportEvents].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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
        // Conversation (parties hydrated separately — buyer_id/seller_id -> auth.users)
        supabase
          .from("conversations")
          .select("*")
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
          .select("*")
          .eq("conversation_id", data.conversation_id)
          .order("created_at", { ascending: false }),
      ]);

    if (convRes.error || !convRes.data)
      throw new Error("Conversation not found.");

    const conv = convRes.data;

    // Hydrate parties, order and report reporters
    const [profiles, orders, reporterMap] = await Promise.all([
      hydrateProfiles(supabase, [conv.buyer_id, conv.seller_id]),
      hydrateOrders(supabase, [conv.order_id]),
      hydrateProfiles(supabase, (reportsRes.data ?? []).map((r: any) => r.reporter_id)),
    ]);

    const conversation = {
      ...conv,
      buyer: profiles.get(conv.buyer_id) ?? null,
      seller: profiles.get(conv.seller_id) ?? null,
      order: conv.order_id ? orders.get(conv.order_id) ?? null : null,
    };

    const reports = (reportsRes.data ?? []).map((r: any) => ({
      ...r,
      reporter: reporterMap.get(r.reporter_id) ?? null,
    }));

    return {
      conversation,
      messages: messagesRes.data ?? [],
      fraud_events: fraudRes.data ?? [],
      strikes: strikesRes.data ?? [],
      reports,
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

    const { data: strikeRows, error } = await supabase
      .from("user_strikes")
      .select("*")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Strike] getStrikeHistory error:", error.message);
      throw new Error("Failed to load strike history.");
    }

    const strikes = strikeRows ?? [];
    const moderatorMap = await hydrateProfiles(supabase, strikes.map((s: any) => s.moderator_id));
    const convMap = await hydrateConversations(supabase, strikes.map((s: any) => s.conversation_id));

    return strikes.map((s: any) => ({
      ...s,
      moderator: moderatorMap.get(s.moderator_id) ?? null,
      conversation: convMap.get(s.conversation_id) ?? null,
    }));
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
      totalChatsRes,
      flaggedConvRes,
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
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("is_flagged", true),
    ]);

    // Moderation backlog = open chat reports awaiting review + flagged chats pending review
    const moderation_backlog = (reportedChatsRes.count ?? 0) + (flaggedChatsRes.count ?? 0);

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
      total_chats: totalChatsRes.count ?? 0,
      active_chats: activeChatsRes.count ?? 0,
      active_orders: activeOrdersRes.count ?? 0,
      flagged_chats: flaggedConvRes.count ?? 0,
      pending_flagged_chats: flaggedChatsRes.count ?? 0,
      reported_chats: reportedChatsRes.count ?? 0,
      moderation_backlog,
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
