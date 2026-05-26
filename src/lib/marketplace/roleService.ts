import { getSupabase } from "@/lib/supabase-client";
import type { Role } from "@/lib/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Service layer for user and role management.
 * Uses Supabase tables:
 *   - profiles (id, email, etc.) – for basic user info.
 *   - user_roles (user_id, role) – many‑to‑many relation.
 */
export const roleService = {
  /** Get all users with their assigned roles */
  async getAllUsers(): Promise<{ id: string; email: string | null; roles: Role[] }[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    // Join profiles with user_roles
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id,email");
    if (pErr) throw pErr;
    const { data: roleRows, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id,role");
    if (rErr) throw rErr;
    const roleMap: Record<string, Role[]> = {};
    roleRows?.forEach((row) => {
      const uid = row.user_id as string;
      const role = row.role as Role;
      if (!roleMap[uid]) roleMap[uid] = [];
      roleMap[uid].push(role);
    });
    return (
      profiles?.map((p) => ({
        id: p.id,
        email: p.email,
        roles: roleMap[p.id] ?? [],
      })) ?? []
    );
  },

  /** Replace a user's roles with a new set */
  async setRoles(userId: string, newRoles: Role[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    // Remove existing roles for user
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) throw delErr;
    // Insert new roles (skip if empty)
    if (newRoles.length > 0) {
      const inserts = newRoles.map((r) => ({ user_id: userId, role: r }));
      const { error: insErr } = await supabase.from("user_roles").insert(inserts);
      if (insErr) throw insErr;
    }
  },
};
