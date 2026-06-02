"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const trackVisit = createServerFn({ method: "POST" })
  .inputValidator((d: { path: string; referrer: string; device: string; browser: string }) => d)
  .handler(async (ctx) => {
    const { data } = ctx as any;
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) return { success: false };

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve IP address
    const ip = request.headers.get("cf-connecting-ip") ||
               request.headers.get("x-real-ip") ||
               request.headers.get("x-forwarded-for")?.split(",")[0] ||
               "127.0.0.1";

    // Mask IP address by hashing
    const ipHash = createHash("sha256").update(ip).digest("hex");

    // Resolve country
    const country = request.headers.get("cf-ipcountry") || "Unknown";

    // Resolve user session if authenticated
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const { path, referrer, device, browser } = data;

    const { error } = await supabaseAdmin
      .from("visits_raw")
      .insert({
        user_id: userId,
        ip_hash: ipHash,
        device,
        browser,
        country,
        referrer: referrer || "Direct",
        path,
      });

    if (error) {
      console.error("[Analytics] Log visit error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  });

export const getAnalyticsStats = createServerFn({ method: "GET" })
  .handler(async (ctx) => {
    const request = (ctx as any).request as Request;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);

    // Ensure staff/admin
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
    const isStaff = roles.some(r => ["owner", "admin", "super_admin"].includes(r));

    if (!isStaff) {
      throw new Error("Forbidden");
    }

    // Load statistics
    const [rawVisitsRes, ordersRes, listingsRes] = await Promise.all([
      supabaseAdmin.from("visits_raw").select("*"),
      supabaseAdmin.from("orders").select("amount_total, status, created_at"),
      supabaseAdmin.from("listings").select("id, title, views, category_id, categories(name)")
    ]);

    if (rawVisitsRes.error) throw rawVisitsRes.error;

    const rawVisits = rawVisitsRes.data || [];
    const orders = ordersRes.data || [];
    const listings = listingsRes.data || [];

    // Process counts
    const today = new Date().toISOString().split("T")[0];
    
    const liveThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 mins ago
    const liveVisitorsCount = rawVisits.filter(v => v.created_at >= liveThreshold).length;

    const todayVisitorsCount = rawVisits.filter(v => v.created_at.startsWith(today)).length;

    const weeklyThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weeklyVisitorsCount = rawVisits.filter(v => v.created_at >= weeklyThreshold).length;

    const monthlyThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyVisitorsCount = rawVisits.filter(v => v.created_at >= monthlyThreshold).length;

    // Traffic sources
    const referrerCounts: Record<string, number> = {};
    rawVisits.forEach(v => {
      const ref = v.referrer || "Direct";
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });
    const trafficSources = Object.keys(referrerCounts).map(k => ({ name: k, value: referrerCounts[k] }));

    // Device/Browser stats
    const deviceCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};

    rawVisits.forEach(v => {
      deviceCounts[v.device] = (deviceCounts[v.device] || 0) + 1;
      browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
      countryCounts[v.country] = (countryCounts[v.country] || 0) + 1;
    });

    // Top pages
    const pathCounts: Record<string, number> = {};
    rawVisits.forEach(v => {
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
    });
    const topPages = Object.keys(pathCounts)
      .map(k => ({ path: k, views: pathCounts[k] }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      success: true,
      liveVisitors: liveVisitorsCount,
      todayVisitors: todayVisitorsCount,
      weeklyVisitors: weeklyVisitorsCount,
      monthlyVisitors: monthlyVisitorsCount,
      trafficSources,
      devices: Object.keys(deviceCounts).map(k => ({ name: k, value: deviceCounts[k] })),
      browsers: Object.keys(browserCounts).map(k => ({ name: k, value: browserCounts[k] })),
      countries: Object.keys(countryCounts).map(k => ({ name: k, value: countryCounts[k] })),
      topPages,
      totalSales: orders.filter(o => o.status === "completed").reduce((sum, o) => sum + Number(o.amount_total), 0)
    };
  });
