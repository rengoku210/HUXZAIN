// scripts/seed-admin.ts
// Seed script to create a development admin/owner account and assign the owner role.
// Run with: `node scripts/seed-admin.ts` (or via ts-node if TypeScript).

import { createClient } from "@supabase/supabase-js";
import { env } from "../src/lib/env";

// Configuration – can be overridden via environment variables.
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@huxzain.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "admin";
const REDIRECT_URL =
  process.env.ADMIN_SEED_REDIRECT ??
  `${process.env.VITE_SITE_URL || "http://localhost:8080"}/auth/verified`;

const supabase = createClient(env.supabase.url, env.supabase.anonKey);

async function ensureAdminUser() {
  // Try to sign in – if succeeds, user already exists.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (signInError && signInError.message.includes("Invalid login credentials")) {
    // User does not exist – create via sign‑up.
    console.log("Admin user not found – creating new admin account...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (signUpError) {
      console.error("Error creating admin user:", signUpError);
      process.exit(1);
    }
    const userId = signUpData?.user?.id;
    if (userId) {
      await assignOwnerRole(userId);
    }
  } else if (signInData) {
    // User exists – ensure owner role.
    console.log("Admin user already exists – verifying owner role...");
    await assignOwnerRole(signInData.user.id);
  } else {
    console.error("Unexpected error during admin user check:", signInError);
    process.exit(1);
  }
}

async function assignOwnerRole(userId: string) {
  // Check current roles.
  const { data: existingRoles, error: fetchErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (fetchErr) {
    console.error("Failed to fetch user roles:", fetchErr);
    return;
  }

  const hasOwner = (existingRoles ?? []).some((r) => (r as any).role === "owner");
  if (!hasOwner) {
    const { error: insertErr } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "owner",
    });
    if (insertErr) {
      console.error("Failed to assign owner role:", insertErr);
    } else {
      console.log("Owner role assigned to admin user.");
    }
  } else {
    console.log("Admin user already has owner role.");
  }
}

ensureAdminUser().catch((e) => {
  console.error("Seed script error:", e);
  process.exit(1);
});
