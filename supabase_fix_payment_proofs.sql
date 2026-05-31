-- Add missing columns to payment_proofs
ALTER TABLE public.payment_proofs 
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS utr_reference text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS ai_score numeric,
  ADD COLUMN IF NOT EXISTS ai_risk_label text,
  ADD COLUMN IF NOT EXISTS ai_model_used text,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS ai_amount_match boolean,
  ADD COLUMN IF NOT EXISTS ai_timestamp_match text,
  ADD COLUMN IF NOT EXISTS ai_utr text,
  ADD COLUMN IF NOT EXISTS ai_authenticity_score numeric,
  ADD COLUMN IF NOT EXISTS ai_checked_at timestamptz;

-- Ensure orders table has urgent_delivery_fee (if not already there)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS urgent_delivery_fee integer default 0;
