"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import crypto from "crypto";

const ROLE_PREFIXES: Record<string, string> = {
  super_admin: "HUX-SA-",
  admin: "HUX-ADM-",
  moderator: "HUX-MOD-",
  payment_reviewer: "HUX-PAY-",
  verification_officer: "HUX-VER-",
  support_agent: "HUX-SUP-",
  employee: "HUX-EMP-",
  manager: "HUX-MGR-",
  developer: "HUX-DEV-",
};

/**
 * Resolves an Employee ID to its email for login.
 */
export const resolveEmployeeIdToEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { employeeId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is offline.");

    const employeeId = data.employeeId.trim().toUpperCase();

    const { data: emp, error } = await supabase
      .from("employees")
      .select("email, status")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error || !emp) {
      throw new Error("Invalid Employee ID. Please check your credentials.");
    }

    if (emp.status === "disabled") {
      throw new Error("This staff account has been disabled. Contact Super Admin.");
    }

    return { email: emp.email };
  });

/**
 * Pre-validates team login inputs, roles, and status before calling signInWithPassword.
 */
export const preValidateTeamLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { input: string; role: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is offline.");

    const input = data.input.trim();
    const role = data.role.trim();

    if (!input) {
      throw new Error("Invalid username. Email or Employee ID is required.");
    }

    let emp: any = null;
    let error: any = null;

    if (input.toUpperCase().startsWith("HUX-")) {
      const employeeId = input.toUpperCase();
      const res = await supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employeeId)
        .maybeSingle();
      emp = res.data;
      error = res.error;
      if (error || !emp) {
        throw new Error("User not found. Employee ID is invalid.");
      }
    } else if (input.includes("@")) {
      const email = input.toLowerCase();
      const res = await supabase
        .from("employees")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      emp = res.data;
      error = res.error;
      if (error || !emp) {
        throw new Error("Unauthorized access. This email is not registered as a team member.");
      }
    } else {
      throw new Error("Invalid username. Please enter a valid Email or Employee ID.");
    }

    if (emp.status === "disabled") {
      throw new Error("Account disabled. Please contact Super Admin.");
    }

    if (emp.role !== role) {
      throw new Error("Role mismatch. The selected role does not match the role assigned to your employee account.");
    }

    return { email: emp.email, employeeId: emp.employee_id };
  });

/**
 * List all staff members.
 */
export const listStaffMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("employee_id", { ascending: true });

    if (error) {
      console.error("[Staff Server] List staff error:", error.message);
      throw new Error("Failed to fetch staff members.");
    }

    return data;
  });

/**
 * Create a new staff account.
 */
export const createStaffAccount = createServerFn({ method: "POST" })
  .inputValidator((d: {
    fullName: string;
    email: string;
    role: string;
    department: string;
    creatorUserId: string;
    creatorIp: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is offline.");

    const { fullName, email: rawEmail, role, department, creatorUserId, creatorIp } = data;
    const email = rawEmail.trim().toLowerCase();

    // 1. Generate unique Employee ID
    const prefix = ROLE_PREFIXES[role] || "HUX-EMP-";
    const { data: currentEmployees, error: fetchErr } = await supabase
      .from("employees")
      .select("employee_id")
      .like("employee_id", `${prefix}%`);

    if (fetchErr) {
      console.error("[Staff Server] Prefix search failed:", fetchErr.message);
      throw new Error("Failed to generate unique Employee ID.");
    }

    let nextNum = 1;
    if (currentEmployees && currentEmployees.length > 0) {
      const ids = currentEmployees
        .map(e => {
          const parts = e.employee_id.split("-");
          const numStr = parts[parts.length - 1];
          return parseInt(numStr, 10);
        })
        .filter(n => !isNaN(n));
      
      if (ids.length > 0) {
        nextNum = Math.max(...ids) + 1;
      }
    }
    const employeeId = `${prefix}${nextNum.toString().padStart(4, "0")}`;

    // 2. Generate secure temporary password
    const tempPassword = crypto.randomBytes(6).toString("hex") + "A1!";

    // 3. Create Auth User
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: fullName,
        role: role,
      }
    });

    if (authErr) {
      console.error("[Staff Server] Auth user creation failed:", authErr.message);
      throw new Error(`Auth user creation failed: ${authErr.message}`);
    }

    const userId = authData.user.id;

    // 4. Create Public Profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        display_name: fullName,
        username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") + "_" + Math.random().toString(36).substring(2, 6),
        is_seller: false
      });

    if (profileErr) {
      console.error("[Staff Server] Profile insert error:", profileErr.message);
    }

    // 5. Assign Roles
    const rolesToAssign = [role, "buyer"];
    for (const r of rolesToAssign) {
      await supabase.from("user_roles").upsert({ user_id: userId, role: r }, { onConflict: "user_id,role" });
    }

    // 6. Insert Employee record
    const { error: empErr } = await supabase
      .from("employees")
      .insert({
        id: userId,
        employee_id: employeeId,
        full_name: fullName,
        email,
        role,
        department,
        status: "active"
      });

    if (empErr) {
      console.error("[Staff Server] Employee record insert failed:", empErr.message);
      throw new Error(`Database record creation failed: ${empErr.message}`);
    }

    // 7. Log Action in staff_action_logs
    await supabase.from("staff_action_logs").insert({
      staff_id: creatorUserId,
      action: "CREATE_STAFF_ACCOUNT",
      target_type: "employee",
      target_id: userId,
      new_value: JSON.stringify({ employeeId, fullName, email, role, department }),
      ip_address: creatorIp
    });

    return { success: true, employeeId, tempPassword, email };
  });

