-- HUXZAIN remaining marketplace systems migration
-- Date: 2026-06-01

-- 1. Add fields to public.listings for SEO and trending listings
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0;

-- 2. Add invoice details to public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- 3. Create reports table for listings and sellers
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'seller')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create seo_pages table
CREATE TABLE IF NOT EXISTS public.seo_pages (
  path TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  og_image_url TEXT,
  keywords TEXT,
  schema_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create visits_raw table (privacy masked analytics)
CREATE TABLE IF NOT EXISTS public.visits_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  device TEXT,
  browser TEXT,
  country TEXT,
  referrer TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create invoice counters table
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  date DATE PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS for new tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- 7. Add RLS Policies
-- Reports: reporter can view own reports, staff can view all and update
DROP POLICY IF EXISTS reports_select_policy ON public.reports;
CREATE POLICY reports_select_policy ON public.reports 
  FOR SELECT USING (reporter_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS reports_insert_policy ON public.reports;
CREATE POLICY reports_insert_policy ON public.reports 
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS reports_update_policy ON public.reports;
CREATE POLICY reports_update_policy ON public.reports 
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- SEO Pages: public read, staff write
DROP POLICY IF EXISTS seo_pages_select_policy ON public.seo_pages;
CREATE POLICY seo_pages_select_policy ON public.seo_pages 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS seo_pages_write_policy ON public.seo_pages;
CREATE POLICY seo_pages_write_policy ON public.seo_pages 
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Visits: anyone can insert, staff can view
DROP POLICY IF EXISTS visits_insert_policy ON public.visits_raw;
CREATE POLICY visits_insert_policy ON public.visits_raw 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS visits_select_policy ON public.visits_raw;
CREATE POLICY visits_select_policy ON public.visits_raw 
  FOR SELECT USING (public.is_staff());

-- Invoice counters: staff can read/write
DROP POLICY IF EXISTS invoice_counters_policy ON public.invoice_counters;
CREATE POLICY invoice_counters_policy ON public.invoice_counters 
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 8. Add Storage Bucket for screenshots and invoices if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('report-screenshots', 'report-screenshots', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('invoices', 'invoices', false, 10485760, array['application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = excluded.public, 
  file_size_limit = excluded.file_size_limit, 
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies for new buckets
DROP POLICY IF EXISTS screenshots_public_read ON storage.objects;
CREATE POLICY screenshots_public_read ON storage.objects 
  FOR SELECT USING (bucket_id = 'report-screenshots');

DROP POLICY IF EXISTS screenshots_insert ON storage.objects;
CREATE POLICY screenshots_insert ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'report-screenshots');

DROP POLICY IF EXISTS invoices_read ON storage.objects;
CREATE POLICY invoices_read ON storage.objects 
  FOR SELECT USING (bucket_id = 'invoices' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff()));

DROP POLICY IF EXISTS invoices_write ON storage.objects;
CREATE POLICY invoices_write ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'invoices');
