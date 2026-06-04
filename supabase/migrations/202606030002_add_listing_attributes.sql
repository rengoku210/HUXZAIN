-- Migration: Add attributes JSONB column to listings for category-specific metadata
-- Examples: Game Accounts (Rank, Level, Skins), In-Game Currency (Amount, Game)

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb;
