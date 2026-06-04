-- Alter app_role enum to add new roles
-- In Postgres, ALTER TYPE ADD VALUE cannot be executed inside a transaction block (like a migration transaction),
-- but Supabase CLI runs migrations outside of a transaction or handles them, so let's add them.
-- If they already exist, we ignore the error.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'payment_reviewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispute_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'verification_officer';
