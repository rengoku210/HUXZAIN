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

async function run() {
  const openApiUrl = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(openApiUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  
  const spec: any = await response.json();
  const defs = spec.definitions;
  console.log("Available tables:", Object.keys(defs));
  
  if (defs.payment_verifications) {
    console.log("payment_verifications columns:", Object.keys(defs.payment_verifications.properties));
  } else {
    // Try case sensitivity or plural/singular
    const matches = Object.keys(defs).filter(k => k.toLowerCase().includes("pay") || k.toLowerCase().includes("verify"));
    console.log("Matching tables:", matches);
  }
}

run().catch(console.error);
