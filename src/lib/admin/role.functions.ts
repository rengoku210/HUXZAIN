"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/roles";

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data: { targetUserId: string; newRoles: Role[]; token: string }) => data)
  .handler(async ({ data: { targetUserId, newRoles, token } }) => {
    try {
      console.log(`[RoleFunctions] Role update requested for user ${targetUserId}`);

      let activeClient = getAdminClient();
      let isFallback = false;

      if (!activeClient) {
        console.warn("[updateUserRole] Admin service client is missing. Resolving standard client fallback...");
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fqeoracqywgwbvwijwqq.supabase.co";
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        if (url && anonKey) {
          activeClient = createClient(url, anonKey, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          isFallback = true;
        }
      }

      if (!activeClient) {
        return {
          success: false,
          error: "Database configuration is missing. Please ensure environment variables are configured."
        };
      }

      // 1. Authenticate the caller securely
      const { data: authData, error: authErr } = await activeClient.auth.getUser(token);
      if (authErr || !authData.user) {
        return {
          success: false,
          error: "Unauthorized: Invalid session token"
        };
      }

      const callerId = authData.user.id;
      const callerEmail = authData.user.email ?? "";

      // 2. Fetch the caller's current roles
      const { data: callerRoleData, error: callerRoleErr } = await activeClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);

      if (callerRoleErr) {
        return {
          success: false,
          error: `Failed to verify your permissions: ${callerRoleErr.message}`
        };
      }

      const callerRoles = callerRoleData?.map((r: any) => r.role as string) || [];
      const ADMIN_EMAILS = ["admin@admin.com", "lullilullivabhaiva@gmail.com"];
      const isEmailWhitelist = ADMIN_EMAILS.includes(callerEmail.toLowerCase());

      const isSuperAdmin = callerRoles.includes("super_admin") || callerRoles.includes("owner") || isEmailWhitelist;
      const isAdmin = callerRoles.includes("admin") || callerRoles.includes("moderator") || isEmailWhitelist;

      if (!isSuperAdmin && !isAdmin) {
        return {
          success: false,
          error: "Access Denied: You do not have permission to manage roles."
        };
      }

      // 3. Enforce promotion rules based on caller's role
      const restrictedRoles = ["super_admin", "owner"];
      const assigningRestricted = newRoles.some((r) => restrictedRoles.includes(r));

      if (!isSuperAdmin && assigningRestricted) {
        return {
          success: false,
          error: "Security Alert: Only Super Admins can assign Super Admin or Owner roles."
        };
      }

      // 4. Also prevent admins from removing restricted roles from existing users
      if (!isSuperAdmin) {
        const { data: targetRoleData } = await activeClient
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId);
        const targetRoles = targetRoleData?.map((r: any) => r.role as string) || [];
        const targetHasRestricted = targetRoles.some((r) => restrictedRoles.includes(r));
        if (targetHasRestricted) {
          return {
            success: false,
            error: "Security Alert: You cannot modify the roles of a Super Admin or Owner. Only Super Admins can do this."
          };
        }
      }

      // 5. Update the roles securely bypassing RLS — delete existing, insert new exact values
      const { error: delErr } = await activeClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);

      if (delErr) {
        return {
          success: false,
          error: `Failed to reset roles: ${delErr.message}`
        };
      }

      // Insert new roles directly (since public.user_roles.role column has been changed to TEXT)
      if (newRoles.length > 0) {
        const uniqueRoles = Array.from(new Set(newRoles));
        const inserts = uniqueRoles.map((r) => ({ user_id: targetUserId, role: r }));
        const { error: insErr } = await activeClient.from("user_roles").insert(inserts);
        if (insErr) {
          return {
            success: false,
            error: `Failed to assign roles: ${insErr.message}`
          };
        }
      }

      // 5.5. Sync granular role to profiles table (fail-safe in case the column does not exist yet)
      const primaryRole = newRoles.includes("super_admin") ? "super_admin" :
                          newRoles.includes("owner") ? "owner" :
                          newRoles.includes("admin") ? "admin" :
                          newRoles.includes("moderator") ? "moderator" :
                          newRoles.includes("staff") ? "staff" : "buyer";

      try {
        await activeClient
          .from("profiles")
          .update({ role: primaryRole })
          .eq("id", targetUserId);
      } catch (profilesErr: any) {
        console.warn("[RoleFunctions] Failed to sync profiles.role (might not exist yet):", profilesErr?.message || profilesErr);
      }

      // 6. Persist granular role securely in auth.users user_metadata (if service role key is available)
      if (!isFallback) {
        try {
          const { error: metaErr } = await activeClient.auth.admin.updateUserById(targetUserId, {
            user_metadata: { role: primaryRole }
          });
          if (metaErr) console.warn("[RoleFunctions] Secure metadata update failed:", metaErr.message);
        } catch (metaErr: any) {
          console.warn("[RoleFunctions] Secure metadata update exception:", metaErr?.message || metaErr);
        }
      }

      console.log(`[RoleFunctions] Successfully updated roles for ${targetUserId} to:`, newRoles);
      return { success: true };
    } catch (globalErr: any) {
      console.error("[updateUserRole] Unhandled exception:", globalErr);
      return {
        success: false,
        error: globalErr?.message || String(globalErr)
      };
    }
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data: { token } }) => {
    try {
      let activeClient = getAdminClient();
      let isFallback = false;

      if (!activeClient) {
        console.warn("[listAdminUsers] Admin service client is missing. Resolving standard client fallback...");
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fqeoracqywgwbvwijwqq.supabase.co";
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        if (url && anonKey) {
          activeClient = createClient(url, anonKey, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          isFallback = true;
        }
      }

      if (!activeClient) {
        return {
          success: false,
          error: "Database configuration is missing. Please ensure VITE_SUPABASE_URL is configured."
        };
      }

      // 1. Authenticate caller using active client
      const { data: authData, error: authErr } = await activeClient.auth.getUser(token);
      if (authErr || !authData.user) {
        return {
          success: false,
          error: `Authentication failed: ${authErr?.message || "Invalid session token"}`
        };
      }

      const callerId = authData.user.id;
      
      // Fetch caller's roles safely
      const { data: callerRoleData, error: callerRoleErr } = await activeClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);

      if (callerRoleErr) {
        return {
          success: false,
          error: `Failed to verify your permissions: ${callerRoleErr.message}`
        };
      }

      const callerRoles = callerRoleData?.map((r: any) => r.role as string) || [];
      const isEmailWhitelist = ["admin@admin.com", "lullilullivabhaiva@gmail.com", "rammodhvadiya210@gmail.com"].includes(authData.user.email ?? "");
      const isAdmin = callerRoles.includes("admin") || callerRoles.includes("super_admin") || callerRoles.includes("owner") || isEmailWhitelist;

      if (!isAdmin) {
        return {
          success: false,
          error: "Access Denied: You do not have administrator permissions."
        };
      }

      // 2. Fetch profiles safely with optional role column
      let profiles: any[] | null = null;
      let pErr: any = null;
      try {
        const res = await activeClient
          .from("profiles")
          .select("id, display_name, username, created_at, suspended_at, is_seller, is_verified, email, role")
          .order("created_at", { ascending: false });
        profiles = res.data;
        pErr = res.error;
      } catch (err) {
        console.warn("[listAdminUsers] Direct fetch profiles.role column threw exception:", err);
      }

      if (pErr || !profiles) {
        const res = await activeClient
          .from("profiles")
          .select("id, display_name, username, created_at, suspended_at, is_seller, is_verified, email")
          .order("created_at", { ascending: false });
        if (res.error) {
          return {
            success: false,
            error: `Failed to fetch user profiles: ${res.error.message}`
          };
        }
        profiles = res.data;
      }

      const { data: roleRows, error: rErr } = await activeClient
        .from("user_roles")
        .select("user_id, role");

      if (rErr) {
        return {
          success: false,
          error: `Failed to fetch user roles: ${rErr.message}`
        };
      }

      let authUsers = null;
      let listErr = null;
      if (!isFallback) {
        try {
          const res = await activeClient.auth.admin.listUsers();
          authUsers = res.data;
          listErr = res.error;
        } catch (err) {
          console.warn("[listAdminUsers] Non-blocking listUsers exception:", err);
        }
      }
      
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

      const combined = (profiles ?? []).map((p: any) => {
        const roles = roleMap[p.id] ?? [];
        const metaRole = p.role || metaRoleMap[p.id];
        
        // Supplement with granular role if it is a custom admin/staff/owner role
        if (metaRole && ["admin", "staff", "moderator", "super_admin", "owner"].includes(metaRole)) {
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

      return {
        success: true,
        data: combined
      };
    } catch (globalErr: any) {
      console.error("[listAdminUsers] Unhandled exception:", globalErr);
      return {
        success: false,
        error: globalErr?.message || String(globalErr)
      };
    }
  });
