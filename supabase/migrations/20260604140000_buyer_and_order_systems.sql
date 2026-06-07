-- HUXZAIN Phase 4 - Buyer Journey, Order Lifecycle & Escrow Systems
-- Date: 2026-06-04

-- 1. Extend order_status enum values (Run outside transaction blocks if necessary, but in RPC exec_sql it runs fine)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_under_review';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'order_active';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'seller_delivering';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'buyer_reviewing';

-- 2. Modify payment_proofs status check constraint to support 'reupload_requested'
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.payment_proofs'::regclass 
        AND contype = 'c' 
        AND consrc LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.payment_proofs DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.payment_proofs ADD CONSTRAINT payment_proofs_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'reupload_requested'));

-- 3. Create order_status_history table for auditing status changes
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_status_history_select ON public.order_status_history;
CREATE POLICY order_status_history_select ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_status_history.order_id 
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ) OR public.is_staff()
  );

-- 4. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS reviews_insert ON public.reviews;
CREATE POLICY reviews_insert ON public.reviews 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = buyer_id);

-- 5. Create dispute_messages table
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispute_messages_select ON public.dispute_messages;
CREATE POLICY dispute_messages_select ON public.dispute_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.disputes 
      WHERE disputes.id = dispute_messages.dispute_id 
      AND (disputes.opened_by = auth.uid() 
           OR EXISTS (SELECT 1 FROM public.orders WHERE orders.id = disputes.order_id AND orders.seller_id = auth.uid()))
    ) OR public.is_staff()
  );

DROP POLICY IF EXISTS dispute_messages_insert ON public.dispute_messages;
CREATE POLICY dispute_messages_insert ON public.dispute_messages
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);

-- 6. Add columns to disputes and orders
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS decision_notes TEXT;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;

-- 7. Trigger to automatically log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (NEW.id, NEW.status::text, auth.uid(), TG_OP || ' of order');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();
