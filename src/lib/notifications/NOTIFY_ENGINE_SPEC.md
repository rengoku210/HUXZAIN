# `notify()` Engine — Contract Spec (HX-003, NOT yet wired)

> Status: **SPEC ONLY**. This document defines the dispatcher that HX-003 will
> implement. No code here is wired into the UI or any flow yet. HX-002 delivered
> the data it depends on: `public.notification_events` (catalogue) +
> `public.notifications` (per-user rows, extended in HX-001).

## Purpose

One dispatcher that every state transition calls instead of inserting
notifications by hand. It looks the event up in `notification_events`, renders
the templated copy + deep-link from `context`, and writes one
`public.notifications` row per recipient — sending email only when the event's
`channels` include `email`.

## Signature (proposed)

```ts
// src/lib/notifications/notify.ts  (HX-003)
type NotifyContext = {
  // recipients — caller decides WHO; the event decides HOW.
  userIds?: string[];          // explicit recipients
  roles?: string[];            // e.g. ['super_admin'] for staff/dashboard events
  // template + link interpolation values (no user data lives in the catalogue)
  data?: Record<string, string | number>;  // {orderId}, {listingId}, {plan}, {date}, {name}, ...
  // typed deep-link source stored on the row for re-authorized navigation
  entity?: { type: string; id: string };
  // overrides (rare) — e.g. force a one-off link
  link?: string;
};

export async function notify(eventKey: string, ctx: NotifyContext): Promise<{
  success: boolean;
  notificationIds: string[];
  error?: { code: string; message: string };
}>;
```

## Behaviour (HX-003 will implement)

1. **Lookup**: `select * from notification_events where event_key = $1 and is_active`.
   - Missing/inactive → return `{ success:false, error:{ code:'CONFIG_MISSING' } }` (never throw into a business flow).
2. **Resolve recipients**: union of `ctx.userIds` and users resolved from `ctx.roles`.
3. **Render**: interpolate `{placeholders}` in `title` / `template_title` /
   `template_body` / `link_pattern` from `ctx.data` + `ctx.entity`. Leave unknown
   placeholders blank rather than printing the token.
4. **Write in-app row(s)**: insert into `public.notifications` with
   `kind = event_key` (back-compat), `event_key`, `category`, `priority`,
   `channels`, `link` (rendered), `entity_type`/`entity_id`, `title`, `body`.
5. **Email**: if `channels @> '{email}'`, render the matching branded email
   template and send via the existing Resend path
   (`src/lib/notifications.functions.ts` + `src/lib/email-templates.ts`).
   - Email is best-effort: a send failure must NOT fail the in-app write.
   - Honour communication preferences for non-essential events; security /
     financial / decision events are non-disableable (Module A / BUG-15).
6. **Idempotency**: optional `dedupe_key` (event_key + entity + recipient) to
   avoid double-sends from retries.
7. **Delivery log**: write to `notification_deliveries` (HX-003 table) per channel.

## Hard rules (carried from the spec)

- **Never email per chat message** — `order.new_message` is `{in_app}` only.
- **Catalogue holds no user data** — only templates with `{placeholders}`.
- **`event_key` is immutable** — it is the stable contract other code calls.
- `category` / `priority` are already constrained to the same sets as
  `public.notifications`, so a catalogue row always produces a valid row.
- `retention_days` is **advisory** here; the cleanup job (Module O) reads it.
  The exact retention period is **Super-Admin configurable** and the source doc
  gives no fixed numbers — current values are defaults, not invented rules.

## Recipient fan-out note

Where the source doc specifies different copy for buyer vs seller vs staff, the
matrix has **separate `event_key`s** (e.g. `order.payment_approved_buyer` and
`order.payment_approved_seller`). Super-Admin dashboard feeds reuse the relevant
`staff.*` event via `ctx.roles = ['super_admin']` rather than duplicate rows.

## MISSING (needs client input before fully wiring reminders)

- Verification-expiry reminder schedule (docs conflict 15/7/3 vs 7/3/1) →
  affects `membership.verification_expiring` cadence (the event row exists; the
  schedule that fires it is Module O / client input).
- Exact notification retention periods (currently 30 / 180 / 365 defaults).
