-- HX-007 / Module B: Commission + Escrow + Settlement + Buyer-Protection config engine.
--
-- Every financial value on HUXZAIN becomes DB-driven and Super-Admin editable.
-- The engine (src/lib/finance) reads these tables; a code-level default snapshot
-- (finance-config.ts DOCUMENTED_*) mirrors these EXACT seed values so the app
-- still functions before this migration is applied, and the DB rows OVERRIDE the
-- defaults once present. Seed values are transcribed line-by-line from:
--   • "Seller subscription plans full detail.docx" (authoritative pricing doc)
--   • "Category and huxzain features.docx" (Buyer Protection section)
-- NOTHING here is invented. Undefined values (processing fee, >₹1,00,000 non-gaming
-- protection, boosting-category rate) are intentionally NOT seeded — see walkthrough.
--
-- Config is keyed by a CANONICAL CATEGORY KEY (not the categories.slug FK) so all 10
-- documented categories have rates now, and any future category (Module H) simply
-- maps its slug to one of these keys via src/lib/finance/finance-config.ts.
-- Idempotent throughout (create if not exists + ON CONFLICT DO NOTHING).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. commission_config  (category_key × plan → commission %)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.commission_config (
  category_key       text not null,
  plan               text not null,
  commission_percent numeric(6,3) not null,
  updated_at         timestamptz not null default now(),
  primary key (category_key, plan),
  constraint commission_plan_check check (plan in ('standard','pro','elite','enterprise')),
  constraint commission_pct_check  check (commission_percent >= 0 and commission_percent <= 100)
);

insert into public.commission_config (category_key, plan, commission_percent) values
  ('gaming_accounts','standard',18),   ('gaming_accounts','pro',16),   ('gaming_accounts','elite',14),   ('gaming_accounts','enterprise',12),
  ('in_game_credits','standard',9),    ('in_game_credits','pro',8),    ('in_game_credits','elite',7),    ('in_game_credits','enterprise',6),
  ('gift_cards','standard',5),         ('gift_cards','pro',4.5),       ('gift_cards','elite',4),         ('gift_cards','enterprise',3),
  ('software_digital_tools','standard',12),('software_digital_tools','pro',11),('software_digital_tools','elite',10),('software_digital_tools','enterprise',8),
  ('coaching_services','standard',20), ('coaching_services','pro',18), ('coaching_services','elite',16), ('coaching_services','enterprise',14),
  ('game_buddy_services','standard',25),('game_buddy_services','pro',22),('game_buddy_services','elite',20),('game_buddy_services','enterprise',18),
  ('freelance_services','standard',20),('freelance_services','pro',18),('freelance_services','elite',16),('freelance_services','enterprise',14),
  ('digital_products','standard',10),  ('digital_products','pro',9),   ('digital_products','elite',8),   ('digital_products','enterprise',7),
  ('subscription_services','standard',5),('subscription_services','pro',4),('subscription_services','elite',3.5),('subscription_services','enterprise',3),
  ('advertising_promotion_services','standard',10),('advertising_promotion_services','pro',9),('advertising_promotion_services','elite',8),('advertising_promotion_services','enterprise',7)
on conflict (category_key, plan) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. escrow_config  (category_key × plan → escrow hold days; 0 = Instant)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.escrow_config (
  category_key text not null,
  plan         text not null,
  hold_days    int not null,
  updated_at   timestamptz not null default now(),
  primary key (category_key, plan),
  constraint escrow_plan_check check (plan in ('standard','pro','elite','enterprise')),
  constraint escrow_days_check check (hold_days >= 0)
);

