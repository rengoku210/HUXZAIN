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
    const callerEmail = authData.user.email ?? "";

    // 2. Fetch the caller's current roles
    const { data: callerRoleData, error: callerRoleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (callerRoleErr) throw new Error("Failed to verify your permissions.");

    const callerRoles = callerRoleData?.map((r: any) => r.role as string) || [];

    const ADMIN_EMAILS = ["admin@admin.com", "lullilullivabhaiva@gmail.com", "rammodhvadiya210@gmail.com"];
    const isEmailWhitelist = ADMIN_EMAILS.includes(callerEmail.toLowerCase());

    const isSuperAdmin = callerRoles.includes("super_admin") || callerRoles.includes("owner") || isEmailWhitelist;
    const isAdmin = callerRoles.includes("admin") || callerRoles.includes("moderator") || isEmailWhitelist;

    if (!isSuperAdmin && !isAdmin) {
      throw new Error("Access Denied: You do not have permission to manage roles.");
    }

    // 3. Enforce promotion rules based on caller's role
    // Only super_admin or owner roles are restricted. Standard admins can assign staff, moderator, admin, buyer, seller.
    const restrictedRoles = ["super_admin", "owner"];
    const assigningRestricted = newRoles.some((r) => restrictedRoles.includes(r));

    if (!isSuperAdmin && assigningRestricted) {
      throw new Error("Security Alert: Only Super Admins can assign Super Admin or Owner roles.");
    }

    // 4. Also prevent admins from removing restricted roles from existing users
    if (!isSuperAdmin) {
      const { data: targetRoleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId);
      const targetRoles = targetRoleData?.map((r: any) => r.role as string) || [];
      const targetHasRestricted = targetRoles.some((r) => restrictedRoles.includes(r));
      if (targetHasRestricted) {
        throw new Error("Security Alert: You cannot modify the roles of a Super Admin or Owner. Only Super Admins can do this.");
      }
    }

    // 5. Update the roles securely bypassing RLS — delete existing, insert new exact values
    const { error: delErr } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    if (delErr) throw new Error(`Failed to reset roles: ${delErr.message}`);

    // Insert new roles — store compatible role values (admin, buyer, seller) to bypass enum constraints
    if (newRoles.length > 0) {
      const mappedRoles = newRoles.map((r) => {
        if (["staff", "moderator", "super_admin", "owner"].includes(r)) {
          return "admin" as Role;
        }
        return r;
      });
      const uniqueRoles = Array.from(new Set(mappedRoles));
      const inserts = uniqueRoles.map((r) => ({ user_id: targetUserId, role: r }));
      const { error: insErr } = await adminClient.from("user_roles").insert(inserts);
      if (insErr) throw new Error(`Failed to assign roles: ${insErr.message}`);
    }

    // 6. Persist granular role securely in auth.users user_metadata
    const primaryRole = newRoles.includes("super_admin") ? "super_admin" :
                        newRoles.includes("owner") ? "owner" :
                        newRoles.includes("admin") ? "admin" :
                        newRoles.includes("moderator") ? "moderator" :
                        newRoles.includes("staff") ? "staff" : "buyer";

    const { error: metaErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role: primaryRole }
    });
    if (metaErr) console.warn("[RoleFunctions] Secure metadata update failed:", metaErr.message);

    console.log(`[RoleFunctions] Successfully updated roles for ${targetUserId} to:`, newRoles);
    return { success: true };
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data: { token } }) => {
    const adminClient = getAdminClient();
    if (!adminClient) throw new Error("Server misconfigured.");

    // 1. Authenticate caller
    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !authData.user) throw new Error("Unauthorized");

    const callerId = authData.user.id;
    const { data: callerRoleData } = await adminClient.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = callerRoleData?.map((r: any) => r.role as string) || [];
    const isEmailWhitelist = ["admin@admin.com", "lullilullivabhaiva@gmail.com", "rammodhvadiya210@gmail.com"].includes(authData.user.email ?? "");
    const isAdmin = callerRoles.includes("admin") || callerRoles.includes("super_admin") || callerRoles.includes("owner") || isEmailWhitelist;

    if (!isAdmin) throw new Error("Forbidden");

    // 2. Fetch profiles, database roles, and auth metadata roles
    const { data: profiles, error: pErr } = await adminClient
      .from("profiles")
      .select("id, display_name, username, created_at, suspended_at, is_seller, is_verified, email")
      .order("created_at", { ascending: false });

    if (pErr) throw pErr;

    const { data: roleRows, error: rErr } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    if (rErr) throw rErr;

    const { data: authUsers, error: listErr } = await adminClient.auth.admin.listUsers();
    
    const metaRoleMap: Record<string, string> = {};
    if (!listErr && authUsers?.users) {
      authUsers.users.forEach((u) => {
        if (u.user_metadata?.role) {
          metaRoleMap[u.id] = u.user_metadata.role;
        }
      });
    }

    const roleMap: Record<string, string[]> = {};
    roleRows?.forEach((row) => {
      const uid = row.user_id;
      const r = row.role;
      if (!roleMap[uid]) roleMap[uid] = [];
      roleMap[uid].push(r);
    });

    const combined = (profiles ?? []).map((p) => {
      const roles = roleMap[p.id] ?? [];
      const metaRole = metaRoleMap[p.id];
      
      // Supplement with granular role if they are an admin
      if (metaRole && roles.includes("admin")) {
        if (!roles.includes(metaRole)) {
          roles.push(metaRole);
        }
      }

      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        username: p.username,
        created_at: p.created_at,
        suspended_at: p.suspended_at,
        is_seller: p.is_seller,
        is_verified: p.is_verified,
        roles: roles as Role[],
      };
    });

    return combined;
  });
