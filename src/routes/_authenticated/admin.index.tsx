import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { primaryCategories, featuredListings } from "@/lib/marketplace-data";
import { toast } from "sonner";
import { Database, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Platform Overview — HUXZAIN Admin" }] }),
  component: Page,
});

const DEMO_LISTINGS = [
  { title: "Premium WordPress Theme", price: 49, status: "active", description: "Responsive multipurpose WordPress theme with advanced page builder.", delivery_time: "Instant" },
  { title: "Complete Shopify Store Setup", price: 199, status: "active", description: "Full Shopify store setup with design, products, and integrations.", delivery_time: "3 days" },
  { title: "SEO Optimization Service", price: 120, status: "active", description: "Complete on-page and technical SEO optimization for your website.", delivery_time: "5 days" },
  { title: "Minimalist Logo Design", price: 75, status: "active", description: "Professional minimalist logo with vector files and branding guide.", delivery_time: "2 days" },
  { title: "Mobile App Development", price: 499, status: "active", description: "Custom React Native mobile app for iOS and Android.", delivery_time: "14 days" },
  { title: "5000+ Premium Icons Pack", price: 12, status: "active", description: "Extensive icon library in SVG, PNG, and Figma formats.", delivery_time: "Instant" },
  { title: "Instagram Templates Bundle", price: 18, status: "active", description: "60 editable Instagram story and post templates in Canva.", delivery_time: "Instant" },
  { title: "AI ChatGPT Prompts Mega Pack", price: 9, status: "active", description: "500+ curated ChatGPT prompts for business, marketing, and content.", delivery_time: "Instant" },
];

const CATEGORY_SLUG_MAP: Record<string, number> = {
  "digital-products": 0,
  "services": 1,
  "seo": 2,
  "design": 3,
  "programming": 4,
  "design-icons": 5,
  "design-templates": 6,
  "digital-products-ai": 7,
};

function Page() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ categories: number; listings: number } | null>(null);

  async function seedAll() {
    const supabase = getSupabase();
    if (!supabase) { toast.error("Supabase not configured"); return; }
    setSeeding(true);
    setSeedResult(null);

    try {
      // 1. Upsert categories
      const catRows = primaryCategories.map((c) => ({ name: c.title, slug: c.slug }));
      const { data: cats, error: catErr } = await supabase
        .from("categories")
        .upsert(catRows, { onConflict: "slug" })
        .select("id, slug");
      if (catErr) throw new Error(`Categories: ${catErr.message}`);

      // 2. Build slug→id map
      const slugToId: Record<string, string> = {};
      for (const c of cats ?? []) slugToId[c.slug] = c.id;

      // 3. Upsert listings (assign category_id based on slug mapping)
      const SLUG_ASSIGNMENTS = [
        "digital-products", "services", "seo", "design",
        "programming", "design", "design", "digital-products",
      ];
      const listingRows = DEMO_LISTINGS.map((l, i) => ({
        ...l,
        category_id: slugToId[SLUG_ASSIGNMENTS[i]] ?? null,
        seller_id: null, // anonymous demo
      }));
      const { error: listErr } = await supabase
        .from("listings")
        .upsert(listingRows, { onConflict: "title" });
      if (listErr) throw new Error(`Listings: ${listErr.message}`);

      setSeedResult({ categories: cats?.length ?? 0, listings: listingRows.length });
      toast.success("Demo data seeded successfully!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function clearDemo() {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!confirm("Remove all demo listings? This cannot be undone.")) return;
    const titles = DEMO_LISTINGS.map((l) => l.title);
    const { error } = await supabase.from("listings").delete().in("title", titles);
    if (error) toast.error(error.message);
    else { toast.success("Demo listings removed."); setSeedResult(null); }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Platform Overview</h1>
      <p className="text-sm text-muted-foreground mt-1">Manage the platform, seed demo data, and monitor key metrics.</p>

      {/* Seed panel */}
      <div className="mt-6">
        <PanelCard title="Demo Data Manager">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-surface/30">
              <div className="flex items-start gap-3">
                <Database className="size-5 text-gold mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Seed Demo Data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inserts 8 categories and 8 sample listings into Supabase so the homepage and category pages look populated for client testing. Safe to run multiple times (upserts by slug/title).
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={seedAll}
                      disabled={seeding}
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gold text-black text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition-all"
                    >
                      {seeding ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                      {seeding ? "Seeding…" : "Seed All Demo Data"}
                    </button>
                    <button
                      onClick={clearDemo}
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:border-red-500/40 hover:text-red-400 transition-colors"
                    >
                      Clear Demo Listings
                    </button>
                  </div>
                </div>
              </div>

              {seedResult && (
                <div className="mt-4 p-3 rounded-lg border border-green-500/20 bg-green-500/5 flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-green-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-green-400">
                    Seeded <strong>{seedResult.categories}</strong> categories and <strong>{seedResult.listings}</strong> listings successfully.
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">Homepage and category pages will now show live data.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Manage Listings", to: "/admin/listings" },
                { label: "Manage Categories", to: "/admin/categories" },
                { label: "Manage Users", to: "/admin/users" },
                { label: "Payments", to: "/admin/payments" },
              ].map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  className="p-3 rounded-xl border border-border hover:border-gold/30 bg-surface/30 hover:bg-surface/60 transition-colors text-sm font-medium text-center"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>
    </>
  );
}
