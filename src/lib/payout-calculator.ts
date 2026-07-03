// src/lib/payout-calculator.ts
import { calculateCoolingDays, type SellerTier } from "./escrow";
import { type FinanceConfig, type CategoryKey } from "./finance";

export type PayoutState = "cooling" | "eligible" | "dormant" | "withdrawn" | "pending_escrow" | "reactivated";

export type OrderPayout = {
  orderId: string;
  orderNumber: string;
  listingTitle: string;
  amount: number;
  commission: number;
  netPayout: number;
  completedAt: string | null;
  deliveredAt: string | null;
  status: string;
  state: PayoutState;
  eligibleAt: Date | null;
  expiresAt: Date | null;
  timeLeftMs: number;
};

export function parseWithdrawnOrderIds(withdrawals: any[]): Set<string> {
  const ids = new Set<string>();
  for (const w of withdrawals) {
    if (w.status === "rejected") continue; // Skip rejected ones
    // Check if order ids are stored in upi_id or another field (e.g. upi_id = "name@upi|orders:id1,id2")
    const match = String(w.upi_id || w.account_holder || "").match(/orders:([a-zA-Z0-9\-_,]+)/);
    if (match && match[1]) {
      match[1].split(",").forEach(id => ids.add(id.trim()));
    }
  }
  return ids;
}

export function getPayoutState(
  order: any,
  withdrawnIds: Set<string>,
  sellerTier: SellerTier = "standard",
  reactivatedIds: Set<string> = new Set(),
  financeConfig?: FinanceConfig
): OrderPayout {
  const orderId = order.id;
  const orderNumber = order.order_number || `AEX-${orderId.slice(0, 8).toUpperCase()}`;
  const listingTitle = order.listing_title || "Marketplace Listing";
  const amount = Number(order.amount_inr || order.amount_total || 0);
  const commission = Number(order.commission_inr || 0);
  const netPayout = Number(order.seller_payout_inr || amount - commission);
  const completedAt = order.completed_at;
  const deliveredAt = order.delivered_at;
  const status = order.status;

  // Defaults
  let state: PayoutState = "pending_escrow";
  let eligibleAt: Date | null = null;
  let expiresAt: Date | null = null;
  let timeLeftMs = 0;

  if (status !== "completed") {
    return {
      orderId,
      orderNumber,
      listingTitle,
      amount,
      commission,
      netPayout,
      completedAt,
      deliveredAt,
      status,
      state,
      eligibleAt,
      expiresAt,
      timeLeftMs
    };
  }

  // If already withdrawn
  if (withdrawnIds.has(orderId)) {
    state = "withdrawn";
    return {
      orderId,
      orderNumber,
      listingTitle,
      amount,
      commission,
      netPayout,
      completedAt,
      deliveredAt,
      status,
      state,
      eligibleAt,
      expiresAt,
      timeLeftMs
    };
  }

  // Calculate timelines
  if (completedAt) {
    const compTime = new Date(completedAt).getTime();
    
    let eligibleTime: number;
    let expiryTime: number;
    
    if (order.withdrawal_eligible_at) {
      eligibleTime = new Date(order.withdrawal_eligible_at).getTime();
    } else {
      let coolingDays = 7;
      if (financeConfig && order.category_key) {
        coolingDays = financeConfig.escrow[order.category_key as CategoryKey]?.[sellerTier] ?? 7;
      } else {
        coolingDays = calculateCoolingDays(sellerTier);
      }
      eligibleTime = compTime + coolingDays * 24 * 60 * 60 * 1000;
    }
    
    if (order.withdrawal_expired_at) {
      expiryTime = new Date(order.withdrawal_expired_at).getTime();
    } else {
      expiryTime = eligibleTime + 30 * 24 * 60 * 60 * 1000;
    }
    
    eligibleAt = new Date(eligibleTime);
    expiresAt = new Date(expiryTime);

    const now = Date.now();

    if (reactivatedIds.has(orderId)) {
      state = "reactivated";
    } else if (now < eligibleTime) {
      state = "cooling";
      timeLeftMs = eligibleTime - now;
    } else if (now >= expiryTime) {
      state = "dormant";
      timeLeftMs = 0;
    } else {
      state = "eligible";
      timeLeftMs = expiryTime - now;
    }
  }

  return {
    orderId,
    orderNumber,
    listingTitle,
    amount,
    commission,
    netPayout,
    completedAt,
    deliveredAt,
    status,
    state,
    eligibleAt,
    expiresAt,
    timeLeftMs
  };
}
