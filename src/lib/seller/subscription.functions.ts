"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import { onWithdrawalApproved } from "@/lib/notifications/hooks";

/**
 * Fetches the seller's active subscription, matching plan configuration limits, 
 * and details about boost tokens.
 */
export const getSellerSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: { sellerId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service offline.");

    const { sellerId } = data;

    // First call check and downgrade to ensure we are looking at real current active plans
    await supabase.rpc("check_and_downgrade_expired_subscriptions");

    // Fetch subscription details
    const { data: sub, error: subErr } = await supabase
      .from("seller_subscriptions")
      .select("*")
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (subErr) {
      console.error("[SubscriptionServer] Error getting subscription:", subErr.message);
      throw new Error("Failed to load subscription details.");
    }

    // Default to Free plan if none exists (though the DB trigger should create one)
    const planName = sub?.plan_name || "Free";
    const status = sub?.status || "Active";
    const suspensionStatus = sub?.suspension_status || false;
    const expiryDate = sub?.expiry_date || null;
    const tokens = sub?.boost_tokens_remaining || 0;

    // Fetch matching plan configuration limits from DB
    const { data: config, error: configErr } = await supabase
      .from("subscription_plans_config")
      .select("*")
      .eq("id", planName.toLowerCase())
      .single();

    if (configErr) {
      console.error("[SubscriptionServer] Config load failed for plan:", planName, configErr.message);
    }

    return {
      seller_id: sellerId,
      plan_name: planName,
      status,
      suspension_status: suspensionStatus,
      expiry_date: expiryDate,
      boost_tokens_remaining: tokens,
      limits: {
        listing_limit_per_category: config?.listing_limit_per_category || 1,
        boost_tokens_per_month: config?.boost_tokens_per_month || 0,
        visibility_multiplier: config?.visibility_multiplier || 1.00,
        settlement_days: config?.settlement_days || 7,
        verification_required: config?.verification_required || false,
        monthly_price_inr: config?.monthly_price_inr || 0,
      }
    };
  });

/**
 * Purchases / activates a subscription plan.
 */
export const activateSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: {
    sellerId: string;
    planId: string; // 'free', 'verified', 'pro', 'elite', 'enterprise'
    durationDays: number;
    paymentMethod: "wallet" | "manual";
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service offline.");

    const { sellerId, planId, durationDays, paymentMethod } = data;

    // Fetch config for plan
    const { data: config, error: configErr } = await supabase
      .from("subscription_plans_config")
      .select("*")
      .eq("id", planId)
      .single();

    if (configErr || !config) {
      throw new Error(`Plan config not found for ${planId}: ${configErr?.message}`);
    }

    const price = config.monthly_price_inr;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);

    // If payment method is wallet, deduct funds (simulated, or credit check)
    if (paymentMethod === "wallet" && price > 0) {
      const { data: wallet, error: walletErr } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("id", sellerId)
        .single();

      if (walletErr || !wallet) throw new Error("Seller wallet not found.");
      if (wallet.available_balance < price) {
        throw new Error(`Insufficient wallet balance. Price: ₹${price}, Wallet: ₹${wallet.available_balance}`);
      }

      // Deduct balance
      const newBalance = wallet.available_balance - price;
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ available_balance: newBalance })
        .eq("id", sellerId);

      if (deductErr) throw new Error("Failed to deduct wallet balance: " + deductErr.message);

      // Record wallet transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: sellerId,
        type: "payout", // using payout/charge type
        amount: -price,
        status: "completed",
        description: `Subscription activation: ${config.name} Plan`
      });
    }

    // Upsert subscription
    const status = paymentMethod === "wallet" || price === 0 ? "Active" : "Pending Activation";
    const planName = config.name;

    const { error: upsertErr } = await supabase
      .from("seller_subscriptions")
      .upsert({
        seller_id: sellerId,
        plan_name: planName,
        start_date: new Date().toISOString(),
        expiry_date: planId === "free" ? null : expiry.toISOString(),
        status,
        suspension_status: false,
        boost_tokens_remaining: status === "Active" ? config.boost_tokens_per_month : 0,
        updated_at: new Date().toISOString()
      }, { onConflict: "seller_id" });

    if (upsertErr) {
      console.error("[SubscriptionServer] Subscription activation upsert failed:", upsertErr.message);
      throw new Error("Failed to activate plan in database: " + upsertErr.message);
    }

    return { success: true, status, planName, price };
  });

/**
 * Submits documents and details for KYC verification.
 */
