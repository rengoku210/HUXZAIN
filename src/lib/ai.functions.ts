"use server";

// src/lib/ai.functions.ts
// ═══════════════════════════════════════════════════════════════════
// HUXZAIN — TanStack Start Bridge for AI Payment Verification
// ═══════════════════════════════════════════════════════════════════
//
// This file is a thin server function wrapper. All actual AI logic
// lives in src/server/ai/payment-verification-service.ts.
//
// TanStack Start's createServerFn already ensures the handler code
// only runs on the server, so a static import is safe and preferred
// over dynamic import() which can fail on certain bundlers/runtimes.
// ═══════════════════════════════════════════════════════════════════

import { createServerFn } from "@tanstack/react-start";
import { verifyPaymentProof } from "@/server/ai/payment-verification-service";

// ── SERVER FUNCTION: analyzePaymentProof ─────────────────────────────
export const analyzePaymentProof = createServerFn({ method: "POST" })
  .inputValidator((proofId: string) => proofId)
  .handler(async ({ data: proofId }) => {
    console.log("[AI Bridge] analyzePaymentProof called with proofId:", proofId);

    try {
      const result = await verifyPaymentProof(proofId);
      console.log("[AI Bridge] Pipeline returned. ai_available:", result.ai_available, "status:", result.status);
      return result;
    } catch (err: any) {
      console.error("[AI Bridge] Pipeline threw exception:", err.stack || err.message || err);
      // Return a structured fallback so the UI gets ai_reason instead of a raw error
      return {
        ai_available: false,
        status: "manual_review_required",
        ai_score: null,
        ai_risk_label: "Pipeline Error",
        ai_model_used: "None",
        ai_recommendation: "Manual Review",
        ai_reason: `Server pipeline error: ${err.message || "Unknown error"}`,
        ai_amount_match: null,
        ai_timestamp_match: null,
        ai_utr: null,
        ai_authenticity_score: null,
        ai_checked_at: new Date().toISOString(),
      };
    }
  });

// ── SERVER FUNCTION: extractPaymentDetails (OCR) ─────────────────────
export const extractPaymentDetails = createServerFn({ method: "POST" })
  .inputValidator((proofId: string) => proofId)
  .handler(async ({ data: proofId }) => {
    console.log("[AI Bridge] extractPaymentDetails called with proofId:", proofId);
    // Dynamically import to ensure server-side isolation if needed, or use static
    const { extractPaymentOCR } = await import("@/server/ai/payment-verification-service");
    
    try {
      const result = await extractPaymentOCR(proofId);
      return result;
    } catch (err: any) {
      console.error("[AI Bridge] OCR extraction threw exception:", err.stack || err.message || err);
      throw err; // Let TanStack start catch and bubble to frontend
    }
  });
