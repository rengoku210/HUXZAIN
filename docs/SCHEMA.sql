-- ============================================================
-- HUXZAIN — Marketplace Schema (Postgres / Supabase)
-- Run in Supabase SQL editor (or psql). Idempotent where safe.
-- Auth uses Supabase's built-in `auth.users` table; everything
-- else lives in `public`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Roles & Permissions (separate table — never on profiles)
-- ------------------------------------------------------------
do $$ begin
  create type public.app_role as enum
    ('buyer','seller','moderator','staff','admin','super_admin');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.app_role not null,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('moderator','staff','admin','super_admin')
  );
$$;

-- ------------------------------------------------------------
-- 2. Profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  avatar_url    text,
  bio           text,
  country       text,
  is_seller     boolean not null default false,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create profile + buyer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'buyer');
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3. Categories
-- ------------------------------------------------------------
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  title     text not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon      text,
  sort      int not null default 0
);
alter table public.categories enable row level security;

-- ------------------------------------------------------------
-- 4. Listings
-- ------------------------------------------------------------
do $$ begin
  create type public.listing_status as enum
    ('draft','pending_review','active','paused','rejected','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.delivery_type as enum ('instant','manual');
exception when duplicate_object then null; end $$;

create table if not exists public.listings (
  id                   uuid primary key default gen_random_uuid(),
  seller_id            uuid not null references auth.users(id) on delete cascade,
  category_id          uuid not null references public.categories(id),
  title                text not null,
  slug                 text not null,
  description          text,
  price_cents          int  not null check (price_cents >= 0),
  currency             text not null default 'USD',
  delivery_type        public.delivery_type not null default 'manual',
  delivery_time_hours  int not null default 24,
  stock                int,
  status               public.listing_status not null default 'pending_review',
  cover_url            text,
  rating_avg           numeric(3,2) not null default 0,
  rating_count         int not null default 0,
  views                int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (seller_id, slug)
);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_category_idx on public.listings(category_id);
alter table public.listings enable row level security;

-- ------------------------------------------------------------
-- 5. Orders + Transactions + Wallets + Payouts
-- ------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('pending','paid','delivering','delivered','completed','disputed','refunded','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.txn_type as enum ('charge','credit','payout','refund','fee');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payout_status as enum ('requested','approved','processing','paid','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references auth.users(id),
  seller_id         uuid not null references auth.users(id),
  listing_id        uuid not null references public.listings(id),
  qty               int  not null default 1,
  amount_cents      int  not null,
  fee_cents         int  not null default 0,
  currency          text not null default 'USD',
  status            public.order_status not null default 'pending',
  protection_until  timestamptz,
  created_at        timestamptz not null default now(),
  delivered_at      timestamptz,
  completed_at      timestamptz
);
create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists orders_seller_idx on public.orders(seller_id);
alter table public.orders enable row level security;

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id),
  order_id     uuid references public.orders(id),
  type         public.txn_type not null,
  amount_cents int  not null,
  currency     text not null default 'USD',
  ref          text,
  created_at   timestamptz not null default now()
);
alter table public.transactions enable row level security;

create table if not exists public.wallets (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  balance_cents   int  not null default 0,
  pending_cents   int  not null default 0,
  currency        text not null default 'USD',
  updated_at      timestamptz not null default now()
);
alter table public.wallets enable row level security;

create table if not exists public.payouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount_cents  int  not null check (amount_cents > 0),
  currency      text not null default 'USD',
  method        text not null,
  status        public.payout_status not null default 'requested',
  requested_at  timestamptz not null default now(),
  processed_at  timestamptz,
  note          text
);
alter table public.payouts enable row level security;

-- ------------------------------------------------------------
-- 6. Reviews + Disputes + Messages + Notifications
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  buyer_id    uuid not null references auth.users(id),
  seller_id   uuid not null references auth.users(id),
  listing_id  uuid not null references public.listings(id),
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (order_id, buyer_id)
);
alter table public.reviews enable row level security;

