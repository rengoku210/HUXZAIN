-- Migration: create_verification_history.sql
CREATE TABLE IF NOT EXISTS public.verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID REFERENCES payment_verifications(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- approve | reject | note
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
