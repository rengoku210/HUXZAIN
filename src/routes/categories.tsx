import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LayoutGrid, ArrowRight, PackageOpen } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { getUiSlugFromDbSlug } from "@/lib/marketplace-data";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Categories — HUXZAIN" },
      {
        name: "description",
        content:
          "Browse all categories on HUXZAIN — digital products, services, design, programming, SEO, marketing, gaming, and much more.",
      },
      { property: "og:title", content: "All Categories — HUXZAIN Digital Marketplace" },
    ],
  }),
  component: CategoriesPage,
});

function DynamicHeading({ text }: { text: string }) {
  const parts = text.split(" ");
  if (parts.length <= 1) return <>{text}</>;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return (
    <>
      {rest} <span className="text-gold">{last}</span>
    </>
  );
}

function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [listingsCounts, setListingsCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      try {
        const [catsRes, listingsRes] = await Promise.all([
          sb.from("categories").select("*").order("sort_order"),
          sb.from("listings").select("category_id").eq("status", "active")
        ]);

        if (catsRes.error) throw catsRes.error;
        if (listingsRes.error) throw listingsRes.error;

        const cats = catsRes.data ?? [];
        const listings = listingsRes.data ?? [];

        const counts: Record<string, number> = {};
        listings.forEach((item: any) => {
          if (item.category_id) {
            counts[item.category_id] = (counts[item.category_id] ?? 0) + 1;
          }
        });

        setCategories(cats);
        setListingsCounts(counts);
      } catch (err) {
        console.error("Failed to load categories page data:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container-page py-20 flex justify-center items-center">
          <LucideIcons.Loader2 className="size-8 text-gold animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  const hasParentId = categories.length > 0 && "parent_id" in categories[0];

  const parentCategories = hasParentId
    ? categories.filter((c) => c.parent_id === null)
    : categories.filter((c) => !["accounts", "currency", "gift-cards", "boosting", "coaching", "subscriptions", "game-accounts", "rank-boosting", "in-game-credits"].includes(c.slug));

  const primaryCategoriesList = parentCategories.filter((parent) => {
    const hasChildren = hasParentId
      ? categories.some((c) => c.parent_id === parent.id)
      : parent.slug === "gaming-entertainment";
    return !hasChildren;
  });

  const groupedCategoriesList = parentCategories.filter((parent) => {
    const hasChildren = hasParentId
      ? categories.some((c) => c.parent_id === parent.id)
      : parent.slug === "gaming-entertainment";
    return hasChildren;
  });

  const getCategoryCountStr = (cat: any) => {
    const directCount = listingsCounts[cat.id] ?? 0;
    const children = hasParentId
      ? categories.filter((c) => c.parent_id === cat.id)
      : (cat.slug === "gaming-entertainment"
          ? categories.filter((c) => ["accounts", "currency", "gift-cards", "boosting", "coaching", "subscriptions", "game-accounts", "rank-boosting", "in-game-credits"].includes(c.slug))
          : []);
    const totalCount = directCount + children.reduce((sum, child) => sum + (listingsCounts[child.id] ?? 0), 0);
    return `${totalCount.toLocaleString()} ${totalCount === 1 ? "Listing" : "Listings"}`;
  };

  const getCategoryIconComponent = (iconName: string | null | undefined, slug: string) => {
    if (iconName && iconName in LucideIcons) {
      return (LucideIcons as any)[iconName];
    }
    const map: Record<string, any> = {
      "digital-products": LucideIcons.Monitor,
      "services": LucideIcons.Cog,
      "hosting": LucideIcons.Server,
      "seo": LucideIcons.Search,
      "design": LucideIcons.Palette,
      "programming": LucideIcons.Code2,
      "marketing": LucideIcons.Megaphone,
      "business": LucideIcons.Building2,
      "gaming-entertainment": LucideIcons.Gamepad2,
      "accounts": LucideIcons.Gamepad2,
      "game-accounts": LucideIcons.Gamepad2,
      "currency": LucideIcons.Coins,
      "in-game-credits": LucideIcons.Coins,
      "gift-cards": LucideIcons.Gift,
      "boosting": LucideIcons.Rocket,
      "rank-boosting": LucideIcons.Rocket,
      "coaching": LucideIcons.GraduationCap,
      "subscriptions": LucideIcons.Crown,
    };
    return map[slug] ?? LucideIcons.Package;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero & Search */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <LayoutGrid className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-6">
            All <span className="text-gold">Categories</span>
          </h1>
          <div className="max-w-2xl mx-auto relative">
            <LucideIcons.Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for any category, game, or service..."
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-surface/50 border border-border focus:border-gold/50 outline-none text-base transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Primary Categories */}
        {primaryCategoriesList.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold">
                Primary <span className="text-gold">Categories</span>
              </h2>
              <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
                {primaryCategoriesList.length} categories
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {primaryCategoriesList.map((cat) => {
                if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                const Icon = getCategoryIconComponent(cat.icon, cat.slug);
                return (
                  <Link
                    key={cat.slug}
                    to="/category/$slug"
                    params={{ slug: getUiSlugFromDbSlug(cat.slug) }}
                    className="group relative rounded-2xl border border-border bg-surface/40 p-6 hover:border-gold/40 hover:bg-surface-elevated transition-all flex flex-col gap-4 overflow-hidden"
                  >
                    {cat.banner_image_url && (
                      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <img src={cat.banner_image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                      </div>
                    )}
                    <div className="relative z-10 size-12 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                      <Icon className="size-5 text-gold drop-shadow-sm" />
                    </div>
                    <div className="relative z-10">
                      <div className="font-semibold text-sm group-hover:text-gold transition-colors mb-1">
                        {cat.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{getCategoryCountStr(cat)}</div>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                      Browse <ArrowRight className="size-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Grouped Categories (e.g. Gaming & Entertainment) */}
        {groupedCategoriesList.map((parent) => {
          const children = hasParentId
            ? categories.filter((c) => c.parent_id === parent.id)
            : categories.filter((c) => ["accounts", "currency", "gift-cards", "boosting", "coaching", "subscriptions", "game-accounts", "rank-boosting", "in-game-credits"].includes(c.slug));

          return (
            <section key={parent.id} className="mb-14">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold">
                  <DynamicHeading text={parent.name} />
                </h2>
                <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
                  {children.length} categories
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {children.map((cat) => {
                  if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                  const Icon = getCategoryIconComponent(cat.icon, cat.slug);
                  return (
                    <Link
                      key={cat.slug}
                      to="/category/$slug"
                      params={{ slug: getUiSlugFromDbSlug(cat.slug) }}
                      className="group relative rounded-2xl border border-border bg-surface/40 p-5 text-center hover:border-gold/40 hover:bg-surface-elevated transition-all flex flex-col items-center gap-3 overflow-hidden"
                    >
                      {cat.banner_image_url && (
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                          <img src={cat.banner_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="relative z-10 size-11 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                        <Icon className="size-5 text-gold drop-shadow-sm" />
                      </div>
                      <div className="relative z-10 text-sm font-medium group-hover:text-gold transition-colors">
                        {cat.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Popular Tags */}
        <div className="rounded-2xl border border-border bg-surface/40 p-7 mb-10">
          <h2 className="font-display text-xl font-bold text-gold mb-5">
            Popular Tags &amp; Subcategories
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "WordPress Themes",
              "Shopify Templates",
              "Logo Design",
              "Social Media Graphics",
              "Figma UI Kits",
              "React Components",
              "Python Scripts",
              "Chrome Extensions",
              "Discord Bots",
              "Video Editing",
              "Voice Overs",
              "Translation",
              "Business Plans",
              "Market Research",
              "Email Marketing",
              "Backlink Building",
              "On-Page SEO",
              "Technical SEO",
              "Google Ads",
              "Facebook Ads",
              "Minecraft Accounts",
              "Valorant Accounts",
              "Robux",
              "Steam Gift Cards",
              "Warzone Coaching",
              "Netflix Subscriptions",
              "Spotify Premium",
              "VPN Services",
              "Cloud Hosting",
              "VPS Servers",
            ].map((tag) => (
              <Link
                key={tag}
                to="/"
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface/60 text-muted-foreground hover:border-gold/40 hover:text-gold transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Seller CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-elevated via-surface to-background p-8 flex flex-col md:flex-row items-center gap-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(500px 300px at 90% 50%, oklch(0.82 0.13 82 / 0.1), transparent 60%)",
            }}
          />
          <div className="relative flex-1">
            <h3 className="font-display text-xl font-bold mb-1">
              Sell Your Digital Products on <span className="text-gold">HUXZAIN</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              List your products in any category and reach thousands of ready-to-buy customers with
              full escrow protection.
            </p>
          </div>
          <Link
            to="/seller-panel"
            className="relative h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2 shrink-0"
          >
            Start Selling <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