/**
 * Reset staff password.
 */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .inputValidator((d: {
    targetUserId: string;
    employeeId: string;
    creatorUserId: string;
    creatorIp: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is offline.");

    const { targetUserId, employeeId, creatorUserId, creatorIp } = data;
    const newTempPassword = crypto.randomBytes(6).toString("hex") + "B2!";

    const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUserId, {
      password: newTempPassword
    });

    if (updateErr) {
      console.error("[Staff Server] Password reset failed:", updateErr.message);
      throw new Error(`Password reset failed: ${updateErr.message}`);
    }

    // Log action
    await supabase.from("staff_action_logs").insert({
      staff_id: creatorUserId,
      action: "RESET_STAFF_PASSWORD",
      target_type: "employee",
      target_id: targetUserId,
      new_value: `Password reset to temporary password for employee ID: ${employeeId}`,
      ip_address: creatorIp
    });

    return { success: true, newTempPassword };
  });

/**
 * Toggle staff status (Enable/Disable account).
 */
export const toggleStaffStatus = createServerFn({ method: "POST" })
  .inputValidator((d: {
    targetUserId: string;
    employeeId: string;
    currentStatus: string;
    creatorUserId: string;
    creatorIp: string;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is offline.");

    const { targetUserId, employeeId, currentStatus, creatorUserId, creatorIp } = data;
    const newStatus = currentStatus === "active" ? "disabled" : "active";

    // 1. Update status in employees table
    const { error: empErr } = await supabase
      .from("employees")
      .update({ status: newStatus })
      .eq("id", targetUserId);

    if (empErr) {
      console.error("[Staff Server] Status update in table failed:", empErr.message);
      throw new Error(`Status update failed: ${empErr.message}`);
    }

    // 2. Ban/unban in Supabase Auth using raw update (users can't login if disabled)
    // Supabase has ban_duration but custom checking in resolveEmployeeIdToEmail is more reliable
    
    // Log action
    await supabase.from("staff_action_logs").insert({
      staff_id: creatorUserId,
      action: "TOGGLE_STAFF_STATUS",
      target_type: "employee",
      target_id: targetUserId,
      previous_value: currentStatus,
      new_value: newStatus,
      ip_address: creatorIp
    });

    return { success: true, newStatus };
  });

/**
 * List all staff activity audit logs.
 */
export const listStaffAuditLogs = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("staff_action_logs")
      .select(`
        id,
        action,
        target_type,
        target_id,
        previous_value,
        new_value,
        ip_address,
        created_at,
        staff_id,
        profiles (
          display_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Staff Server] Fetch audit logs error:", error.message);
      throw new Error("Failed to fetch activity logs.");
    }

    return data;
  });

/**
 * List all team login history.
 */
export const listTeamLoginHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { data, error } = await supabase
      .from("team_login_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Staff Server] Fetch login history error:", error.message);
      throw new Error("Failed to fetch login history.");
    }

    return data;
  });
