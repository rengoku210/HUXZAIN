-- Migration: Ensure frontend insert payload columns exist in listings table
-- Resolves: Silent create listing failure due to wrong column names

-- Ensure gallery_urls exists (in case 202605250001 migration wasn't applied)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS gallery_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'manual';

-- Backfill delivery_type for existing rows that might be NULL
UPDATE public.listings
SET delivery_type = 'manual'
WHERE delivery_type IS NULL;
