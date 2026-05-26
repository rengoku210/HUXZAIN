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

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", { sql: "ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;" });
  console.log("exec_sql RPC result:", data, error);
}

void run();
