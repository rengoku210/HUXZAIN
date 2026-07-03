/**
 * HX-003 — Central notification dispatcher (SERVER-ONLY).
 *
 * Every state transition on the platform should call notify(eventKey, ctx)
 * instead of inserting notifications by hand. The engine:
 *   1. looks the event up in public.notification_events (HX-002),
 *   2. renders its templated title/body/link from `ctx` (no user data lives in
 *      the catalogue — only {placeholders}),
 *   3. resolves recipients from ctx.userIds / ctx.roles / common id fields,
 *   4. inserts ONE public.notifications row per recipient (idempotent via the
 *      dedupe guard from HX-003's migration),
 *   5. sends a branded email only when the event's channels include "email",
 *   6. logs every attempt to public.notification_deliveries.
 *
 * Design guarantees (from the HX-003 brief):
 *   - silent fail on missing/inactive event_key (never throws into a flow),
 *   - idempotent: same event for same entity+recipient is inserted at most once,
 *   - non-blocking: email/log failures never fail the in-app write or the caller,
 *   - no frontend dependency: realtime bell updates come from the INSERT itself
 *     (notifications is in the supabase_realtime publication).
 *
 * This module reads the service-role key via getAdminClient() and must only be
 * imported from server code. It is intentionally NOT a createServerFn endpoint.
 */

import { getAdminClient } from "../../server/supabase-admin";

/** Vite exposes build-time env on import.meta.env; typed access without `any`. */
const META_ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export interface NotifyContext {
  /** Explicit recipient user ids. */
  userIds?: string[];
  /** Roles (user_roles.role) whose members should also receive this. */
  roles?: string[];
  /** Values used to fill {placeholders} in the template + link. */
  data?: Record<string, string | number | null | undefined>;
  /** Typed deep-link source. Adds `${type}Id` to the template data automatically. */
  entity?: { type: string; id: string };
  /** Override the rendered link entirely (rare). */
  link?: string;
  /** Explicit dedupe key. Defaults to entity-scoped key; pass a unique value for repeatable reminders. */
  dedupeKey?: string;
  /** Set false to allow an entity-bound event to repeat (skips auto dedupe). */
  dedupe?: boolean;
}

export interface NotifyResult {
  success: boolean;
  notificationIds: string[];
  /** True when nothing was sent for a non-error reason (unknown event / no recipients). */
  skipped?: boolean;
  error?: { code: string; message: string };
}

interface EventRow {
  event_key: string;
  title: string;
  category: string;
  priority: string;
  channels: string[] | null;
  template_title: string | null;
  template_body: string | null;
  link_pattern: string | null;
}

/** Replace {key} and {{key}} tokens from data; unknown tokens render empty. */
function interpolate(tpl: string | null | undefined, data: Record<string, unknown>): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (_m, key: string) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Best-effort delivery log. Never throws. */
async function logDelivery(
  admin: ReturnType<typeof getAdminClient>,
  row: {
    notification_id: string | null;
    event_key: string;
    channel: "in_app" | "email";
    recipient_user_id: string;
    status: "sent" | "failed" | "skipped" | "queued";
    provider_msg_id?: string | null;
    error?: string | null;
  },
): Promise<void> {
  if (!admin) return;
  try {
    await admin.from("notification_deliveries").insert(row);
  } catch (e) {
    console.error("[notify] delivery log failed:", e);
  }
}

