-- HX-002 / Module A: notification_events matrix table.
--
-- This is the data-driven catalogue that powers the whole notification engine.
-- Every place in the platform that needs to notify someone will call
-- notify(event_key, context) (HX-003) — the engine looks the event up HERE to
-- decide category, priority, channels (in-app / email), the templated copy and
-- the deep-link route. Nothing about *who* receives it lives in this table; the
-- caller passes the recipient. That keeps business rules in config, not code.
--
-- HX-002 = table + seed only. The notify() dispatcher is HX-003 and is NOT
-- wired here (see src/lib/notifications/NOTIFY_ENGINE_SPEC.md for its contract).
--
-- category / priority values are constrained to the SAME sets enforced on
-- public.notifications in HX-001 (migration 20260630120000), so a row seeded
-- here can always be copied onto a real notification without violating its
-- CHECK constraints.

create table if not exists public.notification_events (
  id             uuid primary key default gen_random_uuid(),
  event_key      text not null unique,
  title          text not null,
  description    text,
  category       text not null,
  priority       text not null default 'normal',
  channels       text[] not null default '{in_app}',
  template_title text,
  template_body  text,
  link_pattern   text,
  retention_days int not null default 30,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),

  constraint notification_events_category_check
    check (category in ('orders','listings','finance','membership','security','platform')),
  constraint notification_events_priority_check
    check (priority in ('normal','high','critical')),
  constraint notification_events_retention_check
    check (retention_days > 0)
);

-- event_key already has a unique index from the UNIQUE constraint; add the
-- lookup indexes the engine + admin UI will use.
create index if not exists idx_notification_events_category
  on public.notification_events (category);

create index if not exists idx_notification_events_active
  on public.notification_events (is_active)
  where is_active = true;

-- Config data, not user data: any authenticated user (and the engine) may read
-- it; only staff may edit it. The service-role engine bypasses RLS anyway.
alter table public.notification_events enable row level security;

drop policy if exists notification_events_read on public.notification_events;
create policy notification_events_read on public.notification_events
  for select using (auth.role() = 'authenticated' or public.is_staff());

drop policy if exists notification_events_write on public.notification_events;
create policy notification_events_write on public.notification_events
  for all using (public.is_staff()) with check (public.is_staff());
