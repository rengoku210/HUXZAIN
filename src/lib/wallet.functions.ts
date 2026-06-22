import { getSupabase } from "@/lib/supabase-client";
import { calculateCoolingDays, calculateInspectionHours, type SellerTier } from "@/lib/escrow";

// Ensure a wallet row exists for the user and return it
export async function getOrCreateWallet(userId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[WalletFunctions] Error fetching wallet:", error);
    throw error;
  }

  if (wallet) return wallet;

  // Wallet doesn't exist, create it
  console.log("[WalletFunctions] Creating new wallet for user:", userId);
  const { data: newWallet, error: createError } = await supabase
    .from("wallets")
    .insert({
      id: userId,
      available_balance: 0,
      pending_balance: 0,
      total_earnings: 0,
      withdrawn_amount: 0
    })
    .select("*")
    .single();

  if (createError) {
    console.error("[WalletFunctions] Error creating wallet:", createError);
    throw createError;
  }

  return newWallet;
}

// Complete order and credit the seller with net earnings (deducting tier platform fee)
export async function completeOrderAndCreditSeller(orderId: string, opts?: { bypassDisputeCheck?: boolean }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // 1. Fetch order details
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, listings:listing_id(title, seller_id)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found: " + orderErr?.message);
  }

  if (order.status === "completed") {
    console.log("[WalletFunctions] Order already completed:", orderId);
    return order;
  }

  // Prevent double-crediting
  const { data: existingTxn } = await supabase
    .from("wallet_transactions")
    .select("id")
    .eq("reference_id", orderId)
    .eq("type", "sale")
    .maybeSingle();

  if (existingTxn) {
    console.log("[WalletFunctions] Sale transaction already logged for order:", orderId);
    return order;
  }

  // Defense-in-depth: never auto-credit a seller while the order is disputed.
  // The admin mediation flow passes bypassDisputeCheck to settle the payout as
  // part of resolving the dispute itself.
  if (!opts?.bypassDisputeCheck) {
    if (order.payout_status === "disputed") {
      console.warn(`[WalletFunctions] Refusing to complete disputed order #${orderId}; payout frozen.`);
      return order;
    }
    const { data: openDispute } = await supabase
      .from("disputes")
      .select("id")
      .eq("order_id", orderId)
      .not("status", "in", "(resolved_buyer,resolved_seller,closed)")
      .limit(1)
      .maybeSingle();
    if (openDispute) {
      console.warn(`[WalletFunctions] Order #${orderId} has an unresolved dispute; skipping auto-completion.`);
      return order;
    }
  }

  const sellerId = order.seller_id || order.listings?.seller_id;
  if (!sellerId) {
    throw new Error("Seller information missing on order: " + orderId);
  }

  const amount = Number(order.amount_inr || order.amount_total || 0);

  // 2. Fetch seller profile to determine subscription plan fee
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", sellerId)
    .single();

  const tier = (profile?.subscription_tier || "standard") as SellerTier;

  // Tier fee mappings: Standard = 1.9%, Pro = 1.5%, Elite = 1.0%, Enterprise = 0.5%
  let feePercent = 0.019;
  if (tier === "pro") feePercent = 0.015;
  else if (tier === "elite") feePercent = 0.010;
  else if (tier === "enterprise") feePercent = 0.005;

  const commission = Math.round(amount * feePercent);
  const sellerPayout = Math.round(amount - commission);

  console.log(`[WalletFunctions] Order #${orderId} complete. Tier: ${tier}, Fee: ${feePercent * 100}%, Gross: ₹${amount}, Comm: ₹${commission}, Net: ₹${sellerPayout}`);

  const coolingDays = calculateCoolingDays(tier);
  const now = new Date();
  const eligibleAt = new Date(now.getTime() + coolingDays * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(eligibleAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 3. Update order status -> completed and record cooling metrics
  const { error: updErr } = await supabase
    .from("orders")
    .update({
      status: "completed",
      completed_at: now.toISOString(),
      commission_inr: commission,
      seller_payout_inr: sellerPayout,
      payout_status: "pending_cooling",
      cooling_days: coolingDays,
      withdrawal_eligible_at: eligibleAt.toISOString(),
      withdrawal_expired_at: expiresAt.toISOString(),
      updated_at: now.toISOString()
    })
    .eq("id", orderId);

  if (updErr) throw updErr;

  // 4. Load or create seller wallet
  const wallet = await getOrCreateWallet(sellerId);

  // 5. Credit seller wallet pending balance (funds are locked in cooling) and total earnings
  const { error: walletErr } = await supabase
    .from("wallets")
    .update({
      pending_balance: wallet.pending_balance + sellerPayout,
      total_earnings: wallet.total_earnings + sellerPayout,
      updated_at: new Date().toISOString()
    })
    .eq("id", sellerId);

  if (walletErr) throw walletErr;

  // 6. Log transaction
  const { error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: sellerId,
      type: "sale",
      amount: sellerPayout,
      status: "completed",
      reference_id: orderId,
      description: `Sales revenue from order #${orderId.slice(0, 8)} (${order.listing_title || "Marketplace listing"}) (Locked in Cooling Period)`
    });

  if (txnErr) console.error("[WalletFunctions] Transaction log error:", txnErr);

  // 7. Trigger seller notification
  try {
    await supabase.from("notifications").insert({
      user_id: sellerId,
      kind: "order.completed",
      title: "Order Completed — Cooling Hold Active",
      body: `Order for "${order.listing_title || "Listing"}" is completed. ₹${sellerPayout} is held in cooling for ${coolingDays} days before withdrawal eligibility.`
    });
  } catch (e) { console.error("Notification trigger error:", e); }

  // 8. Auto-generate invoice (idempotent — safe to call multiple times)
  try {
    const { error: invErr } = await supabase.rpc('create_seller_invoice', {
      p_order_id: orderId
    });
    if (invErr) console.warn('[Invoice] Auto-generation failed:', invErr.message);
    else console.log('[Invoice] Auto-generated for order:', orderId);
  } catch (invEx) {
    console.warn('[Invoice] Auto-generation exception:', invEx);
  }

  return order;
}

