const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fqeoracqywgwbvwijwqq.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZW9yYWNxeXdnd2J2d2lqd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg0NTk4OSwiZXhwIjoyMDk0NDIxOTg5fQ.Im5EMmwnG2GZLlnC7uHkhOA_AdpYqDVoGAVtPBPZftE";

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  try {
    console.log("=== DB RLS Policies Inspection ===");
    
    const query = `
      SELECT policyname, schemaname, tablename, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'payment_proofs';
    `;
    
    const { data, error } = await supabase.rpc("exec_sql", { sql: query });
    
    if (error) {
      console.error("SQL Execution error:", error.message);
      return;
    }

    console.log("RLS Policies on 'payment_proofs':");
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("Fatal error:", err);
  }
}

run();
