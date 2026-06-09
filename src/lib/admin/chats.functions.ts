"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Fetch all flagged chats with buyer/seller profile info.
 */
export const getFlaggedChats = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("flagged_chats")
      .select(`
        *,
        buyer:buyer_id (
          display_name,
          email
        ),
        seller:seller_id (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Chats] Fetch flagged chats error:", error.message);
      throw new Error("Failed to fetch flagged chats.");
    }

    return data;
  });

/**
 * Review a specific flagged chat with full details.
 */
export const reviewFlaggedChat = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data: chat, error } = await supabase
      .from("flagged_chats")
      .select(`
        *,
        buyer:buyer_id (
          display_name,
          email,
          username
        ),
        seller:seller_id (
          display_name,
          email,
          username
        )
      `)
      .eq("id", data.id)
      .single();

    if (error || !chat) {
      console.error("[Chats] Review flagged chat error:", error?.message);
      throw new Error("Flagged chat not found.");
    }

    return chat;
  });

/**
 * Update the status of a flagged chat.
 */
export const updateFlaggedChatStatus = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    status: string;
    review_notes: string;
    reviewed_by: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { id, status, review_notes, reviewed_by } = data;

    const { error } = await supabase
      .from("flagged_chats")
      .update({
        status,
        review_notes,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Chats] Update flagged chat status error:", error.message);
      throw new Error("Failed to update flagged chat status.");
    }

    return { success: true };
  });

/**
 * Fetch all security incidents with user profile info.
 */
export const getSecurityIncidents = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("security_incidents")
      .select(`
        *,
        profiles:user_id (
          display_name,
          email,
          username
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Chats] Fetch security incidents error:", error.message);
      throw new Error("Failed to fetch security incidents.");
    }

    return data;
  });

/**
 * Create a new security incident.
 */
export const createSecurityIncident = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    incident_type: string;
    severity: string;
    details: string;
    ip_address: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { user_id, incident_type, severity, details, ip_address } = data;

    const { data: result, error } = await supabase
      .from("security_incidents")
      .insert({
        user_id,
        incident_type,
        severity,
        details,
        ip_address,
      })
      .select()
      .single();

    if (error) {
      console.error("[Chats] Create security incident error:", error.message);
      throw new Error("Failed to create security incident.");
    }

    return { success: true, incident: result };
  });

/**
 * Resolve a security incident.
 */
export const resolveSecurityIncident = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; resolved_by: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("security_incidents")
      .update({
        resolved: true,
        resolved_by: data.resolved_by,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      console.error("[Chats] Resolve security incident error:", error.message);
      throw new Error("Failed to resolve security incident.");
    }

    return { success: true };
  });
