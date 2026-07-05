-- Migration: KYC Hardening & Chat Schema Completion
-- Date: 2026-07-05

-- 1. Extend verifications table for 2nd government ID
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS government_id_type_1 TEXT,
  ADD COLUMN IF NOT EXISTS government_id_type_2 TEXT,
  ADD COLUMN IF NOT EXISTS government_id_2_url TEXT,
  ADD COLUMN IF NOT EXISTS government_id_2_status TEXT DEFAULT 'NOT_STARTED';

-- 2. Create conversations table if not exists
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  buyer_unread INTEGER DEFAULT 0,
  seller_unread INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Add UNIQUE constraint to avoid duplicates per order (essential for get_or_create_order_conversation)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_order 
ON public.conversations (buyer_id, seller_id, order_id) 
WHERE order_id IS NOT NULL;

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for conversations
DROP POLICY IF EXISTS conversations_select_policy ON public.conversations;
CREATE POLICY conversations_select_policy ON public.conversations
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS conversations_insert_policy ON public.conversations;
CREATE POLICY conversations_insert_policy ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS conversations_update_policy ON public.conversations;
CREATE POLICY conversations_update_policy ON public.conversations
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff());

-- 4. RLS Policies for messages
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    ) OR public.is_staff()
  );

DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )) OR public.is_staff()
  );