// Auto-complete delivered orders and release cooling/dormant holds
export async function checkAndReleaseEscrows() {
  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date();

  // 0. Build the set of orders with unresolved disputes. Funds for these orders
  // must NOT auto-release at any stage (inspection, cooling, dormant) until the
  // dispute is resolved by an admin.
  const disputedOrderIds = new Set<string>();
  const { data: openDisputes } = await supabase
    .from("disputes")
    .select("order_id, status")
    .not("status", "in", "(resolved_buyer,resolved_seller,closed)");
  if (openDisputes) {
    for (const d of openDisputes) if (d.order_id) disputedOrderIds.add(d.order_id);
  }

  // 1. AUTO-COMPLETE DELIVERED ORDERS
  const { data: deliveredOrders, error: delErr } = await supabase
    .from("orders")
    .select("*, listings:listing_id(title, seller_id, categories(slug))")
    .eq("status", "buyer_reviewing");

  if (!delErr && deliveredOrders) {
    for (const order of deliveredOrders) {
      try {
        if (disputedOrderIds.has(order.id)) {
          console.log(`[EscrowRelease] Skipping disputed order #${order.id} (auto-complete).`);
          continue;
        }
        const deliveredAt = order.delivered_at;
        if (!deliveredAt) continue;

        const sellerId = order.seller_id || order.listings?.seller_id;
        if (!sellerId) continue;

        // Fetch seller profile to get tier
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", sellerId)
          .single();

        const sellerTier = (profile?.subscription_tier || "standard") as SellerTier;
        const categorySlug = order.listings?.categories?.slug || "general";
        const price = Number(order.amount_inr || order.amount_total || 0);

        const inspectionHours = calculateInspectionHours(categorySlug, price, sellerTier);
        const autoReleaseTime = new Date(new Date(deliveredAt).getTime() + inspectionHours * 60 * 60 * 1000);

        if (now >= autoReleaseTime) {
          console.log(`[EscrowRelease] Auto-completing delivered order #${order.id} (Inspection period of ${inspectionHours}h expired)`);
          await completeOrderAndCreditSeller(order.id);
        }
      } catch (err) {
        console.error(`[EscrowRelease] Failed to auto-complete order ${order.id}:`, err);
      }
    }
  }

  // 2. RELEASE EXPIRED COOLING HOLDS (Mark 'eligible')
  const { data: coolingOrders, error: coolErr } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "completed")
    .eq("payout_status", "pending_cooling")
    .lte("withdrawal_eligible_at", now.toISOString());

  if (!coolErr && coolingOrders) {
    for (const order of coolingOrders) {
      try {
        if (disputedOrderIds.has(order.id)) {
          console.log(`[EscrowRelease] Skipping disputed order #${order.id} (cooling release).`);
          continue;
        }
        const sellerId = order.seller_id;
        const payout = Number(order.seller_payout_inr || 0);

        if (!sellerId || payout <= 0) continue;

        // 2.1 Update order payout_status to 'eligible'
        const { error: updErr } = await supabase
          .from("orders")
          .update({ payout_status: "eligible", updated_at: now.toISOString() })
          .eq("id", order.id);

        if (updErr) throw updErr;

        // 2.2 Shift funds: pending_balance -> available_balance
        const wallet = await getOrCreateWallet(sellerId);
        const newPending = Math.max(0, wallet.pending_balance - payout);
        const newAvailable = wallet.available_balance + payout;

        const { error: walletErr } = await supabase
          .from("wallets")
          .update({
            pending_balance: newPending,
            available_balance: newAvailable,
            updated_at: now.toISOString()
          })
          .eq("id", sellerId);

        if (walletErr) throw walletErr;

        // 2.3 Notify seller
        await supabase.from("notifications").insert({
          user_id: sellerId,
          kind: "wallet.eligible",
          title: "Earnings Eligible for Withdrawal",
          body: `Your earnings of ₹${payout} from Order #${order.id.slice(0, 8)} have completed the cooling period and are now available for withdrawal!`
        });

        console.log(`[EscrowRelease] Released cooling hold for order #${order.id}. Moved ₹${payout} to available.`);
      } catch (err) {
        console.error(`[EscrowRelease] Failed to release cooling hold for order ${order.id}:`, err);
      }
    }
  }

  // 3. TRANSITION EXPIRED ELIGIBLE FUNDS TO DORMANT
  const { data: eligibleExpiredOrders, error: expErr } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "completed")
    .eq("payout_status", "eligible")
    .lte("withdrawal_expired_at", now.toISOString());

  if (!expErr && eligibleExpiredOrders) {
    for (const order of eligibleExpiredOrders) {
      try {
        const sellerId = order.seller_id;
        const payout = Number(order.seller_payout_inr || 0);

        if (!sellerId || payout <= 0) continue;

        // 3.1 Update order payout_status to 'dormant'
        const { error: updErr } = await supabase
          .from("orders")
          .update({ payout_status: "dormant", updated_at: now.toISOString() })
          .eq("id", order.id);

        if (updErr) throw updErr;

        // 3.2 Subtract from available_balance
        const wallet = await getOrCreateWallet(sellerId);
        const newAvailable = Math.max(0, wallet.available_balance - payout);

        const { error: walletErr } = await supabase
          .from("wallets")
          .update({
            available_balance: newAvailable,
            updated_at: now.toISOString()
          })
          .eq("id", sellerId);

        if (walletErr) throw walletErr;

        // 3.3 Log transaction
        await supabase.from("wallet_transactions").insert({
          wallet_id: sellerId,
          type: "withdrawal",
          amount: -payout,
          status: "completed",
          reference_id: order.id,
          description: `Earnings transitioned to Dormant (30-day window expired): Order #${order.id.slice(0, 8)}`
        });

        // 3.4 Notify seller
        await supabase.from("notifications").insert({
          user_id: sellerId,
          kind: "wallet.dormant",
          title: "Earnings Marked as Dormant",
          body: `Earnings of ₹${payout} from Order #${order.id.slice(0, 8)} exceeded the 30-day withdrawal window. Please reactivate them from payouts tab.`
        });

        console.log(`[EscrowRelease] Order #${order.id} earnings marked as dormant.`);
      } catch (err) {
        console.error(`[EscrowRelease] Failed to transition order ${order.id} to dormant:`, err);
      }
    }
  }
}

