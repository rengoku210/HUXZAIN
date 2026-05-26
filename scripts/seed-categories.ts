import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Self-contained .env loader to support running directly with ts-node
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key && !key.startsWith("#")) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn("Could not read .env file:", e);
}

const supabaseUrl = process.env.SUPABASE_URL || "https://fqeoracqywgwbvwijwqq.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is missing in your .env file!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const parentCategories = [
  { name: "Digital Products", slug: "digital-products", sort_order: 10, icon: "Monitor" },
  { name: "Services", slug: "services", sort_order: 20, icon: "Cog" },
  { name: "Hosting", slug: "hosting", sort_order: 30, icon: "Server" },
  { name: "SEO", slug: "seo", sort_order: 40, icon: "Search" },
  { name: "Design", slug: "design", sort_order: 50, icon: "Palette" },
  { name: "Programming", slug: "programming", sort_order: 60, icon: "Code2" },
  { name: "Marketing", slug: "marketing", sort_order: 70, icon: "Megaphone" },
  { name: "Business", slug: "business", sort_order: 80, icon: "Building2" },
  { name: "Gaming & Entertainment", slug: "gaming-entertainment", sort_order: 85, icon: "Gamepad2" },
  { name: "More", slug: "more", sort_order: 90, icon: "Package" },
];

const childCategories = [
  { name: "Gaming Accounts", slug: "accounts", sort_order: 10, icon: "Gamepad2" },
  { name: "In-Game Currency", slug: "currency", sort_order: 20, icon: "Coins" },
  { name: "Gift Cards", slug: "gift-cards", sort_order: 30, icon: "Gift" },
  { name: "Boosting", slug: "boosting", sort_order: 40, icon: "Rocket" },
  { name: "Coaching", slug: "coaching", sort_order: 50, icon: "GraduationCap" },
  { name: "Subscriptions", slug: "subscriptions", sort_order: 60, icon: "Crown" },
];

async function seed() {
  console.log("Seeding parent categories into Supabase database...");
  
  const { data: parentData, error: parentError } = await supabase
    .from("categories")
    .upsert(parentCategories, { onConflict: "slug" })
    .select();

  if (parentError) {
    console.error("Error seeding parent categories:", parentError);
    process.exit(1);
  }

  console.log("Successfully seeded parent categories!");

  // Find Gaming & Entertainment ID
  const gamingEnt = parentData.find((c: any) => c.slug === "gaming-entertainment");
  if (!gamingEnt) {
    console.error("Could not find gaming-entertainment category after seeding!");
    process.exit(1);
  }

  console.log(`Found gaming-entertainment ID: ${gamingEnt.id}. Seeding child categories...`);

  const childCategoriesWithParent = childCategories.map((c) => ({
    ...c,
    parent_id: gamingEnt.id,
  }));

  const { data: childData, error: childError } = await supabase
    .from("categories")
    .upsert(childCategoriesWithParent, { onConflict: "slug" })
    .select();

  if (childError) {
    console.error("Error seeding child categories:", childError);
    process.exit(1);
  }

  console.log("Successfully seeded child categories!");
}

void seed();