do $$ begin
  create type public.dispute_status as enum
    ('open','investigating','resolved_buyer','resolved_seller','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.disputes (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  opened_by    uuid not null references auth.users(id),
  reason       text not null,
  status       public.dispute_status not null default 'open',
  resolution   text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
alter table public.disputes enable row level security;

create table if not exists public.message_threads (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.thread_participants (
  thread_id uuid references public.message_threads(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  primary key (thread_id, user_id)
);
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.message_threads(id) on delete cascade,
  sender_id  uuid not null references auth.users(id),
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.message_threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages enable row level security;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

-- ------------------------------------------------------------
-- 7. Subscriptions, Boosts, Coupons, Tickets
-- ------------------------------------------------------------
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plan                text not null check (plan in ('basic','pro','elite')),
  status              text not null check (status in ('active','cancelled','past_due')),
  current_period_end  timestamptz not null,
  provider_ref        text
);
alter table public.subscriptions enable row level security;

create table if not exists public.boosts (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tier        text not null check (tier in ('feature','highlight','homepage')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  cost_cents  int not null
);
alter table public.boosts enable row level security;

create table if not exists public.coupons (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid references auth.users(id) on delete cascade,
  code              text unique not null,
  percent_off       int check (percent_off between 1 and 100),
  amount_off_cents  int,
  expires_at        timestamptz,
  max_uses          int,
  uses              int not null default 0
);
alter table public.coupons enable row level security;

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  status     text not null check (status in ('open','pending','resolved','closed')) default 'open',
  priority   text not null check (priority in ('low','normal','high','urgent')) default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

-- ------------------------------------------------------------
-- 8. RLS Policies (core subset — extend per feature)
-- ------------------------------------------------------------

-- profiles: self read/write, everyone reads public fields
drop policy if exists "profiles_self_rw"   on public.profiles;
drop policy if exists "profiles_public_r" on public.profiles;
create policy "profiles_self_rw" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_public_r" on public.profiles for select using (true);

-- user_roles: only staff/admin manage; users see their own
drop policy if exists "user_roles_self_r" on public.user_roles;
drop policy if exists "user_roles_admin_rw" on public.user_roles;
create policy "user_roles_self_r" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "user_roles_admin_rw" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- categories: public read, staff write
drop policy if exists "categories_public_r" on public.categories;
drop policy if exists "categories_staff_w"  on public.categories;
create policy "categories_public_r" on public.categories for select using (true);
create policy "categories_staff_w"  on public.categories
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- listings: public can read active listings; sellers manage own; staff manage all
drop policy if exists "listings_public_r" on public.listings;
drop policy if exists "listings_seller_w" on public.listings;
drop policy if exists "listings_staff_w"  on public.listings;
create policy "listings_public_r" on public.listings
  for select using (status = 'active' or auth.uid() = seller_id or public.is_staff(auth.uid()));
create policy "listings_seller_w" on public.listings
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "listings_staff_w"  on public.listings
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- orders: buyer or seller of the row, plus staff
drop policy if exists "orders_party_r" on public.orders;
drop policy if exists "orders_staff_r" on public.orders;
create policy "orders_party_r" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "orders_staff_r" on public.orders
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- wallets & payouts & transactions: owner-only, staff full
drop policy if exists "wallets_owner_rw" on public.wallets;
create policy "wallets_owner_rw" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payouts_owner_rw" on public.payouts;
drop policy if exists "payouts_staff_rw" on public.payouts;
create policy "payouts_owner_rw" on public.payouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payouts_staff_rw" on public.payouts
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "transactions_owner_r" on public.transactions;
create policy "transactions_owner_r" on public.transactions
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));

-- reviews: public read, buyer write own
drop policy if exists "reviews_public_r" on public.reviews;
drop policy if exists "reviews_buyer_w"  on public.reviews;
create policy "reviews_public_r" on public.reviews for select using (true);
create policy "reviews_buyer_w"  on public.reviews
  for insert with check (auth.uid() = buyer_id);

-- disputes: parties + staff
drop policy if exists "disputes_party_rw" on public.disputes;
create policy "disputes_party_rw" on public.disputes
  for all using (auth.uid() = opened_by or public.is_staff(auth.uid()))
  with check (auth.uid() = opened_by or public.is_staff(auth.uid()));

-- messages: participants
drop policy if exists "msgs_participants_rw" on public.messages;
create policy "msgs_participants_rw" on public.messages
  for all using (exists (
    select 1 from public.thread_participants tp
    where tp.thread_id = thread_id and tp.user_id = auth.uid()
  ));

-- notifications: owner only
drop policy if exists "notif_owner_rw" on public.notifications;
create policy "notif_owner_rw" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions / boosts / coupons / tickets: owner + staff
drop policy if exists "subs_owner_rw" on public.subscriptions;
create policy "subs_owner_rw" on public.subscriptions
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));

drop policy if exists "boosts_owner_rw" on public.boosts;
create policy "boosts_owner_rw" on public.boosts
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));

drop policy if exists "coupons_owner_rw" on public.coupons;
create policy "coupons_owner_rw" on public.coupons
  for all using (auth.uid() = seller_id or public.is_staff(auth.uid()))
  with check (auth.uid() = seller_id or public.is_staff(auth.uid()));

drop policy if exists "tickets_owner_rw" on public.support_tickets;
create policy "tickets_owner_rw" on public.support_tickets
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_staff(auth.uid()));
