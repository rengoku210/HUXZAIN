// src/lib/ai.functions.ts
// ═══════════════════════════════════════════════════════════════════
// HUXZAIN — Lightweight TanStack Start Bridge for AI Verification
// ═══════════════════════════════════════════════════════════════════
//
// This file is a thin server function wrapper. All actual AI logic
// lives in src/server/ai/payment-verification-service.ts.
// ═══════════════════════════════════════════════════════════════════

import { createServerFn } from "@tanstack/react-start";

// ── SERVER FUNCTION: analyzePaymentProof ─────────────────────────────
export const analyzePaymentProof = createServerFn({ method: "POST" })
  .inputValidator((proofId: string) => proofId)
  .handler(async ({ data: proofId }) => {
    console.log("[AI Bridge] analyzePaymentProof called with proofId:", proofId);

    // Dynamic import to ensure server-only module is never bundled client-side
    const { verifyPaymentProof } = await import(
      "@/server/ai/payment-verification-service"
    );

    return verifyPaymentProof(proofId);
  });
