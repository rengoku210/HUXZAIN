-- Migration: Create unified payment_proofs table
-- Date: 2026-05-27

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL, -- nullable for subscription
  payment_type TEXT NOT NULL CHECK (payment_type IN ('listing', 'subscription')),
  amount NUMERIC(10, 2) NOT NULL,
  screenshot_url TEXT NOT NULL,
  payment_reference TEXT, -- e.g. order_id or transaction reference
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert unified proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Allow users to view own unified proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Allow staff to select all unified proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Allow staff to update unified proofs" ON public.payment_proofs;

-- Create policies using public.is_staff() checker
CREATE POLICY "Allow authenticated users to insert unified proofs" 
ON public.payment_proofs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view own unified proofs" 
ON public.payment_proofs 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow staff to select all unified proofs" 
ON public.payment_proofs 
FOR SELECT 
TO authenticated 
USING (public.is_staff() OR auth.uid() = user_id);

CREATE POLICY "Allow staff to update unified proofs" 
ON public.payment_proofs 
FOR UPDATE 
TO authenticated 
USING (public.is_staff())
WITH CHECK (public.is_staff());
