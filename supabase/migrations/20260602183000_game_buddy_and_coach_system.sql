-- HUXZAIN Game Buddy + Coaching systems
-- Date: 2026-06-02

-- ------------------------------------------------------------
-- 0) Profile verification fields (used across seller, buddy, coach)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false;

-- ------------------------------------------------------------
-- 1) Game Buddies
-- ------------------------------------------------------------
do $$ begin
  create type public.game_buddy_status as enum ('draft','pending_verification','pending_review','active','rejected','paused');
exception when duplicate_object then null; end $$;

create table if not exists public.game_buddies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  display_name text not null,
  avatar_url text,
  date_of_birth date,
  country text,

  languages text[] not null default array[]::text[],
  primary_game text,
  additional_games text[] not null default array[]::text[],
  play_styles text[] not null default array[]::text[],
  availability text,
  voice_chat boolean not null default false,
  bio text,

  price_per_hour_inr numeric(12,2) not null default 0,
  why_choose text,

  -- verification flags required before publish
  email_verified boolean not null default false,
  phone_verified boolean not null default false,

  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  sessions_completed int not null default 0,

  status public.game_buddy_status not null default 'draft',
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_buddies_status_idx on public.game_buddies(status);
create index if not exists game_buddies_primary_game_idx on public.game_buddies(primary_game);
alter table public.game_buddies enable row level security;

-- ------------------------------------------------------------
-- 2) Coaches
-- ------------------------------------------------------------
do $$ begin
  create type public.coach_status as enum ('draft','pending_verification','pending_review','active','rejected','paused');
exception when duplicate_object then null; end $$;

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  display_name text not null,
  avatar_url text,
  country text,
  languages text[] not null default array[]::text[],
  years_experience int,

  primary_game text,
  secondary_games text[] not null default array[]::text[],
  current_rank text,
  highest_rank text,
  specialization text,

  coaching_categories text[] not null default array[]::text[],
  session_price_inr numeric(12,2) not null default 0,
  session_durations_min int[] not null default array[]::int[],
  availability text,

  intro text,
  why_choose text,
  experience text,

  -- proof uploads (stored in storage)
  highest_rank_screenshot_url text,
  achievement_screenshot_url text,
  tournament_screenshot_url text,
  achievements_text text,

  email_verified boolean not null default false,
  phone_verified boolean not null default false,

  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  sessions_completed int not null default 0,

  status public.coach_status not null default 'draft',
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coaches_status_idx on public.coaches(status);
create index if not exists coaches_primary_game_idx on public.coaches(primary_game);
alter table public.coaches enable row level security;

-- ------------------------------------------------------------
-- 3) RLS Policies
-- ------------------------------------------------------------
-- Game buddies: public can read active profiles; owner can CRUD; user can CRUD own row.
drop policy if exists game_buddies_public_read on public.game_buddies;
create policy game_buddies_public_read on public.game_buddies
  for select using (status = 'active' or public.is_staff() or user_id = auth.uid());

drop policy if exists game_buddies_owner_write on public.game_buddies;
create policy game_buddies_owner_write on public.game_buddies
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists game_buddies_user_write on public.game_buddies;
create policy game_buddies_user_write on public.game_buddies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coaches: public can read active; staff can CRUD; user can CRUD own.
drop policy if exists coaches_public_read on public.coaches;
create policy coaches_public_read on public.coaches
  for select using (status = 'active' or public.is_staff() or user_id = auth.uid());

drop policy if exists coaches_owner_write on public.coaches;
create policy coaches_owner_write on public.coaches
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists coaches_user_write on public.coaches;
create policy coaches_user_write on public.coaches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4) Storage buckets for proof uploads (private)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('buddy-proofs', 'buddy-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('coach-proofs', 'coach-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- user can write to their own folder; staff can read all
drop policy if exists buddy_proofs_read on storage.objects;
create policy buddy_proofs_read on storage.objects
  for select using (bucket_id = 'buddy-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
drop policy if exists buddy_proofs_write on storage.objects;
create policy buddy_proofs_write on storage.objects
  for insert with check (bucket_id = 'buddy-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists coach_proofs_read on storage.objects;
create policy coach_proofs_read on storage.objects
  for select using (bucket_id = 'coach-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
drop policy if exists coach_proofs_write on storage.objects;
create policy coach_proofs_write on storage.objects
  for insert with check (bucket_id = 'coach-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

