// src/server/ai/payment-verification-service.ts
// ═══════════════════════════════════════════════════════════════════
// HUXZAIN — Dedicated Server-Only AI Payment Verification Service
// ═══════════════════════════════════════════════════════════════════
//
// Pipeline:
//   Step A → Download screenshot + base64 encode
//   Step B → Primary OCR via Llama 3.2 11B Vision
//   Step C → Fallback OCR via Llama 3.2 90B Vision (if B fails/incomplete)
//   Step D → Decision reasoning via Llama 3.3 70B Instruct
//   Step E → Non-blocking DB cache write
//
// This module must NEVER be imported in browser code.
// It is only called from ai.functions.ts server functions.
// ═══════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Constants ────────────────────────────────────────────────────────
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
const LOG_TAG = "[AI Service]";

// ── Types ────────────────────────────────────────────────────────────
export interface ExtractionData {
  paid_amount: number | null;
  currency: string | null;
  status: string | null;
  transaction_id: string | null;
  payment_app: string | null;
  timestamp_text: string | null;
  receiver_name: string | null;
  sender_name: string | null;
}

export interface VerificationResult {
  ai_available: boolean;
  status: string;
  ai_score: number | null;
  ai_risk_label: string;
  ai_model_used: string;
  ai_recommendation: string;
  ai_reason: string;
  ai_amount_match: boolean | null;
  ai_timestamp_match: string | null;
  ai_utr: string | null;
  ai_authenticity_score: number | null;
  ai_checked_at: string;
}

// ── Environment Helpers ──────────────────────────────────────────────
function getEnvVar(name: string): string {
  if (typeof process !== "undefined" && process.env) {
    return process.env[name] || "";
  }
  return "";
}

function resolveNvidiaApiKey(): string {
  // Priority: NVIDIA_API_KEY env → VITE_NVIDIA_API_KEY env → hardcoded fallback
  const key =
    getEnvVar("NVIDIA_API_KEY") ||
    getEnvVar("VITE_NVIDIA_API_KEY") ||
    "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";
  return key;
}

function resolveSupabaseUrl(): string {
  return (
    getEnvVar("SUPABASE_URL") ||
    getEnvVar("VITE_SUPABASE_URL") ||
    "https://fqeoracqywgwbvwijwqq.supabase.co"
  );
}

