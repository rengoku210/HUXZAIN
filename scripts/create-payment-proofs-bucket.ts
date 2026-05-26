// scripts/create-payment-proofs-bucket.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ensure this env var exists

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or service key not defined in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket("payment-proofs", {
    public: false, // private bucket
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });
  if (error && error.status !== 409) {
    // 409 means bucket already exists
    console.error("Error creating bucket:", error.message);
    process.exit(1);
  }
  console.log("Bucket created or already exists:", data?.name ?? "payment-proofs");
}

createBucket().then(() => process.exit());
