"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { invalidateFinanceConfigCache, getFinanceConfig, type CategoryKey, type CommissionPlan, type SettlementRule } from "@/lib/finance";

/**
 * Get financial overview with aggregated totals from orders and withdrawals.
 */
export const getFinancialOverview = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // Fetch orders for computation
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("amount_inr, commission_inr, seller_payout_inr, status, payout_status");

    if (ordersErr) {
      console.error("[Finances] Fetch orders error:", ordersErr.message);
      throw new Error("Failed to fetch order data.");
    }

    // Fetch withdrawal data
    const { data: withdrawals, error: withdrawErr } = await supabase
      .from("withdrawals")
      .select("amount, status");

    if (withdrawErr) {
      console.error("[Finances] Fetch withdrawals error:", withdrawErr.message);
      throw new Error("Failed to fetch withdrawal data.");
    }

    const completedStatuses = ["completed", "delivered"];
    const completedOrders = (orders || []).filter((o: any) => completedStatuses.includes(o.status));
    const refundedOrders = (orders || []).filter((o: any) => o.status === "refunded");
    const disputedOrders = (orders || []).filter((o: any) => o.status === "disputed");
    const pendingCoolingOrders = (orders || []).filter((o: any) => o.payout_status === "pending_cooling");

    const total_buyer_paid = completedOrders.reduce((sum: number, o: any) => sum + Number(o.amount_inr || 0), 0);
    const total_commission = completedOrders.reduce((sum: number, o: any) => sum + Number(o.commission_inr || 0), 0);
    const total_seller_earnings = completedOrders.reduce((sum: number, o: any) => sum + Number(o.seller_payout_inr || 0), 0);
    const total_refunded = refundedOrders.reduce((sum: number, o: any) => sum + Number(o.amount_inr || 0), 0);
    const total_on_hold = disputedOrders.reduce((sum: number, o: any) => sum + Number(o.amount_inr || 0), 0);
    const total_pending = pendingCoolingOrders.reduce((sum: number, o: any) => sum + Number(o.amount_inr || 0), 0);

    const completedWithdrawals = (withdrawals || []).filter((w: any) => w.status === "completed");
    const pendingWithdrawals = (withdrawals || []).filter((w: any) => w.status === "pending");

    const total_withdrawn = completedWithdrawals.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
    const pending_withdrawals_count = pendingWithdrawals.length;

    return {
      total_buyer_paid,
      total_commission,
      total_seller_earnings,
      total_refunded,
      total_on_hold,
      total_pending,
      total_withdrawn,
      pending_withdrawals_count,
    };
  });

/**
 * Search transactions by order ID, buyer/seller email/username, or listing title.
 */
