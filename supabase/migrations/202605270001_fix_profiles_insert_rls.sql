-- Migration: Ensure profiles insert RLS policy exists and is configured correctly
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
