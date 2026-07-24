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

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Supabase URL:", supabaseUrl);

  // Define database setup SQL
  const sql = `
  -- 1. Ensure theme_enabled exists on seller_customizations
  ALTER TABLE public.seller_customizations 
    ADD COLUMN IF NOT EXISTS theme_enabled BOOLEAN DEFAULT true;

  -- 2. Add owner role value to app_role enum if it is indeed an enum type.
  -- To be extremely safe, we do it inside a DO block where we check if it is enum,
  -- and handle any potential issue gracefully.
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_type t 
      JOIN pg_namespace n ON t.typnamespace = n.oid 
      WHERE t.typname = 'app_role' AND n.nspname = 'public'
    ) THEN
      BEGIN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END
  $$;

  -- 3. Create listing_reports table
  CREATE TABLE IF NOT EXISTS public.listing_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Enable Row Level Security (RLS) on listing_reports
  ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

  -- Create permissive policy so clients can insert and read listing_reports easily during testing
  DROP POLICY IF EXISTS listing_reports_all ON public.listing_reports;
  CREATE POLICY listing_reports_all ON public.listing_reports FOR ALL USING (true);
  `;

  console.log("Running SQL commands via exec_sql...");
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Migration error:", error);
  } else {
    console.log("Migration executed successfully:", data);
  }

  // Inspect seller_customizations properties via OpenAPI to verify
  const openApiUrl = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(openApiUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  const spec: any = await response.json();
  console.log("\n--- Verification ---");
  console.log("seller_customizations schema:", Object.keys(spec.definitions?.seller_customizations?.properties || {}));
  console.log("listing_reports schema:", Object.keys(spec.definitions?.listing_reports?.properties || {}));
}

run().catch(console.error);
