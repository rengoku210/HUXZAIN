-- HX-003 / Module A: dispatcher infrastructure (idempotency + delivery log + realtime).
--
-- This migration is the runtime backbone for src/lib/notifications/notify.ts.
-- It does NOT rewrite HX-001/HX-002 — it ADDS the engine's own infrastructure:
--   1. a dedupe guard so the same event for the same entity+recipient can never
--      be inserted twice (the hard idempotency guarantee, enforced in the DB so
--      it holds even under concurrent calls),
--   2. a per-channel delivery log (in-app / email) for Communication Logs +
--      debugging + bounce tracking,
--   3. ensures public.notifications is in the realtime publication so the bell
--      updates instantly on insert,
--   4. a small ADDITIVE seed of account-restriction events (grounded in the
--      doc's "Security Communication: Account Restrictions") so the onUserStrike
--      hook has a real event_key to call. ON CONFLICT DO NOTHING — does not
--      touch the 88 rows from HX-002.

-- 1) Idempotency guard ------------------------------------------------------
alter table public.notifications
  add column if not exists dedupe_key text;

-- Partial unique index: only rows that opt into dedupe are constrained.
-- notify() builds dedupe_key = "<event_key>:<entity_type>:<entity_id>:<user_id>"
-- for entity-bound events; reminder-style events pass null and may repeat.
create unique index if not exists uq_notifications_dedupe
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

-- 2) Delivery log -----------------------------------------------------------
create table if not exists public.notification_deliveries (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid references public.notifications(id) on delete cascade,
  event_key         text not null,
  channel           text not null,
  recipient_user_id uuid,
  status            text not null,
  provider_msg_id   text,
  error             text,
  created_at        timestamptz not null default now(),
  constraint notification_deliveries_channel_check check (channel in ('in_app','email')),
  constraint notification_deliveries_status_check  check (status in ('sent','failed','skipped','queued'))
);

create index if not exists idx_notification_deliveries_event
  on public.notification_deliveries (event_key, created_at desc);
create index if not exists idx_notification_deliveries_recipient
  on public.notification_deliveries (recipient_user_id, created_at desc);

alter table public.notification_deliveries enable row level security;

-- Logs are operational data: staff read; the service-role engine writes
-- (and bypasses RLS), so no insert policy for end users.
drop policy if exists notification_deliveries_read on public.notification_deliveries;
create policy notification_deliveries_read on public.notification_deliveries
  for select using (public.is_staff());

-- 3) Realtime: make sure the bell receives INSERTs instantly ----------------
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;            -- already in publication
  when others then raise notice 'realtime publication add skipped: %', sqlerrm;
end $$;

-- 4) Additive seed: account-restriction events for the onUserStrike hook -----
-- (Security Communication -> "Account Restrictions" in the notifications doc.)
insert into public.notification_events
  (event_key, title, description, category, priority, channels, template_title, template_body, link_pattern, retention_days)
values
('security.account_strike','Account strike issued','Moderation strike added','security','critical',ARRAY['in_app','email'],'A strike was added to your account','Your account received a strike for a policy violation. Repeated violations may restrict your account.','/account',365),
('security.account_suspended','Account suspended','Temporary suspension','security','critical',ARRAY['in_app','email'],'Your account has been suspended','Your account has been temporarily suspended. Review the details and contact support if you believe this is a mistake.','/account',365),
('security.account_banned','Account banned','Permanent ban','security','critical',ARRAY['in_app','email'],'Your account has been banned','Your account has been banned for repeated or serious policy violations.','/account',365)
on conflict (event_key) do nothing;
