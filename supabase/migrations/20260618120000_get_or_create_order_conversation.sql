-- Migration: idempotent get-or-create for an order's escrow conversation
-- Date: 2026-06-18
--
-- Why: the buyer's browser cannot reliably INSERT a conversation because
--   - conversations_buyer_create requires email-verification (blocks new buyers)
--   - there is NO seller INSERT policy (the seller can never open a missing chat)
--   - messages_party_insert forbids is_system=true / sender_id<>auth.uid()
--     (so the unlock system-message insert always failed)
--   - uniq_conv_order makes double-fire / approval races throw 23505
-- These all surfaced as an infinite spinner on /messages?orderId=<id>.
--
-- This SECURITY DEFINER function runs server-side, authorizes the caller as a
-- party to the order, and returns the existing conversation or creates one
-- (with listing_id) plus the unlock system message. It is idempotent.

CREATE OR REPLACE FUNCTION public.get_or_create_order_conversation(p_order_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  v_title text;
  c public.conversations;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF auth.uid() <> o.buyer_id
     AND auth.uid() <> o.seller_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized for this order';
  END IF;

  -- Return existing conversation if one already exists for this order.
  SELECT * INTO c FROM public.conversations WHERE order_id = p_order_id LIMIT 1;
  IF c.id IS NOT NULL THEN
    RETURN c;
  END IF;

  SELECT title INTO v_title FROM public.listings WHERE id = o.listing_id;

  INSERT INTO public.conversations (
    order_id, buyer_id, seller_id, listing_id, subject,
    last_message_preview, last_message_at
  )
  VALUES (
    o.id, o.buyer_id, o.seller_id, o.listing_id,
    COALESCE(v_title, 'Escrow Order: ' || left(o.id::text, 8)),
    'Escrow chat unlocked.', now()
  )
  -- Race safety net (StrictMode double-fire / approval-path created it first).
  ON CONFLICT (buyer_id, seller_id, order_id) WHERE order_id IS NOT NULL
  DO UPDATE SET updated_at = now()
  RETURNING * INTO c;

  -- Unlock system message (definer bypasses messages_party_insert).
  INSERT INTO public.messages (conversation_id, sender_id, body, is_system)
  VALUES (c.id, o.seller_id, 'Chat unlocked. Safe escrow communication channel opened.', true);

  RETURN c;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_order_conversation(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
