import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE public.payment_proofs ADD COLUMN IF NOT EXISTS ocr_data jsonb;"
  });
  console.log("payment_proofs", data, error);

  const { data2, error2 } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE public.subscription_payment_proofs ADD COLUMN IF NOT EXISTS ocr_data jsonb;"
  });
  console.log("subscription_payment_proofs", data2, error2);
}

run();
