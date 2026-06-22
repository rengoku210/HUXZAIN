-- G11 / MOD-01 / LIST-25: enable the listing moderation workflow at the DB level.
--
-- The listing_status enum was ('draft','active','hidden','flagged','archived').
-- The admin moderation panel (admin.listings.tsx) and the seller create flow
-- already reference 'pending' (queue + auto-flag) and 'rejected' (admin reject
-- action), but those values were never added to the enum — so every reject and
-- every flagged/pending insert silently failed with an invalid-enum error, and
-- the admin "Pending" tab could never receive a listing.
--
-- Add the missing values so the (already-built) moderation UI actually works
-- and new listings can enter pending-review before going live.
--
-- ALTER TYPE ... ADD VALUE is idempotent via IF NOT EXISTS (PG 12+) and must run
-- outside an explicit transaction block (each statement here is standalone).

ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'rejected';