/** Best-effort branded email send via Resend. Never throws. */
async function sendEmail(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  ev: EventRow,
  userId: string,
  title: string,
  body: string,
  link: string | null,
): Promise<void> {
  const apiKey =
    process.env.RESEND_API_KEY || META_ENV?.VITE_RESEND_API_KEY || META_ENV?.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || META_ENV?.VITE_RESEND_FROM_EMAIL || "noreply@huxzain.shop";
  const siteUrl = process.env.VITE_SITE_URL || META_ENV?.VITE_SITE_URL || "https://huxzain.shop";

  if (!apiKey) {
    await logDelivery(admin, {
      notification_id: null,
      event_key: ev.event_key,
      channel: "email",
      recipient_user_id: userId,
      status: "skipped",
      error: "no RESEND_API_KEY",
    });
    return;
  }

  // Resolve recipient email (Auth first, then profiles fallback).
  let targetEmail: string | undefined;
  try {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    targetEmail = u?.user?.email ?? undefined;
  } catch {
    /* fall through */
  }
  if (!targetEmail) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    targetEmail = (profile as { email?: string } | null)?.email ?? undefined;
  }
  if (!targetEmail) {
    await logDelivery(admin, {
      notification_id: null,
      event_key: ev.event_key,
      channel: "email",
      recipient_user_id: userId,
      status: "skipped",
      error: "no recipient email",
    });
    return;
  }

  const actionBtn = link
    ? `<div style="margin:28px 0;text-align:center;"><a href="${siteUrl}${link}" style="display:inline-block;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">View Details</a></div>`
    : "";
  const html = `
    <div style="background:#0A0A0C;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;border:1px solid #1A1A22;border-radius:16px;">
      <div style="text-align:center;margin-bottom:30px;border-bottom:1px solid #1A1A22;padding-bottom:20px;">
        <h1 style="color:#D4AF37;font-size:28px;font-weight:800;letter-spacing:2px;margin:0;text-transform:uppercase;">HUXZAIN</h1>
      </div>
      <h2 style="color:#fff;font-size:18px;font-weight:700;border-left:3px solid #D4AF37;padding-left:12px;">${title}</h2>
      <div style="color:#C0C0C6;font-size:14px;line-height:1.6;">${body}</div>
      ${actionBtn}
      <div style="text-align:center;border-top:1px solid #1A1A22;padding-top:25px;margin-top:30px;color:#60606A;font-size:11px;">
        <p style="margin:0;">© 2026 HUXZAIN. All rights reserved.</p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `HUXZAIN <${fromEmail}>`,
        to: [targetEmail],
        subject: title,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      await logDelivery(admin, {
        notification_id: null,
        event_key: ev.event_key,
        channel: "email",
        recipient_user_id: userId,
        status: "failed",
        error: errBody.slice(0, 500),
      });
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    await logDelivery(admin, {
      notification_id: null,
      event_key: ev.event_key,
      channel: "email",
      recipient_user_id: userId,
      status: "sent",
      provider_msg_id: json?.id ?? null,
    });
  } catch (e) {
    await logDelivery(admin, {
      notification_id: null,
      event_key: ev.event_key,
      channel: "email",
      recipient_user_id: userId,
      status: "failed",
      error: e instanceof Error ? e.message : "send error",
    });
  }
}

/**
 * Dispatch a platform event. Safe to call from any server-side flow.
 */
export async function notify(eventKey: string, ctx: NotifyContext = {}): Promise<NotifyResult> {
  const admin = getAdminClient();
  if (!admin) {
    console.error("[notify] admin client unavailable");
    return {
      success: false,
      notificationIds: [],
      error: { code: "CONFIG_MISSING", message: "admin client unavailable" },
    };
  }

  try {
    // 1) Lookup event (silent skip if unknown/inactive).
    const { data: evRaw, error: evErr } = await admin
      .from("notification_events")
      .select(
        "event_key,title,category,priority,channels,template_title,template_body,link_pattern",
      )
      .eq("event_key", eventKey)
      .eq("is_active", true)
      .maybeSingle();
    if (evErr) {
      console.error("[notify] event lookup error:", evErr.message);
      return {
        success: false,
        notificationIds: [],
        error: { code: "INTERNAL", message: evErr.message },
      };
    }
    if (!evRaw) {
      console.warn(`[notify] unknown or inactive event_key: ${eventKey} (skipping silently)`);
      return { success: false, notificationIds: [], skipped: true };
    }
    const ev = evRaw as EventRow;

    // 2) Resolve recipients (explicit ids + common id fields + roles).
    const recipients = new Set<string>();
    (ctx.userIds ?? []).forEach((id) => id && recipients.add(id));
    for (const k of ["user_id", "seller_id", "buyer_id", "admin_id"]) {
      const v = ctx.data?.[k];
      if (typeof v === "string" && v) recipients.add(v);
    }
    if (ctx.roles && ctx.roles.length > 0) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .in("role", ctx.roles);
      (roleRows ?? []).forEach(
        (r: { user_id: string | null }) => r.user_id && recipients.add(r.user_id),
      );
    }
    if (recipients.size === 0) {
      console.warn(`[notify] no recipients resolved for ${eventKey} (skipping)`);
      return { success: true, notificationIds: [], skipped: true };
    }

    // 3) Render template + link.
    const data: Record<string, unknown> = { ...(ctx.data ?? {}) };
    if (ctx.entity) data[`${ctx.entity.type}Id`] = ctx.entity.id;
    const title = interpolate(ev.template_title || ev.title, data);
    const body = interpolate(ev.template_body, data);
    const link = ctx.link ?? (interpolate(ev.link_pattern, data) || null);
    const channels = ev.channels ?? ["in_app"];
    const wantsEmail = channels.includes("email");

    // 4) Insert per recipient (DB-enforced idempotency via dedupe_key).
    const notificationIds: string[] = [];
    for (const userId of recipients) {
      const dedupeKey =
        ctx.dedupeKey ??
        (ctx.entity && ctx.dedupe !== false
          ? `${eventKey}:${ctx.entity.type}:${ctx.entity.id}:${userId}`
          : null);

      const { data: ins, error: insErr } = await admin
        .from("notifications")
        .insert({
          user_id: userId,
          kind: eventKey, // back-compat with existing bell code
          event_key: eventKey,
          title,
          body,
          category: ev.category,
          priority: ev.priority,
          channels,
          link,
          entity_type: ctx.entity?.type ?? null,
          entity_id: ctx.entity?.id ?? null,
          dedupe_key: dedupeKey,
          read_at: null,
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        if ((insErr as { code?: string }).code === "23505") {
          // Duplicate (idempotent skip).
          await logDelivery(admin, {
            notification_id: null,
            event_key: eventKey,
            channel: "in_app",
            recipient_user_id: userId,
            status: "skipped",
            error: "dedupe",
          });
          continue;
        }
        console.error(`[notify] insert failed for ${userId}:`, insErr.message);
        await logDelivery(admin, {
          notification_id: null,
          event_key: eventKey,
          channel: "in_app",
          recipient_user_id: userId,
          status: "failed",
          error: insErr.message,
        });
        continue;
      }

      const newId = (ins as { id?: string } | null)?.id;
      if (!newId) continue;
      notificationIds.push(newId);
      await logDelivery(admin, {
        notification_id: newId,
        event_key: eventKey,
        channel: "in_app",
        recipient_user_id: userId,
        status: "sent",
      });

      // 5) Email (best-effort; never blocks).
      if (wantsEmail) {
        await sendEmail(admin, ev, userId, title, body, link);
      }
    }

    return { success: true, notificationIds };
  } catch (e) {
    console.error("[notify] exception:", e);
    return {
      success: false,
      notificationIds: [],
      error: { code: "INTERNAL", message: e instanceof Error ? e.message : "error" },
    };
  }
}
