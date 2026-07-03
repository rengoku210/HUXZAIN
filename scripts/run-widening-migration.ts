import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach((line) => {
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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration(fileName: string) {
  const filePath = path.join(process.cwd(), "supabase", "migrations", fileName);
  console.log(`Reading migration: ${fileName}`);
  const sql = fs.readFileSync(filePath, "utf-8");

  console.log(`Running migration: ${fileName}...`);
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error(`Error in ${fileName}:`, error);
    throw error;
  } else {
    console.log(`Successfully completed migration: ${fileName}`);
  }
}

async function run() {
  await runMigration("20260703010000_create_payment_proof_history.sql");
  console.log("History migration executed successfully.");
}

run().catch((err) => {
  console.error("Fatal migration failure:", err);
  process.exit(1);
});
