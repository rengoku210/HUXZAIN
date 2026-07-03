-- Listing lifecycle + promotion visuals
-- Adds an expiry timestamp (drives the Expired / Renew states on the seller
-- listings page) and a glow_color for the Glow Highlight promotion.
-- Additive and idempotent — safe to run on existing data.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS glow_color TEXT,
  ADD COLUMN IF NOT EXISTS glow_expires_at TIMESTAMPTZ;

-- Official spec (Doc 1 Part 4 — Initial Listing Status): every listing has a
-- validity of EXACTLY 30 days measured FROM APPROVAL, not from draft creation.
-- The expiry window is therefore stamped by the moderation-approval path when a
-- listing becomes 'active' (see admin.listings.updateStatus); drafts/pending
-- listings intentionally keep a NULL expiry (their countdown has not started).
--
-- Backfill only already-ACTIVE listings that predate this column so their
-- countdown is meaningful immediately (approx: created_at + 30 days).
UPDATE public.listings
  SET expiry_date = created_at + interval '30 days'
  WHERE expiry_date IS NULL
    AND status = 'active';

-- Index to make the "expired" filter cheap for sellers with many listings.
CREATE INDEX IF NOT EXISTS idx_listings_expiry_date
  ON public.listings (expiry_date)
  WHERE expiry_date IS NOT NULL;
