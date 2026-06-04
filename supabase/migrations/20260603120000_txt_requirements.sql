-- 1. Extend profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;

-- 2. Extend orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending_cooling',
  ADD COLUMN IF NOT EXISTS inspection_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS cooling_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS withdrawal_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawal_expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_requirements_payload JSONB,
  ADD COLUMN IF NOT EXISTS delivery_payload JSONB,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivation_fee_inr INTEGER DEFAULT 0;

-- 3. Create login_logs table
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for login_logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_logs_self_or_staff ON public.login_logs;
CREATE POLICY login_logs_self_or_staff ON public.login_logs 
  FOR ALL USING (auth.uid() = user_id OR public.is_staff());

-- 4. Create staff_action_logs table
CREATE TABLE IF NOT EXISTS public.staff_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for staff_action_logs
ALTER TABLE public.staff_action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_action_logs_read ON public.staff_action_logs;
CREATE POLICY staff_action_logs_read ON public.staff_action_logs 
  FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS staff_action_logs_write ON public.staff_action_logs;
CREATE POLICY staff_action_logs_write ON public.staff_action_logs 
  FOR INSERT WITH CHECK (public.is_staff());

-- 5. Create policy_violations table
CREATE TABLE IF NOT EXISTS public.policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL, -- 'contact_sharing'
  message_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for policy_violations
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_violations_read ON public.policy_violations;
CREATE POLICY policy_violations_read ON public.policy_violations 
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff());
DROP POLICY IF EXISTS policy_violations_write ON public.policy_violations;
CREATE POLICY policy_violations_write ON public.policy_violations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
