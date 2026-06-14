/**
 * HUXZAIN Fraud Detection Engine — Chat V2
 *
 * Tiered risk-based analysis for chat messages.
 * Tiers: warning | high_risk | critical
 *
 * critical  → block message, flag conversation, notify moderators
 * high_risk → allow + flag conversation + increase risk score significantly
 * warning   → allow + create fraud event + increase risk score
 * safe      → allow (no action)
 */

export type FraudTier = "warning" | "high_risk" | "critical";

export interface FraudDetectionResult {
  isFraud: boolean;
  tier: FraudTier | null;
  detectionType: string | null;
  matchedPattern: string | null;
  confidenceScore: number;
  riskScoreDelta: number;
  shouldBlock: boolean;
  shouldFlagConversation: boolean;
  warningMessage: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL — Block message + flag + alert moderators
// Payment evasion, off-platform payment requests
// ─────────────────────────────────────────────────────────────────────────────
const CRITICAL_RULES: Array<{ pattern: RegExp; type: string; label: string }> = [
  // UPI & payment apps
  { pattern: /\bupi\b/i, type: "payment_evasion", label: "UPI mention" },
  { pattern: /\bphonepe\b/i, type: "payment_evasion", label: "PhonePe" },
  { pattern: /\bgpay\b|\bgoogle\s?pay\b/i, type: "payment_evasion", label: "Google Pay" },
  { pattern: /\bpaytm\b/i, type: "payment_evasion", label: "Paytm" },
  { pattern: /\bpay\s+me\s+direct(ly)?\b/i, type: "payment_evasion", label: "Direct payment request" },
  { pattern: /\bpay\s+outside\b/i, type: "payment_evasion", label: "Pay outside platform" },
  { pattern: /\bdirect\s+payment\b/i, type: "payment_evasion", label: "Direct payment" },
  { pattern: /\bavoid\s+(fee|fees|platform)\b/i, type: "payment_evasion", label: "Fee avoidance" },
  { pattern: /\bskip\s+(fee|fees|escrow)\b/i, type: "payment_evasion", label: "Escrow skip" },
  { pattern: /\boff[\s-]platform\b/i, type: "payment_evasion", label: "Off-platform deal" },
  { pattern: /\bbank\s+transfer\b/i, type: "payment_evasion", label: "Bank transfer" },
  { pattern: /\bneft\b|\brtgs\b|\bimps\b/i, type: "payment_evasion", label: "Bank transaction" },
  { pattern: /\bcash\s+on\s+delivery\b|\bcod\b/i, type: "payment_evasion", label: "Cash on delivery" },
  // UPI IDs (pattern: xxx@yyy)
  {
    pattern: /[a-zA-Z0-9._-]{3,}@(okaxis|oksbi|okhdfcbank|okicici|ybl|paytm|upi|apl|ibl)/i,
    type: "payment_evasion",
    label: "UPI ID shared",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HIGH RISK — Allow + flag conversation + significant risk score increase
// External contact: phone, WhatsApp, Instagram
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_RISK_RULES: Array<{ pattern: RegExp; type: string; label: string }> = [
  // Phone numbers
  {
    pattern: /(\+?91[\s-]?)?[6-9]\d{9}\b/,
    type: "phone_sharing",
    label: "Indian phone number",
  },
  {
    pattern: /(\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    type: "phone_sharing",
    label: "Phone number",
  },
  { pattern: /\bwhatsapp\b.*?\d{7,}/i, type: "contact_sharing", label: "WhatsApp with number" },
  { pattern: /\bwa\.me\/\d+/i, type: "contact_sharing", label: "WhatsApp link" },
  // Instagram
  {
    pattern: /\binstagram\.com\/[a-zA-Z0-9._]+/i,
    type: "contact_sharing",
    label: "Instagram profile link",
  },
  { pattern: /\binsta\b.*?@/i, type: "contact_sharing", label: "Instagram handle" },
  // Snapchat
  { pattern: /\bsnapchat\b|\bsnapchat\.com\b/i, type: "contact_sharing", label: "Snapchat" },
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    type: "contact_sharing",
    label: "Email address",
  },
  // Direct contact solicitation
  { pattern: /\bcall\s+me\b/i, type: "contact_sharing", label: "Call me" },
  { pattern: /\btext\s+me\b/i, type: "contact_sharing", label: "Text me" },
  { pattern: /\bmy\s+number\s+is\b/i, type: "contact_sharing", label: "Sharing phone number" },
  { pattern: /\breach\s+me\s+at\b/i, type: "contact_sharing", label: "Reach me at" },
];

// ─────────────────────────────────────────────────────────────────────────────
// WARNING — Allow + log + minor risk score increase
// Ambiguous mentions of external platforms without explicit contact
// ─────────────────────────────────────────────────────────────────────────────
const WARNING_RULES: Array<{ pattern: RegExp; type: string; label: string }> = [
  { pattern: /\bdiscord\b/i, type: "external_platform", label: "Discord mention" },
  { pattern: /\btelegram\b/i, type: "external_platform", label: "Telegram mention" },
  { pattern: /\bt\.me\b/i, type: "external_platform", label: "Telegram link pattern" },
  { pattern: /\bwhatsapp\b/i, type: "external_platform", label: "WhatsApp mention" },
  { pattern: /\bcontact\s+me\s+on\b/i, type: "external_platform", label: "Contact me on" },
  { pattern: /\bmessage\s+me\s+on\b/i, type: "external_platform", label: "Message me on" },
  { pattern: /\bdm\s+me\b/i, type: "external_platform", label: "DM me" },
  { pattern: /\bdirect\s+transfer\b/i, type: "external_platform", label: "Direct transfer mention" },
  { pattern: /\bskype\b|\bviber\b|\bline\b/i, type: "external_platform", label: "VoIP app mention" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main analysis function
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeFraudRisk(text: string): FraudDetectionResult {
  const safe: FraudDetectionResult = {
    isFraud: false,
    tier: null,
    detectionType: null,
    matchedPattern: null,
    confidenceScore: 0,
    riskScoreDelta: 0,
    shouldBlock: false,
    shouldFlagConversation: false,
    warningMessage: null,
  };

  if (!text || text.trim().length === 0) return safe;

  // Check critical first
  for (const rule of CRITICAL_RULES) {
    if (rule.pattern.test(text)) {
      return {
        isFraud: true,
        tier: "critical",
        detectionType: rule.type,
        matchedPattern: rule.label,
        confidenceScore: 95,
        riskScoreDelta: 30,
        shouldBlock: true,
        shouldFlagConversation: true,
        warningMessage:
          "⛔ Message blocked. Off-platform payment sharing or UPI evasion is strictly prohibited and violates HUXZAIN's Trust & Safety policy.",
      };
    }
  }

  // Check high risk
  for (const rule of HIGH_RISK_RULES) {
    if (rule.pattern.test(text)) {
      return {
        isFraud: true,
        tier: "high_risk",
        detectionType: rule.type,
        matchedPattern: rule.label,
        confidenceScore: 80,
        riskScoreDelta: 20,
        shouldBlock: false,
        shouldFlagConversation: true,
        warningMessage:
          "⚠️ Possible policy violation detected. Sharing personal contact details or external platforms is against HUXZAIN policy. This conversation has been flagged for review.",
      };
    }
  }

  // Check warning
  for (const rule of WARNING_RULES) {
    if (rule.pattern.test(text)) {
      return {
        isFraud: true,
        tier: "warning",
        detectionType: rule.type,
        matchedPattern: rule.label,
        confidenceScore: 60,
        riskScoreDelta: 8,
        shouldBlock: false,
        shouldFlagConversation: false,
        warningMessage:
          "⚡ Keep all communication inside HUXZAIN. Sharing external contact information may lead to account restrictions.",
      };
    }
  }

  return safe;
}

// System message body builder for different tiers
export function buildFraudSystemMessage(result: FraudDetectionResult): string {
  const prefix =
    result.tier === "critical"
      ? "[SYSTEM_FRAUD_CRITICAL]"
      : result.tier === "high_risk"
      ? "[SYSTEM_FRAUD_HIGH]"
      : "[SYSTEM_FRAUD_WARNING]";

  return `${prefix}: ${result.detectionType} detected — ${result.matchedPattern}. Risk score increased by ${result.riskScoreDelta}.`;
}
