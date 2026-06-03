import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabaseAdmin.from("categories").select("*").limit(1);
  console.log("Data:", data);
  if (error) console.error("Error:", error);
}

check();
