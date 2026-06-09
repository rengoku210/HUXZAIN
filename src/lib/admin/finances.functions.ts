"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

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
