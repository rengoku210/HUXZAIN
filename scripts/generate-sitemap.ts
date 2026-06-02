import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const siteUrl = env.VITE_SITE_URL || "https://huxzain.shop";
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log("Generating sitemap...");
  
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase credentials for sitemap generation.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("slug");

  // 2. Fetch active listings
  const { data: listings } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("status", "active");

  const urls: string[] = [
    "",
    "/about",
    "/careers",
    "/contact",
    "/privacy",
    "/terms",
    "/refund-policy",
    "/how-it-works",
    "/categories"
  ];

  if (categories) {
    categories.forEach(c => {
      urls.push(`/category/${c.slug}`);
    });
  }

  if (listings) {
    listings.forEach(l => {
      urls.push(`/product/${l.slug || l.id}`);
    });
  }

  const now = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url === "" ? "daily" : "weekly"}</changefreq>
    <priority>${url === "" ? "1.0" : url.startsWith("/category/") ? "0.8" : "0.5"}</priority>
  </url>`).join("\n")}
</urlset>`;

  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf-8");
  console.log(`Sitemap written successfully to: ${sitemapPath}`);

  // Generate robots.txt
  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  fs.writeFileSync(robotsPath, robots, "utf-8");
  console.log(`robots.txt written successfully to: ${robotsPath}`);
}

run().catch(console.error);
