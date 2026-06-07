-- Create Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS platform_settings_read ON public.platform_settings;
CREATE POLICY platform_settings_read ON public.platform_settings FOR SELECT USING (true);

-- Allow write access only to staff members
DROP POLICY IF EXISTS platform_settings_write ON public.platform_settings;
CREATE POLICY platform_settings_write ON public.platform_settings FOR ALL USING (public.is_staff());

-- Seed initial default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('branding', '{"platform_name": "HUXZAIN", "support_email": "support@huxzain.shop"}'::jsonb),
  ('fees', '{"commission_rate_percent": 1.9, "payout_fee_percent": 0.0}'::jsonb),
  ('moderation', '{"kyc_required": true, "escrow_timeout_hours": 24}'::jsonb),
  ('maintenance', '{"maintenance_mode": false}'::jsonb),
  ('homepage_boosts', '{"max_spotlight_slots": 5}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
