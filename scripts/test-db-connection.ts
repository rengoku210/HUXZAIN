import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

async function run() {
  const res1 = await supabase.from("listing_reports").select("*").limit(1);
  console.log("listing_reports table exists?", !res1.error);
  if (res1.error) {
    console.log("listing_reports error:", res1.error.message);
  }

  const res2 = await supabase.from("seller_customizations").select("*").limit(1);
  console.log("seller_customizations table exists?", !res2.error);
  if (res2.data && res2.data.length > 0) {
    console.log("seller_customizations columns:", Object.keys(res2.data[0]));
  } else {
    // try to get columns using a blank query or inspect OpenAPI
    console.log("seller_customizations data is empty, but table exists.");
  }
}

run().catch(console.error);
