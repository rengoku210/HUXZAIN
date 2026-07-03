/**
 * HX-007 — Pure transaction-summary calculator (ONE engine, no duplicated math).
 *
 * Consumed by BOTH:
 *   • the Transaction Summary panel (client, listing form + checkout), and
 *   • order completion on the server (wallet.functions.ts),
 * so what the seller/buyer sees always equals what is actually stored/charged.
 *
 * Pure + deterministic: no DB, no Date, no I/O. Caller passes a FinanceConfig
 * (from getFinanceConfig()) + inputs; returns a fully-resolved breakdown.
 */

import {
  categoryKeyForSlug,
  commissionPlanFor,
  CATEGORY_LABELS,
  LEGACY_COOLING_DAYS,
  LEGACY_FLAT_COMMISSION,
  type AnyTier,
  type CategoryKey,
  type CommissionPlan,
  type FinanceConfig,
} from "./finance-config";

export type TransactionSummaryInput = {
  /** Listing category slug (as stored on public.categories). */
  categorySlug?: string | null;
  /** Or pass a resolved canonical key directly (takes precedence over slug). */
  categoryKey?: CategoryKey | null;
  /** Seller tier — `verified` is treated as `standard` for commission. */
  tier: AnyTier | string | null | undefined;
  /** Listing / order price in INR. */
  priceInr: number;
  /** Whether the buyer opted into Buyer Protection (checkout only). */
  protectionSelected?: boolean;
};

export type TransactionSummary = {
  priceInr: number;
  categoryKey: CategoryKey | null;
  categoryLabel: string;
  plan: CommissionPlan;

  commissionPercent: number;
  commissionInr: number;
  sellerReceivesInr: number;

  /** Buyer Protection (optional, buyer-selected). */
  protectionEligible: boolean; // price ≥ min order
  protectionAvailable: boolean; // eligible AND a tier covers this amount
  protectionSelected: boolean;
  protectionFeeInr: number;

  processingFeeInr: number;
  processingFeePayer: "buyer" | "seller";

  /** What the buyer pays in total (price + protection + buyer-side processing fee). */
  buyerPaysInr: number;

  escrowHoldDays: number;
  settlementProcessingDays: number;
  withdrawal: { requestCount: number; periodDays: number };

  flags: {
    /** Category has no documented rate → legacy fallback used. */
    unmappedCategory: boolean;
    /** Buyer selected protection but no tier covers this amount (e.g. > ₹1,00,000 non-gaming). */
    protectionUnavailableForAmount: boolean;
  };
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Resolve the buyer-protection fee for a given amount + category, or null if no tier applies. */
export function resolveProtectionFee(
  config: FinanceConfig,
  categoryKey: CategoryKey | null,
  priceInr: number,
): number | null {
  const minOrder = config.misc.buyerProtectionMinOrderInr;
  if (priceInr < minOrder) return null;

  const scope: "gaming" | "general" = categoryKey === "gaming_accounts" ? "gaming" : "general";
  const tier = config.protectionTiers.find(
    (t) =>
      t.scope === scope &&
      priceInr >= t.minAmountInr &&
      (t.maxAmountInr == null || priceInr <= t.maxAmountInr),
  );
  if (!tier) return null; // e.g. non-gaming > ₹1,00,000 — intentionally undefined

  if (tier.feePercent != null) return round((priceInr * tier.feePercent) / 100);
  return round(tier.feeFlatInr ?? 0);
}

export function computeTransactionSummary(
  config: FinanceConfig,
  input: TransactionSummaryInput,
): TransactionSummary {
  const plan = commissionPlanFor(input.tier);
  const price = Number.isFinite(input.priceInr) && input.priceInr > 0 ? input.priceInr : 0;

  const categoryKey =
    input.categoryKey ?? categoryKeyForSlug(input.categorySlug) ?? null;
  const unmapped = categoryKey === null;

  // Commission + escrow: documented matrix for known categories, legacy fallback otherwise.
  const commissionPercent = unmapped
    ? LEGACY_FLAT_COMMISSION[plan]
    : config.commission[categoryKey][plan];
  const escrowHoldDays = unmapped
    ? LEGACY_COOLING_DAYS[plan]
    : config.escrow[categoryKey][plan];

  const commissionInr = round((price * commissionPercent) / 100);
  const sellerReceivesInr = round(price - commissionInr);

  // Buyer Protection (optional).
  const protectionEligible = price >= config.misc.buyerProtectionMinOrderInr;
  const rawProtection = resolveProtectionFee(config, categoryKey, price);
  const protectionAvailable = protectionEligible && rawProtection !== null;
  const protectionSelected = !!input.protectionSelected && protectionAvailable;
  const protectionFeeInr = protectionSelected ? (rawProtection ?? 0) : 0;

  const processingFeeInr = round(config.misc.processingFeeInr);
  const processingFeePayer = config.misc.processingFeePayer;

  const buyerPaysInr = round(
    price + protectionFeeInr + (processingFeePayer === "buyer" ? processingFeeInr : 0),
  );

  const settlement = config.settlement[plan];

  return {
    priceInr: price,
    categoryKey,
    categoryLabel: categoryKey ? CATEGORY_LABELS[categoryKey] : "This category",
    plan,
    commissionPercent,
    commissionInr,
    sellerReceivesInr,
    protectionEligible,
    protectionAvailable,
    protectionSelected,
    protectionFeeInr,
    processingFeeInr,
    processingFeePayer,
    buyerPaysInr,
    escrowHoldDays,
    settlementProcessingDays: settlement.processingDays,
    withdrawal: {
      requestCount: settlement.withdrawalRequestCount,
      periodDays: settlement.withdrawalPeriodDays,
    },
    flags: {
      unmappedCategory: unmapped,
      protectionUnavailableForAmount: !!input.protectionSelected && protectionEligible && rawProtection === null,
    },
  };
}
