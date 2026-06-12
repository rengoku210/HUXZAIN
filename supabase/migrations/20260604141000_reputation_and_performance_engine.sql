-- SQL Migration: Reputation and Performance Engine
-- Filename: supabase/migrations/20260604130000_reputation_and_performance_engine.sql

-- 1. Function to Recalculate Reputation Score
CREATE OR REPLACE FUNCTION public.recalculate_seller_reputation_score(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_completed_orders INTEGER;
  v_reviews_count INTEGER;
  v_avg_rating NUMERIC;
  v_disputes_count INTEGER;
  v_refunds_count INTEGER;
  v_response_time INTEGER;
  v_delivery_consistency NUMERIC;
  v_score NUMERIC;
  v_total_orders INTEGER;
  v_completion_rate NUMERIC;
  v_dispute_rate NUMERIC;
  v_cancellation_rate NUMERIC;
BEGIN
  -- Count completed orders
  SELECT COUNT(*) INTO v_completed_orders
  FROM public.orders
  WHERE seller_id = p_seller_id AND status = 'completed';

  -- Total orders (excluding pending_payment)
  SELECT COUNT(*) INTO v_total_orders
  FROM public.orders
  WHERE seller_id = p_seller_id AND status != 'pending_payment';

  -- Reviews stats
  SELECT COUNT(*), COALESCE(AVG(rating), 5.0) INTO v_reviews_count, v_avg_rating
  FROM public.reviews
  WHERE seller_id = p_seller_id;

  -- Disputes stats (where disputes are opened against the order)
  SELECT COUNT(*) INTO v_disputes_count
  FROM public.disputes d
  JOIN public.orders o ON d.order_id = o.id
  WHERE o.seller_id = p_seller_id;

  -- Refunds count
  SELECT COUNT(*) INTO v_refunds_count
  FROM public.orders
  WHERE seller_id = p_seller_id AND status = 'refunded';

  -- Cancelled orders count
  SELECT COUNT(*) INTO v_cancellation_rate
  FROM public.orders
  WHERE seller_id = p_seller_id AND status = 'cancelled';

  -- Response time & delivery consistency from profiles
  SELECT COALESCE(response_time_seconds, 300), COALESCE(delivery_consistency, 100.0)
  INTO v_response_time, v_delivery_consistency
  FROM public.profiles
  WHERE id = p_seller_id;

  -- Calculate Rates
  IF v_total_orders > 0 THEN
    v_completion_rate := (v_completed_orders::numeric / v_total_orders::numeric) * 100.0;
    v_dispute_rate := (v_disputes_count::numeric / v_total_orders::numeric) * 100.0;
    v_cancellation_rate := (v_cancellation_rate::numeric / v_total_orders::numeric) * 100.0;
  ELSE
    v_completion_rate := 100.0;
    v_dispute_rate := 0.0;
    v_cancellation_rate := 0.0;
  END IF;

  -- Base score starts at 80.0
  v_score := 80.0;

  -- Completed orders bonus: +2.0 per order up to +20.0 max
  v_score := v_score + LEAST(v_completed_orders * 2.0, 20.0);

  -- Review ratings impact: scale rating relative to 3.5
  IF v_reviews_count > 0 THEN
    v_score := v_score + ((v_avg_rating - 3.5) * 10.0);
  END IF;

  -- Disputes penalty: -8.0 per dispute
  v_score := v_score - (v_disputes_count * 8.0);

  -- Refunds penalty: -4.0 per refund
  v_score := v_score - (v_refunds_count * 4.0);

  -- Response time impact: fast (+5.0), slow (-5.0)
  IF v_response_time < 60 THEN
    v_score := v_score + 5.0;
  ELSIF v_response_time > 600 THEN
    v_score := v_score - 5.0;
  END IF;

  -- Delivery consistency impact: good (+5.0), bad (-10.0)
  IF v_delivery_consistency >= 95.0 THEN
    v_score := v_score + 5.0;
  ELSIF v_delivery_consistency < 80.0 THEN
    v_score := v_score - 10.0;
  END IF;

  -- Clamp score between 0.00 and 100.00
  v_score := GREATEST(0.00, LEAST(100.00, v_score));

  -- Update profiles table with updated metrics
  UPDATE public.profiles
  SET 
    reputation_score = v_score,
    performance_score = v_score,
    completion_rate = v_completion_rate,
    dispute_rate = v_dispute_rate,
    cancellation_rate = v_cancellation_rate,
    updated_at = now()
  WHERE id = p_seller_id;

  -- Touch listings of the seller to trigger boost score recalculation dynamically
  UPDATE public.listings
  SET updated_at = now()
  WHERE seller_id = p_seller_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Trigger Function for Table Operations
CREATE OR REPLACE FUNCTION public.trg_recalculate_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'reviews' THEN
      v_seller_id := OLD.seller_id;
    END IF;
  ELSE
    IF TG_TABLE_NAME = 'orders' THEN
      v_seller_id := NEW.seller_id;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
      v_seller_id := NEW.seller_id;
    ELSIF TG_TABLE_NAME = 'disputes' THEN
      SELECT seller_id INTO v_seller_id FROM public.orders WHERE id = NEW.order_id;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      v_seller_id := NEW.id;
    END IF;
  END IF;

  IF v_seller_id IS NOT NULL THEN
    PERFORM public.recalculate_seller_reputation_score(v_seller_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Bind Triggers to Tables
-- Order Trigger
DROP TRIGGER IF EXISTS trg_recalc_rep_orders ON public.orders;
CREATE TRIGGER trg_recalc_rep_orders
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_reputation();

-- Review Trigger
DROP TRIGGER IF EXISTS trg_recalc_rep_reviews ON public.reviews;
CREATE TRIGGER trg_recalc_rep_reviews
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_reputation();

-- Dispute Trigger
DROP TRIGGER IF EXISTS trg_recalc_rep_disputes ON public.disputes;
CREATE TRIGGER trg_recalc_rep_disputes
AFTER INSERT OR UPDATE OF status ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_reputation();

-- Profile Trigger (when manual scores or rates are modified)
DROP TRIGGER IF EXISTS trg_recalc_rep_profiles ON public.profiles;
CREATE TRIGGER trg_recalc_rep_profiles
AFTER UPDATE OF response_time_seconds, delivery_consistency ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_reputation();


-- 4. Subscription Recalculation Trigger (Recalculate Boost Scores when plan changes)
CREATE OR REPLACE FUNCTION public.trg_subscription_boost_recalc()
RETURNS TRIGGER AS $$
BEGIN
  -- Touch listings of the seller to trigger boost score recalculation dynamically
  UPDATE public.listings
  SET updated_at = now()
  WHERE seller_id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sub_boost_recalc ON public.seller_subscriptions;
CREATE TRIGGER trg_sub_boost_recalc
AFTER INSERT OR UPDATE OF plan_name, status, suspension_status ON public.seller_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.trg_subscription_boost_recalc();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
