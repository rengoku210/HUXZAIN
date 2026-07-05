-- Migration: Secure Delivery Framework & Boosting Services Category
-- Date: 2026-07-05

-- 1. Create listing_inventory table for multi-item deliveries
CREATE TABLE IF NOT EXISTS public.listing_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  login_id_enc BYTEA,
  password_enc BYTEA,
  credentials_data_enc BYTEA,
  instructions TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'hold')),
  assigned_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on listing_inventory
ALTER TABLE public.listing_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_inventory_seller_manage ON public.listing_inventory;
CREATE POLICY listing_inventory_seller_manage ON public.listing_inventory
  FOR ALL USING (
    auth.uid() = (select seller_id from public.listings where id = listing_id)
    OR public.is_staff()
  ) WITH CHECK (
    auth.uid() = (select seller_id from public.listings where id = listing_id)
    OR public.is_staff()
  );

DROP POLICY IF EXISTS listing_inventory_buyer_read ON public.listing_inventory;
CREATE POLICY listing_inventory_buyer_read ON public.listing_inventory
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = assigned_order_id 
      AND orders.buyer_id = auth.uid()
      AND orders.status::text IN ('paid', 'buyer_reviewing', 'completed', 'delivered', 'disputed')
    )
  );

-- Create index on listing_inventory
CREATE INDEX IF NOT EXISTS idx_listing_inventory_listing_status ON public.listing_inventory(listing_id, status);

-- 2. Create secure_delivery_logs table for audit/reveal tracking
CREATE TABLE IF NOT EXISTS public.secure_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reveal_date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  browser TEXT,
  operating_system TEXT,
  device_type TEXT,
  country TEXT,
  revealed_fields TEXT[] DEFAULT '{}',
  copied_fields TEXT[] DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on secure_delivery_logs
ALTER TABLE public.secure_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secure_delivery_logs_select ON public.secure_delivery_logs;
CREATE POLICY secure_delivery_logs_select ON public.secure_delivery_logs
  FOR SELECT TO authenticated USING (
    buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff()
  );

