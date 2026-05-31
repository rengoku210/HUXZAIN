const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Parse .env manually
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    env[key] = val;
  }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log("Listing all RPC functions in public schema...");
  
  // We can query the pg_proc system catalog using a simple RPC or select if allowed.
  // Wait, service role has bypass RLS, but standard select on pg_catalog tables might be restricted over PostgREST.
  // Let's try!
  const { data, error } = await supabase
    .from("pg_proc")
    .select("proname")
    .limit(10);
    
  if (error) {
    console.log("Failed to query pg_proc directly:", error.message);
    // Let's try listing functions via a standard SQL query if we can find any other RPC.
  } else {
    console.log("Functions found in pg_proc:", data);
  }
}

check();
