-- HUXZAIN Remote Supabase Database Migration
-- Copy and paste this complete SQL script into the SQL Editor of your Supabase Dashboard (https://supabase.com/dashboard/project/fqeoracqywgwbvwijwqq/sql)
-- Click 'Run' to execute.

-- 1. Create public.notifications Table if it does not exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recreate policies for public.notifications
DROP POLICY IF EXISTS notifications_read ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_staff ON public.notifications;
DROP POLICY IF EXISTS "Allow users to view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow staff to insert notifications" ON public.notifications;

CREATE POLICY "Allow users to view own notifications" 
ON public.notifications FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "Allow staff to insert notifications" 
ON public.notifications FOR INSERT TO authenticated 
WITH CHECK (public.is_staff());


-- 2. Add missing columns to public.profiles if they are missing
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT;


-- 3. Populate existing users' emails from auth.users to public.profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;


-- 4. Create trigger to automatically sync email from auth.users on signup/email update
CREATE OR REPLACE FUNCTION public.handle_sync_user_email()
RETURNS trigger SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  UPDATE public.profiles
  SET email = new.email
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_email();


-- 5. Force schema cache reload in PostgREST
NOTIFY pgrst, 'reload schema';
