import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  ShieldCheck,
  BadgeCheck,
  Headphones,
  Scale,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { useAuth } from "@/lib/auth/auth-context";
import shield from "@/assets/hero-shield.png";
import { getSupabase } from "@/lib/supabase-client";
import type { ListingLike } from "@/lib/marketplace/listing-adapter";
import {
  primaryCategories,
  trustFeatures,
  howSteps,
  protectionPillars,
} from "@/lib/marketplace-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HUXZAIN — Secure Digital Marketplace for Products & Services" },
      {
        name: "description",
        content:
          "Buy, sell and grow safely with HUXZAIN — the premium digital marketplace for products, services, hosting, design, programming and more. Verified sellers, escrow protection.",
      },
      { property: "og:title", content: "HUXZAIN — Secure Digital Marketplace" },
      {
        property: "og:description",
        content:
          "Premium, moderated marketplace for digital products and services with escrow protection and verified sellers.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { roles } = useAuth();
  const isSeller = roles.includes("seller");

  const [counts, setCounts] = useState({
    listings: 0,
    users: 0,
    orders: 0,
    categoryCounts: {} as Record<string, number>
  });

  const [activeSearch, setActiveSearch] = useState("");

  useEffect(() => {
    async function fetchStats() {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const [listingsRes, profilesRes, ordersRes, catsRes] = await Promise.all([
          sb.from("listings").select("category_id", { count: "exact" }).eq("status", "active"),
          sb.from("profiles").select("id", { count: "exact" }),
          sb.from("orders").select("id", { count: "exact" }),
          sb.from("categories").select("id, slug")
        ]);

        const allListings = listingsRes.data ?? [];
        const catMap = (catsRes.data ?? []) as { id: string; slug: string }[];
        
        const categoryCounts: Record<string, number> = {};
        allListings.forEach((item: any) => {
          const cat = catMap.find(c => c.id === item.category_id);
          if (cat) {
            categoryCounts[cat.slug] = (categoryCounts[cat.slug] ?? 0) + 1;
          }
        });

        setCounts({
          listings: listingsRes.count ?? 0,
          users: profilesRes.count ?? 0,
          orders: ordersRes.count ?? 0,
          categoryCounts
        });
      } catch (e) {
        console.error("Error fetching homepage live stats:", e);
      }
    }

    void fetchStats();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero counts={counts} onSearch={(q) => setActiveSearch(q)} />
        <PopularCategories counts={counts} />
        <TrustStrip />
        <FeaturedSection activeSearch={activeSearch} onClearSearch={() => setActiveSearch("")} />
        <ProtectionStrip />
        <HowItWorks />
        <BigStats counts={counts} />
        <ReadyCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero({ counts, onSearch }: { counts: any; onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const statsList = [
    { v: counts.users > 0 ? `${counts.users.toLocaleString()}+` : "10+", l: "Active Users" },
    { v: counts.users > 0 ? `${Math.ceil(counts.users * 0.45).toLocaleString()}+` : "4+", l: "Verified Sellers" },
    { v: counts.orders > 0 ? `${counts.orders.toLocaleString()}+` : "0+", l: "Orders Completed" },
    { v: "99.8%", l: "Positive Feedback" },
  ];

  return (
    <section className="relative">
      <div className="container-page py-14 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center overflow-x-hidden">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight break-words">
            Buy, Sell &amp; Grow
            <br />
            Safely with <span className="text-gold">HUXZAIN</span>
          </h1>
          <p className="mt-5 text-muted-foreground max-w-lg text-sm sm:text-base">
            A secure marketplace for digital products and services.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
            {["Secure Escrow", "Verified Sellers", "24/7 Support", "Buyer Protection"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="size-4 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
                  <span className="size-1.5 rounded-full bg-gold" />
                </span>
                {f}
              </div>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-7 w-full max-w-xl flex items-stretch gap-0 rounded-xl border border-border bg-surface/80 overflow-hidden shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
            <input
              placeholder="What are you looking for?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 px-3 sm:px-4 bg-transparent outline-none text-xs sm:text-sm h-12 placeholder:text-muted-foreground"
            />
            <button type="button" className="px-4 text-xs sm:text-sm text-muted-foreground border-l border-border hover:text-foreground hidden sm:flex items-center gap-1">
              All Categories
            </button>
            <button type="submit" className="px-4 sm:px-6 bg-gold text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-1.5 shrink-0">
              <Search className="size-4" /> Search
            </button>
          </form>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
            {statsList.map((s) => (
              <div key={s.l} className="flex items-start gap-3">
                <div className="size-9 rounded-md border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">
                  ★
                </div>
                <div>
                  <div className="font-display text-lg sm:text-xl font-bold text-foreground">{s.v}</div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground">{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 -m-10 bg-[radial-gradient(circle_at_center,oklch(0.82_0.13_82/0.22),transparent_60%)]"
            aria-hidden
          />
          <img
            src={shield}
            alt="HUXZAIN secure marketplace shield"
            width={1024}
            height={1024}
            className="relative z-10 w-full max-w-md mx-auto drop-shadow-[0_40px_60px_oklch(0.82_0.13_82/0.25)]"
          />
        </div>
      </div>
    </section>
  );
}

function PopularCategories({ counts }: { counts: any }) {
  const getCatCountString = (slug: string) => {
    const count = counts.categoryCounts[slug] ?? 0;
    return `${count} ${count === 1 ? 'Listing' : 'Listings'}`;
  };

  return (
    <section className="container-page py-14">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-display text-3xl font-bold">Popular Categories</h2>
        <Link to="/categories" className="text-sm text-gold inline-flex items-center gap-1.5 hover:underline">
          View All <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {primaryCategories.map((c) => (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="group rounded-2xl border border-border bg-surface/40 p-5 text-center hover:border-gold/40 hover:bg-surface-elevated transition-all"
          >
            <div className="size-12 mx-auto rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
              <c.icon className="size-5 text-gold" />
            </div>
            <div className="text-sm font-medium">{c.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{getCatCountString(c.slug)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="container-page">
      <div className="rounded-2xl border border-border bg-surface/40 px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trustFeatures.map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <f.icon className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSection({ activeSearch, onClearSearch }: { activeSearch: string; onClearSearch: () => void }) {
  const { isAuthenticated, roles } = useAuth();
  const isSeller = roles.includes("seller");
  const [liveListings, setLiveListings] = useState<ListingLike[] | null>(null);
  const [spotlightListings, setSpotlightListings] = useState<ListingLike[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoadingListings(false);
      return;
    }

    async function loadListings() {
      try {
        setLoadingListings(true);

        // 1. Fetch active homepage spotlights (strictly 5 active slots limit)
        const { data: spotlightBoosts } = await supabase!
          .from("listing_boosts")
          .select("listing_id")
          .eq("boost_type", "homepage_spotlight")
          .eq("status", "active")
          .gt("ends_at", new Date().toISOString())
          .limit(5);

        const spotlightIds = spotlightBoosts ? spotlightBoosts.map((b: any) => b.listing_id) : [];
        let fetchedSpotlights: ListingLike[] = [];
        
        if (spotlightIds.length > 0) {
          const { data: spotData } = await supabase!
            .from("listings")
            .select("*")
            .in("id", spotlightIds)
            .eq("status", "active");
          if (spotData) {
            fetchedSpotlights = spotData.map(l => ({ ...l, badge: "Spotlight" })) as ListingLike[];
          }
        }
        setSpotlightListings(fetchedSpotlights);

        // 2. Fetch push_to_top boosts
        const { data: pushBoosts } = await supabase!
          .from("listing_boosts")
          .select("listing_id")
          .eq("boost_type", "push_to_top")
          .eq("status", "active")
          .gt("ends_at", new Date().toISOString());
        const pushedIds = pushBoosts ? pushBoosts.map((b: any) => b.listing_id) : [];

        // 3. Query listings matching the search filter (if any) or generic featured limit 8
        let query = supabase!.from("listings").select("*").eq("status", "active");

        if (activeSearch) {
          query = query.ilike("title", `%${activeSearch}%`);
        } else {
          query = query.order("created_at", { ascending: false }).limit(8);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading featured listings:", error);
          setLiveListings([]);
        } else {
          let listings = (data as ListingLike[]) ?? [];

          // Tag boosted ones
          listings = listings.map(l => {
            if (pushedIds.includes(l.id)) {
              return { ...l, badge: "Sponsored" };
            }
            return l;
          });

          // Prioritize boosted listings to the top for search
          if (activeSearch) {
            listings.sort((a, b) => {
              const aBoosted = pushedIds.includes(a.id);
              const bBoosted = pushedIds.includes(b.id);
              if (aBoosted && !bBoosted) return -1;
              if (!aBoosted && bBoosted) return 1;
              return 0;
            });
          }

          setLiveListings(listings);
        }
      } catch (e) {
        console.error("Error loading featured listings:", e);
        setLiveListings([]);
      } finally {
        setLoadingListings(false);
      }
    }

    void loadListings();
  }, [activeSearch]);

  return (
    <section className="container-page py-14">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold">
          {activeSearch ? `Search Results for "${activeSearch}"` : "Featured Listings"}
        </h2>
        {activeSearch ? (
          <button
            onClick={onClearSearch}
            className="text-xs font-bold text-rose-400 border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            Clear Search
          </button>
        ) : (
          <Link
            to="/categories"
            className="text-sm text-gold inline-flex items-center gap-1.5 hover:underline"
          >
            View All <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      {spotlightListings.length > 0 && !activeSearch && (
        <div className="mb-10 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 via-surface/30 to-background p-6 shadow-lg shadow-gold/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-gold animate-pulse" />
            <h3 className="font-display text-xs sm:text-sm font-bold text-gold uppercase tracking-widest">
              🔥 Premium Spotlight Showcases
            </h3>
            <span className="text-[10px] text-muted-foreground border border-border/80 rounded-full px-2 py-0.5 ml-auto font-medium">
              {spotlightListings.length} / 5 slots filled
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {spotlightListings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        </div>
      )}

      {loadingListings ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface/30 animate-pulse overflow-hidden"
            >
              <div className="h-32 bg-surface" />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded bg-surface w-3/4" />
                <div className="h-3 rounded bg-surface w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !liveListings || liveListings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 py-16 text-center">
          <ShoppingCart className="size-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            {activeSearch ? "No matching products found" : "No listings yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeSearch ? "Try adjusting your keywords or browse popular tags." : "Be the first to list a product on HUXZAIN"}
          </p>
          {activeSearch ? (
            <button
              onClick={onClearSearch}
              className="mt-5 inline-flex h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 items-center cursor-pointer"
            >
              Back to Catalog
            </button>
          ) : (
            <Link
              to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
              search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
              className="mt-5 inline-flex h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110"
            >
              Start Selling
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {liveListings.map((l) => {
              console.log('🏠 Homepage listing passed to card:', l);
              return <ListingCard key={l.id} l={l} />;
            })}
        </div>
      )}
    </section>
  );
}

function ProtectionStrip() {
  const icons = [ShieldCheck, BadgeCheck, Headphones, Scale];
  return (
    <section className="container-page">
      <div className="rounded-2xl border border-border bg-surface/40 px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {protectionPillars.map((p, i) => {
          const Icon = icons[i];
          return (
            <div key={p.title} className="flex items-start gap-3">
              <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-gold" />
              </div>
              <div>
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="container-page py-16 text-center">
      <h2 className="font-display text-3xl font-bold">
        How <span className="text-gold">HUXZAIN</span> Works
      </h2>
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {howSteps.map((s) => (
          <div key={s.n} className="flex flex-col items-center">
            <div className="size-16 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center mb-4 relative">
              <s.icon className="size-6 text-gold" />
              <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-gold text-primary-foreground text-xs font-bold flex items-center justify-center">
                {s.n}
              </span>
            </div>
            <div className="font-semibold mb-2">{s.title}</div>
            <p className="text-xs text-muted-foreground max-w-[180px] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BigStats({ counts }: { counts: any }) {
  const statsList = [
    { v: counts.listings > 0 ? `${counts.listings.toLocaleString()}+` : "0+", l: "Products & Services" },
    { v: counts.users > 0 ? `${Math.ceil(counts.users * 0.35).toLocaleString()}+` : "0+", l: "Active Sellers" },
    { v: counts.users > 0 ? `${Math.ceil(counts.users * 0.75).toLocaleString()}+` : "0+", l: "Happy Customers" },
    { v: "99.8%", l: "Positive Reviews" },
  ];

  return (
    <section className="container-page py-6">
      <div className="rounded-2xl border border-border bg-surface/40 px-6 py-8 grid grid-cols-2 lg:grid-cols-5 gap-6 items-center">
        {statsList.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-display text-2xl font-bold text-gold">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
          </div>
        ))}
        <div className="hidden lg:flex items-center justify-center">
          <div className="size-16 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center">
            <ShieldCheck className="size-7 text-gold" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadyCTA() {
  const { isAuthenticated, roles } = useAuth();
  const isSeller = roles.includes("seller");

  return (
    <section className="container-page py-10">
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-elevated via-surface to-background p-8 md:p-10">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(700px 300px at 90% 50%, oklch(0.82 0.13 82 / 0.15), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="size-14 rounded-xl border border-gold/30 bg-gold/10 flex items-center justify-center shrink-0">
            <ShoppingCart className="size-6 text-gold" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-display text-2xl font-bold">Ready to Start Your Journey?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Join HUXZAIN today and discover amazing digital products &amp; services.
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 w-full md:w-auto">
            <Link
              to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
              search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
              className="h-11 px-5 rounded-lg border border-border bg-surface/60 text-sm font-medium hover:border-gold/50 inline-flex items-center justify-center transition-colors flex-1 sm:flex-initial text-center whitespace-nowrap"
            >
              Become a Seller
            </Link>
            <Link
              to="/categories"
              className="h-11 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center flex-1 sm:flex-initial text-center whitespace-nowrap"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
