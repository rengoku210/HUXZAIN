// src/lib/payments/verificationQueueService.ts
import { getSupabase } from "../supabase-client";
import { UploadResult } from "./paymentUploadService";
import { runOcr } from "./ocrService";
import { calculateFraudScore } from "./fraudScoringService";

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

  // 1. Run OCR (simulation or real)
  const ocrResult = await runOcr(uploadResult.signedUrl);

  // 2. Fraud scoring
  const { score: fraudScore } = await calculateFraudScore({
    userId,
    orderId,
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
    .select("*, listings(title, seller_id)")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  const finalAmount = amount ?? Number(order.amount_inr || order.amount_total || 0);
  const sellerId = order.seller_id;
  const buyerId = order.buyer_id;

  // 2. Calculate distribution (96% seller, 4% admin)
  const commission = Math.round(finalAmount * 0.04);
  const sellerPayout = finalAmount - commission;

  // 3. Update order status and payout info (Real DB columns)
  await supabase
    .from("orders")
    .update({ 
      status: "paid", 
      payment_status: "paid",
      commission_inr: commission,
      seller_payout_inr: sellerPayout,
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

  // 6. Notifications
  await supabase.from("notifications").insert([
    {
      user_id: buyerId,
      kind: "order.paid",
      title: "Payment Verified",
      body: `Your payment for "${order.listings?.title || 'Order'}" has been verified. You can now access your order.`
    },
    {
      user_id: sellerId,
      kind: "order.paid",
      title: "Payment Received",
      body: `Payment for "${order.listings?.title || 'Order'}" has been verified and added to your payout queue.`
    }
  ]);

  // 7. Create conversation (Chat Unlock)
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        order_id: orderId,
        buyer_id: buyerId,
        seller_id: sellerId,
        subject: `Order: ${order.listings?.title || orderId.slice(0, 8)}`,
        last_message_preview: "Chat unlocked. Order is now paid.",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: adminId || sellerId, 
        body: `Chat unlocked. ${order.listings?.title || 'Order'} is now paid and ready for delivery.`,
        is_system: true,
      });
    }
  } catch (e) {
    console.warn("Conversations table might be missing or different:", e);
  }
}
