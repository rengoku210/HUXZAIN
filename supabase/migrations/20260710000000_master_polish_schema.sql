-- Migration: HUXZAIN Master Polish Schema Extensions
-- Date: 2026-07-10

-- 1. Add is_archived to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 2. Add ocr_data_1 and ocr_data_2 to verifications
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS ocr_data_1 JSONB,
  ADD COLUMN IF NOT EXISTS ocr_data_2 JSONB;

-- 3. Extend terms_acceptance_logs with product_id, order_id, policy_type, browser, device
ALTER TABLE public.terms_acceptance_logs
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS policy_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS device TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON public.conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_product ON public.terms_acceptance_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_order ON public.terms_acceptance_logs(order_id);
