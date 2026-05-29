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

// ── Helpers ──────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    throw err;
  }
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
  console.log("[AI] Fetching screenshot");
  
  let response;
  try {
    response = await fetchWithTimeout(absoluteUrl, {}, 8000);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error("Image download timeout");
    }
    throw err;
  }

  console.log(`${LOG_TAG} Step A: Fetch response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    throw new Error(`Step A failed: HTTP ${response.status} (${response.statusText}) for URL: ${absoluteUrl}`);
  }

  const buffer = await response.arrayBuffer();
  const byteLength = buffer.byteLength;
  console.log("[AI] Screenshot fetched successfully");
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

// ── Step B: Primary OCR via microsoft/phi-4-multimodal-instruct ───────────────
async function runPhi4Ocr(apiKey: string, base64Image: string): Promise<ExtractionData | null> {
  console.log(`${LOG_TAG} Step B: Phi-4 Multimodal OCR request starting...`);
  console.log("[AI] Running Phi-4");

  const prompt = `Analyze the provided payment screenshot and extract all visible information.
Return your findings ONLY as a valid JSON object with these exact keys:
{
  "paid_amount": <number or null>,
  "currency": "<string or null>",
  "payment_status": "<string or null>",
  "transaction_id": "<string or null>",
  "payment_app": "<string or null>",
  "timestamp_text": "<string or null>",
  "receiver_name": "<string or null>",
  "sender_name": "<string or null>"
}

Important:
- paid_amount should be a number (e.g. 599.00), not a string
- transaction_id should be the UPI UTR / reference number
- Return strict JSON only. No markdown. No explanation.`;

  try {
    const response = await fetchWithTimeout(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "microsoft/phi-4-multimodal-instruct",
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
    }, 20000);

    console.log(`${LOG_TAG} Step B: Phi-4 API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step B: Phi-4 API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step B: Phi-4 raw output:`, rawContent.substring(0, 500));

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step B: Could not find JSON in Phi-4 output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    // Map payment_status to status
    const mapped: ExtractionData = {
      paid_amount: parsed.paid_amount ?? null,
      currency: parsed.currency ?? null,
      status: parsed.payment_status ?? parsed.status ?? null,
      transaction_id: parsed.transaction_id ?? null,
      payment_app: parsed.payment_app ?? null,
      timestamp_text: parsed.timestamp_text ?? null,
      receiver_name: parsed.receiver_name ?? null,
      sender_name: parsed.sender_name ?? null,
    };
    
    console.log(`${LOG_TAG} Step B: Phi-4 parsed successfully:`, JSON.stringify(mapped));
    console.log("[AI] Phi-4 completed");
    return mapped;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step B: Phi-4 exception:`, err.message);
    return null;
  }
}

