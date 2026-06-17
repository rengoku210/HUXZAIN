-- P0-3: Encrypt listing_credentials at rest + reveal/access logging.
--
-- Previously listing_credentials stored login_id/password/recovery details as
-- plaintext TEXT (created out-of-migration by scratch/create_listing_credentials.cjs).
-- This migration:
--   1. Folds the table into version control (idempotent CREATE).
--   2. Adds pgp_sym_encrypt-backed BYTEA columns and backfills from plaintext.
--   3. Drops the plaintext columns.
--   4. Adds a credential_access_log table.
--   5. Exposes SECURITY DEFINER set/reveal RPCs; reveal enforces access AND
--      writes an access-log row on every successful decrypt.
--
-- KEY MANAGEMENT (must be configured before this works at runtime):
--   The symmetric key is read from a Postgres GUC: current_setting('app.credential_key').
--   Set it once at the database level (NOT in a migration / NOT in VCS), e.g. via
--   the Supabase dashboard SQL editor as a superuser:
--       ALTER DATABASE postgres SET app.credential_key = '<long-random-secret>';
--   Then reconnect. resolve via current_setting('app.credential_key', true).
--   Until the key is set, reveal/set RPCs raise a clear error rather than storing
--   plaintext.

create extension if not exists pgcrypto;

