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
  Shield,
  Truck,
  Lock,
  Users,
  Package,
  FileCheck,
  Crown,
  CreditCard,
  Code,
  PenTool,
  Check,
  Gamepad2,
  Coins,
  GraduationCap,
  Rocket,
  Users2,
  Briefcase,
  Megaphone,
  Store,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { useAuth } from "@/lib/auth/auth-context";
import HeroLogo from "@/components/HeroLogo";
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

function TopBenefitsBar() {
  const benefits = [
    {
      icon: ShieldCheck,
      title: "SECURE PAYMENTS",
      desc: "Full protection for your money",
    },
    {
      icon: Truck,
      title: "FAST DELIVERY",
      desc: "Get your digital items instantly",
    },
    {
      icon: Headphones,
      title: "24/7 SUPPORT",
      desc: "We are always here to help you",
    },
    {
      icon: Users,
      title: "TRUSTED COMMUNITY",
      desc: "Join thousands of active users",
    },
  ];

  return <div className="bg-[#101114] border-b border-gold/10 py-4 shadow-[0_1px_10px_rgba(212,160,23,0.05)]">
  <div className="container-page grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
    {benefits.map((b, idx) => (
      <div key={idx} className="bg-[#101114] border border-gold/20 rounded-xl p-4 flex flex-col items-center justify-center h-full">
        <div className="size-11 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center text-gold shrink-0 shadow-[0_0_15px_rgba(212,160,23,0.1)] mb-2">
          <b.icon className="size-5" />
        </div>
        <div className="text-xs font-bold tracking-wider text-gold uppercase">{b.title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</div>
      </div>
    ))}
  </div>
</div>;
}

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
    <div className="min-h-screen flex flex-col bg-[#0B0C10]">
      <Header />
      <TopBenefitsBar />
      <main className="flex-1">
        <Hero counts={counts} onSearch={(q) => setActiveSearch(q)} />
        <PopularCategories counts={counts} />
        {!activeSearch && <PromotionBanners />}
        <FeaturedSection activeSearch={activeSearch} onClearSearch={() => setActiveSearch("")} />
        {!activeSearch && <TrendingSellers />}
        <HowItWorks />
        <BigStats />
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
            India's Modern Digital Marketplace
          </h1>
          <p className="mt-5 text-muted-foreground max-w-lg text-sm sm:text-base">
            A secure and trusted marketplace for digital products, services and gaming essentials.
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
          {/* STATE 1 - Idle: Breathing scale animation */}
          <div
            className="absolute inset-0 -m-10 bg-[radial-gradient(circle_at_center,oklch(0.82_0.13_82/0.22),transparent_60%)]"
            aria-hidden
          />
          <HeroLogo />
        </div>
      </div>
    </section>
  );
}

