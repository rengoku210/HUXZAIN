ALTER TABLE "public"."payment_proofs" ADD COLUMN "ocr_data" jsonb;
ALTER TABLE "public"."subscription_payment_proofs" ADD COLUMN "ocr_data" jsonb;
