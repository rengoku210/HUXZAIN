-- P0-2 (hardening): tighten the sensitive-bucket read policies.
--
-- 20260617120000_private_sensitive_buckets.sql made the buckets private but left
-- SELECT open to ANY authenticated user (USING bucket_id = '...'). That means any
-- logged-in user could sign/read another case's dispute evidence or report
-- screenshots. This migration scopes reads to the people involved + staff.
--
-- Object path convention (enforced by app code):
--   dispute-evidence    : evidence/<ts>_<file>   -> scoped by dispute participation
--   report-screenshots  : <uid>/<ts>_<file>      -> owner-prefixed
--   chat-attachments    : <conversation_id>/...   -> conversation participants
--
-- Because object paths here are not reliably owner-prefixed for legacy files,
-- dispute-evidence and report reads are restricted to staff OR the uploader.
-- Signed URLs are still minted server-side via createSignedUrl for participants
-- through narrowly-scoped app flows.

-- dispute-evidence: uploader or staff may read; authenticated may write.
drop policy if exists dispute_evidence_read on storage.objects;
create policy dispute_evidence_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (owner = auth.uid() or public.is_staff())
  );

-- report-screenshots: uploader or staff may read.
drop policy if exists report_screenshots_read on storage.objects;
create policy report_screenshots_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'report-screenshots'
    and (owner = auth.uid() or public.is_staff())
  );

-- chat-attachments: uploader or staff. (Conversation-scoped read is enforced in
-- app code via signed URLs minted only for conversation participants.)
drop policy if exists chat_attachments_read on storage.objects;
create policy chat_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (owner = auth.uid() or public.is_staff())
  );
