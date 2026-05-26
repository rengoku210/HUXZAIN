-- Migration: Add parent_id to categories and sync categories

-- 1. Add parent_id column if not exists
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Insert Gaming & Entertainment parent category
INSERT INTO public.categories (name, slug, sort_order, icon)
VALUES ('Gaming & Entertainment', 'gaming-entertainment', 85, 'Gamepad2')
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, icon = EXCLUDED.icon;

-- 3. Sync and link child categories
DO $$
DECLARE
  gaming_parent_id UUID;
BEGIN
  -- Get the ID of the Gaming & Entertainment parent category
  SELECT id INTO gaming_parent_id FROM public.categories WHERE slug = 'gaming-entertainment';

  IF gaming_parent_id IS NOT NULL THEN
    -- Update existing ones if they exist, or insert if not
    
    -- Game Accounts -> accounts
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = 'game-accounts') THEN
      UPDATE public.categories 
      SET slug = 'accounts', name = 'Gaming Accounts', parent_id = gaming_parent_id, icon = 'Gamepad2', sort_order = 10 
      WHERE slug = 'game-accounts';
    ELSE
      INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
      VALUES ('Gaming Accounts', 'accounts', gaming_parent_id, 'Gamepad2', 10)
      ON CONFLICT (slug) DO UPDATE 
      SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;
    END IF;

    -- Coaching -> coaching
    INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
    VALUES ('Coaching', 'coaching', gaming_parent_id, 'GraduationCap', 50)
    ON CONFLICT (slug) DO UPDATE 
    SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

    -- Rank Boosting -> boosting
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = 'rank-boosting') THEN
      UPDATE public.categories 
      SET slug = 'boosting', name = 'Boosting', parent_id = gaming_parent_id, icon = 'Rocket', sort_order = 40 
      WHERE slug = 'rank-boosting';
    ELSE
      INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
      VALUES ('Boosting', 'boosting', gaming_parent_id, 'Rocket', 40)
      ON CONFLICT (slug) DO UPDATE 
      SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;
    END IF;

    -- In-Game Credits -> currency
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = 'in-game-credits') THEN
      UPDATE public.categories 
      SET slug = 'currency', name = 'In-Game Currency', parent_id = gaming_parent_id, icon = 'Coins', sort_order = 20 
      WHERE slug = 'in-game-credits';
    ELSE
      INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
      VALUES ('In-Game Currency', 'currency', gaming_parent_id, 'Coins', 20)
      ON CONFLICT (slug) DO UPDATE 
      SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;
    END IF;

    -- Gift Cards (new)
    INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
    VALUES ('Gift Cards', 'gift-cards', gaming_parent_id, 'Gift', 30)
    ON CONFLICT (slug) DO UPDATE 
    SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

    -- Subscriptions (new)
    INSERT INTO public.categories (name, slug, parent_id, icon, sort_order)
    VALUES ('Subscriptions', 'subscriptions', gaming_parent_id, 'Crown', 60)
    ON CONFLICT (slug) DO UPDATE 
    SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

  END IF;
END $$;
