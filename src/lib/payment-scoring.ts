/**
 * payment-scoring.ts
 *
 * Pure deterministic Fraud Confidence Score calculator.
 * Input  : OCR data extracted by Slip Miner
 * Output : score (1–100), risk_level, recommendation, reason, breakdown
 *
 * NO AI. NO API CALLS. NO EXTERNAL MODELS.
 * Only code logic applied to the OCR JSON response fields.
 */

export interface OcrPayload {
  amount?: string | number | null;
  currency?: string | null;
  date?: string | null;
  time?: string | null;
  transaction_id?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  payment_status?: string | null;
  payment_app?: string | null;
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  max: number;
  passed: boolean;
  detail: string;
}

export interface PaymentScore {
  score: number;
  risk_level: "Low Risk" | "Medium Risk" | "High Risk";
  recommendation: "Approve" | "Manual Review" | "Suspicious / Review Carefully";
  reason: string;
  breakdown: ScoreBreakdownItem[];
}

// ─────────────────────────────────────────────────────────────────
// Known legitimate UPI payment apps (case-insensitive)
// ─────────────────────────────────────────────────────────────────
const KNOWN_APPS = ["paytm", "phonepe", "gpay", "google pay", "upi", "bhim", "amazon pay", "mobikwik", "freecharge"];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const cleaned = String(raw).replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function isValidDate(raw: string | null | undefined): boolean {
  if (!raw) return false;
  // Accept: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, common formats
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/, // 2024-04-04
    /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/, // 04/04/2024
    /^\d{2}\s+\w+\s+\d{4}$/, // 04 Apr 2024
  ];
  return patterns.some((p) => p.test(raw.trim()));
}

function isValidTime(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return /\d{1,2}:\d{2}/.test(raw.trim());
}

function isValidTransactionId(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  // Must be at least 8 characters and alphanumeric
  return trimmed.length >= 8 && /^[a-zA-Z0-9\-_]+$/.test(trimmed);
}

