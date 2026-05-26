-- Migration: Fix Account & Profile Issues
-- 1. Ensure profiles table has all required columns
-- 2. Fix RLS policies for user_roles (Become Seller fix)
-- 3. Fix RLS policies for profiles (Profile Save fix)

-- 1. Ensure profiles columns exist
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'country') then
    alter table public.profiles add column country text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio') then
    alter table public.profiles add column bio text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email_visibility') then
    alter table public.profiles add column email_visibility text default 'private';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'display_name') then
    alter table public.profiles add column display_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'username') then
    alter table public.profiles add column username text;
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
end $$;

-- 2. Fix RLS for user_roles (Allow users to become sellers)
drop policy if exists "roles_user_become_seller" on public.user_roles;
drop policy if exists "roles_read_own_or_staff" on public.user_roles;

-- Allow users to see their own roles
create policy "roles_read_own" on public.user_roles
  for select using (auth.uid() = user_id);

-- Allow users to insert 'seller' or 'buyer' for themselves
create policy "roles_insert_self" on public.user_roles
  for insert with check (auth.uid() = user_id and role in ('buyer', 'seller'));

-- Allow staff to manage all roles
create policy "roles_staff_all" on public.user_roles
  for all using (public.is_staff()) with check (public.is_staff());

-- 3. Fix RLS for profiles (Allow users to update everything about themselves)
drop policy if exists "profiles_update_own_or_staff" on public.profiles;
drop policy if exists "profiles_read" on public.profiles;

-- Public read for profiles
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- Users can update their own profile
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Ensure staff can still update if needed
create policy "profiles_staff_update" on public.profiles
  for update using (public.is_staff()) with check (public.is_staff());

-- 4. Ensure sync_seller_flag trigger is active (matches current schema)
-- This ensures that when a 'seller' role is added, is_seller becomes true automatically.
create or replace function public.sync_seller_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.role = 'seller' then
    update public.profiles set is_seller = true where id = new.user_id;
  elsif tg_op = 'DELETE' and old.role = 'seller' then
    update public.profiles set is_seller = exists (
      select 1 from public.user_roles where user_id = old.user_id and role = 'seller'
    ) where id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_seller_flag_insert on public.user_roles;
create trigger sync_seller_flag_insert 
  after insert on public.user_roles 
  for each row execute function public.sync_seller_flag();

drop trigger if exists sync_seller_flag_delete on public.user_roles;
create trigger sync_seller_flag_delete 
  after delete on public.user_roles 
  for each row execute function public.sync_seller_flag();
