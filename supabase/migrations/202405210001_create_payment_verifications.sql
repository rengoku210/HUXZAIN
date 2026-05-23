-- Migration: create_payment_verifications.sql
CREATE TABLE IF NOT EXISTS public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  screenshot_url TEXT NOT NULL,
  screenshot_hash TEXT NOT NULL,
  ocr_result JSONB,
  fraud_score INT,
  fraud_level TEXT,
  risk_tags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
