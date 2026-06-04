-- HUXZAIN core marketplace schema.
-- Canonical app fields: listings.price and listings.cover_image_url.
-- Compatibility fields: listings.price_cents and listings.cover_url.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('buyer', 'seller', 'moderator', 'staff', 'admin', 'super_admin', 'owner');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'active', 'hidden', 'flagged', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending_payment', 'pending', 'paid', 'delivering', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  country text,
  is_seller boolean not null default false,
  is_verified boolean not null default false,
  seller_approved boolean not null default true,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  price_cents integer generated always as ((round(price * 100))::integer) stored,
  currency text not null default 'USD',
  delivery_details text,
  delivery_time text,
  delivery_type text not null default 'manual',
  stock integer,
  status public.listing_status not null default 'active',
  featured boolean not null default false,
  cover_image_url text,
  cover_url text generated always as (cover_image_url) stored,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_seller_id_idx on public.listings(seller_id);
create index if not exists listings_category_id_idx on public.listings(category_id);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_featured_idx on public.listings(is_featured) where is_featured = true;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete restrict,
  qty integer not null default 1 check (qty > 0),
  amount_total numeric(12,2) not null check (amount_total >= 0),
  amount_cents integer generated always as ((round(amount_total * 100))::integer) stored,
  fee_cents integer not null default 0,
  currency text not null default 'USD',
  payment_method text not null default 'manual',
  status public.order_status not null default 'pending_payment',
  protection_until timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_seller_id_idx on public.orders(seller_id);
create index if not exists orders_listing_id_idx on public.orders(listing_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('charge', 'credit', 'payout', 'refund', 'fee')),
  amount_cents integer not null,
  amount numeric(12,2) generated always as ((amount_cents::numeric / 100)) stored,
  currency text not null default 'USD',
  ref text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cents integer not null default 0,
  pending_cents integer not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.screenshot_hashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid,
  hash text not null unique,
  path text,
  created_at timestamptz not null default now()
);

alter table public.payment_verifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists order_id uuid,
  add column if not exists transaction_id text,
  add column if not exists screenshot_url text,
  add column if not exists screenshot_hash text,
  add column if not exists status text not null default 'pending',
  add column if not exists amount numeric(12,2),
  add column if not exists ocr_result jsonb,
  add column if not exists fraud_score jsonb,
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.payment_verifications
    add constraint payment_verifications_order_fk
    foreign key (order_id) references public.orders(id) on delete cascade;
exception when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do update set email = excluded.email;
  insert into public.user_roles (user_id, role) values (new.id, 'buyer') on conflict do nothing;
  insert into public.wallets (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.has_role(target_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = target_role);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role::text in ('moderator', 'staff', 'admin', 'super_admin', 'owner'));
$$;

create or replace function public.sync_seller_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.role = 'seller' then
    update public.profiles set is_seller = true where id = new.user_id;
  elsif tg_op = 'DELETE' and old.role = 'seller' then
    update public.profiles set is_seller = exists (select 1 from public.user_roles where user_id = old.user_id and role = 'seller') where id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_seller_flag_insert on public.user_roles;
create trigger sync_seller_flag_insert after insert on public.user_roles for each row execute function public.sync_seller_flag();
drop trigger if exists sync_seller_flag_delete on public.user_roles;
create trigger sync_seller_flag_delete after delete on public.user_roles for each row execute function public.sync_seller_flag();
alter table public.categories add column if not exists sort integer not null default 0;

insert into public.categories (name, slug, sort) values
  ('Digital Products', 'digital-products', 10),
  ('Services', 'services', 20),
  ('Hosting', 'hosting', 30),
  ('SEO', 'seo', 40),
  ('Design', 'design', 50),
  ('Programming', 'programming', 60),
  ('Marketing', 'marketing', 70),
  ('Business', 'business', 80)
on conflict (slug) do update set name = excluded.name, sort = excluded.sort;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.screenshot_hashes enable row level security;
alter table public.payment_verifications enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles for update using (auth.uid() = id or public.is_staff()) with check (auth.uid() = id or public.is_staff());

