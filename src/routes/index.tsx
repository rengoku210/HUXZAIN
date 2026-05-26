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
        <Hero counts={counts} />
        <PopularCategories counts={counts} />
        <TrustStrip />
        <FeaturedSection />
        <ProtectionStrip />
        <HowItWorks />
        <BigStats counts={counts} />
        <ReadyCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero({ counts }: { counts: any }) {
  const statsList = [
    { v: counts.users > 0 ? `${counts.users.toLocaleString()}+` : "10+", l: "Active Users" },
    { v: counts.users > 0 ? `${Math.ceil(counts.users * 0.45).toLocaleString()}+` : "4+", l: "Verified Sellers" },
    { v: counts.orders > 0 ? `${counts.orders.toLocaleString()}+` : "0+", l: "Orders Completed" },
    { v: "99.8%", l: "Positive Feedback" },
  ];

  return (
    <section className="relative">
      <div className="container-page py-14 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            Buy, Sell &amp; Grow
            <br />
            Safely with <span className="text-gold">HUXZAIN</span>
          </h1>
          <p className="mt-5 text-muted-foreground max-w-lg">
            A secure marketplace for digital products and services.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {["Secure Escrow", "Verified Sellers", "24/7 Support", "Buyer Protection"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="size-4 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
                  <span className="size-1.5 rounded-full bg-gold" />
                </span>
                {f}
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-stretch gap-0 rounded-xl border border-border bg-surface/80 overflow-hidden max-w-xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
            <input
              placeholder="What are you looking for?"
              className="flex-1 px-4 bg-transparent outline-none text-sm h-12 placeholder:text-muted-foreground"
            />
            <button className="px-4 text-sm text-muted-foreground border-l border-border hover:text-foreground hidden sm:flex items-center gap-1">
              All Categories
            </button>
            <button className="px-6 bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2">
              <Search className="size-4" /> Search
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
            {statsList.map((s) => (
              <div key={s.l} className="flex items-start gap-3">
                <div className="size-9 rounded-md border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0 text-gold text-xs font-bold">
                  ★
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-foreground">{s.v}</div>
                  <div className="text-[11px] text-muted-foreground">{s.l}</div>
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

function FeaturedSection() {
  const { isAuthenticated, roles } = useAuth();
  const isSeller = roles.includes("seller");
  const [liveListings, setLiveListings] = useState<ListingLike[] | null>(null);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
  const supabase = getSupabase();
  if (!supabase) {
    setLoadingListings(false);
    return;
  }

  async function loadListings() {
    try {
      const { data, error } = await supabase!.from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Error loading featured listings:", error);
        setLiveListings([]);
      } else {
        console.log('FeaturedSection listings:', data);
        const listings = (data as ListingLike[]) ?? [];
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
}, []);

  return (
    <section className="container-page py-14">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-display text-3xl font-bold">Featured Listings</h2>
        <Link
          to="/categories"
          className="text-sm text-gold inline-flex items-center gap-1.5 hover:underline"
        >
          View All <ArrowRight className="size-3.5" />
        </Link>
      </div>
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
          <p className="text-muted-foreground font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to list a product on HUXZAIN
          </p>
          <Link
            to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
            search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
            className="mt-5 inline-flex h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110"
          >
            Start Selling
          </Link>
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
      <div className="rounded-2xl border border-border bg-surface/40 px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="flex gap-3">
            <Link
              to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
              search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
              className="h-11 px-5 rounded-lg border border-border bg-surface/60 text-sm font-medium hover:border-gold/50 inline-flex items-center transition-colors"
            >
              Become a Seller
            </Link>
            <Link
              to="/categories"
              className="h-11 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
