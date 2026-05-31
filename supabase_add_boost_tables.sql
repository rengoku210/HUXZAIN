-- 1. payment_proofs
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  amount integer not null,
  screenshot_url text not null,
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  payment_type text not null,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_proofs enable row level security;
drop policy if exists payment_proofs_self on public.payment_proofs;
create policy payment_proofs_self on public.payment_proofs for all using (auth.uid() = user_id or auth.uid() = buyer_id or public.is_staff());

-- 2. listing_boosts
create table if not exists public.listing_boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  boost_type text not null, -- 'push_to_top', 'homepage_spotlight', 'category_banner', 'featured_newsletter'
  amount_inr integer not null,
  duration_days integer not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.listing_boosts enable row level security;
drop policy if exists listing_boosts_read on public.listing_boosts;
create policy listing_boosts_read on public.listing_boosts for select using (true);
drop policy if exists listing_boosts_self on public.listing_boosts;
create policy listing_boosts_self on public.listing_boosts for all using (auth.uid() = seller_id or public.is_staff());