// Request withdrawal from available wallet balance
export async function requestWithdrawal(userId: string, amount: number, method: "upi" | "bank_transfer", details: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  if (amount <= 0) throw new Error("Withdrawal amount must be greater than zero");

  const wallet = await getOrCreateWallet(userId);

  // Check if withdrawals are frozen in reports table
  const { data: freezeRow } = await supabase
    .from("reports")
    .select("status")
    .eq("target_id", userId)
    .eq("target_type", "seller")
    .eq("reason", "freeze")
    .eq("status", "open")
    .maybeSingle();

  if (freezeRow) {
    throw new Error("Your payouts and withdrawals are temporarily frozen by platform administration. Please open a support ticket for mediation.");
  }

  if (wallet.available_balance < amount) {
    throw new Error("Insufficient available balance");
  }

  console.log(`[WalletFunctions] Withdrawal requested: user=${userId}, amount=₹${amount}, method=${method}`);

  // 1. Deduct from available, transfer to pending
  const { error: walletErr } = await supabase
    .from("wallets")
    .update({
      available_balance: wallet.available_balance - amount,
      pending_balance: wallet.pending_balance + amount,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (walletErr) throw walletErr;

  // 2. Insert withdrawal request record
  const { data: withdrawal, error: wErr } = await supabase
    .from("withdrawals")
    .insert({
      user_id: userId,
      amount,
      method,
      upi_id: details.upi_id || null,
      upi_qr_url: details.upi_qr_url || null,
      account_holder: details.account_holder || null,
      account_number: details.account_number || null,
      ifsc_code: details.ifsc_code || null,
      status: "pending"
    })
    .select("*")
    .single();

  if (wErr) throw wErr;

  // 3. Log a pending transaction
  const { error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: userId,
      type: "withdrawal",
      amount: -amount,
      status: "pending",
      reference_id: withdrawal.id,
      description: `Withdrawal request (${method === "upi" ? "UPI ID: " + details.upi_id : "Bank Transfer"})`
    });

  if (txnErr) console.error("[WalletFunctions] Transaction log error:", txnErr);

  // 4. Create support ticket for Admin/Staff review automatically!
  try {
    await supabase.from("support_tickets").insert({
      user_id: userId,
      title: `Payout Withdrawal Request — ₹${amount}`,
      category: "billing",
      status: "open"
    });
  } catch (e) { console.error("[WalletFunctions] Auto-ticket creation failed:", e); }

  return withdrawal;
}

// Process withdrawal status changes (Approve / Reject)
export async function processWithdrawalStatus(withdrawalId: string, status: "completed" | "rejected") {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: w, error: wErr } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .single();

  if (wErr || !w) throw new Error("Withdrawal request not found: " + wErr?.message);
  if (w.status !== "pending") throw new Error("Withdrawal request is already processed");

  const userId = w.user_id;
  const amount = Number(w.amount);
  const wallet = await getOrCreateWallet(userId);

  console.log(`[WalletFunctions] Payout status update: id=${withdrawalId}, amount=₹${amount}, status=${status}`);

  if (status === "completed") {
    // 1. Deduct from pending_balance and increment withdrawn_amount
    const { error: walletErr } = await supabase
      .from("wallets")
      .update({
        pending_balance: Math.max(0, wallet.pending_balance - amount),
        withdrawn_amount: wallet.withdrawn_amount + amount,
        last_payout_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (walletErr) throw walletErr;

    // 2. Mark withdrawal as completed
    await supabase.from("withdrawals").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", withdrawalId);

    // 2.0 Mark associated orders as withdrawn
    const match = String(w.upi_id || w.account_holder || "").match(/orders:([a-zA-Z0-9\-_,]+)/);
    if (match && match[1]) {
      const orderIds = match[1].split(",");
      await supabase
        .from("orders")
        .update({ payout_status: "withdrawn", updated_at: new Date().toISOString() })
        .in("id", orderIds);
    }

    // 2.1 Find and update related support ticket
    try {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .eq("category", "billing")
        .eq("title", `Payout Withdrawal Request — ₹${amount}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket) {
        await supabase
          .from("support_tickets")
          .update({ status: "resolved", updated_at: new Date().toISOString() })
          .eq("id", ticket.id);

        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticket.id,
          sender_id: userId,
          message: `✓ Withdrawal of ₹${amount} completed and paid out. Payout ticket marked resolved.`,
          system_event: true
        });
      }
    } catch (e) {
      console.error("[WalletFunctions] Failed to resolve related support ticket:", e);
    }

    // 3. Mark transaction as completed
    await supabase.from("wallet_transactions").update({ status: "completed" }).eq("reference_id", withdrawalId).eq("type", "withdrawal");


    // 4. Notify user
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "wallet.withdrawal",
        title: "Withdrawal Completed",
        body: `Your withdrawal request for ₹${amount} has been successfully paid out.`
      });
    } catch (e) { console.error("Notification error:", e); }

  } else if (status === "rejected") {
    // 1. Deduct from pending_balance and refund back to available_balance
    const { error: walletErr } = await supabase
      .from("wallets")
      .update({
        pending_balance: Math.max(0, wallet.pending_balance - amount),
        available_balance: wallet.available_balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (walletErr) throw walletErr;

    // 2. Mark withdrawal as rejected
    await supabase.from("withdrawals").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", withdrawalId);

    // 2.1 Find and update related support ticket
    try {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .eq("category", "billing")
        .eq("title", `Payout Withdrawal Request — ₹${amount}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket) {
        await supabase
          .from("support_tickets")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", ticket.id);

        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticket.id,
          sender_id: userId,
          message: `✗ Withdrawal of ₹${amount} was rejected by admin review. Payout ticket closed.`,
          system_event: true
        });
      }
    } catch (e) {
      console.error("[WalletFunctions] Failed to close related support ticket:", e);
    }

    // 3. Mark transaction as failed/rejected
    await supabase.from("wallet_transactions").update({ status: "rejected" }).eq("reference_id", withdrawalId).eq("type", "withdrawal");


    // 4. Notify user
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "wallet.withdrawal",
        title: "Withdrawal Rejected",
        body: `Your withdrawal request for ₹${amount} was rejected and the funds have been returned to your balance.`
      });
    } catch (e) { console.error("Notification error:", e); }
  }
}