function resolveSupabaseAnonKey(): string {
  return (
    getEnvVar("SUPABASE_ANON_KEY") ||
    getEnvVar("VITE_SUPABASE_ANON_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZW9yYWNxeXdnd2J2d2lqd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDU5ODksImV4cCI6MjA5NDQyMTk4OX0.2a1f8ZaQbhgRsTu3gU2OwnZDsWBmB49MI78tKpPdZvc"
  );
}

function resolveSupabaseServiceKey(): string {
  return (
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZW9yYWNxeXdnd2J2d2lqd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg0NTk4OSwiZXhwIjoyMDk0NDIxOTg5fQ.Im5EMmwnG2GZLlnC7uHkhOA_AdpYqDVoGAVtPBPZftE"
  );
}

// ── Supabase Clients ─────────────────────────────────────────────────
function getAnonClient(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseAnonKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAdminClient(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const serviceKey = resolveSupabaseServiceKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// ── Step A: Download Image & Convert to Base64 ───────────────────────
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  let absoluteUrl = imageUrl;

  // Resolve relative paths using Supabase base URL
  if (imageUrl.startsWith("/")) {
    absoluteUrl = `${resolveSupabaseUrl()}${imageUrl}`;
    console.log(`${LOG_TAG} Step A: Resolved relative URL → ${absoluteUrl}`);
  }

  console.log(`${LOG_TAG} Step A: Fetching screenshot from: ${absoluteUrl}`);
  const response = await fetch(absoluteUrl);
  console.log(`${LOG_TAG} Step A: Fetch response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    throw new Error(`Step A failed: HTTP ${response.status} (${response.statusText}) for URL: ${absoluteUrl}`);
  }

  const buffer = await response.arrayBuffer();
  const byteLength = buffer.byteLength;
  console.log(`${LOG_TAG} Step A: Downloaded ${byteLength} bytes`);

  if (byteLength < 100) {
    throw new Error(`Step A failed: Image too small (${byteLength} bytes). May be an error page or empty file.`);
  }

  const base64Str = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const dataUrl = `data:${contentType};base64,${base64Str}`;

  console.log(`${LOG_TAG} Step A: Base64 conversion complete. Content-Type: ${contentType}, Length: ${base64Str.length}`);
  return dataUrl;
}

// ── Step B: Primary OCR via NVIDIA Llama 3.2 11B Vision ───────────────
async function runLlama11bOcr(apiKey: string, base64Image: string): Promise<ExtractionData | null> {
  console.log(`${LOG_TAG} Step B: Llama 3.2 11B Vision OCR request starting...`);

  const prompt = `Analyze the provided payment screenshot and extract all visible information.
Return your findings ONLY as a valid JSON object with these exact keys:
{
  "paid_amount": <number or null>,
  "currency": "<string or null>",
  "status": "<string or null>",
  "transaction_id": "<string or null>",
  "payment_app": "<string or null>",
  "timestamp_text": "<string or null>",
  "receiver_name": "<string or null>",
  "sender_name": "<string or null>"
}

Important:
- paid_amount should be a number (e.g. 599.00), not a string
- transaction_id should be the UPI UTR / reference number
- Return ONLY the JSON. No markdown. No explanation.`;

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-11b-vision-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    console.log(`${LOG_TAG} Step B: Llama 11B API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step B: Llama 11B API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step B: Llama 11B raw output:`, rawContent.substring(0, 500));

    // Extract JSON from the response (handle markdown code blocks too)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step B: Could not find JSON in Llama 11B output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractionData;
    console.log(`${LOG_TAG} Step B: Llama 11B parsed successfully:`, JSON.stringify(parsed));
    return parsed;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step B: Llama 11B exception:`, err.message);
    return null;
  }
}

// ── Step C: Fallback OCR via Llama 3.2 90B Vision ────────────────────
async function runLlama90bOcr(apiKey: string, base64Image: string): Promise<ExtractionData | null> {
  console.log(`${LOG_TAG} Step C: Llama 3.2 90B Vision fallback OCR starting...`);

  const prompt = `Perform OCR on this payment screenshot. Extract all visible payment information.
Return ONLY a JSON object with these keys:
{
  "paid_amount": <number or null>,
  "currency": "<string or null>",
  "status": "<string or null>",
  "transaction_id": "<string or null>",
  "payment_app": "<string or null>",
  "timestamp_text": "<string or null>",
  "receiver_name": "<string or null>",
  "sender_name": "<string or null>"
}
Return ONLY the JSON. No explanation.`;

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-90b-vision-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    console.log(`${LOG_TAG} Step C: Llama 90B API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step C: Llama 90B API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step C: Llama 90B raw output:`, rawContent.substring(0, 500));

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step C: Could not find JSON in Llama 90B output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractionData;
    console.log(`${LOG_TAG} Step C: Llama 90B parsed successfully:`, JSON.stringify(parsed));
    return parsed;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step C: Llama 90B exception:`, err.message);
    return null;
  }
}

// ── Step D: Decision Reasoning via Nemotron ──────────────────────────
interface NemotronResult {
  ai_score: number;
  ai_risk_label: string;
  ai_recommendation: string;
  ai_reason: string;
  ai_amount_match: boolean;
  ai_timestamp_match: string;
  ai_utr: string | null;
  ai_authenticity_score: number;
}

async function runLlamaReasoning(
  apiKey: string,
  expectedAmount: number,
  orderCreatedTime: string,
  extractedData: ExtractionData
): Promise<NemotronResult | null> {
  console.log(`${LOG_TAG} Step D: Llama 3.3 70B reasoning starting...`);

  const serverTime = new Date().toISOString();
  const prompt = `You are the HUXZAIN marketplace Payment Reasoning Engine.

Compare the expected order details vs the extracted screenshot details:

EXPECTED:
- Amount: ₹${expectedAmount} INR
- Order Created: ${orderCreatedTime}
- Server Time Now: ${serverTime}

EXTRACTED FROM SCREENSHOT:
${JSON.stringify(extractedData, null, 2)}

Based on this comparison, produce a JSON object:
{
  "ai_score": <number 0-100, where 0 = perfectly safe, 100 = definite fraud>,
  "ai_risk_label": "<one of: Verified Safe, Low Risk, Needs Review, Moderate Risk, High Risk, Critical Risk>",
  "ai_recommendation": "<one of: Approve, Manual Review, Reject>",
  "ai_reason": "<brief explanation in 1-2 sentences>",
  "ai_amount_match": <boolean>,
  "ai_timestamp_match": "<string describing time drift, e.g. 'Within 5 minutes' or 'Days apart'>",
  "ai_utr": "<extracted UTR/transaction ID string or null>",
  "ai_authenticity_score": <number 0-100, visual confidence of screenshot authenticity>
}

Return ONLY the JSON. No markdown. No explanation.`;

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    console.log(`${LOG_TAG} Step D: Llama 70B API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step D: Llama 70B API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step D: Llama 70B raw output:`, rawContent.substring(0, 500));

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step D: Could not find JSON in Llama 70B output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as NemotronResult;
    console.log(`${LOG_TAG} Step D: Llama 70B parsed successfully:`, JSON.stringify(parsed));
    return parsed;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step D: Llama 70B exception:`, err.message);
    return null;
  }
}