insert into public.escrow_config (category_key, plan, hold_days) values
  ('gaming_accounts','standard',14),   ('gaming_accounts','pro',10),   ('gaming_accounts','elite',7),   ('gaming_accounts','enterprise',5),
  ('in_game_credits','standard',3),    ('in_game_credits','pro',2),    ('in_game_credits','elite',1),   ('in_game_credits','enterprise',0),
  ('gift_cards','standard',3),         ('gift_cards','pro',2),         ('gift_cards','elite',1),        ('gift_cards','enterprise',0),
  ('software_digital_tools','standard',7),('software_digital_tools','pro',5),('software_digital_tools','elite',3),('software_digital_tools','enterprise',2),
  ('coaching_services','standard',3),  ('coaching_services','pro',2),  ('coaching_services','elite',1), ('coaching_services','enterprise',0),
  ('game_buddy_services','standard',3),('game_buddy_services','pro',2),('game_buddy_services','elite',1),('game_buddy_services','enterprise',0),
  ('freelance_services','standard',7), ('freelance_services','pro',5), ('freelance_services','elite',3),('freelance_services','enterprise',2),
  ('digital_products','standard',7),   ('digital_products','pro',5),   ('digital_products','elite',3),  ('digital_products','enterprise',2),
  ('subscription_services','standard',3),('subscription_services','pro',2),('subscription_services','elite',1),('subscription_services','enterprise',0),
  ('advertising_promotion_services','standard',3),('advertising_promotion_services','pro',2),('advertising_promotion_services','elite',1),('advertising_promotion_services','enterprise',0)
on conflict (category_key, plan) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. settlement_config  (plan → settlement processing days + withdrawal rule)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.settlement_config (
  plan                     text primary key,
  processing_days          int not null,
  withdrawal_request_count int not null,
  withdrawal_period_days   int not null,
  updated_at               timestamptz not null default now(),
  constraint settlement_plan_check check (plan in ('standard','pro','elite','enterprise')),
  constraint settlement_days_check check (processing_days >= 0 and withdrawal_request_count > 0 and withdrawal_period_days > 0)
);

insert into public.settlement_config (plan, processing_days, withdrawal_request_count, withdrawal_period_days) values
  ('standard',7,1,10),
  ('pro',4,2,10),
  ('elite',3,1,5),
  ('enterprise',2,1,2)
on conflict (plan) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. buyer_protection_config  (range-based fee; scope = general | gaming)
--    Buyer-selected at checkout; only for eligible orders ≥ min order (₹1,000).
--    NOT seeded above ₹1,00,000 for 'general' (client value undefined — flagged).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.buyer_protection_config (
  id             uuid primary key default gen_random_uuid(),
  scope          text not null,
  min_amount_inr int not null,
  max_amount_inr int,               -- null = no upper bound
  fee_percent    numeric(6,3),      -- exactly one of fee_percent / fee_flat_inr is set
  fee_flat_inr   int,
  updated_at     timestamptz not null default now(),
  constraint bp_scope_check check (scope in ('general','gaming')),
  constraint bp_fee_check   check ((fee_percent is not null) <> (fee_flat_inr is not null))
);

insert into public.buyer_protection_config (scope, min_amount_inr, max_amount_inr, fee_percent, fee_flat_inr) values
  -- General categories (all except Gaming Accounts)
  ('general',1000,7000,5,null),
  ('general',7001,20000,null,499),
  ('general',20001,50000,null,799),
  ('general',50001,100000,null,999),
  -- Gaming Accounts: 5% flat, any order value ≥ ₹1,000 (no upper bound)
  ('gaming',1000,null,5,null)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. platform_settings key 'transaction_fees' — misc finance knobs
--    processing_fee_inr defaults 0 (undefined in docs — Super-Admin editable).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.platform_settings (key, value) values
  ('transaction_fees', '{"processing_fee_inr": 0, "buyer_protection_min_order_inr": 1000, "processing_fee_payer": "buyer"}'::jsonb)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. orders — additive finance columns (idempotent; no data loss)
--    commission_inr / seller_payout_inr are already written by the app; declare
--    them explicitly + add commission %, category key and buyer-protection fields.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists commission_inr            numeric(12,2),
  add column if not exists seller_payout_inr         numeric(12,2),
  add column if not exists commission_percent        numeric(6,3),
  add column if not exists category_key              text,
  add column if not exists buyer_protection_selected boolean not null default false,
  add column if not exists buyer_protection_fee_inr  numeric(12,2) not null default 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — config is readable by any authenticated user (the Transaction Summary
-- panel needs it) and writable only by staff (Super-Admin). Mirrors HX-002.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['commission_config','escrow_config','settlement_config','buyer_protection_config']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (auth.role() = ''authenticated'' or public.is_staff())', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;