export const searchTransactions = createServerFn({ method: "POST" })
  .inputValidator((d: {
    query: string;
    status_filter?: string;
    date_from?: string;
    date_to?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { query, status_filter, date_from, date_to } = data;

    let q = supabase
      .from("orders")
      .select(`
        *,
        buyer:buyer_id (
          display_name,
          email,
          username
        ),
        seller:seller_id (
          display_name,
          email,
          username
        ),
        listing:listing_id (
          title
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (status_filter) {
      q = q.eq("status", status_filter);
    }

    if (date_from) {
      q = q.gte("created_at", date_from);
    }

    if (date_to) {
      q = q.lte("created_at", date_to);
    }

    const { data: results, error } = await q;

    if (error) {
      console.error("[Finances] Search transactions error:", error.message);
      throw new Error("Failed to search transactions.");
    }

    // Client-side filter by search query across order id, buyer/seller info, listing title
    const searchLower = query.toLowerCase().trim();
    const filtered = searchLower
      ? (results || []).filter((row: any) => {
          const orderId = (row.id || "").toLowerCase();
          const buyerName = (row.buyer?.display_name || "").toLowerCase();
          const buyerEmail = (row.buyer?.email || "").toLowerCase();
          const buyerUsername = (row.buyer?.username || "").toLowerCase();
          const sellerName = (row.seller?.display_name || "").toLowerCase();
          const sellerEmail = (row.seller?.email || "").toLowerCase();
          const sellerUsername = (row.seller?.username || "").toLowerCase();
          const listingTitle = (row.listing?.title || "").toLowerCase();

          return (
            orderId.includes(searchLower) ||
            buyerName.includes(searchLower) ||
            buyerEmail.includes(searchLower) ||
            buyerUsername.includes(searchLower) ||
            sellerName.includes(searchLower) ||
            sellerEmail.includes(searchLower) ||
            sellerUsername.includes(searchLower) ||
            listingTitle.includes(searchLower)
          );
        })
      : results;

    return filtered;
  });

/**
 * Get detailed withdrawal information including seller profile and history.
 */
export const getWithdrawalDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { withdrawal_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // 1. Fetch the withdrawal
    const { data: withdrawal, error: withdrawErr } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", data.withdrawal_id)
      .single();

    if (withdrawErr || !withdrawal) {
      console.error("[Finances] Fetch withdrawal error:", withdrawErr?.message);
      throw new Error("Withdrawal not found.");
    }

    // 2. Fetch seller profile
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("display_name, email, username, is_verified, seller_tier, is_seller")
      .eq("id", withdrawal.user_id)
      .single();

    // 3. Previous withdrawals for this seller
    const { data: previousWithdrawals } = await supabase
      .from("withdrawals")
      .select("id, amount, status, created_at")
      .eq("user_id", withdrawal.user_id)
      .neq("id", data.withdrawal_id)
      .order("created_at", { ascending: false });

    const completedPrev = (previousWithdrawals || []).filter((w: any) => w.status === "completed");
    const totalWithdrawn = completedPrev.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);

    // 4. Withdrawal logs
    const { data: logs } = await supabase
      .from("withdrawal_logs")
      .select("*")
      .eq("withdrawal_id", data.withdrawal_id)
      .order("created_at", { ascending: true });

    return {
      withdrawal,
      seller_profile: sellerProfile,
      previous_withdrawals_count: (previousWithdrawals || []).length,
      total_withdrawn: totalWithdrawn,
      withdrawal_logs: logs || [],
    };
  });

/**
 * Add a log entry to a withdrawal.
 */
export const addWithdrawalLog = createServerFn({ method: "POST" })
  .inputValidator((d: {
    withdrawal_id: string;
    status: string;
    notes: string;
    employee_id: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { withdrawal_id, status, notes, employee_id } = data;

    const { error } = await supabase
      .from("withdrawal_logs")
      .insert({
        withdrawal_id,
        status,
        notes,
        employee_id,
      });

    if (error) {
      console.error("[Finances] Add withdrawal log error:", error.message);
      throw new Error("Failed to add withdrawal log.");
    }

    return { success: true };
  });

/**
 * Check withdrawal risk flags for a user.
 */
export const getWithdrawalRiskFlags = createServerFn({ method: "POST" })
  .inputValidator((d: { user_id: string; amount: number }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { user_id, amount } = data;
    const flags: string[] = [];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Check if new seller (< 30 days)
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, trust_score")
      .eq("id", user_id)
      .single();

    if (profile && profile.created_at >= thirtyDaysAgo) {
      flags.push("New seller account (less than 30 days old)");
    }

    // 2. Check for open disputes
    const { count: disputeCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user_id)
      .eq("status", "disputed");

    if (disputeCount && disputeCount > 0) {
      flags.push(`Has ${disputeCount} open dispute(s)`);
    }

    // 3. Large withdrawal amount
    if (amount > 10000) {
      flags.push("Large withdrawal amount (> ₹10,000)");
    }

    // 4. Check for fraud reports
    const { count: fraudCount } = await supabase
      .from("security_incidents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("incident_type", "fraud");

    if (fraudCount && fraudCount > 0) {
      flags.push(`Has ${fraudCount} fraud report(s)`);
    }

    // 5. Low trust score
    if (profile && profile.trust_score !== null && profile.trust_score < 30) {
      flags.push(`Low trust score (${profile.trust_score})`);
    }

    return flags;
  });

/**
 * Update the Super Admin finance configuration tables atomically.
 * Gated to super_admin or owner roles.
 */
export const updateFinanceConfig = createServerFn({ method: "POST" })
  .inputValidator((d: SaveFinanceConfigInput) => d)
  .handler(async ({ data }) => {
    const { token, commission, escrow, settlement, buyerProtectionTiers, misc } = data;

    const validCategories = [
      "gaming_accounts",
      "in_game_credits",
      "gift_cards",
      "software_digital_tools",
      "coaching_services",
      "game_buddy_services",
      "freelance_services",
      "digital_products",
      "subscription_services",
      "advertising_promotion_services"
    ];
    const validPlans = ["standard", "pro", "elite", "enterprise"];
    const validScopes = ["general", "gaming"];

    // 1. Structural inputs validation
    for (const c of commission) {
      if (!validCategories.includes(c.category_key) || !validPlans.includes(c.plan)) {
        throw new Error(`Invalid category/plan in commission: ${c.category_key} x ${c.plan}`);
      }
      if (c.commission_percent < 0 || c.commission_percent > 100) {
        throw new Error(`Commission percentage for ${c.category_key} must be between 0 and 100%`);
      }
    }
    for (const e of escrow) {
      if (!validCategories.includes(e.category_key) || !validPlans.includes(e.plan)) {
        throw new Error(`Invalid category/plan in escrow: ${e.category_key} x ${e.plan}`);
      }
      if (e.hold_days < 0) {
        throw new Error(`Escrow hold days for ${e.category_key} cannot be negative`);
      }
    }
    for (const s of settlement) {
      if (!validPlans.includes(s.plan)) {
        throw new Error(`Invalid plan in settlement: ${s.plan}`);
      }
      if (s.processing_days < 0 || s.withdrawal_request_count < 1 || s.withdrawal_period_days < 1) {
        throw new Error(`Invalid limits in settlement for plan ${s.plan}`);
      }
    }
    for (const bp of buyerProtectionTiers) {
      if (!validScopes.includes(bp.scope)) {
        throw new Error(`Invalid scope in buyer protection: ${bp.scope}`);
      }
      if (bp.min_amount_inr < 0) {
        throw new Error("Buyer protection minimum amount cannot be negative");
      }
      if (bp.max_amount_inr !== null && bp.max_amount_inr < bp.min_amount_inr) {
        throw new Error("Buyer protection range max cannot be less than min");
      }
      if ((bp.fee_percent !== null) === (bp.fee_flat_inr !== null)) {
        throw new Error("Each buyer protection range must have exactly one fee type");
      }
      if (bp.fee_percent !== null && (bp.fee_percent < 0 || bp.fee_percent > 100)) {
        throw new Error("Fee percentage must be between 0 and 100%");
      }
      if (bp.fee_flat_inr !== null && bp.fee_flat_inr < 0) {
        throw new Error("Flat fee cannot be negative");
      }
    }

    // 2. Duplicates and range overlap/coverage validation
    const commissionKeys = new Set<string>();
    for (const c of commission) {
      const key = `${c.category_key}:${c.plan}`;
      if (commissionKeys.has(key)) {
        throw new Error(`Duplicate commission entry for category ${c.category_key} and plan ${c.plan}`);
      }
      commissionKeys.add(key);
    }
    const escrowKeys = new Set<string>();
    for (const e of escrow) {
      const key = `${e.category_key}:${e.plan}`;
      if (escrowKeys.has(key)) {
        throw new Error(`Duplicate escrow entry for category ${e.category_key} and plan ${e.plan}`);
      }
      escrowKeys.add(key);
    }
    const settlementPlans = new Set<string>();
    for (const s of settlement) {
      if (settlementPlans.has(s.plan)) {
        throw new Error(`Duplicate settlement entry for plan ${s.plan}`);
      }
      settlementPlans.add(s.plan);
    }

    // Contiguity/gaps/overlaps check
    const generalTiers = buyerProtectionTiers.filter(t => t.scope === "general");
    const gamingTiers = buyerProtectionTiers.filter(t => t.scope === "gaming");

    const validateContiguity = (tiers: typeof buyerProtectionTiers, scope: string) => {
      if (tiers.length === 0) return;
      const sorted = [...tiers].sort((a, b) => a.min_amount_inr - b.min_amount_inr);
      if (sorted[0].min_amount_inr !== misc.buyer_protection_min_order_inr) {
        throw new Error(`The first tier for ${scope} must start exactly at the minimum order limit (₹${misc.buyer_protection_min_order_inr})`);
      }
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
          const prev = sorted[i - 1];
          if (prev.max_amount_inr === null) {
            throw new Error(`Scope ${scope} has an unbounded tier followed by another tier, causing overlap`);
          }
          if (sorted[i].min_amount_inr !== prev.max_amount_inr + 1) {
            if (sorted[i].min_amount_inr <= prev.max_amount_inr) {
              throw new Error(`Overlapping ranges detected in ${scope} scope: [${prev.min_amount_inr}-${prev.max_amount_inr}] and [${sorted[i].min_amount_inr}-${sorted[i].max_amount_inr ?? 'Infinity'}]`);
            } else {
              throw new Error(`Missing coverage (gap) detected in ${scope} scope between ₹${prev.max_amount_inr} and ₹${sorted[i].min_amount_inr}`);
            }
          }
        }
      }
    };
    validateContiguity(generalTiers, "general");
    validateContiguity(gamingTiers, "gaming");

    // 3. Database connection & authentication
    let activeClient = getAdminClient();
    if (!activeClient) {
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fqeoracqywgwbvwijwqq.supabase.co";
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (url && anonKey) {
        activeClient = createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false }
        });
      }
    }
    if (!activeClient) {
      throw new Error("Database configuration is missing.");
    }

    const { data: authData, error: authErr } = await activeClient.auth.getUser(token);
    if (authErr || !authData.user) {
      throw new Error("Unauthorized: Invalid session token");
    }

    // Verify caller roles
    const { data: callerRoles } = await activeClient
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);

    const roles = (callerRoles || []).map((r: any) => r.role);
    const isSuperAdminOrOwner = roles.includes("super_admin") || roles.includes("owner");

    // Break-glass fallback
    const ADMIN_OVERRIDE_EMAIL = process.env.VITE_ADMIN_OVERRIDE_EMAIL || "";
    const isOverride = ADMIN_OVERRIDE_EMAIL && authData.user.email === ADMIN_OVERRIDE_EMAIL;

    if (!isSuperAdminOrOwner && !isOverride) {
      throw new Error("Forbidden: Only Super Admins and Owners can modify finance configuration.");
    }

    // 4. Fetch previous values for audit logging
    const prevConfig = await getFinanceConfig({ force: true });

    // Compare and build changed fields log
    const changedFields: string[] = [];
    for (const key of Object.keys(prevConfig.commission) as CategoryKey[]) {
      for (const p of Object.keys(prevConfig.commission[key]) as CommissionPlan[]) {
        const prevVal = prevConfig.commission[key][p];
        const newVal = commission.find(c => c.category_key === key && c.plan === p)?.commission_percent;
        if (newVal !== undefined && prevVal !== newVal) {
          changedFields.push(`commission:${key}:${p}(${prevVal}%->${newVal}%)`);
        }
      }
    }
    for (const key of Object.keys(prevConfig.escrow) as CategoryKey[]) {
      for (const p of Object.keys(prevConfig.escrow[key]) as CommissionPlan[]) {
        const prevVal = prevConfig.escrow[key][p];
        const newVal = escrow.find(e => e.category_key === key && e.plan === p)?.hold_days;
        if (newVal !== undefined && prevVal !== newVal) {
          changedFields.push(`escrow:${key}:${p}(${prevVal}d->${newVal}d)`);
        }
      }
    }
    for (const p of Object.keys(prevConfig.settlement) as CommissionPlan[]) {
      const prev = prevConfig.settlement[p];
      const newVal = settlement.find(s => s.plan === p);
      if (newVal) {
        if (prev.processingDays !== newVal.processing_days) {
          changedFields.push(`settlement:${p}:processing_days(${prev.processingDays}->${newVal.processing_days})`);
        }
        if (prev.withdrawalRequestCount !== newVal.withdrawal_request_count) {
          changedFields.push(`settlement:${p}:request_count(${prev.withdrawalRequestCount}->${newVal.withdrawal_request_count})`);
        }
        if (prev.withdrawalPeriodDays !== newVal.withdrawal_period_days) {
          changedFields.push(`settlement:${p}:period_days(${prev.withdrawalPeriodDays}->${newVal.withdrawal_period_days})`);
        }
      }
    }
    if (prevConfig.misc.processingFeeInr !== misc.processing_fee_inr) {
      changedFields.push(`misc:processing_fee_inr(${prevConfig.misc.processingFeeInr}->${misc.processing_fee_inr})`);
    }
    if (prevConfig.misc.processingFeePayer !== misc.processing_fee_payer) {
      changedFields.push(`misc:processing_fee_payer(${prevConfig.misc.processingFeePayer}->${misc.processing_fee_payer})`);
    }
    if (prevConfig.misc.buyerProtectionMinOrderInr !== misc.buyer_protection_min_order_inr) {
      changedFields.push(`misc:buyer_protection_min_order_inr(${prevConfig.misc.buyerProtectionMinOrderInr}->${misc.buyer_protection_min_order_inr})`);
    }

    // 5. Generate and execute atomic database upsert transaction via public.exec_sql RPC
    let sql = `DO $$
BEGIN
  -- 1. Reset and upsert commission_config
  DELETE FROM public.commission_config;
`;
    for (const c of commission) {
      sql += `  INSERT INTO public.commission_config (category_key, plan, commission_percent) VALUES ('${c.category_key}', '${c.plan}', ${Number(c.commission_percent)});
`;
    }

    sql += `  -- 2. Reset and upsert escrow_config
  DELETE FROM public.escrow_config;
`;
    for (const e of escrow) {
      sql += `  INSERT INTO public.escrow_config (category_key, plan, hold_days) VALUES ('${e.category_key}', '${e.plan}', ${Math.round(e.hold_days)});
`;
    }

    sql += `  -- 3. Reset and upsert settlement_config
  DELETE FROM public.settlement_config;
`;
    for (const s of settlement) {
      sql += `  INSERT INTO public.settlement_config (plan, processing_days, withdrawal_request_count, withdrawal_period_days) VALUES ('${s.plan}', ${Math.round(s.processing_days)}, ${Math.round(s.withdrawal_request_count)}, ${Math.round(s.withdrawal_period_days)});
`;
    }

    sql += `  -- 4. Reset and upsert buyer_protection_config
  DELETE FROM public.buyer_protection_config;
`;
    for (const bp of buyerProtectionTiers) {
      const maxVal = bp.max_amount_inr === null ? 'NULL' : Math.round(bp.max_amount_inr);
      const feePct = bp.fee_percent === null ? 'NULL' : Number(bp.fee_percent);
      const feeFlat = bp.fee_flat_inr === null ? 'NULL' : Math.round(bp.fee_flat_inr);
      sql += `  INSERT INTO public.buyer_protection_config (scope, min_amount_inr, max_amount_inr, fee_percent, fee_flat_inr) VALUES ('${bp.scope}', ${Math.round(bp.min_amount_inr)}, ${maxVal}, ${feePct}, ${feeFlat});
`;
    }

    const feesVal = {
      processing_fee_inr: Number(misc.processing_fee_inr),
      processing_fee_payer: misc.processing_fee_payer === 'seller' ? 'seller' : 'buyer',
      buyer_protection_min_order_inr: Number(misc.buyer_protection_min_order_inr),
      buyer_protection_enabled: !!misc.buyer_protection_enabled
    };

    sql += `  -- 5. Platform settings
  INSERT INTO public.platform_settings (key, value) VALUES ('transaction_fees', '${JSON.stringify(feesVal)}'::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END $$;`;

    const { error: txErr } = await activeClient.rpc("exec_sql", { sql });
    if (txErr) {
      console.error("[Finances] Save transaction failed, rolled back:", txErr.message);
      throw new Error(`Failed to save configuration: ${txErr.message}`);
    }

    // 6. Log staff audit action
    const newConfigObj = {
      commission: commission.reduce((acc: any, c) => {
        if (!acc[c.category_key]) acc[c.category_key] = {};
        acc[c.category_key][c.plan] = c.commission_percent;
        return acc;
      }, {}),
      escrow: escrow.reduce((acc: any, e) => {
        if (!acc[e.category_key]) acc[e.category_key] = {};
        acc[e.category_key][e.plan] = e.hold_days;
        return acc;
      }, {}),
      settlement: settlement.reduce((acc: any, s) => {
        acc[s.plan] = {
          processingDays: s.processing_days,
          withdrawalRequestCount: s.withdrawal_request_count,
          withdrawalPeriodDays: s.withdrawal_period_days
        };
        return acc;
      }, {}),
      protectionTiers: buyerProtectionTiers,
      misc: feesVal
    };

    await activeClient
      .from("staff_action_logs")
      .insert({
        staff_id: authData.user.id,
        action: "update_finance_configuration",
        previous_value: JSON.stringify(prevConfig),
        new_value: JSON.stringify(newConfigObj),
        notes: `Fields changed: ${changedFields.join(', ') || 'none'}`
      });

    // 7. Invalidate caches immediately
    invalidateFinanceConfigCache();

    return { success: true };
  });

export interface SaveFinanceConfigInput {
  token: string;
  commission: Array<{ category_key: string; plan: string; commission_percent: number }>;
  escrow: Array<{ category_key: string; plan: string; hold_days: number }>;
  settlement: Array<{ plan: string; processing_days: number; withdrawal_request_count: number; withdrawal_period_days: number }>;
  buyerProtectionTiers: Array<{ scope: "general" | "gaming"; min_amount_inr: number; max_amount_inr: number | null; fee_percent: number | null; fee_flat_inr: number | null }>;
  misc: {
    processing_fee_inr: number;
    processing_fee_payer: "buyer" | "seller";
    buyer_protection_min_order_inr: number;
    buyer_protection_enabled: boolean;
  };
}
