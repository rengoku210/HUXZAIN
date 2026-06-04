"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const logTeamLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; employeeId?: string; success: boolean; device: string; role: string; ip: string }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) return { success: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const ip = request.headers.get("cf-connecting-ip") ||
               request.headers.get("x-real-ip") ||
               request.headers.get("x-forwarded-for")?.split(",")[0] ||
               "127.0.0.1";

    const { error } = await supabaseAdmin
      .from("team_login_history")
      .insert({
        email: data.email,
        employee_id: data.employeeId || null,
        success: data.success,
        device: data.device,
        role_attempted: data.role,
        ip_address: ip,
      });

    // We don't fail the login if logging fails
    if (error) {
      console.error("[Employee Auth] Failed to log team login attempt:", error);
    }

    return { success: true };
  });