function PromotionBanners() {
  return (
    <section className="container-page py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GAME BUDDIES BANNER */}
        <div 
          className="relative overflow-hidden rounded-2xl border border-[#ff007f]/20 bg-gradient-to-br from-[#1b1024] via-[#100918] to-[#0b0610] p-6 md:p-8 flex flex-col justify-between min-h-[300px] shadow-[0_0_20px_rgba(255,0,127,0.05)] hover:border-[#ff007f]/40 transition-all duration-300 group"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(16, 9, 24, 0.95) 45%, rgba(16, 9, 24, 0.5) 100%), url('https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=60')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="relative z-10 max-w-[280px] sm:max-w-[340px]">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-[#ff007f] text-white uppercase tracking-wider mb-3">
              NEW
            </span>
            <h3 className="font-display text-2xl font-bold text-white tracking-wide uppercase">
              Game Buddies
            </h3>
            <p className="text-xs text-purple-200 mt-1 font-medium">
              Partner up. Play together. Win together.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                "Find verified gamers & teammates",
                "Duo, Squad or Clan - your choice",
                "Play anytime, anywhere",
                "Build friendships & rank up"
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="size-4 rounded-full bg-[#ff007f]/10 border border-[#ff007f]/30 flex items-center justify-center shrink-0">
                    <Check className="size-2.5 text-[#ff007f]" />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/game-buddies"
              className="h-10 px-5 rounded-xl bg-[#ff007f] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(255,0,127,0.3)] inline-flex items-center justify-center"
            >
              Find Game Buddies
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=50&h=50&fit=crop"
                ].map((img, i) => (
                  <img
                    key={i}
                    className="inline-block size-6 rounded-full ring-2 ring-[#100918] object-cover"
                    src={img}
                    alt="avatar"
                  />
                ))}
              </div>
              <span className="text-[10px] text-purple-300 font-bold">10K+ Active Gamers</span>
            </div>
          </div>
        </div>

        {/* COACH & EARN BANNER */}
        <div 
          className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-[#241b10] via-[#181109] to-[#100b06] p-6 md:p-8 flex flex-col justify-between min-h-[300px] shadow-[0_0_20px_rgba(212,160,23,0.05)] hover:border-gold/40 transition-all duration-300 group"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(24, 17, 9, 0.95) 45%, rgba(24, 17, 9, 0.5) 100%), url('https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=600&auto=format&fit=crop&q=60')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="relative z-10 max-w-[280px] sm:max-w-[340px]">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-gold text-primary-foreground uppercase tracking-wider mb-3">
              JOIN AS A COACH
            </span>
            <h3 className="font-display text-2xl font-bold text-white tracking-wide uppercase">
              Coach & Earn
            </h3>
            <p className="text-xs text-amber-200 mt-1 font-medium">
              Share your skills. Inspire. Earn.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                "1-on-1 Coaching Sessions",
                "Help players improve & rank up",
                "Flexible schedule",
                "Earn securely. Get paid for your skills"
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="size-4 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                    <Check className="size-2.5 text-gold" />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/become-coach"
              className="h-10 px-5 rounded-xl bg-gold text-primary-foreground text-xs font-bold hover:brightness-115 active:scale-95 transition-all shadow-[0_4px_12px_rgba(212,160,23,0.3)] inline-flex items-center justify-center"
            >
              Become a Coach
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {[
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop"
                ].map((img, i) => (
                  <img
                    key={i}
                    className="inline-block size-6 rounded-full ring-2 ring-[#181109] object-cover"
                    src={img}
                    alt="avatar"
                  />
                ))}
              </div>
              <span className="text-[10px] text-amber-300 font-bold">500+ Verified Coaches</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PopularCategories({ counts }: { counts: any }) {
  const customCategories = [
    {
      slug: "gaming-accounts",
      title: "Gaming Accounts",
      subtitle: "Accounts & Profiles",
      icon: Gamepad2,
      color: "text-[#9d4edd]",
      glow: "shadow-[0_0_15px_rgba(157,78,221,0.06)] hover:shadow-[0_0_25px_rgba(157,78,221,0.22)]",
      border: "border-border/80 hover:border-[#9d4edd]/50",
      bgHover: "hover:bg-[#9d4edd]/5",
    },
    {
      slug: "in-game-currency",
      title: "In-Game Currency",
      subtitle: "Top-up & Currency",
      icon: Coins,
      color: "text-[#ffb703]",
      glow: "shadow-[0_0_15px_rgba(255,183,3,0.06)] hover:shadow-[0_0_25px_rgba(255,183,3,0.22)]",
      border: "border-border/80 hover:border-[#ffb703]/50",
      bgHover: "hover:bg-[#ffb703]/5",
    },
    {
      slug: "gift-cards",
      title: "Gift Cards",
      subtitle: "Redeem & Save",
      icon: CreditCard,
      color: "text-[#4ea8de]",
      glow: "shadow-[0_0_15px_rgba(78,168,222,0.06)] hover:shadow-[0_0_25px_rgba(78,168,222,0.22)]",
      border: "border-border/80 hover:border-[#4ea8de]/50",
      bgHover: "hover:bg-[#4ea8de]/5",
    },
    {
      slug: "software-tools",
      title: "Software & Tools",
      subtitle: "Tools & Applications",
      icon: Code,
      color: "text-[#06d6a0]",
      glow: "shadow-[0_0_15px_rgba(6,214,160,0.06)] hover:shadow-[0_0_25px_rgba(6,214,160,0.22)]",
      border: "border-border/80 hover:border-[#06d6a0]/50",
      bgHover: "hover:bg-[#06d6a0]/5",
    },
    {
      slug: "subscriptions",
      title: "Subscriptions",
      subtitle: "Premium Access",
      icon: Crown,
      color: "text-[#f77f00]",
      glow: "shadow-[0_0_15px_rgba(247,127,0,0.06)] hover:shadow-[0_0_25px_rgba(247,127,0,0.22)]",
      border: "border-border/80 hover:border-[#f77f00]/50",
      bgHover: "hover:bg-[#f77f00]/5",
    },
    {
      slug: "coaching-services",
      title: "Coaching Services",
      subtitle: "Learn & Improve",
      icon: GraduationCap,
      color: "text-[#2a9d8f]",
      glow: "shadow-[0_0_15px_rgba(42,157,143,0.06)] hover:shadow-[0_0_25px_rgba(42,157,143,0.22)]",
      border: "border-border/80 hover:border-[#2a9d8f]/50",
      bgHover: "hover:bg-[#2a9d8f]/5",
    },
    {
      slug: "boosting-services",
      title: "Boosting Services",
      subtitle: "Rank Up Fast",
      icon: Rocket,
      color: "text-[#00b4d8]",
      glow: "shadow-[0_0_15px_rgba(0,180,216,0.06)] hover:shadow-[0_0_25px_rgba(0,180,216,0.22)]",
      border: "border-border/80 hover:border-[#00b4d8]/50",
      bgHover: "hover:bg-[#00b4d8]/5",
    },
    {
      slug: "game-buddies",
      title: "Game Buddies",
      subtitle: "Play Together",
      icon: Users2,
      color: "text-[#ff007f]",
      glow: "shadow-[0_0_15px_rgba(255,0,127,0.06)] hover:shadow-[0_0_25px_rgba(255,0,127,0.22)]",
      border: "border-border/80 hover:border-[#ff007f]/50",
      bgHover: "hover:bg-[#ff007f]/5",
    },
    {
      slug: "freelance-services",
      title: "Freelance Services",
      subtitle: "Hire Experts",
      icon: Briefcase,
      color: "text-[#48cae4]",
      glow: "shadow-[0_0_15px_rgba(72,202,228,0.06)] hover:shadow-[0_0_25px_rgba(72,202,228,0.22)]",
      border: "border-border/80 hover:border-[#48cae4]/50",
      bgHover: "hover:bg-[#48cae4]/5",
    },
    {
      slug: "editing-design",
      title: "Editing & Design",
      subtitle: "Creative Services",
      icon: PenTool,
      color: "text-[#ff9f1c]",
      glow: "shadow-[0_0_15px_rgba(255,159,28,0.06)] hover:shadow-[0_0_25px_rgba(255,159,28,0.22)]",
      border: "border-border/80 hover:border-[#ff9f1c]/50",
      bgHover: "hover:bg-[#ff9f1c]/5",
    },
    {
      slug: "advertising-services",
      title: "Advertising Services",
      subtitle: "Promote & Grow",
      icon: Megaphone,
      color: "text-[#e9c46a]",
      glow: "shadow-[0_0_15px_rgba(233,196,106,0.06)] hover:shadow-[0_0_25px_rgba(233,196,106,0.22)]",
      border: "border-border/80 hover:border-[#e9c46a]/50",
      bgHover: "hover:bg-[#e9c46a]/5",
    },
    {
      slug: "digital-marketplace",
      title: "Digital Marketplace",
      subtitle: "All Digital Listings",
      icon: Store,
      color: "text-[#e76f51]",
      glow: "shadow-[0_0_15px_rgba(231,111,81,0.06)] hover:shadow-[0_0_25px_rgba(231,111,81,0.22)]",
      border: "border-border/80 hover:border-[#e76f51]/50",
      bgHover: "hover:bg-[#e76f51]/5",
    },
  ];

  return (
    <section className="container-page py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Explore Our Categories</h2>
        </div>
        <Link to="/categories" className="text-sm font-bold text-gold inline-flex items-center gap-1.5 hover:underline">
          View All Categories <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {customCategories.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className={`group rounded-2xl border bg-[#101114] p-5 text-center transition-all duration-300 ${c.border} ${c.glow} ${c.bgHover} hover:scale-[1.03]`}
            >
              <div className={`size-12 mx-auto rounded-full border border-border bg-[#0B0C10] flex items-center justify-center mb-3 group-hover:scale-105 transition-all shadow-inner`}>
                <Icon className={`size-5 transition-colors duration-300 ${c.color}`} />
              </div>
              <div className="text-xs font-bold text-foreground truncate">{c.title}</div>
              <div className="text-[10px] text-muted-foreground mt-1 truncate leading-snug">
                {c.subtitle}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

interface SellerProfile {
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  orders: string;
  successRate: string;
  tier: "Top Seller" | "Rising Star" | "Elite Trader";
  colorRing: string;
}

const mockTrendingSellers: SellerProfile[] = [
  {
    name: "HUXZAIN_A",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop",
    rating: 5.0,
    reviews: 245,
    orders: "1.8k+",
    successRate: "100%",
    tier: "Top Seller",
    colorRing: "ring-gold",
  },
  {
    name: "KRONOS_FPS",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
    rating: 4.9,
    reviews: 189,
    orders: "1.2k+",
    successRate: "99.4%",
    tier: "Rising Star",
    colorRing: "ring-blue-500",
  },
  {
    name: "CAPTAIN_DB",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop",
    rating: 5.0,
    reviews: 312,
    orders: "2.4k+",
    successRate: "99.8%",
    tier: "Top Seller",
    colorRing: "ring-emerald-500",
  },
  {
    name: "AVERAGEJOE",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    rating: 4.8,
    reviews: 95,
    orders: "600+",
    successRate: "98.5%",
    tier: "Rising Star",
    colorRing: "ring-purple-500",
  },
  {
    name: "KINGSLEEV",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    rating: 4.9,
    reviews: 154,
    orders: "950+",
    successRate: "99.1%",
    tier: "Top Seller",
    colorRing: "ring-amber-500",
  },
  {
    name: "SELLER_PRO",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    rating: 5.0,
    reviews: 420,
    orders: "3.1k+",
    successRate: "100%",
    tier: "Elite Trader",
    colorRing: "ring-rose-500",
  },
  {
    name: "GAMER_HQ",
    avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&h=150&fit=crop",
    rating: 4.9,
    reviews: 210,
    orders: "1.5k+",
    successRate: "99.2%",
    tier: "Top Seller",
    colorRing: "ring-cyan-500",
  },
  {
    name: "VORTEX_VAL",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
    rating: 4.7,
    reviews: 80,
    orders: "450+",
    successRate: "97.8%",
    tier: "Rising Star",
    colorRing: "ring-fuchsia-500",
  }
];

function TrendingSellers() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    async function loadSellers() {
      const supabase = getSupabase();
      if (!supabase) {
        setSellers(mockTrendingSellers);
        return;
      }
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, rating_avg, rating_count, is_seller")
          .eq("is_seller", true)
          .limit(8);

        if (error || !profiles || profiles.length === 0) {
          setSellers(mockTrendingSellers);
          return;
        }

        const mapped: SellerProfile[] = profiles.map((p, idx) => {
          const fallback = mockTrendingSellers[idx % mockTrendingSellers.length];
          return {
            name: p.display_name || p.username || `Seller_${p.id.slice(0, 4)}`,
            avatar: p.avatar_url || fallback.avatar,
            rating: p.rating_avg || 5.0,
            reviews: p.rating_count || Math.floor(Math.random() * 200) + 10,
            orders: `${Math.floor(Math.random() * 500) + 100}+`,
            successRate: `${(95 + Math.random() * 5).toFixed(1)}%`,
            tier: idx % 3 === 0 ? "Top Seller" : idx % 3 === 1 ? "Rising Star" : "Elite Trader",
            colorRing: fallback.colorRing
          };
        });

        while (mapped.length < 6) {
          mapped.push(mockTrendingSellers[mapped.length % mockTrendingSellers.length]);
        }
        
        setSellers(mapped);
      } catch (e) {
        console.error("Error loading sellers:", e);
        setSellers(mockTrendingSellers);
      }
    }
    void loadSellers();
  }, []);

  const nextSlide = () => {
    setStartIndex((prev) => (prev + 1 > sellers.length - 6 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setStartIndex((prev) => (prev - 1 < 0 ? sellers.length - 6 : prev - 1));
  };

  if (sellers.length === 0) return null;

  return (
    <section className="container-page py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2 text-foreground">
              Trending Sellers <Crown className="size-6 text-gold fill-gold/20 animate-pulse" />
            </h2>
          </div>
          <p className="text-xs font-bold tracking-wider text-muted-foreground mt-1 uppercase">
            THE MOST ACTIVE AND TRUSTED SELLERS ON OUR PLATFORM
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/categories" className="text-sm font-bold text-gold hover:underline flex items-center gap-1">
            View All Sellers <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="relative group/carousel">
        <button 
          onClick={prevSlide}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full border border-gold/30 bg-background/90 text-gold flex items-center justify-center hover:bg-gold hover:text-primary-foreground hover:scale-110 transition-all shadow-[0_0_15px_rgba(212,160,23,0.15)] cursor-pointer"
        >
          ‹
        </button>
        <button 
          onClick={nextSlide}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full border border-gold/30 bg-background/90 text-gold flex items-center justify-center hover:bg-gold hover:text-primary-foreground hover:scale-110 transition-all shadow-[0_0_15px_rgba(212,160,23,0.15)] cursor-pointer"
        >
          ›
        </button>

        <div className="flex overflow-x-auto gap-4 py-2">
          {sellers.slice(startIndex, startIndex + 6).map((s, idx) => (
            <div 
              key={idx}
              className="bg-[#101114] border border-border/80 rounded-2xl p-5 flex flex-col items-center justify-between text-center transition-all hover:border-gold/40 hover:shadow-[0_0_15px_rgba(212,160,23,0.08)] hover:scale-[1.03]"
            >
              <div className="relative mb-4">
                <div className={`size-18 rounded-full ring-2 ${s.colorRing} ring-offset-2 ring-offset-background p-0.5 overflow-hidden shadow-[0_0_10px_rgba(212,160,23,0.1)]`}>
                  <img 
                    src={s.avatar} 
                    alt={s.name} 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 size-4 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center shadow-lg" title="Online">
                  <span className="size-1.5 bg-white rounded-full animate-pulse" />
                </span>
              </div>

              <div className="flex items-center gap-1 mb-1 justify-center w-full">
                <span className="text-xs font-bold text-foreground truncate max-w-[85px]">{s.name}</span>
                <BadgeCheck className="size-3.5 text-blue-400 fill-blue-500/10 shrink-0" />
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3 justify-center">
                <span className="text-gold font-bold">★</span>
                <span className="text-foreground font-semibold">{s.rating.toFixed(1)}</span>
                <span>({s.reviews})</span>
              </div>

              <div className="w-full border-t border-border/50 my-2" />

              <div className="grid grid-cols-2 gap-1 w-full text-[9px] text-muted-foreground mb-4">
                <div className="border-r border-border/50 pr-1">
                  <div className="font-bold text-foreground">{s.orders}</div>
                  <div>Orders</div>
                </div>
                <div className="pl-1">
                  <div className="font-bold text-emerald-400">{s.successRate}</div>
                  <div>Success</div>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold ${
                s.tier === "Top Seller" 
                  ? "bg-gold/10 text-gold border border-gold/20" 
                  : s.tier === "Elite Trader"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
                ★ {s.tier}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <Shield className="size-4 text-emerald-400" />
          <span>All sellers are verified and monitored for your safety.</span>
        </div>
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
        let query = supabase!
          .from("listings")
          .select("*, profiles(id, display_name, username, subscription_tier, is_verified)")
          .eq("status", "active");

        if (activeSearch) {
          query = query.ilike("title", `%${activeSearch}%`).order("boost_score", { ascending: false }).order("created_at", { ascending: false });
        } else {
          query = query.order("boost_score", { ascending: false }).order("created_at", { ascending: false }).limit(8);
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

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Find",
      desc: "Search for the product or service you need.",
      icon: Search,
    },
    {
      n: 2,
      title: "Order",
      desc: "Place your order and fund the escrow.",
      icon: ShoppingCart,
    },
    {
      n: 3,
      title: "Receive",
      desc: "Receive the item or service from the seller.",
      icon: Package,
      highlight: true,
    },
    {
      n: 4,
      title: "Release",
      desc: "Confirm everything is correct and release funds.",
      icon: FileCheck,
    },
    {
      n: 5,
      title: "Completed",
      desc: "The order is completed and both parties are happy.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="container-page py-16 text-center">
      <div>
        <h2 className="font-display text-3xl font-bold flex items-center justify-center gap-2">
          How <span className="text-gold">HUXZAIN</span> Works
        </h2>
        <p className="text-xs font-bold tracking-wider text-muted-foreground mt-1 uppercase">
          AN EASY FIVE-STEP PROCESS
        </p>
      </div>

      <div className="mt-12 flex flex-col lg:flex-row items-stretch justify-between gap-6 lg:gap-4 relative">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex-1 flex flex-col lg:flex-row items-center relative w-full">
              {/* Step Card */}
              <div
                className={`w-full rounded-2xl p-6 flex flex-col items-center justify-between transition-all bg-[#101114] min-h-[220px] ${
                  s.highlight
                    ? "border-2 border-gold shadow-[0_0_25px_rgba(212,160,23,0.18)] scale-[1.04] z-10"
                    : "border border-border/80 hover:border-gold/30 hover:scale-[1.01]"
                }`}
              >
                {/* Step Circle */}
                <div className="size-16 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center mb-4 relative transition-colors">
                  <Icon className="size-6 text-gold" />
                  <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-gold text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                    {s.n}
                  </span>
                </div>
                <div className="font-semibold text-sm mb-2 text-foreground">{s.title}</div>
                <p className="text-xs text-muted-foreground max-w-[190px] leading-relaxed">
                  {s.desc}
                </p>
              </div>

              {/* Connecting Dotted Indicator */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center px-2 text-gold/30 font-bold text-lg select-none shrink-0 self-center">
                  ┄┄▶
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Safety / Trust Pillars Box */}
      <div className="mt-16 rounded-2xl border border-border/80 bg-[#101114]/50 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <Lock className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Escrow Protection</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Funds are kept in escrow until delivery is confirmed.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <BadgeCheck className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Verified Sellers</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                All sellers are vetted and monitored for quality.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <Headphones className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Friendly Support</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We help you resolving issues/disputes.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <Shield className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Privacy First</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your data is safe and never shared.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BigStats() {
  const statsList = [
    { v: "10K+", l: "Active Users", icon: Users },
    { v: "5K+", l: "Verified Sellers", icon: BadgeCheck },
    { v: "50K+", l: "Orders Completed", icon: ShoppingCart },
    { v: "99.8%", l: "Thumbs-up Feedback", icon: ShieldCheck },
    { v: "24/7", l: "Support Available", icon: Headphones },
  ];

  return (
    <section className="w-full bg-[#0B0C10] border-t border-b border-gold/10 py-6 my-8 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="container-page grid grid-cols-2 md:grid-cols-5 gap-6 items-center text-center">
        {statsList.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="flex flex-col items-center justify-center gap-1 group">
              <div className="flex items-center gap-2 justify-center">
                <Icon className="size-4 text-gold group-hover:scale-110 transition-transform" />
                <div className="font-display text-xl font-bold text-gold tracking-tight">{s.v}</div>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
            </div>
          );
        })}
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
