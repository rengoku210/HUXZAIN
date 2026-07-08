-- Migration: Add mutual completion columns to orders table
-- Date: 2026-07-08

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_confirmed_at TIMESTAMPTZ;

-- Add an index for quick checking of completion statuses
CREATE INDEX IF NOT EXISTS idx_orders_mutual_completion 
ON public.orders (buyer_confirmed_at, seller_confirmed_at);
