-- Migration: Create subscription_payment_proofs table and add subscription_tier to profiles
-- Date: 2026-05-27

-- 1. Add subscription_tier column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'standard';

-- 2. Create subscription_payment_proofs table
CREATE TABLE IF NOT EXISTS public.subscription_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_plan TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  screenshot_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.subscription_payment_proofs ENABLE ROW LEVEL SECURITY;

-- 4. Drop policies if exist to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert payment proofs" ON public.subscription_payment_proofs;
DROP POLICY IF EXISTS "Allow users to view own payment proofs" ON public.subscription_payment_proofs;
DROP POLICY IF EXISTS "Allow staff to select all payment proofs" ON public.subscription_payment_proofs;
DROP POLICY IF EXISTS "Allow staff to update payment proofs" ON public.subscription_payment_proofs;

-- 5. Create clean, non-conflicting policies
-- Standard users can insert their own proofs
CREATE POLICY "Allow authenticated users to insert payment proofs" 
ON public.subscription_payment_proofs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Standard users can view their own proofs
CREATE POLICY "Allow users to view own payment proofs" 
ON public.subscription_payment_proofs 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Staff can view all proofs
CREATE POLICY "Allow staff to select all payment proofs" 
ON public.subscription_payment_proofs 
FOR SELECT 
TO authenticated 
USING (public.is_staff() OR auth.uid() = user_id);

-- Staff can update (approve/reject) proofs
CREATE POLICY "Allow staff to update payment proofs" 
ON public.subscription_payment_proofs 
FOR UPDATE 
TO authenticated 
USING (public.is_staff())
WITH CHECK (public.is_staff());
