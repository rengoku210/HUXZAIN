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

console.log("Supabase URL:", env.SUPABASE_URL || env.VITE_SUPABASE_URL);
const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: users, error: userError } = await supabase.from("profiles").select("id, display_name, is_seller").limit(10);
  if (userError) console.error("User Error:", userError);
  console.log("Users:", users);

  const { data: admins, error: adminError } = await supabase.from("user_roles").select("user_id, role").in("role", ["owner", "admin"]);
  if (adminError) console.error("Admin Error:", adminError);
  console.log("Admins:", admins);
}

void check();