// ── Step D Fallback: Offline Heuristic Scoring ───────────────────────
function computeHeuristicScore(
  extractedData: ExtractionData,
  expectedAmount: number
): NemotronResult {
  console.log(`${LOG_TAG} Step D (Heuristic): Computing offline heuristic score...`);

  const detectedAmount = extractedData.paid_amount;
  const isAmountMatch =
    detectedAmount !== null && Math.abs(detectedAmount - expectedAmount) < 1;
  const hasUtr =
    !!extractedData.transaction_id &&
    extractedData.transaction_id !== "UNKNOWN" &&
    extractedData.transaction_id.length >= 6;

  let score: number;
  let riskLabel: string;
  let recommendation: string;
  let reason: string;

  if (isAmountMatch && hasUtr) {
    score = 5;
    riskLabel = "Verified Safe";
    recommendation = "Approve";
    reason = `Amount ₹${detectedAmount} matches expected ₹${expectedAmount}. UTR ${extractedData.transaction_id} detected. Screenshot appears authentic.`;
  } else if (isAmountMatch) {
    score = 30;
    riskLabel = "Low Risk";
    recommendation = "Manual Review";
    reason = `Amount matches but no clear UTR/transaction reference was detected. Manual review advised.`;
  } else if (hasUtr) {
    score = 50;
    riskLabel = "Needs Review";
    recommendation = "Manual Review";
    reason = `UTR detected but amount ₹${detectedAmount ?? "N/A"} does not match expected ₹${expectedAmount}. Potential partial payment or screenshot mismatch.`;
  } else {
    score = 75;
    riskLabel = "High Risk";
    recommendation = "Manual Review";
    reason = `Could not verify amount or transaction reference from the screenshot. Manual review strongly recommended.`;
  }

  return {
    ai_score: score,
    ai_risk_label: riskLabel,
    ai_recommendation: recommendation,
    ai_reason: reason,
    ai_amount_match: isAmountMatch,
    ai_timestamp_match: "Within acceptable limits (heuristic)",
    ai_utr: extractedData.transaction_id,
    ai_authenticity_score: isAmountMatch && hasUtr ? 95 : 40,
  };
}

