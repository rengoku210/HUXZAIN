-- Migration: HX-010 Category Field & Engine configurations for Module C
-- Creates category_engine_config and category_field_config tables with RLS and seeds.

-- 1. category_engine_config
create table if not exists public.category_engine_config (
  category_slug text primary key references public.categories(slug) on delete cascade,
  delivery_type text not null constraint delivery_type_check check (delivery_type in ('instant', 'manual', 'hybrid')),
  delivery_engine text not null constraint delivery_engine_check check (delivery_engine in (
    'Instant', 'Credentials', 'Manual', 'Session', 'Booking', 'Hybrid', 'Custom'
  )),
  updated_at timestamptz not null default now()
);

-- RLS for category_engine_config
alter table public.category_engine_config enable row level security;

drop policy if exists category_engine_config_public_read on public.category_engine_config;
create policy category_engine_config_public_read
  on public.category_engine_config for select using (true);

drop policy if exists category_engine_config_admin_write on public.category_engine_config;
create policy category_engine_config_admin_write
  on public.category_engine_config for all
  using (public.is_staff())
  with check (public.is_staff());

-- 2. category_field_config
create table if not exists public.category_field_config (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.category_engine_config(category_slug) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null constraint field_type_check check (field_type in (
    'text', 'textarea', 'number', 'email', 'password', 'url', 'select', 'multiselect', 'checkbox', 'radio', 'tags', 'file', 'image', 'date', 'datetime', 'boolean'
  )),
  is_required boolean not null default false,
  validation_rules jsonb not null default '{}'::jsonb, -- e.g. {"min": 1, "max": 100, "regex": "^[A-Za-z0-9]+$", "allowed_values": ["Asia", "Europe"], "custom_error": "Required field"}
  placeholder text,
  help_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_field_key_unique unique (category_slug, field_key)
);

-- RLS for category_field_config
alter table public.category_field_config enable row level security;

drop policy if exists category_field_config_public_read on public.category_field_config;
create policy category_field_config_public_read
  on public.category_field_config for select using (true);

drop policy if exists category_field_config_admin_write on public.category_field_config;
create policy category_field_config_admin_write
  on public.category_field_config for all
  using (public.is_staff())
  with check (public.is_staff());

-- 3. Seed category_engine_config
insert into public.category_engine_config (category_slug, delivery_type, delivery_engine) values
  ('accounts', 'hybrid', 'Credentials'),
  ('boosting', 'manual', 'Custom'),
  ('currency', 'manual', 'Manual'),
  ('coaching', 'manual', 'Session'),
  ('gift-cards', 'instant', 'Instant'),
  ('software-tools', 'instant', 'Instant'),
  ('subscriptions', 'instant', 'Instant')
on conflict (category_slug) do update
set delivery_type = excluded.delivery_type, delivery_engine = excluded.delivery_engine;

-- 4. Seed category_field_config for accounts (Gaming Accounts)
insert into public.category_field_config (category_slug, field_key, label, field_type, is_required, validation_rules, placeholder, help_text, sort_order) values
  ('accounts', 'game', 'Game Name', 'text', true, '{"group": "Game Details"}'::jsonb, 'e.g. Valorant, BGMI', 'Select the game this account belongs to', 10),
  ('accounts', 'region', 'Region', 'select', true, '{"allowed_values": ["Global", "Asia", "Europe", "North America", "South America", "Middle East", "India"], "group": "Game Details"}'::jsonb, 'Select region', 'Geographic region of the game server', 20),
  ('accounts', 'rank', 'Rank', 'text', true, '{"group": "Game Details"}'::jsonb, 'e.g. Diamond II, Conqueror', 'Current in-game rank of the account', 30),
  ('accounts', 'platform', 'Platform', 'text', true, '{"group": "Game Details"}'::jsonb, 'e.g. PC, PS5, Xbox', 'Device platform', 40),
  ('accounts', 'level', 'Account Level', 'number', true, '{"min": 1, "group": "Game Details"}'::jsonb, 'e.g. 150', 'Account level/XP progression', 50),
  
  ('accounts', 'skinsCount', 'Skins Count', 'number', true, '{"min": 0, "pricing_hint": "Accounts with >50 skins typically sell for 20% higher prices", "group": "Inventory & Proofs"}'::jsonb, 'e.g. 85', 'Number of weapon/character skins unlocked', 60),
  ('accounts', 'rareItems', 'Rare Skins/Items', 'textarea', true, '{"group": "Inventory & Proofs"}'::jsonb, 'List any rare skins or cosmetics...', 'Separated by commas', 70),
  ('accounts', 'linkedAccounts', 'Linked Accounts', 'text', true, '{"group": "Inventory & Proofs"}'::jsonb, 'e.g. Steam, Riot, Game Center', 'Third-party accounts linked', 80),
  
  ('accounts', 'firstOwnerStatus', 'Original/First Owner', 'checkbox', false, '{"group": "Ownership Settings"}'::jsonb, null, 'Are you the original owner of this account?', 90),
  ('accounts', 'originalEmailIncluded', 'Original Email Included', 'checkbox', false, '{"depends_on": {"field": "firstOwnerStatus", "value": true}, "group": "Ownership Settings"}'::jsonb, null, 'Does the listing include the original creation email?', 100),
  ('accounts', 'emailChangeable', 'Email Changeable', 'checkbox', false, '{"group": "Ownership Settings"}'::jsonb, null, 'Can the primary email of the account be changed immediately?', 110),
  
  ('accounts', 'warrantyInformation', 'Warranty Information', 'text', true, '{"pricing_hint": "Offers with at least 7 days warranty have 40% higher buyer confidence", "group": "Pricing & Warranty"}'::jsonb, 'e.g. 7 Days, Lifetime, None', 'Protection warranty duration', 120),
  
  ('accounts', 'accountCreationDate', 'Account Creation Date', 'date', true, '{"group": "Account History"}'::jsonb, null, 'Date when the game account was created', 130),
  ('accounts', 'recoveryHistory', 'Recovery History', 'text', true, '{"group": "Account History"}'::jsonb, 'e.g. Never recovered, recovered once in 2024', 'Historical details of account recoveries', 140),
  ('accounts', 'purchaseReceiptsAvailable', 'Purchase Receipts Available', 'checkbox', false, '{"group": "Account History"}'::jsonb, null, 'Are payment receipt invoices available?', 150)
on conflict (category_slug, field_key) do update
set label = excluded.label, field_type = excluded.field_type, is_required = excluded.is_required, validation_rules = excluded.validation_rules, placeholder = excluded.placeholder, help_text = excluded.help_text, sort_order = excluded.sort_order;
