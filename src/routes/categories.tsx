import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LayoutGrid, ArrowRight } from "lucide-react";
import { primaryCategories, gamingCategories } from "@/lib/marketplace-data";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Categories — HUXZAIN" },
      { name: "description", content: "Browse all categories on HUXZAIN — digital products, services, design, programming, SEO, marketing, gaming, and much more." },
      { property: "og:title", content: "All Categories — HUXZAIN Digital Marketplace" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <LayoutGrid className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            All <span className="text-gold">Categories</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Explore our full range of digital products, services, and more. Every category is stocked with vetted listings from verified sellers.
          </p>
        </div>

        {/* Primary Categories */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold">
              Primary <span className="text-gold">Categories</span>
            </h2>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              {primaryCategories.length} categories
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {primaryCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to="/category/$slug"
                  params={{ slug: cat.slug }}
                  className="group rounded-2xl border border-border bg-surface/40 p-6 hover:border-gold/40 hover:bg-surface-elevated transition-all flex flex-col gap-4"
                >
                  <div className="size-12 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm group-hover:text-gold transition-colors mb-1">
                      {cat.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{cat.count}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse <ArrowRight className="size-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Gaming Categories */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold">
              Gaming &amp; <span className="text-gold">Entertainment</span>
            </h2>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              {gamingCategories.length} categories
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {gamingCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to="/category/$slug"
                  params={{ slug: cat.slug }}
                  className="group rounded-2xl border border-border bg-surface/40 p-5 text-center hover:border-gold/40 hover:bg-surface-elevated transition-all flex flex-col items-center gap-3"
                >
                  <div className="size-11 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <div className="text-sm font-medium group-hover:text-gold transition-colors">
                    {cat.title}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Popular Tags */}
        <div className="rounded-2xl border border-border bg-surface/40 p-7 mb-10">
          <h2 className="font-display text-xl font-bold text-gold mb-5">Popular Tags &amp; Subcategories</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "WordPress Themes", "Shopify Templates", "Logo Design", "Social Media Graphics", "Figma UI Kits",
              "React Components", "Python Scripts", "Chrome Extensions", "Discord Bots", "Video Editing",
              "Voice Overs", "Translation", "Business Plans", "Market Research", "Email Marketing",
              "Backlink Building", "On-Page SEO", "Technical SEO", "Google Ads", "Facebook Ads",
              "Minecraft Accounts", "Valorant Accounts", "Robux", "Steam Gift Cards", "Warzone Coaching",
              "Netflix Subscriptions", "Spotify Premium", "VPN Services", "Cloud Hosting", "VPS Servers",
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
            style={{ backgroundImage: "radial-gradient(500px 300px at 90% 50%, oklch(0.82 0.13 82 / 0.1), transparent 60%)" }}
          />
          <div className="relative flex-1">
            <h3 className="font-display text-xl font-bold mb-1">
              Sell Your Digital Products on <span className="text-gold">HUXZAIN</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              List your products in any category and reach thousands of ready-to-buy customers with full escrow protection.
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
