-- HUXZAIN AI Payment Verification Pipeline Migration
-- Copy and paste this complete SQL script into the SQL Editor of your Supabase Dashboard (https://supabase.com/dashboard/project/fqeoracqywgwbvwijwqq/sql)
-- Click 'Run' to execute.

-- 1. Add AI Verification Columns to public.payment_proofs Table
ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_risk_label TEXT,
  ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS ai_reason TEXT,
  ADD COLUMN IF NOT EXISTS ai_amount_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_timestamp_match TEXT,
  ADD COLUMN IF NOT EXISTS ai_utr TEXT,
  ADD COLUMN IF NOT EXISTS ai_authenticity_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMPTZ;

-- 2. Force schema cache reload in PostgREST
NOTIFY pgrst, 'reload schema';
