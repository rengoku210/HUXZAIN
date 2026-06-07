-- Drop existing tables to ensure clean migration structure
DROP TABLE IF EXISTS public.seller_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans_config CASCADE;

-- 1. Subscription Plans Configuration Table
CREATE TABLE IF NOT EXISTS public.subscription_plans_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_inr INTEGER NOT NULL,
  listing_limit_per_category INTEGER NOT NULL,
  boost_tokens_per_month INTEGER NOT NULL,
  visibility_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  settlement_days INTEGER NOT NULL DEFAULT 7,
  verification_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default plan details
INSERT INTO public.subscription_plans_config (id, name, monthly_price_inr, listing_limit_per_category, boost_tokens_per_month, visibility_multiplier, settlement_days, verification_required)
VALUES 
  ('free', 'Free', 0, 1, 0, 1.00, 7, false),
  ('verified', 'Verified', 149, 1, 0, 1.20, 7, true),
  ('pro', 'Pro', 299, 6, 10, 1.50, 5, false),
  ('elite', 'Elite', 599, 11, 20, 2.00, 3, false),
  ('enterprise', 'Enterprise', 999, 99999, 50, 2.50, 1, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_inr = EXCLUDED.monthly_price_inr,
  listing_limit_per_category = EXCLUDED.listing_limit_per_category,
  boost_tokens_per_month = EXCLUDED.boost_tokens_per_month,
  visibility_multiplier = EXCLUDED.visibility_multiplier,
  settlement_days = EXCLUDED.settlement_days,
  verification_required = EXCLUDED.verification_required;

-- 2. Seller Subscriptions Table
CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  seller_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Free',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending Activation', 'Expired', 'Suspended', 'Cancelled')),
  suspension_status BOOLEAN NOT NULL DEFAULT false,
  boost_tokens_remaining INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Extend Verifications Table
ALTER TABLE public.verifications 
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS payout_details JSONB,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Adjust check constraint on status for action required
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE public.verifications ADD CONSTRAINT verifications_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'action_required'));

-- 4. Extend Listings Table for boosts and ranking score
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_homepage_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_glow BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_score NUMERIC(10,2) NOT NULL DEFAULT 0.0;

-- 5. Extend Profiles for Reputation & Performance Scores
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation_score NUMERIC(5,2) NOT NULL DEFAULT 80.0,
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,2) NOT NULL DEFAULT 80.0,
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  ADD COLUMN IF NOT EXISTS dispute_rate NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS cancellation_rate NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS delivery_consistency NUMERIC(5,2) NOT NULL DEFAULT 100.0;

-- 6. Seller Analytics Events Table
CREATE TABLE IF NOT EXISTS public.seller_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'listing_view', 'click', 'sale')),
  ip_hash TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.subscription_plans_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_analytics_events ENABLE ROW LEVEL SECURITY;

-- Setup Policies
DROP POLICY IF EXISTS config_read_policy ON public.subscription_plans_config;
CREATE POLICY config_read_policy ON public.subscription_plans_config FOR SELECT USING (true);
DROP POLICY IF EXISTS config_write_policy ON public.subscription_plans_config;
CREATE POLICY config_write_policy ON public.subscription_plans_config FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS subs_read_policy ON public.seller_subscriptions;
CREATE POLICY subs_read_policy ON public.seller_subscriptions FOR SELECT USING (true);
DROP POLICY IF EXISTS subs_self_policy ON public.seller_subscriptions;
CREATE POLICY subs_self_policy ON public.seller_subscriptions FOR ALL USING (auth.uid() = seller_id OR public.is_staff());

DROP POLICY IF EXISTS analytics_insert_policy ON public.seller_analytics_events;
CREATE POLICY analytics_insert_policy ON public.seller_analytics_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS analytics_read_policy ON public.seller_analytics_events;
CREATE POLICY analytics_read_policy ON public.seller_analytics_events FOR SELECT USING (auth.uid() = seller_id OR public.is_staff());