// ── Step C: Fallback OCR via google/paligemma ────────────────────
async function runPaliGemmaFallbackOcr(apiKey: string, base64Image: string): Promise<ExtractionData | null> {
  console.log(`${LOG_TAG} Step C: PaliGemma fallback OCR starting...`);
  console.log("[AI] Running PaliGemma fallback");

  const prompt = `Perform OCR on this payment screenshot. Focus on fallback OCR, screenshot validation, cropped image detection, edited screenshot detection, and UI authenticity detection.
Return ONLY a JSON object with these keys:
{
  "paid_amount": <number or null>,
  "currency": "<string or null>",
  "status": "<string or null>",
  "transaction_id": "<string or null>",
  "payment_app": "<string or null>",
  "timestamp_text": "<string or null>",
  "receiver_name": "<string or null>",
  "sender_name": "<string or null>",
  "is_edited": <boolean>,
  "is_cropped": <boolean>,
  "authenticity_confidence": <number 0-100>
}
Return strict JSON. No explanation.`;

  try {
    const response = await fetchWithTimeout(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/paligemma",
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
    }, 12000);

    console.log(`${LOG_TAG} Step C: PaliGemma API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step C: PaliGemma API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step C: PaliGemma raw output:`, rawContent.substring(0, 500));

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step C: Could not find JSON in PaliGemma output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractionData;
    console.log(`${LOG_TAG} Step C: PaliGemma parsed successfully:`, JSON.stringify(parsed));
    return parsed;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step C: PaliGemma exception:`, err.message);
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

async function runMistralNemotronReasoning(
  apiKey: string,
  expectedAmount: number,
  orderCreatedTime: string,
  extractedData: ExtractionData
): Promise<NemotronResult | null> {
  console.log(`${LOG_TAG} Step D: Mistral Nemotron reasoning starting...`);
  console.log("[AI] Running Mistral Nemotron");

  const serverTime = new Date().toISOString();
  const prompt = `You are the HUXZAIN marketplace Payment Reasoning Engine.

Compare the expected order details vs the extracted screenshot details:

EXPECTED:
- Amount: ₹${expectedAmount} INR
- Order Created: ${orderCreatedTime}
- Server Time Now: ${serverTime}

EXTRACTED FROM SCREENSHOT:
${JSON.stringify(extractedData, null, 2)}

Based on this comparison, produce a strict JSON object exactly like this:
{
  "score": <number 0-100, where 0 = perfectly safe, 100 = definite fraud>,
  "risk_label": "<one of: Verified Safe, Low Risk, Needs Review, Moderate Risk, High Risk, Critical Risk>",
  "recommendation": "<one of: Approve, Manual Review, Reject>",
  "reason": "<brief explanation in 1-2 sentences>",
  "amount_match": <boolean>,
  "timestamp_match": "<string describing time drift, e.g. 'Within 5 minutes'>",
  "utr": "<extracted UTR/transaction ID string or null>",
  "authenticity_score": <number 0-100>
}

Return ONLY the JSON. No markdown. No explanation.`;

  try {
    const response = await fetchWithTimeout(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistralai/mistral-nemotron",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.1,
      }),
    }, 12000);

    console.log(`${LOG_TAG} Step D: Mistral Nemotron API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`${LOG_TAG} Step D: Mistral Nemotron API error body:`, errBody);
      return null;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    console.log(`${LOG_TAG} Step D: Mistral Nemotron raw output:`, rawContent.substring(0, 500));

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`${LOG_TAG} Step D: Could not find JSON in Mistral Nemotron output`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const mapped: NemotronResult = {
      ai_score: parsed.score ?? 50,
      ai_risk_label: parsed.risk_label ?? "Needs Review",
      ai_recommendation: parsed.recommendation ?? "Manual Review",
      ai_reason: parsed.reason ?? "AI Reasoning completed",
      ai_amount_match: parsed.amount_match ?? false,
      ai_timestamp_match: parsed.timestamp_match ?? "Unknown",
      ai_utr: parsed.utr ?? null,
      ai_authenticity_score: parsed.authenticity_score ?? 50,
    };
    console.log(`${LOG_TAG} Step D: Mistral Nemotron parsed successfully:`, JSON.stringify(mapped));
    return mapped;
  } catch (err: any) {
    console.error(`${LOG_TAG} Step D: Mistral Nemotron exception:`, err.message);
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

  return {
    ai_score: 0, // We must return a number per interface, using 0 as placeholder
    ai_risk_label: "Scoring unavailable",
    ai_recommendation: "Manual Review",
    ai_reason: "Manual review required",
    ai_amount_match: isAmountMatch,
    ai_timestamp_match: extractedData.timestamp_text || "Unknown",
    ai_utr: extractedData.transaction_id,
    ai_authenticity_score: 0,
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
function buildFallbackResult(proofId: string, reason: string): any {
  return {
    success: false,
    status: "manual_review",
    reason: "AI analysis unavailable",
    recommendation: "Manual Review",
    // Keep interface compatibility just in case
    ai_available: false,
    ai_score: null,
    ai_risk_label: "Manual Review",
    ai_model_used: "None",
    ai_recommendation: "Manual Review",
    ai_reason: "AI analysis unavailable",
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
async function verifyPaymentProofInternal(proofId: string): Promise<VerificationResult> {
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

  // ── Step B: Primary OCR (Phi-4) ────────────────────────────
  let extractedData: ExtractionData | null = null;
  let modelUsed = "microsoft/phi-4-multimodal-instruct";

  extractedData = await runPhi4Ocr(apiKey, base64Image);

  // ── Step C: Fallback OCR (PaliGemma) ───────────────────────────
  const needsFallback =
    !extractedData ||
    extractedData.paid_amount === null ||
    extractedData.paid_amount === undefined ||
    !extractedData.transaction_id;

  if (needsFallback) {
    console.log(`${LOG_TAG} Step B incomplete. Triggering Step C fallback...`);
    modelUsed = "google/paligemma (Fallback)";
    const fallbackResult = await runPaliGemmaFallbackOcr(apiKey, base64Image);
    if (fallbackResult) {
      // Merge: prefer fallback results but keep any primary fields that fallback missed
      extractedData = {
        paid_amount: fallbackResult.paid_amount ?? extractedData?.paid_amount ?? null,
        currency: fallbackResult.currency ?? extractedData?.currency ?? null,
        status: fallbackResult.status ?? extractedData?.status ?? null,
        transaction_id: fallbackResult.transaction_id ?? extractedData?.transaction_id ?? null,
        payment_app: fallbackResult.payment_app ?? extractedData?.payment_app ?? null,
        timestamp_text: fallbackResult.timestamp_text ?? extractedData?.timestamp_text ?? null,
        receiver_name: fallbackResult.receiver_name ?? extractedData?.receiver_name ?? null,
        sender_name: fallbackResult.sender_name ?? extractedData?.sender_name ?? null,
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

  // ── Step D: Reasoning (Mistral Nemotron) ─────────────────────────────────
  let nemotronResult = await runMistralNemotronReasoning(
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
    modelUsed += " + mistralai/mistral-nemotron";
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

export async function verifyPaymentProof(proofId: string): Promise<VerificationResult> {
  console.log("[AI] Starting analysis");

  const timeoutPromise = new Promise<VerificationResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error("AI analysis unavailable"));
    }, 30000);
  });

  try {
    const result = await Promise.race([
      verifyPaymentProofInternal(proofId),
      timeoutPromise
    ]);
    console.log("[AI] Final result ready");
    return result;
  } catch (err: any) {
    console.log("[AI] Returning error");
    
    if (err.message === "AI analysis unavailable") {
      console.log("[AI] Timeout triggered");
      return buildFallbackResult(proofId, "AI analysis unavailable");
    }
    
    return buildFallbackResult(proofId, err.message || "Unknown error");
  }
}