// ─────────────────────────────────────────────────────────────────
// Core Scoring Function
// ─────────────────────────────────────────────────────────────────
export function scorePayment(
  ocr: OcrPayload,
  expectedAmount?: number | null
): PaymentScore {
  const breakdown: ScoreBreakdownItem[] = [];
  const reasons: string[] = [];
  let total = 0;

  // ── 1. Amount Match (+30 exact, +20 tolerance, 0 mismatch) ──────
  const ocrAmount = parseAmount(ocr.amount);
  let amountPoints = 0;
  let amountDetail = "Amount missing from OCR";

  if (ocrAmount !== null) {
    if (expectedAmount !== null && expectedAmount !== undefined && expectedAmount > 0) {
      const diff = Math.abs(ocrAmount - expectedAmount);
      const pct = diff / expectedAmount;
      if (pct === 0) {
        amountPoints = 30;
        amountDetail = `Exact match ₹${ocrAmount}`;
        reasons.push("Amount matched exactly");
      } else if (pct <= 0.02) {
        // within 2% tolerance
        amountPoints = 20;
        amountDetail = `Near match ₹${ocrAmount} vs expected ₹${expectedAmount}`;
        reasons.push("Amount within tolerance");
      } else {
        amountPoints = 0;
        amountDetail = `Mismatch ₹${ocrAmount} vs expected ₹${expectedAmount}`;
        reasons.push("Amount mismatch — verify manually");
      }
    } else {
      // No expected amount to compare against — give partial credit for presence
      amountPoints = 20;
      amountDetail = `OCR amount ₹${ocrAmount} (no expected amount to compare)`;
      reasons.push("Amount present in OCR");
    }
  }

  breakdown.push({
    label: "Amount",
    points: amountPoints,
    max: 30,
    passed: amountPoints > 0,
    detail: amountDetail,
  });
  total += amountPoints;

  // ── 2. Transaction ID (+25) ──────────────────────────────────────
  const txValid = isValidTransactionId(ocr.transaction_id);
  const txPoints = txValid ? 25 : 0;
  const txDetail = txValid
    ? `UTR/TxID: ${ocr.transaction_id}`
    : "Transaction ID missing or too short";
  if (txValid) reasons.push("Valid UTR/transaction ID detected");

  breakdown.push({
    label: "Transaction ID",
    points: txPoints,
    max: 25,
    passed: txValid,
    detail: txDetail,
  });
  total += txPoints;

  // ── 3. Payment Status (+20 success, +10 pending, 0 else) ─────────
  const status = (ocr.payment_status ?? "").toLowerCase().trim();
  let statusPoints = 0;
  let statusDetail = `Status: ${ocr.payment_status ?? "missing"}`;

  if (status === "success" || status === "successful" || status === "completed") {
    statusPoints = 20;
    reasons.push("Payment status: success");
  } else if (status === "pending") {
    statusPoints = 10;
    statusDetail = "Status: pending (partial credit)";
    reasons.push("Payment status: pending");
  } else if (status) {
    statusPoints = 0;
    statusDetail = `Status: ${ocr.payment_status} (unrecognised)`;
  } else {
    statusDetail = "Payment status missing";
  }

  breakdown.push({
    label: "Payment Status",
    points: statusPoints,
    max: 20,
    passed: statusPoints > 0,
    detail: statusDetail,
  });
  total += statusPoints;

  // ── 4. Sender / Receiver Presence (+5 each) ──────────────────────
  const hasSender = !!(ocr.sender_name?.trim());
  const hasReceiver = !!(ocr.receiver_name?.trim());
  const namesPoints = (hasSender ? 5 : 0) + (hasReceiver ? 5 : 0);

  if (hasSender) reasons.push(`Sender identified: ${ocr.sender_name}`);
  if (hasReceiver) reasons.push(`Receiver identified: ${ocr.receiver_name}`);

  breakdown.push({
    label: "Sender / Receiver",
    points: namesPoints,
    max: 10,
    passed: namesPoints > 0,
    detail: [
      hasSender ? `Sender: ${ocr.sender_name}` : "Sender missing",
      hasReceiver ? `Receiver: ${ocr.receiver_name}` : "Receiver missing",
    ].join(" · "),
  });
  total += namesPoints;

  // ── 5. Date / Time (+5 each) ─────────────────────────────────────
  const dateOk = isValidDate(ocr.date);
  const timeOk = isValidTime(ocr.time);
  const dtPoints = (dateOk ? 5 : 0) + (timeOk ? 5 : 0);

  breakdown.push({
    label: "Date / Time",
    points: dtPoints,
    max: 10,
    passed: dtPoints > 0,
    detail: [
      dateOk ? `Date: ${ocr.date}` : "Date missing/invalid",
      timeOk ? `Time: ${ocr.time}` : "Time missing",
    ].join(" · "),
  });
  total += dtPoints;

  // ── 6. Payment App Known (+5) ────────────────────────────────────
  const appRaw = (ocr.payment_app ?? "").toLowerCase().trim();
  const appKnown = KNOWN_APPS.some((a) => appRaw.includes(a));
  const appPoints = appKnown ? 5 : 0;

  if (appKnown) reasons.push(`Payment app: ${ocr.payment_app}`);

  breakdown.push({
    label: "Payment App",
    points: appPoints,
    max: 5,
    passed: appKnown,
    detail: appKnown ? `${ocr.payment_app} (recognised)` : `${ocr.payment_app || "missing"} (unknown app)`,
  });
  total += appPoints;

  // ── Clamp to 1–100 ───────────────────────────────────────────────
  const score = Math.max(1, Math.min(100, total));

  // ── Risk Level & Recommendation ──────────────────────────────────
  let risk_level: PaymentScore["risk_level"];
  let recommendation: PaymentScore["recommendation"];

  if (score >= 80) {
    risk_level = "Low Risk";
    recommendation = "Approve";
  } else if (score >= 50) {
    risk_level = "Medium Risk";
    recommendation = "Manual Review";
  } else {
    risk_level = "High Risk";
    recommendation = "Suspicious / Review Carefully";
  }

  const reason =
    reasons.length > 0
      ? reasons.join(", ")
      : "Insufficient OCR data to verify payment";

  return { score, risk_level, recommendation, reason, breakdown };
}
