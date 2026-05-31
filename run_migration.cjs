const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing keys.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sql = `
-- 1. wallets
create table if not exists public.wallets (
  id uuid primary key references public.profiles(id) on delete cascade,
  available_balance integer not null default 0,
  pending_balance integer not null default 0,
  total_earnings integer not null default 0,
  withdrawn_amount integer not null default 0,
  last_payout_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.wallets enable row level security;
drop policy if exists wallets_self on public.wallets;
create policy wallets_self on public.wallets for all using (auth.uid() = id or public.is_staff());

-- 2. wallet_transactions
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'sale', 'topup', 'withdrawal', 'refund'
  amount integer not null,
  status text not null default 'completed', -- 'pending', 'completed', 'failed', 'rejected'
  reference_id text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;
drop policy if exists transactions_self on public.wallet_transactions;
create policy transactions_self on public.wallet_transactions for all using (auth.uid() = wallet_id or public.is_staff());

-- 3. withdrawals
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  method text not null, -- 'upi' or 'bank_transfer'
  upi_id text,
  upi_qr_url text,
  account_holder text,
  account_number text,
  ifsc_code text,
  status text not null default 'pending', -- 'pending', 'completed', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.withdrawals enable row level security;
drop policy if exists withdrawals_self on public.withdrawals;
create policy withdrawals_self on public.withdrawals for all using (auth.uid() = user_id or public.is_staff());

-- 4. coupons & user_coupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  reward_type text not null default 'pro_trial',
  reward_duration_days integer not null default 3,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
drop policy if exists coupons_read on public.coupons;
create policy coupons_read on public.coupons for select using (true);

-- Seed default WELCOME coupon if not exists
insert into public.coupons (code, reward_type, reward_duration_days)
values ('WELCOME', 'pro_trial', 3)
on conflict (code) do nothing;

create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coupon_code text not null,
  used_at timestamptz not null default now(),
  unique (user_id, coupon_code)
);

alter table public.user_coupons enable row level security;
drop policy if exists user_coupons_self on public.user_coupons;
create policy user_coupons_self on public.user_coupons for all using (auth.uid() = user_id or public.is_staff());

-- 5. boosts
create table if not exists public.boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  type text not null, -- 'homepage_spotlight', 'category_banner', 'featured_newsletter', 'push_to_top'
  price_inr integer not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.boosts enable row level security;
drop policy if exists boosts_self on public.boosts;
create policy boosts_self on public.boosts for all using (auth.uid() = user_id or public.is_staff());

-- 6. verifications
create table if not exists public.verifications (
  id uuid primary key references public.profiles(id) on delete cascade,
  government_id_url text,
  address_proof_url text,
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verifications enable row level security;
drop policy if exists verifications_self on public.verifications;
create policy verifications_self on public.verifications for all using (auth.uid() = id or public.is_staff());

-- 7. seller_customizations
create table if not exists public.seller_customizations (
  id uuid primary key references public.profiles(id) on delete cascade,
  logo_url text,
  banner_url text,
  theme_color text,
  accent_color text,
  storefront_banner_customization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_customizations enable row level security;
drop policy if exists seller_customizations_all on public.seller_customizations;
create policy seller_customizations_all on public.seller_customizations for all using (true);

-- 8. support_tickets & support_ticket_messages
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null, -- 'bug', 'technical_issue', 'billing', 'top_up'
  status text not null default 'open', -- 'open', 'closed'
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
drop policy if exists tickets_self on public.support_tickets;
create policy tickets_self on public.support_tickets for all using (auth.uid() = user_id or public.is_staff());

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  system_event boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.support_ticket_messages enable row level security;
drop policy if exists messages_self on public.support_ticket_messages;
create policy messages_self on public.support_ticket_messages for all using (
  exists (select 1 from public.support_tickets where id = ticket_id and (user_id = auth.uid() or public.is_staff()))
);

-- 9. active_sessions
create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device text not null,
  browser text not null,
  ip_address text,
  last_active timestamptz not null default now()
);

alter table public.active_sessions enable row level security;
drop policy if exists sessions_self on public.active_sessions;
create policy sessions_self on public.active_sessions for all using (auth.uid() = user_id or public.is_staff());

-- 10. Add subscription_expires_at to profiles if not exists
alter table public.profiles add column if not exists subscription_expires_at timestamptz;
`;

async function run() {
  console.log("Running SQL migrations...");
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully:", data);
  }
}

run();
