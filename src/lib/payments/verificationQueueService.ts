// src/lib/payments/verificationQueueService.ts
import { getSupabase } from "../supabase-client";
import { UploadResult } from "./paymentUploadService";
import { runOcr } from "./ocrService";
import { calculateFraudScore } from "./fraudScoringService";
import { getFinanceConfig, computeTransactionSummary, type CategoryKey } from "@/lib/finance";
import { onPaymentSuccess, onOrderDelivered } from "@/lib/notifications/hooks";

export interface VerificationRecord {
  id: string;
  order_id: string;
  user_id: string;
  screenshot_url: string;
  screenshot_hash: string;
  status: "pending" | "approved" | "rejected";
  ocr_result?: any;
  fraud_score?: number;
  created_at: string;
}

/**
 * Create a new verification record in the queue.
 * Matches REAL database schema: uses payment_events for storage.
 */
export async function createVerification(params: {
  userId: string;
  orderId: string;
  uploadResult: UploadResult;
}): Promise<any> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");

  const { userId, orderId, uploadResult } = params;

  // 1. Run OCR (simulation or real) with a failsafe timeout to prevent hanging in the browser
  let ocrResult: any = { rawText: "" };
  try {
    const ocrPromise = runOcr(uploadResult.signedUrl);
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("OCR Timeout")), 5000)
    );
    ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
  } catch (ocrErr) {
    console.warn("[VerificationQueue] OCR failed or timed out, proceeding with fallback:", ocrErr);
  }

  // 2. Fraud scoring
  const { score: fraudScore } = await calculateFraudScore({
    userId,
    orderId,
    transactionId: ocrResult.transactionId,
    amount: ocrResult.amount,
    timestamp: ocrResult.timestamp,
    ocrConfidence: ocrResult.confidence,
    screenshotHash: uploadResult.hash,
  });

  // Use payment_events as fallback for missing payment_verifications table
  const { data, error } = await supabase
    .from("payment_events")
    .insert([
      {
        order_id: orderId,
        provider: "manual",
        event_type: "proof_uploaded",
        payload: {
          user_id: userId,
          screenshot_url: uploadResult.signedUrl,
          screenshot_hash: uploadResult.hash,
          ocr_result: ocrResult,
          fraud_score: fraudScore,
          transaction_id: ocrResult.transactionId,
          amount: ocrResult.amount,
          status: "pending",
        },
      },
    ])
    .select("*");
  
  if (error) throw error;
  
  // Update order payment status
  await supabase.from("orders").update({ status: "admin_review", payment_status: "attempted" }).eq("id", orderId);
  
  return data?.[0];
}

/**
 * Update verification status by staff.
 */
