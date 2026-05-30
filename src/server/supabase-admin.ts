import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL || 
              process.env.SUPABASE_URL || 
              (import.meta as any).env?.VITE_SUPABASE_URL || 
              (import.meta as any).env?.SUPABASE_URL;
              
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
              process.env.SUPABASE_KEY ||
              (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY ||
              (import.meta as any).env?.SUPABASE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin client.");
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
