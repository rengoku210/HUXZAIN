/**
 * HX-007 — getFinanceConfig(): build a FinanceConfig snapshot from the DB.
 *
 * Reads the Super-Admin-editable config tables seeded by
 * `20260701130000_finance_engine_config.sql` and overlays them on the
 * DOCUMENTED_FINANCE_CONFIG defaults (finance-config.ts). The defaults mirror
 * the seed EXACTLY, so:
 *   • before the migration is applied, or if the tables are unreachable, the app
 *     still computes correct summaries from the code-level defaults, and
 *   • once a Super-Admin edits a row, that DB value OVERRIDES the default.
 *
 * Any partial/missing row falls back per-field to the documented default — the
 * engine never receives an undefined rate. Result is cached in-module for a
 * short TTL so the Transaction Summary panel (which may render on every price
 * keystroke) does not hammer the DB.
 */

import { getSupabase } from "@/lib/supabase-client";
import {
  DOCUMENTED_FINANCE_CONFIG,
  ALL_CATEGORY_KEYS,
  ALL_PLANS,
  type CategoryKey,
  type CommissionPlan,
  type FinanceConfig,
  type ProtectionTier,
  type SettlementRule,
} from "./finance-config";

const CACHE_TTL_MS = 60_000;
let cache: { at: number; config: FinanceConfig } | null = null;

/** Deep-clone the documented defaults so DB overlays never mutate the constant. */
function cloneDefaults(): FinanceConfig {
  return {
    commission: structuredClone(DOCUMENTED_FINANCE_CONFIG.commission),
    escrow: structuredClone(DOCUMENTED_FINANCE_CONFIG.escrow),
    settlement: structuredClone(DOCUMENTED_FINANCE_CONFIG.settlement),
    protectionTiers: structuredClone(DOCUMENTED_FINANCE_CONFIG.protectionTiers),
    misc: structuredClone(DOCUMENTED_FINANCE_CONFIG.misc),
  };
}

const isCategoryKey = (v: unknown): v is CategoryKey =>
  typeof v === "string" && (ALL_CATEGORY_KEYS as string[]).includes(v);
const isPlan = (v: unknown): v is CommissionPlan =>
  typeof v === "string" && (ALL_PLANS as string[]).includes(v);

/**
 * Build a FinanceConfig from the DB, overlaying documented defaults.
 * `force` bypasses the cache (e.g. after a Super-Admin save).
 */
export async function getFinanceConfig(opts?: { force?: boolean }): Promise<FinanceConfig> {
  if (!opts?.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.config;
  }

  const config = cloneDefaults();
  const supabase = getSupabase();
  if (!supabase) {
    // No client (SSR/edge without env) — documented defaults are the source of truth.
    cache = { at: Date.now(), config };
    return config;
  }

  try {
    const [commissionRes, escrowRes, settlementRes, protectionRes, settingsRes] =
      await Promise.all([
        supabase.from("commission_config").select("category_key, plan, commission_percent"),
        supabase.from("escrow_config").select("category_key, plan, hold_days"),
        supabase
          .from("settlement_config")
          .select("plan, processing_days, withdrawal_request_count, withdrawal_period_days"),
        supabase
          .from("buyer_protection_config")
          .select("scope, min_amount_inr, max_amount_inr, fee_percent, fee_flat_inr"),
        supabase.from("platform_settings").select("key, value").eq("key", "transaction_fees"),
      ]);

    // Commission overlay
    for (const row of commissionRes.data ?? []) {
      if (isCategoryKey(row.category_key) && isPlan(row.plan) && row.commission_percent != null) {
        config.commission[row.category_key][row.plan] = Number(row.commission_percent);
      }
    }

    // Escrow overlay
    for (const row of escrowRes.data ?? []) {
      if (isCategoryKey(row.category_key) && isPlan(row.plan) && row.hold_days != null) {
        config.escrow[row.category_key][row.plan] = Number(row.hold_days);
      }
    }

    // Settlement overlay
    for (const row of settlementRes.data ?? []) {
      if (isPlan(row.plan)) {
        const rule: SettlementRule = {
          processingDays: Number(row.processing_days),
          withdrawalRequestCount: Number(row.withdrawal_request_count),
          withdrawalPeriodDays: Number(row.withdrawal_period_days),
        };
        config.settlement[row.plan] = rule;
      }
    }

    // Buyer-protection overlay — a non-empty table fully replaces the defaults
    // (ranges are authoritative), otherwise keep the documented tiers.
    if (protectionRes.data && protectionRes.data.length > 0) {
      const tiers: ProtectionTier[] = [];
      for (const row of protectionRes.data) {
        const scope = row.scope === "gaming" ? "gaming" : "general";
        tiers.push({
          scope,
          minAmountInr: Number(row.min_amount_inr),
          maxAmountInr: row.max_amount_inr == null ? null : Number(row.max_amount_inr),
          feePercent: row.fee_percent == null ? null : Number(row.fee_percent),
          feeFlatInr: row.fee_flat_inr == null ? null : Number(row.fee_flat_inr),
        });
      }
      config.protectionTiers = tiers;
    }

    // Misc knobs overlay
    const feesRow = settingsRes.data?.[0]?.value as Record<string, unknown> | undefined;
    if (feesRow) {
      if (feesRow.processing_fee_inr != null) {
        config.misc.processingFeeInr = Number(feesRow.processing_fee_inr);
      }
      if (feesRow.buyer_protection_min_order_inr != null) {
        config.misc.buyerProtectionMinOrderInr = Number(feesRow.buyer_protection_min_order_inr);
      }
      if (feesRow.processing_fee_payer === "buyer" || feesRow.processing_fee_payer === "seller") {
        config.misc.processingFeePayer = feesRow.processing_fee_payer;
      }
    }
  } catch (e) {
    // Any failure → documented defaults (already in `config`).
    console.warn("[finance] getFinanceConfig fell back to documented defaults:", e);
  }

  cache = { at: Date.now(), config };
  return config;
}

/** Clear the in-module cache (call after a Super-Admin edits config). */
export function invalidateFinanceConfigCache(): void {
  cache = null;
}
