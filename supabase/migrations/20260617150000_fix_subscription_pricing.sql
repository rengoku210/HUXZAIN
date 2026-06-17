-- G1: Correct subscription plan pricing to the documented (spec) values.
--
-- Defect: subscription_plans_config was seeded with prices ~90% below spec
-- (verified 149, pro 299, elite 599, enterprise 999). Two payment paths diverged:
--   * Manual UPI checkout (seller.subscription.payment.tsx) charges the hardcoded
--     frontend value (the SPEC value: 499/2999/4999/10000) — correct amount.
--   * Wallet activation (activateSubscription) charges config.monthly_price_inr
--     (the DB value) — under-charged 90%.
-- Per devdoc-requirements.md PLAN-02/05/06/07, the SPEC values are authoritative.
-- Correcting the config table makes it the single source of truth and fixes the
-- wallet undercharge + all display surfaces in one place (GOV-01 direction).
--
-- Idempotent: re-running re-asserts the correct prices.

UPDATE public.subscription_plans_config SET monthly_price_inr = 499   WHERE id = 'verified';
UPDATE public.subscription_plans_config SET monthly_price_inr = 2999  WHERE id = 'pro';
UPDATE public.subscription_plans_config SET monthly_price_inr = 4999  WHERE id = 'elite';
UPDATE public.subscription_plans_config SET monthly_price_inr = 10000 WHERE id = 'enterprise';
-- free stays 0.