drop policy if exists roles_read_own_or_staff on public.user_roles;
create policy roles_read_own_or_staff on public.user_roles for select using (auth.uid() = user_id or public.is_staff());
drop policy if exists roles_user_become_seller on public.user_roles;
create policy roles_user_become_seller on public.user_roles for insert with check (auth.uid() = user_id and role in ('buyer', 'seller'));
drop policy if exists roles_staff_manage on public.user_roles;
create policy roles_staff_manage on public.user_roles for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);
drop policy if exists categories_staff_write on public.categories;
create policy categories_staff_write on public.categories for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists listings_public_read_active on public.listings;
create policy listings_public_read_active on public.listings for select using (status = 'active' or seller_id = auth.uid() or public.is_staff());
drop policy if exists listings_seller_insert on public.listings;
create policy listings_seller_insert on public.listings for insert with check (seller_id = auth.uid() and public.has_role('seller'));
drop policy if exists listings_seller_update_own on public.listings;
create policy listings_seller_update_own on public.listings for update using (seller_id = auth.uid() or public.is_staff()) with check (seller_id = auth.uid() or public.is_staff());
drop policy if exists listings_seller_delete_own on public.listings;
create policy listings_seller_delete_own on public.listings for delete using (seller_id = auth.uid() or public.is_staff());

drop policy if exists orders_read_participants_or_staff on public.orders;
create policy orders_read_participants_or_staff on public.orders for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_staff());
drop policy if exists orders_buyer_insert on public.orders;
create policy orders_buyer_insert on public.orders for insert with check (buyer_id = auth.uid());
drop policy if exists orders_participant_update on public.orders;
create policy orders_participant_update on public.orders for update using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_staff()) with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_staff());

drop policy if exists transactions_read_own_or_staff on public.transactions;
create policy transactions_read_own_or_staff on public.transactions for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists transactions_insert_own_or_staff on public.transactions;
create policy transactions_insert_own_or_staff on public.transactions for insert with check (user_id = auth.uid() or public.is_staff());

drop policy if exists wallets_read_own_or_staff on public.wallets;
create policy wallets_read_own_or_staff on public.wallets for select using (id = auth.uid() or public.is_staff());
drop policy if exists wallets_staff_update on public.wallets;
create policy wallets_staff_update on public.wallets for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists disputes_read on public.disputes;
create policy disputes_read on public.disputes for select using (opened_by = auth.uid() or public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));
drop policy if exists disputes_open on public.disputes;
create policy disputes_open on public.disputes for insert with check (opened_by = auth.uid());
drop policy if exists disputes_staff_update on public.disputes;
create policy disputes_staff_update on public.disputes for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff on public.notifications for insert with check (public.is_staff());

drop policy if exists hashes_read on public.screenshot_hashes;
create policy hashes_read on public.screenshot_hashes for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists hashes_insert_own on public.screenshot_hashes;
create policy hashes_insert_own on public.screenshot_hashes for insert with check (user_id = auth.uid());

drop policy if exists payment_verifications_read on public.payment_verifications;
create policy payment_verifications_read on public.payment_verifications for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists payment_verifications_insert on public.payment_verifications;
create policy payment_verifications_insert on public.payment_verifications for insert with check (user_id = auth.uid());
drop policy if exists payment_verifications_staff_update on public.payment_verifications;
create policy payment_verifications_staff_update on public.payment_verifications for update using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('listing-images', 'listing-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists avatars_user_write on storage.objects;
create policy avatars_user_write on storage.objects for all using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists listing_images_public_read on storage.objects;
create policy listing_images_public_read on storage.objects for select using (bucket_id = 'listing-images');
drop policy if exists listing_images_seller_write on storage.objects;
create policy listing_images_seller_write on storage.objects for all using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists payment_proofs_read on storage.objects;
create policy payment_proofs_read on storage.objects for select using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
drop policy if exists payment_proofs_write on storage.objects;
create policy payment_proofs_write on storage.objects for insert with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
