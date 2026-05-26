import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { updateVerificationStatus } from "../src/lib/payments/verificationQueueService";

// Manually parse .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
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
const adminId = buyerId; // We just made him admin
const listingId = "6360b42f-e810-417e-ad2a-e0313302b5aa";
const price = 599; // INR

async function runTest() {
  console.log("--- Starting E2E Payment Pipeline Test ---");

  // 1. Buy Now Simulation
  console.log("Step 1: Simulating 'Buy Now'...");
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      qty: 1,
      amount_total: price,
      currency: "INR",
      payment_method: "manual",
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (orderErr) throw orderErr;
  console.log("Order created:", order.id);

  const amountCents = Math.round(price * 100);
  await supabase.from("transactions").insert({
    user_id: buyerId,
    order_id: order.id,
    type: "charge",
    amount_cents: amountCents,
    currency: "INR",
    ref: `manual_test:${order.id}`,
    status: "pending",
  });

  // 2. Upload Proof Simulation
  console.log("Step 2: Simulating 'Proof Upload'...");
  const { data: verification, error: vErr } = await supabase
    .from("payment_verifications")
    .insert({
      user_id: buyerId,
      order_id: order.id,
      transaction_id: "TEST-E2E-123",
      screenshot_url: "https://example.com/proof.png",
      screenshot_hash: "hash_" + Date.now(),
      status: "pending",
      amount: price,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (vErr) throw vErr;
  console.log("Verification submitted:", verification.id);

  // 3. Admin Approval Simulation
  console.log("Step 3: Simulating 'Admin Approval'...");
  // We need to call the real function updateVerificationStatus
  // Note: We need to ensure getSupabase() works in the service context.
  // Since we are running in a script, we might need to mock it or set env vars.
  process.env.VITE_SUPABASE_URL = supabaseUrl;
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  // We'll use service key for the test script to ensure it can update wallets
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

  await updateVerificationStatus({
    verificationId: verification.id,
    status: "approved",
    staffUserId: adminId,
    note: "E2E Test Approval",
  });
  console.log("Admin approved the payment.");

  // 4. Wallet Distribution Verification
  console.log("Step 4: Verifying Wallet Distribution...");
  
  const { data: sellerWallet } = await supabase.from("wallets").select("balance_cents").eq("user_id", sellerId).single();
  const { data: adminWallet } = await supabase.from("wallets").select("balance_cents").eq("user_id", adminId).single();

  const expectedSellerCents = Math.round(amountCents * 0.96);
  const expectedAdminCents = amountCents - expectedSellerCents;

  console.log(`Seller Wallet: ${sellerWallet?.balance_cents} cents`);
  console.log(`Admin Wallet: ${adminWallet?.balance_cents} cents`);
  console.log(`Expected Seller Credit: ${expectedSellerCents} cents`);
  console.log(`Expected Admin Fee: ${expectedAdminCents} cents`);

  // 5. Order Status Verification
  const { data: finalOrder } = await supabase.from("orders").select("status").eq("id", order.id).single();
  console.log(`Final Order Status: ${finalOrder?.status}`);

  // 6. Chat Unlock Verification
  const { data: thread } = await supabase.from("message_threads").select("id").eq("order_id", order.id).maybeSingle();
  console.log(`Chat Thread Created: ${thread ? "Yes (" + thread.id + ")" : "No"}`);

  if (finalOrder?.status === "paid" && thread) {
    console.log("\n✅ E2E Payment Pipeline Test PASSED!");
  } else {
    console.log("\n❌ E2E Payment Pipeline Test FAILED!");
  }
}

runTest().catch((e) => {
  console.error("Test failed with error:", e);
});
