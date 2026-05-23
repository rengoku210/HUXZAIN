// src/lib/payments/verificationQueueService.ts
import { getSupabase } from "../supabase-client";
import { UploadResult } from "./paymentUploadService";
import { OcrResult } from "./ocrService";
import { FraudScoreResult, calculateFraudScore } from "./fraudScoringService";

export interface VerificationRecord {
  id: string;
  user_id: string;
  order_id: string;
  screenshot_url: string;
  screenshot_hash: string;
  ocr_result: OcrResult | null;
  fraud_score: FraudScoreResult | null;
  status: "pending" | "approved" | "rejected";
  staff_user_id?: string;
  staff_note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new verification entry after successful upload.
 * Stores screenshot URL, hash, runs OCR and fraud scoring, and returns the record.
 */
export async function createVerification(params: {
  userId: string;
  orderId: string;
  uploadResult: UploadResult;
}): Promise<VerificationRecord> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");

  const { userId, orderId, uploadResult } = params;

  // Run OCR on the uploaded file via buffer – we need to fetch the file again.
  // For simplicity, we will fetch the file using the signed URL.
  const response = await fetch(uploadResult.signedUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ocrResult = await import("./ocrService").then((mod) => mod.runOcr(buffer));

  // Compute fraud score
  const fraudScore = await calculateFraudScore({
    userId,
    orderId,
    transactionId: ocrResult.transactionId,
    amount: ocrResult.amount,
    timestamp: ocrResult.timestamp,
    ocrConfidence: ocrResult.confidence,
    screenshotHash: uploadResult.hash,
  });

  const { data, error } = await supabase.from("payment_verifications").insert([
    {
      user_id: userId,
      order_id: orderId,
      screenshot_url: uploadResult.signedUrl,
      screenshot_hash: uploadResult.hash,
      ocr_result: ocrResult,
      fraud_score: fraudScore,
      status: "pending",
    },
  ]).select("*");
  if (error) throw error;
  const record = data?.[0] as VerificationRecord;

  // Log to verification_history
  await supabase.from("verification_history").insert([
    {
      verification_id: record.id,
      action: "created",
      performed_by: userId,
      note: null,
    },
  ]);

  return record;
}

/**
 * Update verification status by staff.
 */
export async function updateVerificationStatus(params: {
  verificationId: string;
  status: "approved" | "rejected";
  staffUserId: string;
  note?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");
  const { verificationId, status, staffUserId, note } = params;

  const { error } = await supabase
    .from("payment_verifications")
    .update({ status, staff_user_id: staffUserId, staff_note: note })
    .eq("id", verificationId);
  if (error) throw error;

  await supabase.from("verification_history").insert([
    {
      verification_id: verificationId,
      action: status,
      performed_by: staffUserId,
      note: note ?? null,
    },
  ]);
}
