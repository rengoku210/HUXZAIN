const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing keys.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function seed() {
  console.log("Seeding test passwords and data...");

  // 1. Reset rammodhvadiya210@gmail.com password
  const rammoEmail = "rammodhvadiya210@gmail.com";
  const { data: rammoUser, error: rammoError } = await supabase.auth.admin.listUsers();
  if (rammoError) throw rammoError;

  const rammo = rammoUser.users.find(u => u.email?.toLowerCase() === rammoEmail);
  if (rammo) {
    const { error: updErr } = await supabase.auth.admin.updateUserById(rammo.id, { password: "TempPass123!" });
    if (updErr) console.error("Error updating rammo password:", updErr);
    else console.log("Updated rammo password successfully");

    // Make sure they have admin role
    const { error: rErr } = await supabase.from("user_roles").upsert({ user_id: rammo.id, role: "admin" }, { onConflict: "user_id,role" });
    if (rErr) console.error("Error setting rammo admin role:", rErr);
    else console.log("Set rammo admin role successfully");
  } else {
    console.log("rammodhvadiya210@gmail.com not found");
  }

  // 2. Reset lullilullivabhaiva@gmail.com password
  const vabhEmail = "lullilullivabhaiva@gmail.com";
  const vabh = rammoUser.users.find(u => u.email?.toLowerCase() === vabhEmail);
  if (vabh) {
    const { error: updErr } = await supabase.auth.admin.updateUserById(vabh.id, { password: "TempPass123!" });
    if (updErr) console.error("Error updating vabh password:", updErr);
    else console.log("Updated vabh password successfully");

    // Make sure they have admin role
    const { error: rErr } = await supabase.from("user_roles").upsert({ user_id: vabh.id, role: "admin" }, { onConflict: "user_id,role" });
    if (rErr) console.error("Error setting vabh admin role:", rErr);
    else console.log("Set vabh admin role successfully");
  }

  // 3. Create or update test buyer: test_buyer@huxzain.app
  const buyerEmail = "test_buyer@huxzain.app";
  let buyer = rammoUser.users.find(u => u.email?.toLowerCase() === buyerEmail);
  if (!buyer) {
    console.log("Creating test buyer user...");
    const { data: newBuyer, error: createErr } = await supabase.auth.admin.createUser({
      email: buyerEmail,
      password: "TempPass123!",
      email_confirm: true
    });
    if (createErr) throw createErr;
    buyer = newBuyer.user;
    console.log("Test buyer created:", buyer.id);
  } else {
    const { error: updErr } = await supabase.auth.admin.updateUserById(buyer.id, { password: "TempPass123!" });
    if (updErr) console.error("Error updating buyer password:", updErr);
    else console.log("Updated buyer password successfully");
  }

  // Make sure profile exists for buyer
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: buyer.id,
    email: buyerEmail,
    display_name: "Test Buyer",
    username: "testbuyer",
    is_seller: false
  }, { onConflict: "id" });
  if (pErr) console.error("Error upserting buyer profile:", pErr);
  else console.log("Upserted buyer profile successfully");

  // Assign role 'buyer'
  await supabase.from("user_roles").upsert({ user_id: buyer.id, role: "buyer" }, { onConflict: "user_id,role" });

  // 4. Create an order and a pending payment proof for this buyer
  // Let's find an active listing
  const { data: listings } = await supabase.from("listings").select("*").eq("status", "active").limit(1);
  if (listings && listings.length > 0) {
    const listing = listings[0];
    console.log("Using listing for test order:", listing.id, listing.title);

    // Make sure lullilullivabhaiva@gmail.com is marked as a seller
    await supabase.from("profiles").update({ is_seller: true }).eq("id", vabh.id);

    // Update listing's seller_id to lullilullivabhaiva@gmail.com
    await supabase.from("listings").update({ seller_id: vabh.id }).eq("id", listing.id);

    // Create a new pending order
    const { data: newOrder, error: oErr } = await supabase.from("orders").insert({
      buyer_id: buyer.id,
      seller_id: vabh.id,
      listing_id: listing.id,
      qty: 1,
      amount_total: listing.price_inr || 599,
      amount_inr: listing.price_inr || 599,
      currency: "INR",
      payment_method: "manual",
      status: "pending"
    }).select("id").single();

    if (oErr) console.error("Error creating order:", oErr);
    else {
      console.log("Pending order created:", newOrder.id);

      // Create a pending payment proof
      const { error: proofErr } = await supabase.from("payment_proofs").insert({
        order_id: newOrder.id,
        user_id: buyer.id,
        buyer_id: buyer.id,
        listing_id: listing.id,
        amount: listing.price_inr || 599,
        screenshot_url: "https://example.com/mock-receipt.jpg",
        status: "pending",
        payment_type: "listing",
        payment_reference: `listing:${listing.id}`
      });

      if (proofErr) console.error("Error creating payment proof:", proofErr);
      else console.log("Pending payment proof created successfully");
    }
  }

  console.log("Seeding done!");
}

seed();
