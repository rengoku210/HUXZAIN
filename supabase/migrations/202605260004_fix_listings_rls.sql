-- Migration: Fix RLS policies for listings table
-- Resolves: 403 Forbidden / code 42501 when seller tries to update own listing
-- Root cause: Old conflicting policies blocking UPDATE from authenticated seller

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Drop all existing conflicting listing policies
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings_public_read_active"      ON public.listings;
DROP POLICY IF EXISTS "listings_seller_insert"           ON public.listings;
DROP POLICY IF EXISTS "listings_seller_update_own"       ON public.listings;
DROP POLICY IF EXISTS "listings_seller_delete_own"       ON public.listings;
DROP POLICY IF EXISTS "listings_select_public"           ON public.listings;
DROP POLICY IF EXISTS "listings_insert_own"              ON public.listings;
DROP POLICY IF EXISTS "listings_update_own"              ON public.listings;
DROP POLICY IF EXISTS "listings_delete_own"              ON public.listings;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Ensure RLS is enabled
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. CREATE clean, non-conflicting policies
-- ────────────────────────────────────────────────────────────────────────────

-- Public can view active listings, or seller can view their own listings (any status)
CREATE POLICY "listings_select_public"
ON public.listings
FOR SELECT
USING (
  status = 'active'
  OR auth.uid() = seller_id
);

-- Seller can insert their own listing
CREATE POLICY "listings_insert_own"
ON public.listings
FOR INSERT
WITH CHECK (
  auth.uid() = seller_id
);

-- Seller can update their own listing (no has_role requirement — seller_id match is sufficient)
CREATE POLICY "listings_update_own"
ON public.listings
FOR UPDATE
USING (
  auth.uid() = seller_id
)
WITH CHECK (
  auth.uid() = seller_id
);

-- Seller can delete their own listing
CREATE POLICY "listings_delete_own"
ON public.listings
FOR DELETE
USING (
  auth.uid() = seller_id
);
