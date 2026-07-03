/**
 * HX-007 — Finance engine config (types + documented defaults + category mapping).
 *
 * Single source of truth for the DOCUMENTED financial values. These constants
 * mirror the seed in `supabase/migrations/20260701130000_finance_engine_config.sql`
 * EXACTLY, and act as the fallback when the DB config tables are absent/unreachable
 * (so the app works before the migration is applied). DB rows OVERRIDE these.
 *
 * Values transcribed from the client docs — nothing invented:
 *   • "Seller subscription plans full detail.docx" (commission, escrow, settlement)
 *   • "Category and huxzain features.docx" (Buyer Protection)
 *
 * Undefined-in-docs values are intentionally NOT modelled with a fake number:
 *   • processing fee → 0 (Super-Admin editable)
 *   • non-gaming buyer protection above ₹1,00,000 → unavailable (flagged)
 *   • `boosting` category commission → unmapped → legacy fallback (flagged)
 */

/** Plans that carry a commission/escrow rate. `verified` is NOT one — it maps to standard. */
export type CommissionPlan = "standard" | "pro" | "elite" | "enterprise";

/** Any tier the app may hold, including `verified` (verification purchase, not a plan). */
export type AnyTier = CommissionPlan | "verified";

/** Canonical category keys — the 10 documented commission categories. */
export type CategoryKey =
  | "gaming_accounts"
  | "in_game_credits"
  | "gift_cards"
  | "software_digital_tools"
  | "coaching_services"
  | "game_buddy_services"
  | "freelance_services"
  | "digital_products"
  | "subscription_services"
  | "advertising_promotion_services";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  gaming_accounts: "Gaming Accounts",
  in_game_credits: "In-Game Credits",
  gift_cards: "Gift Cards",
  software_digital_tools: "Software & Digital Tools",
  coaching_services: "Coaching Services",
  game_buddy_services: "Game Buddy Services",
  freelance_services: "Freelance Services",
  digital_products: "Digital Products",
  subscription_services: "Subscription Services",
  advertising_promotion_services: "Advertising & Promotion Services",
};

const PLANS: CommissionPlan[] = ["standard", "pro", "elite", "enterprise"];

/** Commission %  [standard, pro, elite, enterprise] per category. */
const COMMISSION_ROWS: Record<CategoryKey, [number, number, number, number]> = {
  gaming_accounts: [18, 16, 14, 12],
  in_game_credits: [9, 8, 7, 6],
  gift_cards: [5, 4.5, 4, 3],
  software_digital_tools: [12, 11, 10, 8],
  coaching_services: [20, 18, 16, 14],
  game_buddy_services: [25, 22, 20, 18],
  freelance_services: [20, 18, 16, 14],
  digital_products: [10, 9, 8, 7],
  subscription_services: [5, 4, 3.5, 3],
  advertising_promotion_services: [10, 9, 8, 7],
};

/** Escrow hold days [standard, pro, elite, enterprise] per category (0 = Instant). */
const ESCROW_ROWS: Record<CategoryKey, [number, number, number, number]> = {
  gaming_accounts: [14, 10, 7, 5],
  in_game_credits: [3, 2, 1, 0],
  gift_cards: [3, 2, 1, 0],
  software_digital_tools: [7, 5, 3, 2],
  coaching_services: [3, 2, 1, 0],
  game_buddy_services: [3, 2, 1, 0],
  freelance_services: [7, 5, 3, 2],
  digital_products: [7, 5, 3, 2],
  subscription_services: [3, 2, 1, 0],
  advertising_promotion_services: [3, 2, 1, 0],
};

export type SettlementRule = {
  processingDays: number;
  withdrawalRequestCount: number;
  withdrawalPeriodDays: number;
};

const SETTLEMENT_ROWS: Record<CommissionPlan, SettlementRule> = {
  standard: { processingDays: 7, withdrawalRequestCount: 1, withdrawalPeriodDays: 10 },
  pro: { processingDays: 4, withdrawalRequestCount: 2, withdrawalPeriodDays: 10 },
  elite: { processingDays: 3, withdrawalRequestCount: 1, withdrawalPeriodDays: 5 },
  enterprise: { processingDays: 2, withdrawalRequestCount: 1, withdrawalPeriodDays: 2 },
};

export type ProtectionTier = {
  scope: "general" | "gaming";
  minAmountInr: number;
  maxAmountInr: number | null; // null = no upper bound
  feePercent: number | null;
  feeFlatInr: number | null;
};

const PROTECTION_TIERS: ProtectionTier[] = [
  { scope: "general", minAmountInr: 1000, maxAmountInr: 7000, feePercent: 5, feeFlatInr: null },
  { scope: "general", minAmountInr: 7001, maxAmountInr: 20000, feePercent: null, feeFlatInr: 499 },
  { scope: "general", minAmountInr: 20001, maxAmountInr: 50000, feePercent: null, feeFlatInr: 799 },
  { scope: "general", minAmountInr: 50001, maxAmountInr: 100000, feePercent: null, feeFlatInr: 999 },
  { scope: "gaming", minAmountInr: 1000, maxAmountInr: null, feePercent: 5, feeFlatInr: null },
];

