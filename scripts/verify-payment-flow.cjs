const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Manually parse .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// Test Data
const buyerId = "47f363ac-690a-47ce-aa02-cad9dc6cbe8a"; // TEST USER
const sellerId = "3396f4e3-c5be-4f0a-a503-b77ddecb51a1"; // u49839498
const adminId = buyerId; 
const listingId = "6360b42f-e810-417e-ad2a-e0313302b5aa";
const price = 599; // INR

async function runTest() {
  console.log("--- Starting E2E Payment Pipeline Test (REAL SCHEMA) ---");

  // 1. Buy Now Simulation
  console.log("Step 1: Simulating 'Buy Now'...");
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      listing_title: 'E2E Test Logo',
      amount_inr: price,
      status: "pending_payment",
      payment_method: "manual",
      payment_status: "created"
    })
    .select("id")
    .single();

  if (orderErr) {
    console.error("Order Creation Error:", orderErr);
    throw orderErr;
  }
  console.log("Order created:", order.id);

  // 2. Upload Proof Simulation (using payment_events as fallback)
  console.log("Step 2: Simulating 'Proof Upload' via payment_events...");
  const { data: event, error: vErr } = await supabase
    .from("payment_events")
    .insert({
      order_id: order.id,
      provider: "manual",
      event_id: "E2E-" + Date.now(),
      event_type: "proof_uploaded",
      payload: {
        user_id: buyerId,
        screenshot_url: "https://example.com/e2e-proof.png",
        transaction_id: "E2E-UTR-" + Date.now(),
        amount: price,
        status: "pending"
      }
    })
    .select("id")
    .single();

  if (vErr) {
    console.error("Payment Event Creation Error:", vErr);
    throw vErr;
  }
  console.log("Payment proof stored in payment_events:", event.id);

  // Update order to admin_review
  await supabase.from("orders").update({ status: "admin_review" }).eq("id", order.id);

  // 3. Admin Approval Simulation
  console.log("Step 3: Simulating 'Admin Approval'...");
  
  const status = "approved";
  const commission = Math.round(price * 0.04);
  const sellerPayout = price - commission;

  // 1. Update order status and payout info (Real DB columns)
  await supabase
    .from("orders")
    .update({ 
      status: "paid", 
      payment_status: "paid",
      commission_inr: commission,
      seller_payout_inr: sellerPayout,
      updated_at: new Date().toISOString() 
    })
    .eq("id", order.id);

  // 2. Update payment_event
  const { data: currentEvent } = await supabase.from("payment_events").select("payload").eq("id", event.id).single();
  const newPayload = { ...currentEvent.payload, status, approved_by: adminId };
  await supabase.from("payment_events").update({ payload: newPayload, processed: true }).eq("id", event.id);

  // 3. Create conversation
  const { data: conv } = await supabase
    .from("conversations")
    .insert({
      order_id: order.id,
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      subject: `Order E2E Test`,
      last_message_preview: "Chat unlocked. Order is now paid.",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  console.log("Admin approved and processed the payment.");

  // 4. Verification
  console.log("Step 4: Verifying results...");
  
  const { data: finalOrder } = await supabase.from("orders").select("status, payment_status, commission_inr, seller_payout_inr").eq("id", order.id).single();
  console.log(`Final Order Status: ${finalOrder.status}`);
  console.log(`Payment Status: ${finalOrder.payment_status}`);
  console.log(`Commission: ₹${finalOrder.commission_inr}`);
  console.log(`Seller Payout: ₹${finalOrder.seller_payout_inr}`);

  const { data: finalConv } = await supabase.from("conversations").select("id").eq("order_id", order.id).maybeSingle();
  console.log(`Conversation Created: ${finalConv ? "Yes" : "No"}`);

  if (finalOrder.status === "paid" && finalConv && finalOrder.commission_inr > 0) {
    console.log("\n✅ E2E Payment Pipeline Test PASSED!");
  } else {
    console.log("\n❌ E2E Payment Pipeline Test FAILED!");
  }
}

runTest().catch((e) => {
  console.error("Test failed with error:", e);
});
