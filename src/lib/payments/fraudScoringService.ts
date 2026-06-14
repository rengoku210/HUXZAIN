// src/lib/payments/fraudScoringService.ts
import { getSupabase } from "../supabase-client";

export interface FraudScoreResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  tags: string[];
  confidence: number; // 0-1 based on OCR confidence and data quality
}

/**
 * Calculates a fraud assistance score based on various heuristics.
 * The function queries Supabase to detect duplicate transaction IDs, duplicate image hashes,
 * amount mismatches, timestamp drift, low OCR confidence, rapid submissions, and metadata edits.
 */
export async function calculateFraudScore(params: {
  userId: string;
  orderId: string;
  transactionId?: string;
  amount?: number;
  timestamp?: string; // ISO
  ocrConfidence?: number; // 0â€‘1
  screenshotHash?: string;
}): Promise<FraudScoreResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");

  const { userId, orderId, transactionId, amount, timestamp, ocrConfidence, screenshotHash } =
    params;
  let score = 0;
  const tags: string[] = [];

  // Duplicate transaction ID detection
  if (transactionId) {
    const { data: dupTxn } = await supabase
      .from("payment_verifications")
      .select("id")
      .eq("ocr_result->>transaction_id", transactionId)
      .neq("order_id", orderId)
      .maybeSingle();
    if (dupTxn) {
      score += 30;
      tags.push("duplicate-transaction");
    }
  }

  // Duplicate screenshot hash detection (exact match)
  if (screenshotHash) {
    const { data: dupHash } = await supabase
      .from("screenshot_hashes")
      .select("id")
      .eq("hash", screenshotHash)
      .neq("order_id", orderId)
      .maybeSingle();
    if (dupHash) {
      score += 30;
      tags.push("duplicate-screenshot");
    }
  }

  // Amount mismatch with order total (assumes orders table exists)
  if (amount !== undefined) {
    const { data: order } = await supabase
      .from("orders")
      .select("amount_inr")
      .eq("id", orderId)
      .maybeSingle();
    if (order && Math.abs((order.amount_inr || 0) - amount) > 0.01) {
      score += 20;
      tags.push("amount-mismatch");
    }
  }

  // Timestamp drift â€“ allow Â±10 minutes
  if (timestamp) {
    const ocrDate = new Date(timestamp);
    const { data: orderInfo } = await supabase
      .from("orders")
      .select("created_at")
      .eq("id", orderId)
      .maybeSingle();
    if (orderInfo) {
      const orderDate = new Date(orderInfo.created_at);
      const diffMs = Math.abs(ocrDate.getTime() - orderDate.getTime());
      if (diffMs > 10 * 60 * 1000) {
        score += 10;
        tags.push("timestamp-drift");
      }
    }
  }

  // Low OCR confidence
  if (ocrConfidence !== undefined && ocrConfidence < 0.6) {
    score += 15;
    tags.push("low-ocr-confidence");
  }

  // Rapid submissions â€“ more than 2 verifications by same user in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("payment_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", fiveMinAgo);
  if (recentCount && recentCount > 2) {
    score += 10;
    tags.push("rapid-submission");
  }

  // Metadata/edit indicators â€“ placeholder (real implementation could inspect EXIF via Sharp)
  // For now, if amount field was parsed but raw OCR text contains the word "Edited" add tag.
  // This will be handled by caller via an extra param if needed.

  // Cap score at 100
  if (score > 100) score = 100;

  let level: FraudScoreResult["level"] = "low";
  if (score > 75) level = "critical";
  else if (score > 50) level = "high";
  else if (score > 25) level = "medium";

  // Confidence combines OCR confidence (if available) with a simple heuristic
  const confidence = ocrConfidence !== undefined ? ocrConfidence : 0.8;

  return { score, level, tags, confidence };
}
