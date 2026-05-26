import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key && !key.startsWith("#")) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn("Could not read .env file:", e);
}

const supabaseUrl = process.env.SUPABASE_URL || "https://fqeoracqywgwbvwijwqq.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is missing in your .env file!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  // We can query schema information using postgres RPC if available, or just insert a dummy category with parent_id and see if it fails or succeeds.
  // Let's try to query the schema by executing an ad-hoc query or looking for parent_id in a select.
  const { data, error } = await supabase.from("categories").select("parent_id").limit(1);
  console.log("Selecting parent_id result:", data, error);
}

void check();
