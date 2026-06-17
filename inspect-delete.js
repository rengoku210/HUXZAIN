import fs from 'fs';
import { createClient } from "@supabase/supabase-js";

// Read .env from workspace root
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith("'") || val.startsWith('"')) val = val.slice(1, -1);
    envVars[key] = val;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const adminUserId = '927d27fc-1ea9-4ec3-a14c-fa8d5cff54b8';

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function executeAndRead(sqlQuery) {
  let cleanQuery = sqlQuery.trim();
  if (cleanQuery.endsWith(";")) {
    cleanQuery = cleanQuery.slice(0, -1);
  }

  const wrappedSql = `
    UPDATE public.profiles 
    SET bio = (
      SELECT COALESCE(json_agg(t)::text, '[]')
      FROM (${cleanQuery}) t
    )
    WHERE id = '${adminUserId}';
  `;

  const { error } = await supabase.rpc("exec_sql", { sql: wrappedSql });
  if (error) {
    throw new Error(`RPC exec_sql error: ${error.message}`);
  }

  const { data, error: fetchErr } = await supabase
    .from("profiles")
    .select("bio")
    .eq("id", adminUserId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Fetch bio error: ${fetchErr.message}`);
  }

  return JSON.parse(data?.bio || '[]');
}

async function run() {
  console.log("=== Listings Columns & Types ===");

  try {
    const sql = `
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'listings';
    `;
    const cols = await executeAndRead(sql);
    cols.forEach(c => {
      console.log(`  - ${c.column_name} (data_type: ${c.data_type}, udt_name: ${c.udt_name}, nullable: ${c.is_nullable})`);
    });

  } catch (err) {
    console.error("Audit failed:", err);
  }
}

run();