// Apply coupon code (e.g. WELCOME)
export async function applyCoupon(userId: string, code: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const cleanCode = code.trim().toUpperCase();

  // Call the server-side RPC function to validate and execute redemption
  const { data, error } = await supabase.rpc("apply_coupon_server", {
    p_user_id: userId,
    p_coupon_code: cleanCode
  });

  if (error) {
    console.error("[WalletFunctions] Coupon redemption failed:", error);
    throw new Error(error.message);
  }

  // Send in-app notification to the user
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "coupon.welcome",
      title: "Coupon Activated — Pro Plan Unlocked!",
      body: `You have successfully applied the coupon "${cleanCode}". Enjoy 3 days of Pro Plan customization, lower fees, and boost access!`
    });
  } catch (e) {
    console.error("Notification trigger error:", e);
  }

  return data;
}


// Add balance directly to a user's wallet (admin top-up approval, refunds, etc.)
export async function addWalletBalance(
  userId: string,
  amount: number,
  type: "topup" | "refund" | "bonus",
  referenceId?: string
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  if (amount <= 0) throw new Error("Amount must be greater than zero");

  const wallet = await getOrCreateWallet(userId);

  const { error: walletErr } = await supabase
    .from("wallets")
    .update({
      available_balance: wallet.available_balance + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (walletErr) throw walletErr;

  // Log transaction
  await supabase.from("wallet_transactions").insert({
    wallet_id: userId,
    type,
    amount,
    status: "completed",
    reference_id: referenceId || null,
    description:
      type === "topup"
        ? `Wallet top-up of ₹${amount} approved by admin.`
        : type === "refund"
          ? `Refund of ₹${amount} credited to wallet.`
          : `Bonus credit of ₹${amount} added to wallet.`,
  });

  // Notify user
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "wallet.topup",
      title: "Wallet Balance Updated",
      body: `₹${amount} has been credited to your wallet ${type === "topup" ? "top-up" : type} by admin.`,
    });
  } catch (e) { console.error("Notification error:", e); }
}

