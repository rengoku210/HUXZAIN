"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const submitReport = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      targetType: "listing" | "seller";
      targetId: string;
      reason: string;
      note: string;
      screenshotUrl?: string;
    }) => d
  )
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;
    // Authenticate user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing database credentials");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve reporter session
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    let reporterId: string | null = null;
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      reporterId = userData?.user?.id || null;
    }

    const { targetType, targetId, reason, note, screenshotUrl } = data;

    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        reason,
        note,
        screenshot_url: screenshotUrl || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("[Report] Error submitting report:", error.message);
      return { success: false, error: error.message };
    }

    // Trigger admin notification about suspicious report
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["owner", "admin", "super_admin"]);

    if (admins) {
      for (const admin of admins) {
        await supabaseAdmin.from("notifications").insert({
          user_id: admin.user_id,
          kind: "admin.report_received",
          title: "New Public Report Submitted",
          body: `A user has reported a ${targetType} (ID: ${targetId}) for: "${reason}".`,
        });
      }
    }

    return { success: true, reportId: report.id };
  });

export const getReportsList = createServerFn({ method: "GET" })
  .handler(async (ctx) => {
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase configuration missing");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Ensure staff
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);

    if (!userData?.user) {
      throw new Error("Unauthorized");
    }

    // Check staff role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    
    const roles = roleData?.map(r => r.role) || [];
    const isStaff = roles.some(r => ["owner", "admin", "super_admin", "staff", "moderator"].includes(r));

    if (!isStaff) {
      throw new Error("Forbidden");
    }

    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, reports };
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { reportId: string; status: "resolved" | "dismissed" }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase configuration missing");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Ensure staff
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);

    if (!userData?.user) {
      throw new Error("Unauthorized");
    }

    // Update status
    const { reportId, status } = data;
    const { data: updatedReport, error } = await supabaseAdmin
      .from("reports")
      .update({
        status,
        resolved_by: userData.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, report: updatedReport };
  });
