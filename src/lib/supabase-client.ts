/**
 * Browser Supabase client. Works only when VITE_SUPABASE_URL +
 * VITE_SUPABASE_ANON_KEY are present in the env. Safe to import
 * everywhere — returns null when not configured so auth/data layers
 * can render placeholder UI without crashing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "huxzain.auth",
    },
  });
  return _client;
}