-- 7. Trigger to Enforce Listing Limits
CREATE OR REPLACE FUNCTION public.enforce_listing_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
  v_current_count INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Get active seller subscription plan name
  SELECT LOWER(plan_name), plan_name INTO v_plan_id, v_plan_name
  FROM public.seller_subscriptions
  WHERE seller_id = NEW.seller_id AND status = 'Active' AND suspension_status = false;
  
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
    v_plan_name := 'Free';
  END IF;

  -- Read listing limit for this plan
  SELECT listing_limit_per_category INTO v_limit
  FROM public.subscription_plans_config
  WHERE id = v_plan_id;
  
  IF v_limit IS NULL THEN
    v_limit := 1; -- Fallback to Free limit
  END IF;

  -- Count existing active listings in this category for this seller
  SELECT COUNT(*) INTO v_current_count
  FROM public.listings
  WHERE seller_id = NEW.seller_id 
    AND category_id = NEW.category_id 
    AND status = 'active';

  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'Category limit reached. Plan % allows % active listing(s) per category. Currently you have %.', v_plan_name, v_limit, v_current_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_listing_limits ON public.listings;
CREATE TRIGGER trg_enforce_listing_limits
BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_limits();

-- 8. Trigger to Calculate Listing Boost Score
CREATE OR REPLACE FUNCTION public.calculate_listing_boost_score()
RETURNS TRIGGER AS $$
DECLARE
  v_reputation NUMERIC;
  v_multiplier NUMERIC;
  v_plan_id TEXT;
  v_score NUMERIC;
BEGIN
  -- Get seller reputation
  SELECT COALESCE(reputation_score, 80.0) INTO v_reputation
  FROM public.profiles WHERE id = NEW.seller_id;

  -- Get active seller plan name
  SELECT LOWER(plan_name) INTO v_plan_id
  FROM public.seller_subscriptions
  WHERE seller_id = NEW.seller_id AND status = 'Active' AND suspension_status = false;

  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Get vis multiplier
  SELECT visibility_multiplier INTO v_multiplier
  FROM public.subscription_plans_config
  WHERE id = v_plan_id;

  IF v_multiplier IS NULL THEN
    v_multiplier := 1.00;
  END IF;

  -- Base ranking score
  v_score := v_reputation;
  
  IF NEW.is_featured THEN
    v_score := v_score + 100.0;
  END IF;
  IF NEW.is_homepage_featured THEN
    v_score := v_score + 50.0;
  END IF;
  IF NEW.is_urgent THEN
    v_score := v_score + 20.0;
  END IF;
  IF NEW.has_glow THEN
    v_score := v_score + 10.0;
  END IF;

  -- Apply visibility plan multiplier
  NEW.boost_score := v_score * v_multiplier;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_listing_boost_score ON public.listings;
CREATE TRIGGER trg_calculate_listing_boost_score
BEFORE INSERT OR UPDATE OF seller_id, is_featured, is_homepage_featured, is_urgent, has_glow ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.calculate_listing_boost_score();

-- 9. Trigger to create default 'Free' subscription for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.seller_subscriptions (seller_id, plan_name, start_date, expiry_date, status, suspension_status, boost_tokens_remaining)
  VALUES (NEW.id, 'Free', now(), null, 'Active', false, 0)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_new_profile_subscription ON public.profiles;
CREATE TRIGGER trg_handle_new_profile_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_subscription();

-- Populate subscriptions for existing profiles
INSERT INTO public.seller_subscriptions (seller_id, plan_name, start_date, expiry_date, status, suspension_status, boost_tokens_remaining)
SELECT id, 'Free', now(), null, 'Active', false, 0
FROM public.profiles
ON CONFLICT (seller_id) DO NOTHING;

-- 10. Expired Subscriptions Downgrader Function
CREATE OR REPLACE FUNCTION public.check_and_downgrade_expired_subscriptions()
RETURNS void AS $$
BEGIN
  -- Update profiles subscription_tier back to 'standard' (mapped to Free in standard app views)
  UPDATE public.profiles p
  SET subscription_tier = 'standard'
  FROM public.seller_subscriptions s
  WHERE p.id = s.seller_id 
    AND s.status = 'Active'
    AND s.expiry_date IS NOT NULL 
    AND s.expiry_date < now();

  -- Downgrade expired subscriptions to Free in the seller_subscriptions ledger
  UPDATE public.seller_subscriptions
  SET plan_name = 'Free',
      start_date = now(),
      expiry_date = null,
      status = 'Active',
      boost_tokens_remaining = 0,
      updated_at = now()
  WHERE status = 'Active' 
    AND expiry_date IS NOT NULL 
    AND expiry_date < now();
END;
$$ LANGUAGE plpgsql;

-- Force reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
