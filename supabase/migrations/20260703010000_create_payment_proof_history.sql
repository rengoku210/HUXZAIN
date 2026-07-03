-- Migration: Create payment_proof_history table for archiving screenshot versions
-- Date: 2026-07-03

CREATE TABLE IF NOT EXISTS public.payment_proof_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_proof_id UUID NOT NULL REFERENCES public.payment_proofs(id) ON DELETE CASCADE,
  version INT NOT NULL,
  screenshot_url TEXT NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_proof_history ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist
DROP POLICY IF EXISTS "Allow users to view own payment proof history" ON public.payment_proof_history;
DROP POLICY IF EXISTS "Allow staff to view all payment proof history" ON public.payment_proof_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert history" ON public.payment_proof_history;

-- Create policies
CREATE POLICY "Allow users to view own payment proof history"
ON public.payment_proof_history
FOR SELECT
TO authenticated
USING (auth.uid() = uploader_id);

CREATE POLICY "Allow staff to view all payment proof history"
ON public.payment_proof_history
FOR SELECT
TO authenticated
USING (public.is_staff() OR auth.uid() = uploader_id);

CREATE POLICY "Allow authenticated users to insert history"
ON public.payment_proof_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploader_id OR public.is_staff());
