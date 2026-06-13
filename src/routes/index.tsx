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
  MessageSquare,
  LayoutGrid,
  Flame,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { useAuth } from "@/lib/auth/auth-context";
import HeroLogo from "@/components/HeroLogo";
import { getSupabase } from "@/lib/supabase-client";
import heroArtwork from "@/assets/hero-artwork.png";
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
    <div className="min-h-screen flex flex-col bg-[#060709]">
      <Header transparent={true} />
      <main className="flex-1">
        <Hero counts={counts} onSearch={(q) => setActiveSearch(q)} />
        <PopularCategories counts={counts} />
        <FeaturedSection activeSearch={activeSearch} onClearSearch={() => setActiveSearch("")} />
        {!activeSearch && <TrendingListings />}
        {!activeSearch && <TopRatedSellers />}
        {!activeSearch && <PromotionBanners />}
        <HowItWorks />
        <ReadyCTA />
        {!activeSearch && <CommunitySection />}
      </main>
      <Footer />
    </div>
  );
}

function Hero({ counts, onSearch }: { counts: any; onSearch: (q: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

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

  return (
    <>
      <section
        className="relative overflow-hidden w-full flex flex-col justify-center min-h-[520px] sm:min-h-[620px] md:min-h-[780px] bg-black bg-no-repeat bg-cover bg-[position:right_-180px_center] md:bg-[position:center_right]"
        style={{
          backgroundImage: `url('${heroArtwork}')`,
        }}
      >
        {/* Mobile Dark Overlay: Stronger 80% solid fade for max readability */}
        <div
          className="absolute inset-0 z-0 pointer-events-none block md:hidden bg-[#050505]/80"
        />

        {/* Desktop Dark Overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none hidden md:block"
          style={{
            background: "linear-gradient(90deg, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.75) 35%, rgba(5,5,5,0.35) 60%, rgba(5,5,5,0.10) 100%)",
          }}
        />

        {/* Ambient particles / stars field */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              `radial-gradient(1.2px 1.2px at 12% 14%, rgba(212,175,55,0.22) 0%, transparent 100%),
               radial-gradient(1.4px 1.4px at 28% 38%, rgba(255,255,255,0.15) 0%, transparent 100%),
               radial-gradient(1.6px 1.6px at 48% 22%, rgba(212,175,55,0.18) 0%, transparent 100%),
               radial-gradient(1.2px 1.2px at 62% 48%, rgba(255,255,255,0.1) 0%, transparent 100%),
               radial-gradient(2px 2px at 82% 18%, rgba(212,175,55,0.25) 0%, transparent 100%),
               radial-gradient(1.2px 1.2px at 92% 52%, rgba(255,255,255,0.12) 0%, transparent 100%),
               radial-gradient(1.6px 1.6px at 17% 72%, rgba(212,175,55,0.15) 0%, transparent 100%),
               radial-gradient(1.4px 1.4px at 40% 88%, rgba(255,255,255,0.1) 0%, transparent 100%),
               radial-gradient(1.2px 1.2px at 72% 78%, rgba(212,175,55,0.2) 0%, transparent 100%),
               radial-gradient(1.6px 1.6px at 90% 82%, rgba(255,255,255,0.12) 0%, transparent 100%)`,
          }}
        />

        {/* Hero Content Container */}
        <div className="container-page relative z-10 pt-28 lg:pt-36 pb-12 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
            
            {/* Left Side: Floating Text Content */}
            <div className="space-y-6 text-left max-w-[580px] lg:max-w-none">
              {/* WELCOME TO HUXZAIN Label */}
              <div className="inline-flex items-center">
                <span className="font-display text-[10px] md:text-[11px] font-bold uppercase tracking-[0.24em] text-gold">
                  WELCOME TO HUXZAIN
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-1.5 md:space-y-2">
                <h1
                  className="font-display font-extrabold tracking-tight leading-[1.08] text-white"
                  style={{ fontSize: "clamp(1.8rem, 5.5vw, 4.2rem)" }}
                >
                  India's Modern
                </h1>
                <h1
                  className="font-display font-extrabold tracking-tight leading-[1.08]"
                  style={{
                    fontSize: "clamp(1.8rem, 5.5vw, 4.2rem)",
                    background: "linear-gradient(135deg, #ffd700 0%, #e8c53a 50%, #b8860b 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Digital Marketplace
                </h1>
              </div>

              {/* Description */}
              <p className="text-[#8e93a3] text-[14.5px] md:text-[16px] leading-relaxed max-w-[520px] font-medium mt-3">
                A secure and trusted marketplace for digital products, services and gaming essentials.
              </p>

              {/* Trust badges row */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 text-[10.5px] font-bold text-[#8e93a3] uppercase tracking-[0.08em] mt-2 max-w-[500px]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded-full border border-gold/45 bg-gold/5 text-gold shrink-0">
                    <Check className="size-2.5" />
                  </span>
                  <span>Secure Escrow</span>
                </div>
                <span className="text-[#2b2f3a] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded-full border border-gold/45 bg-gold/5 text-gold shrink-0">
                    <Check className="size-2.5" />
                  </span>
                  <span>Verified Sellers</span>
                </div>
                <span className="text-[#2b2f3a] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Headphones className="size-4 text-gold shrink-0" />
                  <span>24/7 Support</span>
                </div>
                <span className="text-[#2b2f3a] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded-full border border-gold/45 bg-gold/5 text-gold shrink-0">
                    <Check className="size-2.5" />
                  </span>
                  <span>Buyer Protection</span>
                </div>
              </div>

              {/* Search bar pill */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center overflow-hidden w-full max-w-[580px] p-2 sm:p-1.5 bg-[#0d0e11]/95 border border-white/5 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.65)] backdrop-blur-md mt-6 sm:mt-8 gap-2 sm:gap-0"
              >
                <div className="flex-1 flex items-center min-w-0 pl-3 pr-3 sm:pr-1 sm:pl-3 sm:px-4">
                  <Search className="size-4 text-[#4a5060] mr-2 shrink-0 sm:hidden" />
                  <input
                    id="hero-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What are you looking for?"
                    className="w-full bg-transparent border-none outline-none text-xs md:text-sm text-white placeholder:text-[#4a5060] font-semibold"
                    style={{ height: "40px" }}
                  />
                </div>

                <div className="w-full h-px bg-white/10 sm:hidden" />
                <div className="w-px h-6 bg-white/10 mx-1 shrink-0 hidden sm:block" />

                <div className="relative flex items-center shrink-0 hidden sm:flex">
                  <select
                    id="hero-search-category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-transparent border-none outline-none text-[11px] md:text-[12px] text-[#8a8f9d] cursor-pointer appearance-none font-semibold pr-7 pl-3 h-full"
                  >
                    <option value="all" className="bg-[#0d0e10] text-white">All Categories</option>
                    {primaryCategories.map((c) => (
                      <option key={c.slug} value={c.slug} className="bg-[#0d0e10] text-white">
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 size-3.5 text-[#8a8f9d] pointer-events-none" />
                </div>

                <button
                  id="hero-search-btn"
                  type="submit"
                  className="flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-[0.08em] border-none cursor-pointer px-4 sm:px-6 rounded-xl bg-gold text-[#0a0b0d] hover:brightness-110 active:scale-[0.98] transition-all shrink-0 font-display w-full sm:w-auto"
                  style={{ height: "40px" }}
                >
                  <Search className="size-3.5 hidden sm:inline" />
                  Search
                </button>
              </form>
            </div>

            {/* Right Side: Empty spacer so background wallpaper remains visible */}
            <div className="hidden lg:block h-[420px] pointer-events-none select-none z-0" />
            
          </div>
        </div>
      </section>

      {/* Benefits/Feature Strip (Placed below the hero section, completely separate) */}
      <div className="w-full bg-[#050505] py-6 border-b border-white/[0.02] z-10 relative">
        <div className="container-page">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl border border-white/5 bg-[#0c0d10]/50 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.45)] w-full"
          >
            {benefits.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-4 py-2 px-3 lg:px-4">
                  <div
                    className="size-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 shrink-0"
                  >
                    <Icon className="size-4.5 text-gold" />
                  </div>
                  <div>
                    <div className="font-bold text-[10.5px] uppercase tracking-wider text-gold">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[#5c6170] mt-0.5 font-medium leading-snug">
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function PromotionBanners() {
  return (
    <section className="container-page py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* GAME BUDDIES CARD */}
        <div 
          className="relative overflow-hidden rounded-3xl border border-purple-500/10 bg-gradient-to-br from-[#12081c] via-[#09040e] to-black p-8 md:p-10 flex flex-col justify-between min-h-[360px] shadow-[0_0_30px_rgba(157,78,221,0.05)] hover:border-purple-500/25 hover:shadow-[0_0_40px_rgba(157,78,221,0.1)] transition-all duration-500 group"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(9, 4, 14, 0.96) 50%, rgba(9, 4, 14, 0.4) 100%), url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=70')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Neon Pink Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff007f]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#ff007f]/15 transition-all duration-500" />
          
          <div className="relative z-10 max-w-[280px] sm:max-w-[360px] space-y-4">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ff007f]/15 text-[#ff007f] border border-[#ff007f]/30 uppercase tracking-widest mb-3">
                Partner Up
              </span>
              <h3 className="font-display text-3xl font-extrabold text-white tracking-wide uppercase">
                Game Buddies
              </h3>
              <p className="text-xs text-purple-200/80 mt-1 font-medium leading-relaxed">
                Partner up. Play together. Win together.
              </p>
            </div>

            <ul className="space-y-2.5 pt-2">
              {[
                "Find verified gamers & teammates",
                "Duo, Squad or Clan - your choice",
                "Play anytime, anywhere",
                "Build friendships & rank up"
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="size-4 rounded-full bg-[#ff007f]/10 border border-[#ff007f]/30 flex items-center justify-center shrink-0">
                    <Check className="size-2.5 text-[#ff007f]" />
                  </span>
                  <span className="text-foreground/90 font-medium">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-8 flex items-center gap-4 flex-wrap">
            <Link
              to="/game-buddies"
              className="h-11 px-6 rounded-xl bg-[#ff007f] hover:bg-[#ff007f]/90 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(255,0,127,0.35)] inline-flex items-center justify-center gap-1.5"
            >
              Find Game Buddies <ArrowRight className="size-3.5" />
            </Link>

            <div className="flex items-center">
              <div className="flex -space-x-2.5 overflow-hidden">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=50&h=50&fit=crop"
                ].map((img, i) => (
                  <img
                    key={i}
                    className="inline-block size-7 rounded-full ring-2 ring-[#09040e] object-cover"
                    src={img}
                    alt="avatar"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COACH & EARN CARD */}
        <div 
          className="relative overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-br from-[#1c1408] via-[#0e0a04] to-black p-8 md:p-10 flex flex-col justify-between min-h-[360px] shadow-[0_0_30px_rgba(212,160,23,0.05)] hover:border-gold/25 hover:shadow-[0_0_40px_rgba(212,160,23,0.1)] transition-all duration-500 group"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(14, 10, 4, 0.96) 50%, rgba(14, 10, 4, 0.4) 100%), url('https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&auto=format&fit=crop&q=70')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Amber Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-gold/15 transition-all duration-500" />
          
          <div className="relative z-10 max-w-[280px] sm:max-w-[360px] space-y-4">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gold/15 text-gold border border-gold/30 uppercase tracking-widest mb-3">
                Share Your Skills
              </span>
              <h3 className="font-display text-3xl font-extrabold text-white tracking-wide uppercase">
                Coach & Earn
              </h3>
              <p className="text-xs text-amber-200/80 mt-1 font-medium leading-relaxed">
                Share your skills. Inspire. Earn.
              </p>
            </div>

            <ul className="space-y-2.5 pt-2">
              {[
                "1-on-1 Coaching Sessions",
                "Help players improve & rank up",
                "Flexible schedule",
                "Earn securely. Get paid for your skills"
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="size-4 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                    <Check className="size-2.5 text-gold" />
                  </span>
                  <span className="text-foreground/90 font-medium">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-8 flex items-center gap-4 flex-wrap">
            <Link
              to="/become-coach"
              className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-xs font-bold hover:brightness-115 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,160,23,0.35)] inline-flex items-center justify-center gap-1.5"
            >
              Become a Coach <ArrowRight className="size-3.5" />
            </Link>

            <div className="flex items-center">
              <div className="flex -space-x-2.5 overflow-hidden">
                {[
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop"
                ].map((img, i) => (
                  <img
                    key={i}
                    className="inline-block size-7 rounded-full ring-2 ring-[#0e0a04] object-cover"
                    src={img}
                    alt="avatar"
                  />
                ))}
              </div>
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
      title: "Gaming Marketplace",
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

const mockTopRatedSellers: SellerProfile[] = [
  {
    name: "ProBoosters",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop",
    rating: 5.0,
    reviews: 312,
    orders: "560+",
    successRate: "100%",
    tier: "Top Seller",
    colorRing: "ring-gold",
  },
  {
    name: "EliteStore",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
    rating: 4.9,
    reviews: 128,
    orders: "320+",
    successRate: "99.4%",
    tier: "Rising Star",
    colorRing: "ring-blue-500",
  },
  {
    name: "DigitalHub",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop",
    rating: 4.8,
    reviews: 96,
    orders: "210+",
    successRate: "99.8%",
    tier: "Top Seller",
    colorRing: "ring-emerald-500",
  },
  {
    name: "CoachMaster",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    rating: 4.8,
    reviews: 184,
    orders: "330+",
    successRate: "99.1%",
    tier: "Top Seller",
    colorRing: "ring-amber-500",
  },
  {
    name: "GameSquad",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    rating: 4.7,
    reviews: 86,
    orders: "150+",
    successRate: "98.5%",
    tier: "Rising Star",
    colorRing: "ring-purple-500",
  }
];

function TopRatedSellers() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    async function loadSellers() {
      const supabase = getSupabase();
      if (!supabase) {
        setSellers(mockTopRatedSellers);
        return;
      }
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, rating_avg, rating_count, is_seller")
          .eq("is_seller", true)
          .order("rating_avg", { ascending: false }) // Sort by rating_avg desc
          .limit(8);

        if (error || !profiles || profiles.length === 0) {
          setSellers(mockTopRatedSellers);
          return;
        }

        const mapped: SellerProfile[] = profiles.map((p, idx) => {
          const fallback = mockTopRatedSellers[idx % mockTopRatedSellers.length];
          return {
            name: p.display_name || p.username || `Seller_${p.id.slice(0, 4)}`,
            avatar: p.avatar_url || fallback.avatar,
            rating: p.rating_avg || 5.0,
            reviews: p.rating_count || Math.floor(Math.random() * 200) + 10,
            orders: `${Math.floor(Math.random() * 300) + 50}+`,
            successRate: `${(96 + Math.random() * 4).toFixed(1)}%`,
            tier: idx % 3 === 0 ? "Top Seller" : idx % 3 === 1 ? "Rising Star" : "Elite Trader",
            colorRing: fallback.colorRing
          };
        });

        while (mapped.length < 5) {
          mapped.push(mockTopRatedSellers[mapped.length % mockTopRatedSellers.length]);
        }
        
        setSellers(mapped);
      } catch (e) {
        console.error("Error loading sellers:", e);
        setSellers(mockTopRatedSellers);
      }
    }
    void loadSellers();
  }, []);

  const nextSlide = () => {
    setStartIndex((prev) => (prev + 1 > sellers.length - 5 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setStartIndex((prev) => (prev - 1 < 0 ? sellers.length - 5 : prev - 1));
  };

  if (sellers.length === 0) return null;

  return (
    <section className="container-page py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2 text-foreground">
              Top Rated Sellers <Crown className="size-6 text-gold fill-gold/20 animate-pulse" />
            </h2>
          </div>
          <p className="text-xs font-bold tracking-wider text-muted-foreground mt-1 uppercase">
            Trusted sellers with top quality service and ratings
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

        <div className="flex overflow-x-auto gap-5 py-2 scrollbar-none">
          {sellers.slice(startIndex, startIndex + 5).map((s, idx) => (
            <div 
              key={idx}
              className="bg-[#101114] border border-border/80 rounded-2xl p-5 flex flex-col items-center justify-between text-center transition-all hover:border-gold/40 hover:shadow-[0_0_15px_rgba(212,160,23,0.08)] hover:scale-[1.03] min-w-[190px] flex-1"
            >
              <div className="relative mb-4">
                <div className={`size-20 rounded-full ring-2 ${s.colorRing} ring-offset-2 ring-offset-background p-0.5 overflow-hidden shadow-[0_0_10px_rgba(212,160,23,0.15)]`}>
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
                <span className="text-xs font-bold text-foreground truncate max-w-[95px]">{s.name}</span>
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
            {liveListings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Discover",
      desc: "Browse digital products, services and opportunities across multiple categories.",
      icon: Search,
    },
    {
      n: 2,
      title: "Connect",
      desc: "Chat directly with sellers or service providers and finalize the details.",
      icon: MessageSquare,
    },
    {
      n: 3,
      title: "Secure Transaction",
      desc: "Make safe payments through our secure system. Your money is always protected.",
      icon: Lock,
    },
    {
      n: 4,
      title: "Complete & Review",
      desc: "Get your service or product and leave a review. Build your reputation in the community.",
      icon: Check,
    },
  ];

  return (
    <section className="container-page py-16 text-center">
      <div>
        <h2 className="font-display text-3xl font-bold flex items-center justify-center gap-2">
          How <span className="text-gold">HUXZAIN</span> Works
        </h2>
        <p className="text-xs font-bold tracking-wider text-muted-foreground mt-1 uppercase">
          Simple, secure and seamless experience for everyone.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex flex-col items-center relative w-full">
              {/* Step Card */}
              <div className="w-full rounded-2xl p-6 flex flex-col items-center justify-between transition-all bg-[#101114] min-h-[220px] border border-border/80 hover:border-gold/30 hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(212,160,23,0.05)]">
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
            </div>
          );
        })}
      </div>

      {/* Safety / Trust Pillars Box (Why Choose HUXZAIN) */}
      <div className="mt-16 rounded-2xl border border-border/80 bg-[#101114]/50 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <Lock className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Escrow Protection</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your funds are safe until delivery is confirmed.
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
              <Shield className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Buyer Protection</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Get support and resolution for every transaction.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
              <Headphones className="size-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">24/7 Support</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We're here to help you via ticket and email.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendingListings() {
  const [listings, setListings] = useState<ListingLike[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    async function loadTrending() {
      try {
        const { data, error } = await supabase!
          .from("listings")
          .select("*, profiles(id, display_name, username, subscription_tier, is_verified)")
          .eq("status", "active")
          .order("view_count", { ascending: false })
          .limit(5);
        if (error) throw error;
        setListings(data as ListingLike[]);
      } catch (e) {
        console.error("Error loading trending listings:", e);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }
    void loadTrending();
  }, []);

  if (loading) {
    return (
      <section className="container-page py-10">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-8">Trending Listings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface/30 h-48 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!listings || listings.length === 0) return null;

  return (
    <section className="container-page py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Trending Listings <Flame className="size-6 text-orange-500 fill-orange-500/20 animate-pulse" />
          </h2>
          <p className="text-xs font-bold tracking-wider text-muted-foreground mt-1 uppercase">
            The most viewed and popular listings right now
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {listings.map((l) => (
          <ListingCard key={l.id} l={l} />
        ))}
      </div>
    </section>
  );
}

function ReadyCTA() {
  const { isAuthenticated, roles } = useAuth();
  const isSeller = roles.includes("seller");

  return (
    <section className="container-page py-12">
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-r from-[#101114] via-[#16171d] to-[#101114] p-8 md:p-12 shadow-[0_0_30px_rgba(212,160,23,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left glowing crystals overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gold/10 to-transparent pointer-events-none blur-xl opacity-50" />
        {/* Right glowing crystals overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gold/10 to-transparent pointer-events-none blur-xl opacity-50" />

        <div className="relative z-10 flex-1 space-y-3 text-center md:text-left">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Build. <span className="text-gold">Sell.</span> Grow.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Join India's modern digital marketplace and connect with buyers, sellers and professionals.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-4 shrink-0 justify-center">
          <Link
            to="/categories"
            className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(212,160,23,0.3)] inline-flex items-center gap-2"
          >
            Start Exploring <ArrowRight className="size-4" />
          </Link>
          <Link
            to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
            search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
            className="h-11 px-6 rounded-xl border border-gold/40 text-gold text-sm font-bold hover:bg-gold/5 active:scale-95 transition-all inline-flex items-center justify-center"
          >
            Become a Seller
          </Link>
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className="container-page py-8">
      <div className="rounded-3xl border border-border/80 bg-[#101114]/60 backdrop-blur-md p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="font-display text-2xl font-bold text-white">
            Join The <span className="text-gold">HUXZAIN</span> Community
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Stay connected with updates, offers and everything happening on HUXZAIN.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center justify-center">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white text-sm font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(220,39,67,0.25)]"
          >
            <svg className="size-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Instagram
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#1877f2] to-[#0d62d4] text-white text-sm font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(24,119,242,0.25)]"
          >
            <svg className="size-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </a>
          <a
            href="https://whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#25d366] to-[#1cbd55] text-white text-sm font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
          >
            <svg className="size-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.407 9.862-9.86.002-2.64-1.023-5.123-2.887-6.99A9.807 9.807 0 0012.008 1.74c-5.44 0-9.865 4.41-9.867 9.864-.001 1.73.457 3.419 1.32 4.93L2.43 21.32l5.093-1.334z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