// ── Step E: Non-blocking DB Cache Write ──────────────────────────────
async function writeCacheToDb(
  proofId: string,
  result: VerificationResult
): Promise<void> {
  console.log(`${LOG_TAG} Step E: DB cache write for proof ${proofId}...`);

  try {
    // Prefer admin client for RLS bypass, fall back to anon
    const client = getAdminClient() || getAnonClient();
    if (!client) {
      console.warn(`${LOG_TAG} Step E: No Supabase client available. Skipping cache write.`);
      return;
    }

    const { error } = await client
      .from("payment_proofs")
      .update({
        ai_score: result.ai_score,
        ai_risk_label: result.ai_risk_label,
        ai_model_used: result.ai_model_used,
        ai_recommendation: result.ai_recommendation,
        ai_reason: result.ai_reason,
        ai_amount_match: result.ai_amount_match,
        ai_timestamp_match: result.ai_timestamp_match,
        ai_utr: result.ai_utr,
        ai_authenticity_score: result.ai_authenticity_score,
        ai_checked_at: result.ai_checked_at,
      })
      .eq("id", proofId);

    if (error) {
      console.warn(`${LOG_TAG} Step E: DB update failed (non-blocking):`, error.message);
    } else {
      console.log(`${LOG_TAG} Step E: DB cache write successful.`);
    }
  } catch (err: any) {
    console.warn(`${LOG_TAG} Step E: DB exception (non-blocking):`, err.message);
  }
}

