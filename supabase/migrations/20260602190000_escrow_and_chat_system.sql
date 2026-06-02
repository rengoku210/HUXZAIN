-- Migration: Add escrow system and additional storage buckets
-- Date: 2026-06-02

-- 1. Create escrow_holds table
CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  hold_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow_holds
-- Buyers and sellers can view their own escrow holds
DROP POLICY IF EXISTS escrow_holds_select_policy ON public.escrow_holds;
CREATE POLICY escrow_holds_select_policy ON public.escrow_holds 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = escrow_holds.order_id 
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
    OR public.is_staff()
  );

-- Staff can update escrow holds
DROP POLICY IF EXISTS escrow_holds_staff_policy ON public.escrow_holds;
CREATE POLICY escrow_holds_staff_policy ON public.escrow_holds 
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 2. Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chat-attachments', 'chat-attachments', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('dispute-evidence', 'dispute-evidence', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = excluded.public, 
  file_size_limit = excluded.file_size_limit, 
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies for new buckets
DROP POLICY IF EXISTS chat_attachments_policy ON storage.objects;
CREATE POLICY chat_attachments_policy ON storage.objects 
  FOR ALL USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS dispute_evidence_policy ON storage.objects;
CREATE POLICY dispute_evidence_policy ON storage.objects 
  FOR ALL USING (bucket_id = 'dispute-evidence');

-- 3. Add trust_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

-- 4. Create profile_badges table
CREATE TABLE IF NOT EXISTS public.profile_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge)
);

ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_badges_select ON public.profile_badges;
CREATE POLICY profile_badges_select ON public.profile_badges 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profile_badges_staff ON public.profile_badges;
CREATE POLICY profile_badges_staff ON public.profile_badges 
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