export const submitKYCVerification = createServerFn({ method: "POST" })
  .inputValidator((d: {
    sellerId: string;
    govtIdUrl: string;
    govtIdType1?: string;
    govtIdType2?: string;
    govtId2Url?: string;
    selfieUrl: string;
    addressProofUrl: string;
    payoutDetails: {
      accountHolder: string;
      accountNumber: string;
      ifscCode: string;
      upiId: string;
      method: "upi" | "bank_transfer";
    };
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service offline.");

    const {
      sellerId,
      govtIdUrl,
      govtIdType1,
      govtIdType2,
      govtId2Url,
      selfieUrl,
      addressProofUrl,
      payoutDetails
    } = data;

    // Fetch existing verification record to maintain already approved documents
    const { data: existing } = await supabase
      .from("verifications")
      .select("*")
      .eq("id", sellerId)
      .maybeSingle();

    let governmentIdStatus = existing?.government_id_status || "NOT_STARTED";
    if (govtIdUrl) {
      if (govtIdUrl !== existing?.government_id_url || governmentIdStatus === "NOT_STARTED" || governmentIdStatus === "REJECTED") {
        governmentIdStatus = "UNDER_REVIEW";
      }
    } else {
      governmentIdStatus = "NOT_STARTED";
    }

    let governmentId2Status = existing?.government_id_2_status || "NOT_STARTED";
    if (govtId2Url) {
      if (govtId2Url !== existing?.government_id_2_url || governmentId2Status === "NOT_STARTED" || governmentId2Status === "REJECTED") {
        governmentId2Status = "UNDER_REVIEW";
      }
    } else {
      governmentId2Status = "NOT_STARTED";
    }

    let selfieStatus = existing?.selfie_status || "NOT_STARTED";
    if (selfieUrl) {
      if (selfieUrl !== existing?.selfie_url || selfieStatus === "NOT_STARTED" || selfieStatus === "REJECTED") {
        selfieStatus = "UNDER_REVIEW";
      }
    } else {
      selfieStatus = "NOT_STARTED";
    }

    let addressProofStatus = existing?.address_proof_status || "NOT_STARTED";
    if (addressProofUrl) {
      if (addressProofUrl !== existing?.address_proof_url || addressProofStatus === "NOT_STARTED" || addressProofStatus === "REJECTED") {
        addressProofStatus = "UNDER_REVIEW";
      }
    } else {
      addressProofStatus = "NOT_STARTED";
    }

    const payload = {
      id: sellerId,
      government_id_url: govtIdUrl || null,
      government_id_type_1: govtIdType1 || null,
      government_id_type_2: govtIdType2 || null,
      government_id_2_url: govtId2Url || null,
      selfie_url: selfieUrl || null,
      address_proof_url: addressProofUrl || null,
      government_id_status: governmentIdStatus,
      government_id_2_status: governmentId2Status,
      selfie_status: selfieStatus,
      address_proof_status: addressProofStatus,
      payout_details: payoutDetails,
      status: "pending",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("verifications")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[SubscriptionServer] KYC upload error:", error.message);
      throw new Error("KYC upload failed: " + error.message);
    }

    return { success: true };
  });

/**
 * Activates a boost for a listing using a boost token from the seller's plan.
 */
export const activateBoostWithToken = createServerFn({ method: "POST" })
  .inputValidator((d: {
    sellerId: string;
    listingId: string;
    boostType: string;
    durationDays: number;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service offline.");

    const { sellerId, listingId, boostType, durationDays } = data;

    // 1. Get current subscription tokens remaining
    const { data: sub, error: subErr } = await supabase
      .from("seller_subscriptions")
      .select("boost_tokens_remaining")
      .eq("seller_id", sellerId)
      .single();

    if (subErr || !sub) {
      throw new Error("Active seller subscription not found.");
    }

    if (sub.boost_tokens_remaining <= 0) {
      throw new Error("No boost tokens remaining under your active subscription.");
    }

    // 2. Decrement token count
    const newTokensCount = sub.boost_tokens_remaining - 1;
    const { error: subUpdErr } = await supabase
      .from("seller_subscriptions")
      .update({ boost_tokens_remaining: newTokensCount })
      .eq("seller_id", sellerId);

    if (subUpdErr) {
      throw new Error("Failed to deduct boost token: " + subUpdErr.message);
    }

    // 3. Create approved payment proof
    const { data: proof, error: pErr } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: sellerId,
        buyer_id: sellerId,
        listing_id: listingId,
        amount: 0,
        screenshot_url: "token_payment",
        status: "approved",
        payment_type: "boost",
        payment_reference: `boost:${boostType}:${listingId}`
      })
      .select("*")
      .single();

    if (pErr) {
      // Rollback token count
      await supabase
        .from("seller_subscriptions")
        .update({ boost_tokens_remaining: sub.boost_tokens_remaining })
        .eq("seller_id", sellerId);
      throw new Error("Failed to create token payment proof: " + pErr.message);
    }

    // 4. Create approved boost request
    const { data: bReq, error: bErr } = await supabase
      .from("boost_requests")
      .insert({
        user_id: sellerId,
        listing_id: listingId,
        payment_proof_id: proof.id,
        boost_type: boostType,
        amount: 0,
        duration_days: durationDays,
        status: "approved"
      })
      .select("*")
      .single();

    if (bErr) {
      // Rollback token count
      await supabase
        .from("seller_subscriptions")
        .update({ boost_tokens_remaining: sub.boost_tokens_remaining })
        .eq("seller_id", sellerId);
      throw new Error("Failed to create boost request: " + bErr.message);
    }

    // 5. Insert active boost record in listing_boosts
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + durationDays);

    const { error: boostErr } = await supabase
      .from("listing_boosts")
      .insert({
        listing_id: listingId,
        seller_id: sellerId,
        boost_type: boostType,
        amount_inr: 0, // Using free token
        duration_days: durationDays,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: expiry.toISOString()
      });

    if (boostErr) {
      // Rollback token count
      await supabase
        .from("seller_subscriptions")
        .update({ boost_tokens_remaining: sub.boost_tokens_remaining })
        .eq("seller_id", sellerId);

      // Cleanup proof and request
      await supabase.from("boost_requests").delete().eq("id", bReq.id);
      await supabase.from("payment_proofs").delete().eq("id", proof.id);

      throw new Error("Failed to activate boost: " + boostErr.message);
    }

    // 6. Log staff action (system/self action)
    try {
      await supabase.from("staff_action_logs").insert({
        staff_id: sellerId,
        action: "token_boost_purchase",
        target_type: "boost_request",
        target_id: bReq.id,
        previous_value: "none",
        new_value: "approved"
      });
    } catch (e) { console.error("Staff log failed:", e); }

    return { success: true, remainingTokens: newTokensCount };
  });

