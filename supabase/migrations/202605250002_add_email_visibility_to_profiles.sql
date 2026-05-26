alter table public.profiles add column if not exists email_visibility text default 'private';
