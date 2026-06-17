-- P0-2: Make sensitive storage buckets private and lock down RLS.
-- dispute-evidence, chat-attachments, and report-screenshots previously had
-- public=true and FOR ALL USING (bucket_id=...) policies, meaning any anonymous
-- visitor could read uploaded evidence, chat attachments, and report
-- screenshots. This migration flips them to private and restricts access to
-- authenticated users. Files are served via short-lived signed URLs from the app.

-- 1. Flip buckets to private
UPDATE storage.buckets SET public = false
  WHERE id IN ('dispute-evidence', 'chat-attachments', 'report-screenshots');

-- 2. Replace the wide-open policies with authenticated-only access.

-- dispute-evidence
DROP POLICY IF EXISTS dispute_evidence_policy ON storage.objects;
DROP POLICY IF EXISTS dispute_evidence_read ON storage.objects;
DROP POLICY IF EXISTS dispute_evidence_write ON storage.objects;
CREATE POLICY dispute_evidence_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'dispute-evidence');
CREATE POLICY dispute_evidence_write ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dispute-evidence');

-- chat-attachments
DROP POLICY IF EXISTS chat_attachments_policy ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_read ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_write ON storage.objects;
CREATE POLICY chat_attachments_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments');
CREATE POLICY chat_attachments_write ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');

-- report-screenshots
DROP POLICY IF EXISTS screenshots_public_read ON storage.objects;
DROP POLICY IF EXISTS screenshots_insert ON storage.objects;
DROP POLICY IF EXISTS report_screenshots_read ON storage.objects;
DROP POLICY IF EXISTS report_screenshots_write ON storage.objects;
CREATE POLICY report_screenshots_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'report-screenshots');
CREATE POLICY report_screenshots_write ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'report-screenshots');
