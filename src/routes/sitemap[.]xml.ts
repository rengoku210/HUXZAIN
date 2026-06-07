"use server";

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://huxzain.shop";

// Static pages that should always appear in the sitemap
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/categories", priority: "0.9", changefreq: "daily" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/how-it-works", priority: "0.6", changefreq: "monthly" },
  { path: "/coaching", priority: "0.7", changefreq: "weekly" },
  { path: "/game-buddies", priority: "0.7", changefreq: "weekly" },
  { path: "/blog", priority: "0.5", changefreq: "weekly" },
  { path: "/contact", priority: "0.4", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/refund-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/become-coach", priority: "0.6", changefreq: "monthly" },
  { path: "/become-game-buddy", priority: "0.6", changefreq: "monthly" },
];

// Category slugs that are always present
const CATEGORY_SLUGS = [
  "gaming-accounts",
  "in-game-currency",
  "gift-cards",
  "software-tools",
  "subscriptions",
  "coaching-services",
  "boosting-services",
  "game-buddies",
  "freelance-services",
  "editing-design",
  "advertising-services",
  "digital-marketplace",
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
  const entries = urls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : "";
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl =
          process.env.VITE_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          "";
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

        const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

        // 1. Add static routes
        for (const route of STATIC_ROUTES) {
          urls.push({
            loc: `${BASE_URL}${route.path}`,
            changefreq: route.changefreq,
            priority: route.priority,
          });
        }

        // 2. Add category pages
        for (const slug of CATEGORY_SLUGS) {
          urls.push({
            loc: `${BASE_URL}/category/${slug}`,
            changefreq: "daily",
            priority: "0.8",
          });
        }

        // 3. Add active listings from Supabase (if configured)
        if (supabaseUrl && serviceKey) {
          try {
            const supabase = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });

            const { data: listings } = await supabase
              .from("listings")
              .select("id, slug, updated_at")
              .eq("status", "active")
              .order("updated_at", { ascending: false })
              .limit(2000);

            for (const listing of listings ?? []) {
              const identifier = listing.slug || listing.id;
              const lastmod = listing.updated_at
                ? new Date(listing.updated_at).toISOString().split("T")[0]
                : undefined;
              urls.push({
                loc: `${BASE_URL}/product/${encodeURIComponent(identifier)}`,
                lastmod,
                changefreq: "weekly",
                priority: "0.7",
              });
            }

            // 4. Add active category slugs from database
            const { data: dbCategories } = await supabase
              .from("categories")
              .select("slug")
              .order("sort_order");

            for (const cat of dbCategories ?? []) {
              const already = urls.some((u) => u.loc === `${BASE_URL}/category/${cat.slug}`);
              if (!already && cat.slug) {
                urls.push({
                  loc: `${BASE_URL}/category/${encodeURIComponent(cat.slug)}`,
                  changefreq: "daily",
                  priority: "0.8",
                });
              }
            }
          } catch (err) {
            console.error("[Sitemap] Failed to fetch dynamic data:", err);
            // Serve static-only sitemap on DB errors
          }
        }

        const xml = buildSitemap(urls);

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