// Purchase boost (Homepage Spotlight, Category Banner, etc.) in INR
export async function purchaseBoost(userId: string, listingId: string, type: string, price: number, payMethod: "wallet" | "manual", screenshotUrl?: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  console.log(`[WalletFunctions] Purchase boost: user=${userId}, listing=${listingId}, type=${type}, price=₹${price}, method=${payMethod}`);

  if (payMethod === "wallet") {
    // 1. Get user wallet balance
    const wallet = await getOrCreateWallet(userId);
    if (wallet.available_balance < price) {
      throw new Error("Insufficient wallet balance. Top up your wallet or pay via screenshot QR proof.");
    }

    // 2. Deduct amount from available balance
    const { error: wErr } = await supabase
      .from("wallets")
      .update({
        available_balance: wallet.available_balance - price,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (wErr) throw wErr;

    // 3. Log transaction
    await supabase.from("wallet_transactions").insert({
      wallet_id: userId,
      type: "withdrawal",
      amount: -price,
      status: "completed",
      description: `Purchased listing boost: "${type.replace(/_/g, ' ').toUpperCase()}"`
    });

    // 4. Create approved payment proof
    const { data: proof, error: pErr } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: userId,
        buyer_id: userId,
        listing_id: listingId,
        amount: price,
        screenshot_url: "wallet_payment",
        status: "approved",
        payment_type: "boost",
        payment_reference: `boost:${type}:${listingId}`
      })
      .select("*")
      .single();

    if (pErr) throw pErr;

    // 5. Create approved boost request
    const { data: bReq, error: bErr } = await supabase
      .from("boost_requests")
      .insert({
        user_id: userId,
        listing_id: listingId,
        payment_proof_id: proof.id,
        boost_type: type,
        amount: price,
        duration_days: 7,
        status: "approved"
      })
      .select("*")
      .single();

    if (bErr) throw bErr;

    // 6. Create active boost record in listing_boosts
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days default duration

    const { error: lbErr } = await supabase
      .from("listing_boosts")
      .insert({
        listing_id: listingId,
        seller_id: userId,
        boost_type: type as any,
        amount_inr: price,
        duration_days: 7,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "active" as any
      });

    if (lbErr) throw lbErr;

    // 7. Create audit log entry
    try {
      await supabase.from("staff_action_logs").insert({
        staff_id: userId,
        action: "wallet_boost_purchase",
        target_type: "boost_request",
        target_id: bReq.id,
        previous_value: "none",
        new_value: "approved"
      });
    } catch (e) { console.error("Staff log failed:", e); }

    // 8. Notify user
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        kind: "boost.active",
        title: "Listing Boost Activated!",
        body: `Your listing boost "${type.replace(/_/g, ' ').toUpperCase()}" is now live for 7 days!`
      });
    } catch (e) { console.error("Notification error:", e); }

    return bReq;

  } else if (payMethod === "manual") {
    if (!screenshotUrl) throw new Error("Screenshot url is required for manual QR code payment");

    // 1. Create a pending top-up/boost payment proof in unified payment_proofs
    const { data: proof, error: pErr } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: userId,
        buyer_id: userId,
        listing_id: listingId,
        amount: price,
        screenshot_url: screenshotUrl,
        status: "pending",
        payment_type: "boost",
        payment_reference: `boost:${type}:${listingId}`
      })
      .select("*")
      .single();

    if (pErr) throw pErr;

    // 2. Create pending boost request linked to payment proof
    const { data: bReq, error: bErr } = await supabase
      .from("boost_requests")
      .insert({
        user_id: userId,
        listing_id: listingId,
        payment_proof_id: proof.id,
        boost_type: type,
        amount: price,
        duration_days: 7,
        status: "pending"
      })
      .select("*")
      .single();

    if (bErr) throw bErr;

    // 3. Create support ticket automatically
    try {
      await supabase.from("support_tickets").insert({
        user_id: userId,
        title: `Boost Promotion Payment Review — ₹${price}`,
        category: "top_up",
        status: "open"
      });
    } catch (e) { console.error("Auto ticket creation failed:", e); }

    return bReq;
  }
}

