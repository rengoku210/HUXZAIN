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

    // 8. Send Employee Welcome Email
    try {
      const { data: domainConfig } = await supabase
        .from("smtp_configurations")
        .select("*")
        .limit(1)
        .maybeSingle();

      const apiKey = domainConfig?.api_key || process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY;
      const fromEmail = domainConfig?.from_email || "noreply@huxzain.shop";

      if (apiKey) {
        const welcomeSubject = `Welcome to the HUXZAIN Team, ${fullName}!`;
        const welcomeHtml = `
          <div style="background-color: #0A0A0C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #1A1A22; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <!-- Top Gold Accent Bar -->
            <div style="height: 4px; background: linear-gradient(90deg, #D4AF37, #F3E5AB, #D4AF37); border-radius: 4px 4px 0 0; margin: -40px -20px 30px -20px;"></div>
            
            <!-- Header Logo -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1A1A22; padding-bottom: 20px;">
              <h1 style="color: #D4AF37; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0; text-transform: uppercase;">HUXZAIN</h1>
              <p style="color: #8F8F9A; font-size: 10px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Secure Digital Products Escrow Network</p>
            </div>
            
            <!-- Main Content -->
            <div style="background-color: #121216; border: 1px solid #1D1D26; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; border-left: 3px solid #D4AF37; padding-left: 12px;">
                Welcome to the Team, ${fullName}!
              </h2>
              <p style="color: #C0C0C6; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                Congratulations on joining the HUXZAIN operations crew! You have been onboarded as an authorized team member of the platform. Together, we are building India's most secure digital products escrow platform.
              </p>
              
              <!-- Credentials Block -->
              <div style="background-color: #181820; border: 1px solid #2A2A35; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <h3 style="color: #D4AF37; font-size: 12px; font-weight: 700; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Staff Credentials</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #C0C0C6;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #8F8F9A; width: 130px;">Employee ID:</td>
                    <td style="padding: 6px 0; font-family: monospace; color: #FFFFFF; font-weight: bold;">${employeeId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #8F8F9A;">Department:</td>
                    <td style="padding: 6px 0; color: #FFFFFF;">${department}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #8F8F9A;">Assigned Role:</td>
                    <td style="padding: 6px 0; color: #FFFFFF; text-transform: uppercase; font-weight: 600; font-size: 11px;">${role}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #8F8F9A;">Temporary Key:</td>
                    <td style="padding: 6px 0; font-family: monospace; color: #D4AF37; font-weight: bold;">${tempPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Expectations Block -->
              <h3 style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-bottom: 10px;">Platform Security & Code of Conduct</h3>
              <ul style="color: #A0A0AA; font-size: 13px; line-height: 1.5; padding-left: 20px; margin-bottom: 25px;">
                <li style="margin-bottom: 8px;"><strong>Strict Confidentiality:</strong> Never share these credentials or access keys with any third-party.</li>
                <li style="margin-bottom: 8px;"><strong>Zero Trust Verification:</strong> Always request UTR reference and bank validation for order settlements.</li>
                <li style="margin-bottom: 8px;"><strong>Accountability:</strong> All actions on the admin portal are tracked, signed, and audited.</li>
              </ul>

              <!-- Next Steps -->
              <h3 style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-bottom: 10px;">Your Next Steps</h3>
              <p style="color: #A0A0AA; font-size: 13px; line-height: 1.5; margin: 0 0 15px 0;">
                Log in to the HUXZAIN staff portal using your Employee ID or email address, along with your temporary key. You will be prompted to set a new password on your first session login.
              </p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="https://huxzain.shop/admin" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #D4AF37, #F3E5AB); color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(212,175,55,0.25);">
                  Access Admin Portal
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; border-top: 1px solid #1A1A22; padding-top: 25px; color: #60606A; font-size: 11px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">This communication is classified as internal company confidential information.</p>
              <p style="margin: 0 0 15px 0;">© 2026 HUXZAIN Security Command. All rights reserved.</p>
            </div>
          </div>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `HUXZAIN Command <${fromEmail}>`,
            to: [email],
            subject: welcomeSubject,
            html: welcomeHtml
          })
        });
      }
    } catch (welcomeErr) {
      console.error("Failed to send welcome email to new employee:", welcomeErr);
    }

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
