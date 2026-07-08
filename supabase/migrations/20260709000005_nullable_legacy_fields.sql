-- Ensure legacy plaintext columns in listing_credentials are not-null relaxed (nullable).
-- Since all data is now sym-encrypted at rest and stored in the corresponding _enc columns,
-- the legacy columns should be allowed to be NULL.

ALTER TABLE public.listing_credentials ALTER COLUMN login_id DROP NOT NULL;
ALTER TABLE public.listing_credentials ALTER COLUMN password DROP NOT NULL;
ALTER TABLE public.listing_credentials ALTER COLUMN recovery_details DROP NOT NULL;
ALTER TABLE public.listing_credentials ALTER COLUMN email_transfer_details DROP NOT NULL;
