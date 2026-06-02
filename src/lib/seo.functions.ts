"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const getPageSeo = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);

    const { data: seo, error } = await supabaseAdmin
      .from("seo_pages")
      .select("*")
      .eq("path", data.path)
      .maybeSingle();

    if (error) {
      console.error("[SEO] Error fetching page SEO:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, seo };
  });

export const savePageSeo = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      path: string;
      title: string;
      description: string;
      keywords?: string;
      ogImageUrl?: string;
      schemaJson?: any;
    }) => d
  )
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);

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
    const isStaff = roles.some(r => ["owner", "admin", "super_admin", "staff"].includes(r));

    if (!isStaff) {
      throw new Error("Forbidden");
    }

    const { path, title, description, keywords, ogImageUrl, schemaJson } = data;

    const { data: seo, error } = await supabaseAdmin
      .from("seo_pages")
      .upsert({
        path,
        title,
        description,
        keywords: keywords || null,
        og_image_url: ogImageUrl || null,
        schema_json: schemaJson || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "path" })
      .select()
      .single();

    if (error) {
      console.error("[SEO] Error saving page SEO:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, seo };
  });