// Recalculate and synchronize all wallet balances from real database records
export async function syncAndGetWallet(userId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // 1. Fetch or create wallet
  let wallet = await getOrCreateWallet(userId);

  // 2. Query completed orders
  const { data: comOrders, error: orderErr } = await supabase
    .from("orders")
    .select("seller_payout_inr, payout_status")
    .eq("seller_id", userId)
    .eq("status", "completed");

  if (orderErr) {
    console.error("[syncAndGetWallet] Error loading orders:", orderErr);
    return wallet;
  }

  // 3. Query non-rejected withdrawals
  const { data: withdrawals, error: wdErr } = await supabase
    .from("withdrawals")
    .select("amount, status")
    .eq("user_id", userId)
    .not("status", "eq", "rejected");

  if (wdErr) {
    console.error("[syncAndGetWallet] Error loading withdrawals:", wdErr);
    return wallet;
  }

  // 4. Query reactivation fees
  const { data: reactTxns, error: txErr } = await supabase
    .from("wallet_transactions")
    .select("amount")
    .eq("wallet_id", userId)
    .eq("type", "withdrawal")
    .like("description", "%Reactivation Fee%");

  if (txErr) {
    console.error("[syncAndGetWallet] Error loading reactivation fees:", txErr);
    return wallet;
  }

  // Calculate sums
  const total_earnings = (comOrders ?? []).reduce((sum, o) => sum + Number(o.seller_payout_inr || 0), 0);
  const withdrawn_amount = (withdrawals ?? []).filter(w => w.status === 'completed').reduce((sum, w) => sum + Number(w.amount), 0);
  const pending_withdrawals = (withdrawals ?? []).filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0);
  const reactivation_fees = (reactTxns ?? []).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const held_escrow = (comOrders ?? []).filter(o => ['pending_cooling', 'dormant'].includes(o.payout_status)).reduce((sum, o) => sum + Number(o.seller_payout_inr || 0), 0);

  const pending_balance = held_escrow + pending_withdrawals;
  const available_balance = Math.max(0, total_earnings - (withdrawn_amount + pending_withdrawals + reactivation_fees) - held_escrow);

  // Update wallet record in database
  const { data: updatedWallet, error: updErr } = await supabase
    .from("wallets")
    .update({
      total_earnings,
      withdrawn_amount,
      pending_balance,
      available_balance,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (updErr) {
    console.error("[syncAndGetWallet] Error updating wallet:", updErr);
    return wallet;
  }

  return updatedWallet;
}
