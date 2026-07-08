import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { COACHING_CATEGORIES, GAMES } from "@/lib/buddy-coach";
import { getUserAvatar, DEFAULT_AVATAR_URL } from "@/lib/marketplace-data";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  Crown,
  Gamepad2,
  GraduationCap,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

type CoachRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  languages: string[] | null;
  years_experience: number | null;
  primary_game: string | null;
  coaching_categories: string[] | null;
  availability: string | null;
  session_price_inr: number;
  rating_avg: number;
  rating_count: number;
  sessions_completed: number;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
};

export const Route = createFileRoute("/coaching")({
  head: () => ({ meta: [{ title: "Coaching — HUXZAIN" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGame, setSelectedGame] = useState<string>("All Games");
  const [category, setCategory] = useState<string>("All Types");
  const [availability, setAvailability] = useState<string>("Any");
  const [sort, setSort] = useState<"highest_rated" | "lowest_price" | "most_sessions">(
    "highest_rated",
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb.from("coaches").select("*");
      if (!active) return;
      if (error) console.error("Failed to load coaches:", error);
      setRows(((data ?? []) as any[]) as CoachRow[]);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let out = rows.filter((r) => r.status === "active");
    if (selectedGame !== "All Games") {
      out = out.filter((r) => r.primary_game === selectedGame);
    }
    if (category !== "All Types") {
      out = out.filter((r) => (r.coaching_categories ?? []).includes(category));
    }
    if (availability !== "Any") {
      out = out.filter((r) =>
        (r.availability ?? "").toLowerCase().includes(availability.toLowerCase()),
      );
    }
    out.sort((a, b) => {
      if (sort === "highest_rated") return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      if (sort === "lowest_price")
        return Number(a.session_price_inr ?? 0) - Number(b.session_price_inr ?? 0);
      return Number(b.sessions_completed ?? 0) - Number(a.sessions_completed ?? 0);
    });
    return out;
  }, [rows, selectedGame, category, availability, sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(212,160,23,0.18),transparent_55%),radial-gradient(circle_at_75%_35%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="container-page relative py-12 lg:py-14 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05]">
                Become a Coach.{" "}
                <span className="text-gold">Inspire.</span> Teach. Earn.
              </h1>
              <p className="mt-4 text-muted-foreground max-w-2xl text-sm sm:text-base">
                Share your skills, train players, build your reputation — and earn on your terms.
                Flexible. Rewarding. Respected.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/become-coach"
                  className="inline-flex items-center h-10 px-5 rounded-xl bg-gold text-black font-bold text-sm hover:brightness-110 transition-all"
                >
                  Become a Coach <ArrowRight className="size-4 ml-1.5" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center h-10 px-5 rounded-xl border border-border bg-background/40 text-sm font-semibold hover:border-gold/35 transition-colors"
                >
                  How It Works
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {[
                  { i: BadgeCheck, t: "Verified Coaches", d: "All coaches are verified" },
                  { i: ShieldCheck, t: "Secure Payments", d: "Safe escrow-style protection" },
                  { i: Crown, t: "Fair & Transparent", d: "No hidden fees" },
                  { i: Users, t: "24/7 Support", d: "We’re here to help" },
                  { i: ShieldCheck, t: "Coach Protection", d: "Your account & earnings are safe" },
                ].map((x) => (
                  <div key={x.t} className="flex items-center gap-2">
                    <div className="size-9 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center">
                      <x.i className="size-4 text-gold" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground/90">{x.t}</div>
                      <div className="text-[11px] text-muted-foreground">{x.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { v: "500+", l: "Active Coaches" },
                  { v: "10K+", l: "Sessions Completed" },
                  { v: "98%", l: "Positive Feedback" },
                  { v: "4.9/5", l: "Average Rating" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-border bg-background/30 p-3">
                    <div className="text-lg font-bold">{s.v}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="container-page py-10 grid lg:grid-cols-[280px_1fr_320px] gap-6">
          {/* Filters */}
          <aside className="rounded-2xl border border-border bg-surface/40 p-4 h-fit lg:sticky lg:top-32">
            <div className="text-sm font-semibold mb-3">Filters</div>
            <div className="space-y-4">
              <Select
                label="Select Game"
                value={selectedGame}
                onChange={setSelectedGame}
                options={["All Games", ...GAMES]}
              />
              <Select
                label="Coaching Type"
                value={category}
                onChange={setCategory}
                options={["All Types", ...COACHING_CATEGORIES]}
              />
              <Select
                label="Availability"
                value={availability}
                onChange={setAvailability}
                options={["Any", "Available Now", "Available Today", "Weekend", "Night"]}
              />
              <div>
                <div className="text-[11px] text-muted-foreground mb-2">Sort by</div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                >
                  <option value="highest_rated">Highest Rated</option>
                  <option value="lowest_price">Lowest Price</option>
                  <option value="most_sessions">Most Sessions</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main list */}
          <div>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold">All Coaches</h2>
                <div className="text-xs text-muted-foreground mt-1">
                  Showing {filtered.length} coaches
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-surface/30 p-4 animate-pulse"
                  >
                    <div className="h-10 w-10 rounded-xl bg-surface" />
                    <div className="mt-3 h-3 w-1/2 bg-surface rounded" />
                    <div className="mt-2 h-3 w-1/3 bg-surface rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
                <div className="text-sm font-semibold">No coaches found</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Try changing filters.
                </div>
                <Link
                  to="/become-coach"
                  className="mt-5 inline-flex items-center h-10 px-5 rounded-xl bg-gold text-black font-bold text-sm hover:brightness-110"
                >
                  Become a Coach <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <Link
                    key={c.id}
                    to="/coaching/$id"
                    params={{ id: c.id }}
                    className="block rounded-2xl border border-border bg-surface/40 p-4 hover:bg-surface/60 hover:border-gold/35 transition-all hover:shadow-[0_0_24px_rgba(212,160,23,0.10)]"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                        <div className="size-14 rounded-2xl border border-border bg-background/40 overflow-hidden shrink-0">
                          <img
                            src={getUserAvatar(c.avatar_url)}
                            alt={c.display_name}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_AVATAR_URL;
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold truncate text-sm sm:text-base">{c.display_name}</div>
                            {c.email_verified && c.phone_verified && (
                              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                                <BadgeCheck className="size-3" /> Verified
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Gamepad2 className="size-3.5 text-gold" />
                              {c.primary_game ?? "Coach"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Star className="size-3.5 text-gold" />{" "}
                              {Number(c.rating_avg ?? 0).toFixed(1)}{" "}
                              <span className="text-muted-foreground">
                                ({c.rating_count ?? 0})
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BarChart3 className="size-3.5 text-muted-foreground" />{" "}
                              {c.sessions_completed ?? 0} sessions
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(c.coaching_categories ?? []).slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[9px] sm:text-[10px] px-2 py-0.5 sm:py-1 rounded-full border border-border bg-background/30 text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                            {c.availability && (
                              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 sm:py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                                {c.availability}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-t-0 shrink-0 gap-3">
                        <div className="text-left sm:text-right">
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground">Starting from</div>
                          <div className="text-base sm:text-lg font-bold text-gold">
                            ₹{Number(c.session_price_inr ?? 0).toFixed(0)}
                            <span className="text-xs text-muted-foreground font-medium">/session</span>
                          </div>
                        </div>
                        <div className="inline-flex items-center justify-center h-8 sm:h-9 px-4 rounded-xl bg-gold text-black font-bold text-xs sm:text-sm hover:brightness-110 transition-all cursor-pointer">
                          View Profile
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4 h-fit lg:sticky lg:top-32">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-gold" />
                <div className="font-semibold">Why Become a Coach on HUXZAIN?</div>
              </div>
              <ul className="mt-3 text-xs text-muted-foreground space-y-2">
                <li>• Earn more on your terms</li>
                <li>• Flexible schedule from anywhere</li>
                <li>• Build your brand & reputation</li>
                <li>• Dedicated support</li>
              </ul>
              <Link
                to="/become-coach"
                className="mt-4 inline-flex w-full items-center justify-center h-10 rounded-xl bg-gold text-black font-bold text-sm hover:brightness-110"
              >
                Start Coaching Today
              </Link>
              <div className="text-[11px] text-muted-foreground mt-2 text-center">
                It’s free to get started.
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="font-semibold">Popular Coaching Categories</div>
              <div className="mt-3 space-y-2">
                {COACHING_CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-background/30 hover:border-gold/35 transition-colors text-xs"
                  >
                    <span className="text-muted-foreground">{c}</span>
                    <span className="text-gold font-bold">{Math.floor(40 + Math.random() * 120)}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-2">{label}</div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-xl border border-border bg-background/40 pl-3 pr-9 text-sm outline-none appearance-none"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