-- 1. Table (idempotent; matches the prior scratch script shape)
create table if not exists public.listing_credentials (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  login_id text,
  password text,
  instructions text,
  recovery_details text,
  email_transfer_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_credentials enable row level security;

-- 2. Encrypted columns
alter table public.listing_credentials
  add column if not exists login_id_enc bytea,
  add column if not exists password_enc bytea,
  add column if not exists recovery_details_enc bytea,
  add column if not exists email_transfer_details_enc bytea;

-- Helper to fetch the key or fail loudly (never silently store plaintext).
create or replace function public._credential_key()
returns text language plpgsql stable as $$
declare k text;
begin
  k := current_setting('app.credential_key', true);
  if k is null or length(k) = 0 then
    raise exception 'app.credential_key is not configured; refusing to encrypt/decrypt credentials';
  end if;
  return k;
end;
$$;

-- 3. Backfill existing plaintext into encrypted columns, then null the plaintext.
--    Guarded so it is a no-op if the key is unset (migration still applies; you
--    re-run the backfill after setting the key).
do $$
declare k text;
begin
  k := current_setting('app.credential_key', true);
  if k is null or length(k) = 0 then
    raise notice 'app.credential_key unset: skipping credential backfill. Set the key and run backfill_listing_credentials().';
    return;
  end if;
  update public.listing_credentials set
    login_id_enc = case when login_id is not null then pgp_sym_encrypt(login_id, k) else login_id_enc end,
    password_enc = case when password is not null then pgp_sym_encrypt(password, k) else password_enc end,
    recovery_details_enc = case when recovery_details is not null then pgp_sym_encrypt(recovery_details, k) else recovery_details_enc end,
    email_transfer_details_enc = case when email_transfer_details is not null then pgp_sym_encrypt(email_transfer_details, k) else email_transfer_details_enc end;
  -- Scrub plaintext now that ciphertext exists.
  update public.listing_credentials set
    login_id = null, password = null, recovery_details = null, email_transfer_details = null;
end $$;

-- Re-runnable backfill (call after the key is configured if it was unset at migrate time).
create or replace function public.backfill_listing_credentials()
returns void language plpgsql security definer set search_path = public as $$
declare k text := public._credential_key();
begin
  update public.listing_credentials set
    login_id_enc = case when login_id is not null then pgp_sym_encrypt(login_id, k) else login_id_enc end,
    password_enc = case when password is not null then pgp_sym_encrypt(password, k) else password_enc end,
    recovery_details_enc = case when recovery_details is not null then pgp_sym_encrypt(recovery_details, k) else recovery_details_enc end,
    email_transfer_details_enc = case when email_transfer_details is not null then pgp_sym_encrypt(email_transfer_details, k) else email_transfer_details_enc end;
  update public.listing_credentials set
    login_id = null, password = null, recovery_details = null, email_transfer_details = null;
end $$;

-- 4. Access log
create table if not exists public.credential_access_log (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  accessed_by uuid references auth.users(id),
  access_type text not null default 'reveal',
  accessed_at timestamptz not null default now()
);
alter table public.credential_access_log enable row level security;
drop policy if exists credential_access_log_staff_read on public.credential_access_log;
create policy credential_access_log_staff_read on public.credential_access_log
  for select to authenticated using (public.is_staff());

create index if not exists idx_credential_access_log_listing on public.credential_access_log(listing_id, accessed_at desc);

-- 5a. Determine whether the current user may see credentials for a listing.
create or replace function public._can_access_credentials(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() = (select seller_id from public.listings where id = p_listing_id)
    or exists (
      select 1 from public.orders
      where listing_id = p_listing_id
        and buyer_id = auth.uid()
        and status::text in ('paid','buyer_reviewing','completed')
    )
    or public.is_staff();
$$;

-- 5b. Seller/staff write credentials (encrypts server-side).
create or replace function public.set_listing_credentials(
  p_listing_id uuid,
  p_login_id text,
  p_password text,
  p_instructions text default null,
  p_recovery_details text default null,
  p_email_transfer_details text default null
) returns void language plpgsql security definer set search_path = public as $$
declare k text := public._credential_key();
begin
  if not (auth.uid() = (select seller_id from public.listings where id = p_listing_id) or public.is_staff()) then
    raise exception 'not authorized to set credentials for this listing';
  end if;
  insert into public.listing_credentials as lc (
    listing_id, login_id_enc, password_enc, instructions, recovery_details_enc, email_transfer_details_enc, updated_at
  ) values (
    p_listing_id,
    case when p_login_id is not null then pgp_sym_encrypt(p_login_id, k) end,
    case when p_password is not null then pgp_sym_encrypt(p_password, k) end,
    p_instructions,
    case when p_recovery_details is not null then pgp_sym_encrypt(p_recovery_details, k) end,
    case when p_email_transfer_details is not null then pgp_sym_encrypt(p_email_transfer_details, k) end,
    now()
  )
  on conflict (listing_id) do update set
    login_id_enc = excluded.login_id_enc,
    password_enc = excluded.password_enc,
    instructions = excluded.instructions,
    recovery_details_enc = excluded.recovery_details_enc,
    email_transfer_details_enc = excluded.email_transfer_details_enc,
    updated_at = now();
end $$;

-- 5c. Reveal: enforces access, decrypts, and logs the reveal.
create or replace function public.reveal_listing_credentials(p_listing_id uuid)
returns table (
  login_id text,
  password text,
  instructions text,
  recovery_details text,
  email_transfer_details text
) language plpgsql security definer set search_path = public as $$
declare k text := public._credential_key();
begin
  if not public._can_access_credentials(p_listing_id) then
    raise exception 'not authorized to reveal credentials for this listing';
  end if;

  insert into public.credential_access_log(listing_id, accessed_by, access_type)
  values (p_listing_id, auth.uid(), 'reveal');

  return query
    select
      pgp_sym_decrypt(lc.login_id_enc, k),
      pgp_sym_decrypt(lc.password_enc, k),
      lc.instructions,
      pgp_sym_decrypt(lc.recovery_details_enc, k),
      pgp_sym_decrypt(lc.email_transfer_details_enc, k)
    from public.listing_credentials lc
    where lc.listing_id = p_listing_id;
end $$;

-- Lock down the table itself: no direct row reads. All access goes through the
-- reveal RPC (which logs). Writers go through set_listing_credentials.
drop policy if exists "listing_credentials_select" on public.listing_credentials;
drop policy if exists "listing_credentials_insert" on public.listing_credentials;
drop policy if exists "listing_credentials_update" on public.listing_credentials;
drop policy if exists "listing_credentials_delete" on public.listing_credentials;
-- Intentionally NO direct SELECT policy: forces use of reveal_listing_credentials().
create policy listing_credentials_staff_manage on public.listing_credentials
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on function public.reveal_listing_credentials(uuid) from public;
grant execute on function public.reveal_listing_credentials(uuid) to authenticated;
revoke all on function public.set_listing_credentials(uuid,text,text,text,text,text) from public;
grant execute on function public.set_listing_credentials(uuid,text,text,text,text,text) to authenticated;
