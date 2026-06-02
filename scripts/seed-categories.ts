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

/**
 * HUXZAIN approved homepage categories (premium set).
 *
 * NOTE:
 * - This script assumes your `categories` table uses columns:
 *   `name`, `slug`, `sort_order`, `icon`
 * - If your table uses `title/sort` instead, update payload keys accordingly.
 */
const categories = [
  { name: "Gaming Accounts", slug: "gaming-accounts", sort_order: 10, icon: "Gamepad2" },
  { name: "In-Game Currency", slug: "in-game-currency", sort_order: 20, icon: "Gem" },
  { name: "Gift Cards", slug: "gift-cards", sort_order: 30, icon: "Gift" },
  { name: "Software & Tools", slug: "software-tools", sort_order: 40, icon: "Laptop" },
  { name: "Subscriptions", slug: "subscriptions", sort_order: 50, icon: "Crown" },
  { name: "Coaching Services", slug: "coaching-services", sort_order: 60, icon: "GraduationCap" },
  { name: "Boosting Services", slug: "boosting-services", sort_order: 70, icon: "Rocket" },
  { name: "Game Buddies", slug: "game-buddies", sort_order: 80, icon: "Users2" },
  { name: "Freelance Services", slug: "freelance-services", sort_order: 90, icon: "Briefcase" },
  { name: "Editing & Design", slug: "editing-design", sort_order: 100, icon: "Palette" },
  { name: "Advertising Services", slug: "advertising-services", sort_order: 110, icon: "Megaphone" },
  { name: "Digital Marketplace", slug: "digital-marketplace", sort_order: 120, icon: "Store" },
];

async function seed() {
  console.log("Seeding HUXZAIN approved categories into Supabase database...");
  
  const { data: upserted, error: upsertError } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "slug" })
    .select();

  if (upsertError) {
    console.error("Error seeding categories:", upsertError);
    process.exit(1);
  }

  console.log(`Successfully seeded ${upserted?.length ?? categories.length} categories!`);
}

void seed();
