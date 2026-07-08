-- Fix _can_access_credentials to support all active paid states of an order
-- E.g. payment_approved, order_active, seller_delivering, buyer_reviewing, completed, disputed.

CREATE OR REPLACE FUNCTION public._can_access_credentials(p_listing_id uuid)
RETURNS boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() = (select seller_id from public.listings where id = p_listing_id)
    or exists (
      select 1 from public.orders
      where listing_id = p_listing_id
        and buyer_id = auth.uid()
        and status::text in ('paid', 'payment_approved', 'order_active', 'seller_delivering', 'buyer_reviewing', 'completed', 'disputed')
    )
    or public.is_staff();
$$;
