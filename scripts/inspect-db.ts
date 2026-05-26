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

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from("listings").select("*").limit(1);
  if (error) console.error("Error fetching listings:", error);
  else console.log("Listings Sample:", data?.[0]);

  const { data: orders } = await supabase.from("orders").select("*").limit(1);
  console.log("Orders Sample:", orders?.[0]);

  const { data: profiles } = await supabase.from("profiles").select("*").limit(1);
  console.log("Profiles Sample:", profiles?.[0]);
}

run().catch(console.error);