/**
 * Updates a withdrawal request status inside the admin approval ledger.
 */
export const updateWithdrawalStatus = createServerFn({ method: "POST" })
  .inputValidator((d: {
    withdrawalId: string;
    status: "pending" | "review" | "approved" | "completed" | "rejected";
    adminNotes?: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service offline.");

    const { withdrawalId, status, adminNotes } = data;

    // 1. Fetch withdrawal details
    const { data: w, error: wErr } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single();

    if (wErr || !w) throw new Error("Withdrawal request not found.");

    const userId = w.user_id;

    // 2. Resolve intermediate states vs terminal states
    if (status === "completed") {
      // Terminal complete state (Paid) -> call wallet.functions.ts handler
      const { processWithdrawalStatus } = await import("@/lib/wallet.functions");
      await processWithdrawalStatus(withdrawalId, "completed");
      if (adminNotes) {
        await supabase
          .from("withdrawals")
          .update({ admin_notes: adminNotes })
          .eq("id", withdrawalId);
      }
    } else if (status === "rejected") {
      // Terminal reject state -> call wallet.functions.ts handler
      const { processWithdrawalStatus } = await import("@/lib/wallet.functions");
      await processWithdrawalStatus(withdrawalId, "rejected");
      if (adminNotes) {
        await supabase
          .from("withdrawals")
          .update({ admin_notes: adminNotes })
          .eq("id", withdrawalId);
      }
    } else {
      // Intermediate state (review, approved)
      const { error: updErr } = await supabase
        .from("withdrawals")
        .update({ 
          status, 
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString() 
        })
        .eq("id", withdrawalId);

      if (updErr) throw new Error("Failed to update status: " + updErr.message);

      if (status === "approved") {
        // HX-006: withdrawal-approved notification via the engine.
        try {
          await onWithdrawalApproved(withdrawalId, userId);
        } catch (notifEx) {
          console.warn("[Withdrawal] Withdrawal-approved notification non-blocking exception:", notifEx);
        }
      } else {
        // Other intermediate states (e.g. "review") keep the lightweight in-app note.
        await supabase.from("notifications").insert({
          user_id: userId,
          kind: "withdrawal.status",
          title: `Withdrawal Status Update: ${status.toUpperCase()}`,
          body: `Your withdrawal request of ₹${(w.amount / 100).toLocaleString()} is now: ${status.toUpperCase()}`
        });
      }
    }

    return { success: true };
  });


