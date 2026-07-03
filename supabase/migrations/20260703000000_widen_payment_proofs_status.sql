-- Migration: Widen payment_proofs status check constraint to support REUPLOAD_REQUIRED
-- Date: 2026-07-03

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.payment_proofs'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.payment_proofs DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.payment_proofs ADD CONSTRAINT payment_proofs_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'reupload_requested', 'REUPLOAD_REQUIRED'));
