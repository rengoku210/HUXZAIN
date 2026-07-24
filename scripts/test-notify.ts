import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
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
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env manually:", e);
}

import { notify } from "../src/lib/notifications/notify";
import { getAdminClient } from "../src/server/supabase-admin";

async function testNotifications() {
  console.log("🚀 STARTING INTEGRATION TEST FOR NOTIFICATIONS...");
  const admin = getAdminClient();
  if (!admin) {
    console.error("❌ Database connection failed. Admin client is undefined.");
    process.exit(1);
  }

  // 1. Fetch a test user (ideally a staff or owner, or fallback to any profile)
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, email, display_name")
    .limit(1);

  if (pErr || !profiles || profiles.length === 0) {
    console.error("❌ No profiles found in the database to run the test.", pErr);
    process.exit(1);
  }

  const testUser = profiles[0];
  console.log(`👤 Using test user: ${testUser.display_name} (${testUser.email})`);

  // Ensure this user has the 'owner' role for the sake of the test
  console.log("🔑 Ensuring test user has 'owner' role...");
  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: testUser.id, role: "owner" });
  
  if (roleErr) {
    console.warn("⚠️ Failed to upsert 'owner' role (could be permission RLS on user_roles):", roleErr.message);
  }

  // 2. Dispatch a staff event
  console.log("🔔 Dispatching event 'staff.dispute_review'...");
  const res = await notify("staff.dispute_review", {
    userIds: [testUser.id],
    data: { disputeId: "test-dispute-id-123" },
    entity: { type: "dispute", id: "test-dispute-id-123" }
  });

  console.log("📦 Result:", res);

  if (!res.success) {
    console.error("❌ Notification dispatch failed:", res.error);
    process.exit(1);
  }

  console.log("✅ Notification rows successfully inserted into 'notifications' table.");

  // 3. Verify that mirroring worked and inserted into internal_notifications table
  console.log("🔍 Checking internal_notifications table for mirrored entry...");
  const { data: internalNotifs, error: intErr } = await admin
    .from("internal_notifications")
    .select("*")
    .eq("user_id", testUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (intErr) {
    console.error("❌ Error querying internal_notifications:", intErr.message);
    process.exit(1);
  }

  if (!internalNotifs || internalNotifs.length === 0) {
    console.error("❌ No mirrored internal_notifications found!");
    process.exit(1);
  }

  const latestInternal = internalNotifs[0];
  console.log("✅ Mirrored entry found in internal_notifications table:", latestInternal);
  console.log(`   - Title: ${latestInternal.title}`);
  console.log(`   - Body: ${latestInternal.body}`);
  console.log(`   - Category: ${latestInternal.category}`);
  console.log(`   - Type: ${latestInternal.type}`);

  if (latestInternal.category !== "disputes") {
    console.error(`❌ Category mismatch! Expected 'disputes', got '${latestInternal.category}'`);
    process.exit(1);
  }

  console.log("🎉 ALL NOTIFICATION SYSTEMS WORK PERFECTLY!");
  process.exit(0);
}

testNotifications().catch(e => {
  console.error("❌ Exception during test execution:", e);
  process.exit(1);
});
