-- HX-001 / Module A (Notification + Email Engine): notification schema upgrade.
--
-- The notifications table today is:
--   (id, user_id, kind, title, body, read_at, created_at)
-- That shape is why the platform "feels broken":
--   * BUG-02 — dropdown rows have no destination, so clicking does nothing.
--             There is no link / entity reference to navigate to.
--   * The bell cannot group items the way the spec requires
--     (Orders / Listings / Finance / Seller Membership / Security / Platform)
--     because there is no category column — `kind` is an ad-hoc free string.
--   * The 47-event notification matrix has no stable event identifier to key on.
--
-- This migration ONLY widens the schema (HX-001). It does NOT:
--   * change RLS (the existing notifications_read / notifications_insert_staff
--     policies stay exactly as they are; the notify() engine writes via the
--     service-role client, which bypasses RLS),
--   * create the events / deliveries config tables (those are HX-002 / HX-003),
--   * touch any other module.
--
-- `kind` is intentionally kept for backward compatibility with existing rows and
-- the current bell code; `event_key` is the new structured identifier going
-- forward. Adding columns with defaults backfills existing rows automatically,
-- so old notifications become category='platform', priority='normal',
-- channels='{in_app}' — all valid against the CHECK constraints below.

alter table public.notifications
  add column if not exists link text,
  add column if not exists category text not null default 'platform',
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists event_key text,
  add column if not exists priority text not null default 'normal',
  add column if not exists channels text[] not null default '{in_app}';

-- Constrain category to the six spec groups (membership = "Seller Membership").
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_category_check'
  ) then
    alter table public.notifications
      add constraint notifications_category_check
      check (category in (
        'orders', 'listings', 'finance', 'membership', 'security', 'platform'
      ));
  end if;
end $$;

-- Constrain priority. 'critical' is reserved for security/financial events that
-- must never be auto-archived early or suppressed.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_priority_check'
  ) then
    alter table public.notifications
      add constraint notifications_priority_check
      check (priority in ('normal', 'high', 'critical'));
  end if;
end $$;

-- Hot path: the bell's unread badge + unread list per user.
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- Category filtering in the Notification Center.
create index if not exists idx_notifications_category
  on public.notifications (user_id, category, created_at desc);

-- Deep-link lookups ("show me notifications about this order").
create index if not exists idx_notifications_entity
  on public.notifications (entity_type, entity_id);
