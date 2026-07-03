-- Reconcile subscription_plans_config pricing to the OFFICIAL spec
-- (docxx/"Seller subscription plans full detail.docx").
--
-- The original seed (20260604113000) used early placeholder monthly prices
-- (Pro ₹299, Elite ₹599, Enterprise ₹999, Verified ₹149). The finalized spec
-- pricing is Pro ₹2,999 / Elite ₹4,999 / Enterprise ₹9,999, with the standalone
-- Verified Badge at ₹499/mo. commission_config / escrow_config / settlement_config
-- (20260701130000) already match the spec exactly and are left untouched.
--
-- Documentation wins on conflict (this also supersedes the ₹8,999 Enterprise value
-- shown in the Platform Settings screenshot mockups).

UPDATE public.subscription_plans_config SET monthly_price_inr = 499  WHERE id = 'verified';
UPDATE public.subscription_plans_config SET monthly_price_inr = 2999 WHERE id = 'pro';
UPDATE public.subscription_plans_config SET monthly_price_inr = 4999 WHERE id = 'elite';
UPDATE public.subscription_plans_config SET monthly_price_inr = 9999 WHERE id = 'enterprise';

-- Listing limits per category per spec: Standard 1, Pro 5, Elite 10, Enterprise 30.
-- (Original seed used 1 / 6 / 11 / 99999 — align to the documented allowances.)
UPDATE public.subscription_plans_config SET listing_limit_per_category = 1  WHERE id = 'free';
UPDATE public.subscription_plans_config SET listing_limit_per_category = 5  WHERE id = 'pro';
UPDATE public.subscription_plans_config SET listing_limit_per_category = 10 WHERE id = 'elite';
UPDATE public.subscription_plans_config SET listing_limit_per_category = 30 WHERE id = 'enterprise';
