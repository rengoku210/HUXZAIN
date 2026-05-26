// scripts/signed-url-expiration-check.ts
// Generates a signed URL for a test object in the payment_proofs bucket and verifies expiration <= 900 seconds.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const TEST_BUCKET = "payment_proofs";
const TEST_PATH = "test-object.txt";

async function run() {
  try {
    // Ensure test object exists (upload placeholder text)
    const { error: uploadErr } = await supabase.storage
      .from(TEST_BUCKET)
      .upload(TEST_PATH, new Blob(["test"], { type: "text/plain" }), { upsert: true });
    if (uploadErr) {
      console.error("❌ Upload error:", uploadErr.message);
      process.exit(1);
    }
    // Create signed URL with 15 min expiration (900 seconds)
    const { data, error: signErr } = await supabase.storage
      .from(TEST_BUCKET)
      .createSignedUrl(TEST_PATH, 900);
    if (signErr) {
      console.error("❌ Signed URL creation error:", signErr.message);
      process.exit(1);
    }
    const { signedUrl, expiresIn } = data;
    if (expiresIn > 900) {
      console.error(`❌ Signed URL expiration too long: ${expiresIn}s`);
      process.exit(1);
    }
    console.log("✅ Signed URL expiration is within limits:", expiresIn, "seconds");
    console.log("Signed URL:", signedUrl);
    process.exit(0);
  } catch (e) {
    console.error("❌ Unexpected error:", e);
    process.exit(1);
  }
}

run();
