import * as fs from "fs";
import * as path from "path";

// Manually parse .env
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

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

async function run() {
  const openApiUrl = `${supabaseUrl}/rest/v1/`;
  console.log("Fetching OpenAPI spec...");
  
  const response = await fetch(openApiUrl, {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  });
  
  const spec: any = await response.json();
  const catsDefinition = spec.definitions?.categories;
  
  console.log("\n--- 'categories' Table properties from live schema cache ---");
  console.log(JSON.stringify(catsDefinition.properties, null, 2));
}

run().catch(console.error);
