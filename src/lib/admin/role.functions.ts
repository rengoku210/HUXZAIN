"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import type { Role } from "@/lib/roles";

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data: { targetUserId: string; newRoles: Role[]; token: string }) => data)
  .handler(async ({ data: { targetUserId, newRoles, token } }) => {
    console.log(`[RoleFunctions] Role update requested for user ${targetUserId}`);

    const adminClient = getAdminClient();
    if (!adminClient) {
      throw new Error("Server misconfigured: missing admin client.");
    }

    // 1. Authenticate the caller securely
    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData.user) {
      console.warn("[RoleFunctions] Invalid token provided.");
      throw new Error("Unauthorized: Invalid session token");
    }

    const callerId = authData.user.id;

    // 2. Fetch the caller's current roles
    const { data: callerRoleData, error: callerRoleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (callerRoleErr) throw new Error("Failed to verify your permissions.");

    const callerRoles = callerRoleData?.map((r: any) => r.role as string) || [];

    const isSuperAdmin = callerRoles.includes("super_admin") || callerRoles.includes("owner");
    const isAdmin = callerRoles.includes("admin") || callerRoles.includes("moderator");

    if (!isSuperAdmin && !isAdmin) {
      throw new Error("Access Denied: You do not have permission to manage roles.");
    }

    // 3. Enforce promotion rules based on caller's role
    // Admins cannot assign staff, moderator, admin, super_admin, or owner.
    const restrictedRoles = ["staff", "moderator", "admin", "super_admin", "owner"];
    const assigningRestricted = newRoles.some((r) => restrictedRoles.includes(r));

    if (!isSuperAdmin && assigningRestricted) {
      throw new Error("Security Alert: Only Super Admins can assign administrative roles.");
    }

    // 4. Also prevent admins from removing restricted roles from existing users
    // If a user is already an admin, a regular admin shouldn't be able to demote them.
    if (!isSuperAdmin) {
      const { data: targetRoleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId);
      const targetRoles = targetRoleData?.map((r: any) => r.role as string) || [];
      const targetHasRestricted = targetRoles.some((r) => restrictedRoles.includes(r));
      if (targetHasRestricted) {
        throw new Error("Security Alert: You cannot modify the roles of an existing administrator. Only Super Admins can do this.");
      }
    }

    // 5. Update the roles securely bypassing RLS
    // Delete existing roles
    const { error: delErr } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    if (delErr) throw new Error(`Failed to reset roles: ${delErr.message}`);

    // Insert new roles
    if (newRoles.length > 0) {
      const inserts = newRoles.map((r) => ({ user_id: targetUserId, role: r }));
      const { error: insErr } = await adminClient.from("user_roles").insert(inserts);
      if (insErr) throw new Error(`Failed to assign roles: ${insErr.message}`);
    }

    // 6. Defensive, non-blocking compatibility write to profiles.role
    try {
      const primaryRole = newRoles.includes("super_admin") ? "super_admin" :
                          newRoles.includes("admin") ? "admin" :
                          newRoles.includes("moderator") ? "moderator" :
                          newRoles.includes("staff") ? "staff" : "buyer";

      await adminClient
        .from("profiles")
        .update({ role: primaryRole })
        .eq("id", targetUserId);
    } catch (err) {
      console.warn("[RoleFunctions] Non-blocking profiles.role compatibility update failed:", err);
    }

    console.log(`[RoleFunctions] Successfully updated roles for ${targetUserId} to:`, newRoles);
    return { success: true };
  });