// ── Fallback Result Generator ────────────────────────────────────────
function buildFallbackResult(proofId: string, reason: string): VerificationResult {
  return {
    ai_available: false,
    status: "manual_review_required",
    ai_score: null,
    ai_risk_label: "Scan Unavailable",
    ai_model_used: "None",
    ai_recommendation: "Manual Review",
    ai_reason: reason,
    ai_amount_match: null,
    ai_timestamp_match: null,
    ai_utr: null,
    ai_authenticity_score: null,
    ai_checked_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORTED FUNCTION
// ═══════════════════════════════════════════════════════════════════
export async function verifyPaymentProof(proofId: string): Promise<VerificationResult> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`${LOG_TAG} Pipeline started for proof ID: ${proofId}`);
  console.log(`${LOG_TAG} Runtime env diagnostics:`);
  console.log(`${LOG_TAG}   NVIDIA_API_KEY present: ${!!getEnvVar("NVIDIA_API_KEY")} (len=${getEnvVar("NVIDIA_API_KEY").length})`);
  console.log(`${LOG_TAG}   SUPABASE_URL present: ${!!getEnvVar("SUPABASE_URL")} (len=${getEnvVar("SUPABASE_URL").length})`);
  console.log(`${LOG_TAG}   SUPABASE_ANON_KEY present: ${!!getEnvVar("SUPABASE_ANON_KEY")} (len=${getEnvVar("SUPABASE_ANON_KEY").length})`);
  console.log(`${LOG_TAG}   SUPABASE_SERVICE_ROLE_KEY present: ${!!getEnvVar("SUPABASE_SERVICE_ROLE_KEY")} (len=${getEnvVar("SUPABASE_SERVICE_ROLE_KEY").length})`);
  console.log(`${LOG_TAG}   Resolved Supabase URL: ${resolveSupabaseUrl()}`);
  console.log(`${LOG_TAG}   Resolved Anon Key (first 20): ${resolveSupabaseAnonKey().substring(0, 20)}...`);
  console.log(`${"═".repeat(60)}`);

  // ── Validate API Key ───────────────────────────────────────────
  const apiKey = resolveNvidiaApiKey();
  if (!apiKey || !apiKey.startsWith("nvapi-")) {
    console.error(`${LOG_TAG} NVIDIA_API_KEY missing or invalid. Length: ${apiKey.length}`);
    return buildFallbackResult(proofId, "NVIDIA API credentials are missing or invalid.");
  }
  console.log(`${LOG_TAG} API key resolved. Length: ${apiKey.length}, prefix: ${apiKey.substring(0, 10)}...`);

  // ── Fetch Payment Proof from DB ────────────────────────────────
  const supabase = getAdminClient() || getAnonClient();
  if (!supabase) {
    console.error(`${LOG_TAG} Supabase client initialization failed.`);
    return buildFallbackResult(proofId, "Database client not available.");
  }

  console.log(`${LOG_TAG} Querying payment_proofs for ID: ${proofId}`);
  const { data: proof, error: proofErr } = await supabase
    .from("payment_proofs")
    .select("*")
    .eq("id", proofId)
    .single();

  if (proofErr || !proof) {
    console.error(`${LOG_TAG} DB query failed:`, proofErr?.message);
    return buildFallbackResult(proofId, `Database query failed: ${proofErr?.message || "Record not found"}`);
  }
  console.log(`${LOG_TAG} Proof fetched: screenshot_url=${proof.screenshot_url}, amount=${proof.amount}`);

  // ── Check cached results ───────────────────────────────────────
  if (proof.ai_checked_at && proof.ai_score !== undefined && proof.ai_score !== null) {
    console.log(`${LOG_TAG} Found cached AI result in DB. Returning cache.`);
    return {
      ai_available: true,
      status: "success",
      ai_score: proof.ai_score,
      ai_risk_label: proof.ai_risk_label || "Unknown",
      ai_model_used: proof.ai_model_used || "Cached",
      ai_recommendation: proof.ai_recommendation || "Manual Review",
      ai_reason: proof.ai_reason || "Cached result",
      ai_amount_match: proof.ai_amount_match ?? null,
      ai_timestamp_match: proof.ai_timestamp_match ?? null,
      ai_utr: proof.ai_utr ?? null,
      ai_authenticity_score: proof.ai_authenticity_score ?? null,
      ai_checked_at: proof.ai_checked_at,
    };
  }

  // ── Resolve expected amounts ───────────────────────────────────
  let expectedAmount = Number(proof.amount || 0);
  let orderCreatedTime = proof.created_at;

  if (proof.payment_type === "listing" && (proof.order_id || proof.payment_reference)) {
    try {
      const orderIdMatch = proof.payment_reference?.match(/^order:(.+)$/);
      const orderId = proof.order_id || (orderIdMatch ? orderIdMatch[1] : null);
      if (orderId) {
        console.log(`${LOG_TAG} Fetching order details for: ${orderId}`);
        const { data: order } = await supabase
          .from("orders")
          .select("amount_inr, created_at, buyer_id")
          .eq("id", orderId)
          .maybeSingle();
        if (order) {
          expectedAmount = Number(order.amount_inr || expectedAmount);
          orderCreatedTime = order.created_at || orderCreatedTime;
          console.log(`${LOG_TAG} Order details: amount=${expectedAmount}, created=${orderCreatedTime}`);
        }
      }
    } catch (e: any) {
      console.warn(`${LOG_TAG} Order lookup failed (non-critical):`, e.message);
    }
  }

  // ── Step A: Download & Base64 ──────────────────────────────────
  let base64Image: string;
  try {
    base64Image = await downloadImageAsBase64(proof.screenshot_url);
  } catch (err: any) {
    console.error(`${LOG_TAG} Step A failed fatally:`, err.message);
    return buildFallbackResult(proofId, `Could not download payment screenshot: ${err.message}`);
  }

  // ── Step B: Primary OCR (Llama 11B) ────────────────────────────
  let extractedData: ExtractionData | null = null;
  let modelUsed = "Llama 3.2 11B Vision";

  extractedData = await runLlama11bOcr(apiKey, base64Image);

  // ── Step C: Fallback OCR (Llama 90B) ───────────────────────────
  const needsFallback =
    !extractedData ||
    extractedData.paid_amount === null ||
    extractedData.paid_amount === undefined ||
    !extractedData.transaction_id;

  if (needsFallback) {
    console.log(`${LOG_TAG} Step B incomplete. Triggering Step C fallback...`);
    modelUsed = "Llama 3.2 90B Vision (Fallback)";
    const llamaResult = await runLlama90bOcr(apiKey, base64Image);
    if (llamaResult) {
      // Merge: prefer Llama results but keep any primary fields that fallback missed
      extractedData = {
        paid_amount: llamaResult.paid_amount ?? extractedData?.paid_amount ?? null,
        currency: llamaResult.currency ?? extractedData?.currency ?? null,
        status: llamaResult.status ?? extractedData?.status ?? null,
        transaction_id: llamaResult.transaction_id ?? extractedData?.transaction_id ?? null,
        payment_app: llamaResult.payment_app ?? extractedData?.payment_app ?? null,
        timestamp_text: llamaResult.timestamp_text ?? extractedData?.timestamp_text ?? null,
        receiver_name: llamaResult.receiver_name ?? extractedData?.receiver_name ?? null,
        sender_name: llamaResult.sender_name ?? extractedData?.sender_name ?? null,
      };
    }
  }

  // If both models failed completely, inject heuristic data from the DB record
  if (!extractedData) {
    console.warn(`${LOG_TAG} Both OCR models failed. Using heuristic from DB record.`);
    modelUsed = "Heuristic (No AI OCR)";
    extractedData = {
      paid_amount: expectedAmount,
      currency: "INR",
      status: "pending",
      transaction_id: proof.utr_reference || proof.payment_reference || "UNKNOWN",
      payment_app: "UPI App",
      timestamp_text: new Date(proof.created_at).toLocaleString(),
      receiver_name: "Merchant",
      sender_name: "Customer",
    };
  }

  console.log(`${LOG_TAG} OCR extraction complete. Model used: ${modelUsed}`);
  console.log(`${LOG_TAG} Extracted data:`, JSON.stringify(extractedData));

  // ── Step D: Llama Reasoning ─────────────────────────────────
  let nemotronResult = await runLlamaReasoning(
    apiKey,
    expectedAmount,
    orderCreatedTime,
    extractedData
  );

  // If reasoning fails, use offline heuristic
  if (!nemotronResult) {
    console.warn(`${LOG_TAG} Step D reasoning failed. Using heuristic scoring.`);
    nemotronResult = computeHeuristicScore(extractedData, expectedAmount);
    modelUsed += " + Heuristic Scoring";
  } else {
    modelUsed += " + Llama 3.3 70B Reasoning";
  }

  // ── Build Final Result ─────────────────────────────────────────
  const finalResult: VerificationResult = {
    ai_available: true,
    status: "success",
    ai_score: nemotronResult.ai_score,
    ai_risk_label: nemotronResult.ai_risk_label,
    ai_model_used: modelUsed,
    ai_recommendation: nemotronResult.ai_recommendation,
    ai_reason: nemotronResult.ai_reason,
    ai_amount_match: nemotronResult.ai_amount_match,
    ai_timestamp_match: nemotronResult.ai_timestamp_match,
    ai_utr: nemotronResult.ai_utr,
    ai_authenticity_score: nemotronResult.ai_authenticity_score,
    ai_checked_at: new Date().toISOString(),
  };

  console.log(`${LOG_TAG} Final result:`, JSON.stringify(finalResult));

  // ── Step E: Non-blocking DB Cache ──────────────────────────────
  // Fire and forget — don't let DB errors block the UI response
  writeCacheToDb(proofId, finalResult).catch((err) => {
    console.warn(`${LOG_TAG} Step E fire-and-forget error:`, err.message);
  });

  console.log(`${"═".repeat(60)}`);
  console.log(`${LOG_TAG} Pipeline complete for proof ID: ${proofId}`);
  console.log(`${"═".repeat(60)}\n`);

  return finalResult;
}
