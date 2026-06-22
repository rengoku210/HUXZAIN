"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

// buyer_id/seller_id/user_id reference auth.users, so PostgREST cannot embed
// public.profiles through them. Batch-fetch profiles by id and stitch in JS.
async function hydrateProfiles(supabase: any, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map<string, any>();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, email")
    .in("id", unique);
  return new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
}

/**
 * Fetch all flagged chats with buyer/seller profile info.
 */
export const getFlaggedChats = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("flagged_chats")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Chats] Fetch flagged chats error:", error.message);
      throw new Error("Failed to fetch flagged chats.");
    }

    const rows = data ?? [];
    const profiles = await hydrateProfiles(supabase, rows.flatMap((c: any) => [c.buyer_id, c.seller_id]));
    return rows.map((c: any) => ({
      ...c,
      buyer: profiles.get(c.buyer_id) ?? null,
      seller: profiles.get(c.seller_id) ?? null,
    }));
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
      .select("*")
      .eq("id", data.id)
      .single();

    if (error || !chat) {
      console.error("[Chats] Review flagged chat error:", error?.message);
      throw new Error("Flagged chat not found.");
    }

    const profiles = await hydrateProfiles(supabase, [chat.buyer_id, chat.seller_id]);
    return {
      ...chat,
      buyer: profiles.get(chat.buyer_id) ?? null,
      seller: profiles.get(chat.seller_id) ?? null,
    };
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
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Chats] Fetch security incidents error:", error.message);
      throw new Error("Failed to fetch security incidents.");
    }

    const rows = data ?? [];
    const profiles = await hydrateProfiles(supabase, rows.map((r: any) => r.user_id));
    return rows.map((r: any) => ({ ...r, profiles: profiles.get(r.user_id) ?? null }));
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