/** Misc knobs (platform_settings key 'transaction_fees'). */
export type MiscFees = {
  processingFeeInr: number;
  buyerProtectionMinOrderInr: number;
  processingFeePayer: "buyer" | "seller";
};

const MISC_FEES: MiscFees = {
  processingFeeInr: 0,
  buyerProtectionMinOrderInr: 1000,
  processingFeePayer: "buyer",
};

/**
 * LEGACY fallback — the pre-HX-007 flat commission/cooling, used ONLY for
 * categories that do not map to a documented key (e.g. `boosting`). Keeping the
 * previous behaviour here means unmapped categories are NOT broken by the cutover;
 * they are flagged instead. Sourced from the old wallet.functions.ts / escrow.ts.
 */
export const LEGACY_FLAT_COMMISSION: Record<CommissionPlan, number> = {
  standard: 1.9,
  pro: 1.5,
  elite: 1.0,
  enterprise: 0.5,
};
export const LEGACY_COOLING_DAYS: Record<CommissionPlan, number> = {
  standard: 7,
  pro: 5,
  elite: 3,
  enterprise: 1,
};

/**
 * Map a listing's category slug (as stored on public.categories) to a canonical
 * commission key. Returns null for categories with no documented rate (e.g.
 * `boosting`) — the caller then uses the legacy fallback and flags it.
 *
 * Includes both existing slugs and the anticipated slugs for the 5 categories
 * that Module H will create, so they light up automatically once they exist.
 */
const SLUG_TO_KEY: Record<string, CategoryKey> = {
  // Existing DB slugs (from 202605260003_sync_categories.sql)
  accounts: "gaming_accounts",
  currency: "in_game_credits",
  "gift-cards": "gift_cards",
  coaching: "coaching_services",
  subscriptions: "subscription_services",
  // Anticipated Module-H slugs (harmless until those categories exist)
  "gaming-accounts": "gaming_accounts",
  "game-accounts": "gaming_accounts",
  "in-game-credits": "in_game_credits",
  "software-tools": "software_digital_tools",
  "software-digital-tools": "software_digital_tools",
  "game-buddies": "game_buddy_services",
  "game-buddy": "game_buddy_services",
  "freelance-services": "freelance_services",
  "digital-products": "digital_products",
  "advertising-services": "advertising_promotion_services",
  "advertising-promotion-services": "advertising_promotion_services",
  // NOTE: `boosting` intentionally absent → unmapped → legacy fallback + flag.
};

export function categoryKeyForSlug(slug: string | null | undefined): CategoryKey | null {
  if (!slug) return null;
  return SLUG_TO_KEY[slug.toLowerCase()] ?? null;
}

/** Normalise any tier (incl. `verified`) to a commission plan. */
export function commissionPlanFor(tier: AnyTier | string | null | undefined): CommissionPlan {
  const t = (tier ?? "standard").toString().toLowerCase();
  if (t === "pro" || t === "elite" || t === "enterprise") return t;
  return "standard"; // standard + verified + anything unknown
}

/**
 * The full config snapshot the engine operates on. `getFinanceConfig()`
 * (config.functions.ts) builds one from the DB, falling back to these defaults.
 */
export type FinanceConfig = {
  commission: Record<CategoryKey, Record<CommissionPlan, number>>;
  escrow: Record<CategoryKey, Record<CommissionPlan, number>>;
  settlement: Record<CommissionPlan, SettlementRule>;
  protectionTiers: ProtectionTier[];
  misc: MiscFees;
};

function expand<T>(rows: Record<CategoryKey, [number, number, number, number]>): Record<CategoryKey, Record<CommissionPlan, number>> {
  const out = {} as Record<CategoryKey, Record<CommissionPlan, number>>;
  (Object.keys(rows) as CategoryKey[]).forEach((k) => {
    const arr = rows[k];
    out[k] = { standard: arr[0], pro: arr[1], elite: arr[2], enterprise: arr[3] };
  });
  return out;
}

/** The documented defaults, ready to use as a FinanceConfig. */
export const DOCUMENTED_FINANCE_CONFIG: FinanceConfig = {
  commission: expand(COMMISSION_ROWS),
  escrow: expand(ESCROW_ROWS),
  settlement: SETTLEMENT_ROWS,
  protectionTiers: PROTECTION_TIERS,
  misc: MISC_FEES,
};

export const ALL_CATEGORY_KEYS = Object.keys(COMMISSION_ROWS) as CategoryKey[];
export const ALL_PLANS = PLANS;