export async function updateVerificationStatus(params: {
  verificationId: string;
  status: "approved" | "rejected";
  staffUserId: string;
  note?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");
  const { verificationId, status, staffUserId, note } = params;

  // 1. Update record (try payment_events first as it exists in DB)
  const { data: event, error: vError } = await supabase
    .from("payment_events")
    .select("*")
    .eq("id", verificationId)
    .maybeSingle();
  
  if (!vError && event) {
    const newPayload = { ...event.payload, status, staff_note: note, staff_user_id: staffUserId };
    await supabase
      .from("payment_events")
      .update({ payload: newPayload, processed: status === "approved" })
      .eq("id", verificationId);
    
    if (status === "approved" && event.order_id) {
      await processOrderApproval(event.order_id, newPayload.amount);
    } else if (status === "rejected" && event.order_id) {
      await supabase.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", event.order_id);
    }
  } else {
    // Try payment_verifications just in case it was created later
    try {
       await supabase
        .from("payment_verifications")
        .update({ status, staff_user_id: staffUserId, staff_note: note })
        .eq("id", verificationId);
    } catch(e) {
      console.error("No verification table found and event update failed.");
    }
  }
}

/**
 * Internal logic to finalize an order after payment verification.
 * Matches REAL database schema: amount_inr, commission_inr, etc.
 */
async function processOrderApproval(orderId: string, amount: number | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");

  // 1. Fetch order & seller info
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, listings(title, seller_id, category_id, attributes)")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  const finalAmount = amount ?? Number(order.amount_inr || order.amount_total || 0);
  const sellerId = order.seller_id;
  const buyerId = order.buyer_id;

  let commission = order.commission_inr != null ? Number(order.commission_inr) : null;
  let sellerPayout = order.seller_payout_inr != null ? Number(order.seller_payout_inr) : null;
  let commissionPercent = order.commission_percent != null ? Number(order.commission_percent) : null;
  let categoryKey = order.category_key ?? null;
  // Category slug is needed both for the finance summary and the delivery-engine
  // lookup below, so it must live in the outer scope (was previously declared
  // inside the fee-computation block, making it undefined at the engine lookup).
  let catSlug: string | null = null;

  // If order payout fields are missing or if the manually approved amount differs from checkout amount_inr, compute dynamically!
  if (commission === null || sellerPayout === null || (amount !== null && amount !== Number(order.amount_inr))) {
    // Retrieve seller's active membership tier plan
    let sellerTier = "standard";
    const { data: sellerSub } = await supabase
      .from("seller_subscriptions")
      .select("plan")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .maybeSingle();
    if (sellerSub?.plan) {
      sellerTier = sellerSub.plan;
    }

    // Resolve listing category slug
    if (order.listings?.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("slug")
        .eq("id", order.listings.category_id)
        .maybeSingle();
      catSlug = cat?.slug || null;
    }

    const financeConfig = await getFinanceConfig();
    const summary = computeTransactionSummary(financeConfig, {
      categorySlug: catSlug,
      tier: sellerTier,
      priceInr: finalAmount,
      protectionSelected: !!order.buyer_protection_selected
    });

    commission = summary.commissionInr;
    sellerPayout = summary.sellerReceivesInr;
    commissionPercent = summary.commissionPercent;
    categoryKey = summary.categoryKey;
  }

  // Resolve category engine delivery configuration
  let deliveryType = "manual";
  let deliveryEngine = "Manual";

  if (catSlug) {
    const { data: engineConfig } = await supabase
      .from("category_engine_config")
      .select("delivery_type, delivery_engine")
      .eq("category_slug", catSlug)
      .maybeSingle();

    if (engineConfig) {
      deliveryType = engineConfig.delivery_type;
      deliveryEngine = engineConfig.delivery_engine;
    }
  }

  // Calculate target order status and payload for Instant / File / Credentials
  let targetStatus = "payment_approved";
  let deliveryPayload: any = null;
  let deliveredAt: string | null = null;

  if (deliveryEngine === "Instant" || deliveryEngine === "File") {
    targetStatus = "buyer_reviewing";
    deliveredAt = new Date().toISOString();
    // Copy listing attributes containing key files or variables
    const attrs = order.listings?.attributes || {};
    deliveryPayload = {
      instant: true,
      file_url: attrs.file_url || attrs.file || null,
      serial_key: attrs.serial_key || attrs.license_key || attrs.redemption_code || null,
      notes: attrs.notes || attrs.secret_notes || null
    };
  } else if (deliveryEngine === "Credentials") {
    // If credentials exist in the vault, we can auto-release them immediately
    try {
      const { data: creds } = await supabase
        .rpc("reveal_listing_credentials", { p_listing_id: order.listing_id });

      if (creds && (creds.login_id || creds.password)) {
        targetStatus = "buyer_reviewing";
        deliveredAt = new Date().toISOString();
        deliveryPayload = {
          released: true,
          login_id: creds.login_id,
          password: creds.password,
          instructions: creds.instructions || null,
          recovery_details: creds.recovery_details || null,
          email_transfer_details: creds.email_transfer_details || null
        };
      }
    } catch (e) {
      console.warn("[processOrderApproval] Failed to check pre-configured credentials:", e);
    }
  }

  // 3. Update order status and payout info (Real DB columns)
  await supabase
    .from("orders")
    .update({ 
      status: targetStatus, 
      payment_status: "paid",
      commission_inr: commission,
      seller_payout_inr: sellerPayout,
      commission_percent: commissionPercent,
      category_key: categoryKey,
      delivery_payload: deliveryPayload,
      delivered_at: deliveredAt,
      updated_at: new Date().toISOString() 
    })
    .eq("id", orderId);

  // 4. Find admin for notifications/audit
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["owner", "admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  const adminId = adminRole?.user_id;

  // 5. Create payout record
  try {
    await supabase.from("seller_payouts").insert({
      seller_id: sellerId,
      amount_inr: sellerPayout,
      status: "pending",
      notes: `Manual verification approval for order ${orderId}`
    });
  } catch (e) {
    console.warn("seller_payouts table might be missing:", e);
  }

  // 6. Notifications using the centralized notification hooks (no manual inserts!)
  try {
    await onPaymentSuccess(orderId, buyerId, sellerId);
    if (targetStatus === "buyer_reviewing") {
      await onOrderDelivered(orderId, buyerId, sellerId);
    }
  } catch (notifErr) {
    console.warn("[processOrderApproval] central notification dispatcher skipped:", notifErr);
  }

  // 7. Create conversation (Chat Unlock) & send automated system message
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        order_id: orderId,
        buyer_id: buyerId,
        seller_id: sellerId,
        subject: `Order: ${order.listings?.title || orderId.slice(0, 8)}`,
        last_message_preview: targetStatus === "buyer_reviewing" ? "Chat unlocked. Automated delivery completed." : "Chat unlocked. Order is now paid.",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (conv) {
      const messagesToInsert = [];

      // Always send chat unlock system notification
      messagesToInsert.push({
        conversation_id: conv.id,
        sender_id: adminId || sellerId, 
        body: `Chat unlocked. ${order.listings?.title || 'Order'} is now paid.`,
        is_system: true,
      });

      // If automated delivery was triggered, append system delivery notification
      if (targetStatus === "buyer_reviewing") {
        messagesToInsert.push({
          conversation_id: conv.id,
          sender_id: adminId || sellerId,
          body: `[SYSTEM_DELIVERY_SUBMITTED]: Automated ${deliveryEngine} delivery completed. Materials released to the buyer.`,
          is_system: true,
        });
      }

      await supabase.from("messages").insert(messagesToInsert);
    }
  } catch (e) {
    console.warn("Conversations table might be missing or different:", e);
  }
}