-- 3. Functions to manage inventory set and reveal
CREATE OR REPLACE FUNCTION public.set_listing_inventory_item(
  p_listing_id UUID,
  p_login_id TEXT,
  p_password TEXT,
  p_credentials_data TEXT,
  p_instructions TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public as $$
declare 
  k text := public._credential_key();
  v_inv_id UUID;
begin
  if not (auth.uid() = (select seller_id from public.listings where id = p_listing_id) or public.is_staff()) then
    raise exception 'not authorized to add inventory for this listing';
  end if;

  insert into public.listing_inventory (
    listing_id, login_id_enc, password_enc, credentials_data_enc, instructions, notes, status
  ) values (
    p_listing_id,
    case when p_login_id is not null then pgp_sym_encrypt(p_login_id, k) end,
    case when p_password is not null then pgp_sym_encrypt(p_password, k) end,
    case when p_credentials_data is not null then pgp_sym_encrypt(p_credentials_data, k) end,
    p_instructions,
    p_notes,
    'available'
  ) RETURNING id INTO v_inv_id;

  return v_inv_id;
end $$;

CREATE OR REPLACE FUNCTION public.reveal_order_inventory(
  p_order_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_device TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
) RETURNS TABLE (
  login_id TEXT,
  password TEXT,
  credentials_data TEXT,
  instructions TEXT,
  notes TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public as $$
declare 
  k text := public._credential_key();
  v_buyer_id UUID;
  v_seller_id UUID;
  v_listing_id UUID;
  v_status text;
  v_fields text[] := '{}';
begin
  -- Fetch order details
  select buyer_id, seller_id, listing_id, status::text into v_buyer_id, v_seller_id, v_listing_id, v_status
  from public.orders
  where id = p_order_id;

  if v_buyer_id is null then
    raise exception 'order not found';
  end if;

  -- Verify access
  if not (auth.uid() = v_buyer_id or auth.uid() = v_seller_id or public.is_staff()) then
    raise exception 'not authorized to reveal inventory for this order';
  end if;

  -- Verification of order state (only paid/buyer_reviewing/completed/delivered/disputed can reveal)
  if v_status not in ('paid', 'buyer_reviewing', 'completed', 'delivered', 'disputed') then
    raise exception 'cannot reveal delivery info for unpaid order';
  end if;

  -- Add logs only on reveal by buyer
  if auth.uid() = v_buyer_id then
    v_fields := array['reveal_initiated'];
    insert into public.secure_delivery_logs (
      order_id, listing_id, buyer_id, seller_id, ip_address, browser, operating_system, device_type, country, revealed_fields
    ) values (
      p_order_id, v_listing_id, v_buyer_id, v_seller_id, p_ip, p_browser, p_os, p_device, p_country, v_fields
    );
  end if;

  return query
    select
      pgp_sym_decrypt(li.login_id_enc, k),
      pgp_sym_decrypt(li.password_enc, k),
      pgp_sym_decrypt(li.credentials_data_enc, k),
      li.instructions,
      li.notes
    from public.listing_inventory li
    where li.assigned_order_id = p_order_id;
end $$;

-- 4. Prevent deleting listing with active orders trigger
CREATE OR REPLACE FUNCTION public.check_listing_deletable()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE listing_id = OLD.id 
    AND status::text NOT IN ('completed', 'cancelled', 'refunded')
  ) THEN
    RAISE EXCEPTION 'Listings with active orders cannot be deleted. Archive the listing instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_delete_listing_with_active_orders ON public.listings;
CREATE TRIGGER trg_prevent_delete_listing_with_active_orders
BEFORE DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.check_listing_deletable();

-- 5. Add columns for Listing Health Score and Declarations
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS declarations_accepted BOOLEAN DEFAULT false;

-- 6. Insert new categories and subcategories for Boosting Services
DO $$
DECLARE
  v_gaming_parent_id UUID;
  v_boosting_parent_id UUID;
  v_game_record RECORD;
  v_game_id UUID;
  v_games text[] := array[
    'Valorant', 'Counter-Strike 2', 'League of Legends', 'Dota 2', 'Marvel Rivals', 
    'Rainbow Six Siege', 'Overwatch 2', 'Rocket League', 'Apex Legends', 'PUBG PC', 
    'BGMI', 'Call of Duty: Warzone', 'Fortnite', 'Free Fire', 'World of Warcraft', 
    'Diablo IV', 'Lost Ark', 'Black Desert Online', 'New World', 'Mobile Legends: Bang Bang', 
    'Clash of Clans', 'Clash Royale', 'Brawl Stars', 'Honor of Kings', 'Destiny 2', 
    'Path of Exile', 'EA Sports FC', 'GTA Online'
  ];
  v_game_slugs text[] := array[
    'valorant', 'counter-strike-2', 'league-of-legends', 'dota-2', 'marvel-rivals', 
    'rainbow-six-siege', 'overwatch-2', 'rocket-league', 'apex-legends', 'pubg-pc', 
    'bgmi', 'cod-warzone', 'fortnite', 'free-fire', 'world-of-warcraft', 
    'diablo-4', 'lost-ark', 'black-desert-online', 'new-world', 'mobile-legends', 
    'clash-of-clans', 'clash-royale', 'brawl-stars', 'honor-of-kings', 'destiny-2', 
    'path-of-exile', 'ea-sports-fc', 'gta-online'
  ];
  v_idx int;
  v_boost_types text[] := array['Rank Boost', 'Placement Matches', 'Win Boost', 'Custom Boost'];
  v_bt text;
  v_bt_slug text;
BEGIN
  -- Fetch the main Gaming & Entertainment category
  SELECT id INTO v_gaming_parent_id FROM public.categories WHERE slug = 'gaming-entertainment';
  
  IF v_gaming_parent_id IS NULL THEN
    INSERT INTO public.categories (name, slug, sort_order, icon)
    VALUES ('Gaming & Entertainment', 'gaming-entertainment', 85, 'Gamepad2')
    RETURNING id INTO v_gaming_parent_id;
  END IF;

  -- Ensure Boosting parent category is linked under Gaming
  SELECT id INTO v_boosting_parent_id FROM public.categories WHERE slug = 'boosting';
  
  IF v_boosting_parent_id IS NULL THEN
    INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
    VALUES ('Boosting Services', 'boosting', v_gaming_parent_id, 'Rocket', 40)
    RETURNING id INTO v_boosting_parent_id;
  ELSE
    UPDATE public.categories 
    SET name = 'Boosting Services', parent_id = v_gaming_parent_id, icon = 'Rocket', sort_order = 40 
    WHERE id = v_boosting_parent_id;
  END IF;

  -- Seeding the 28 games under Boosting Services
  FOR v_idx IN 1 .. array_length(v_games, 1) LOOP
    INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
    VALUES (v_games[v_idx], v_game_slugs[v_idx], v_boosting_parent_id, 'Gamepad2', v_idx * 10)
    ON CONFLICT (slug) DO UPDATE
    SET name = excluded.name, parent_id = excluded.parent_id, icon = excluded.icon, sort_order = excluded.sort_order
    RETURNING id INTO v_game_id;

    -- Seed Boost Types under each game
    FOREACH v_bt IN ARRAY v_boost_types LOOP
      v_bt_slug := v_game_slugs[v_idx] || '-' || lower(replace(v_bt, ' ', '-'));
      INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
      VALUES (v_bt, v_bt_slug, v_game_id, 'Rocket', 10)
      ON CONFLICT (slug) DO UPDATE
      SET name = excluded.name, parent_id = excluded.parent_id, icon = excluded.icon;
    END LOOP;
  END LOOP;

END $$;
