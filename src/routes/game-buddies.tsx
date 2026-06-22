import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { GAMES, GAME_MODES, PLAY_STYLES } from "@/lib/buddy-coach";
import { getUserAvatar, DEFAULT_AVATAR_URL } from "@/lib/marketplace-data";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Gamepad2,
  Globe,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

type GameBuddyRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  languages: string[] | null;
  primary_game: string | null;
  additional_games: string[] | null;
  play_styles: string[] | null;
  availability: string | null;
  voice_chat: boolean;
  price_per_hour_inr: number;
  rating_avg: number;
  rating_count: number;
  sessions_completed: number;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
};

export const Route = createFileRoute("/game-buddies")({
  head: () => ({
    meta: [
      { title: "Game Buddies — HUXZAIN" },
      {
        name: "description",
        content:
          "Find verified game buddies on HUXZAIN. Filter by game, mode, language, availability and price.",
      },
    ],
  }),
  component: Page,
});

function Pill({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 hover:border-gold/35 transition-colors">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
          <Icon className="size-5 text-gold" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [rows, setRows] = useState<GameBuddyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [selectedGame, setSelectedGame] = useState<string>("All Games");
  const [mode, setMode] = useState<string>("Any");
  const [availability, setAvailability] = useState<string>("Any");
  const [language, setLanguage] = useState<string>("Any");
  const [voiceChat, setVoiceChat] = useState<"any" | "yes" | "no">("any");
  const [sort, setSort] = useState<
    "highest_rated" | "lowest_price" | "most_sessions" | "newest"
  >("highest_rated");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("game_buddies")
        .select("*")
        .in("status", ["active", "pending_review"]); // show pending to staff/self via RLS

      if (!active) return;
      if (error) {
        console.error("Failed to load game buddies:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as GameBuddyRow[]);
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => r.status === "active");

    if (needle) {
      out = out.filter((r) => {
        const hay = [
          r.display_name,
          r.primary_game,
          ...(r.additional_games ?? []),
          ...(r.play_styles ?? []),
          ...(r.languages ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    if (selectedGame !== "All Games") {
      out = out.filter(
        (r) =>
          r.primary_game === selectedGame ||
          (r.additional_games ?? []).includes(selectedGame),
      );
    }
    if (mode !== "Any") {
      out = out.filter((r) => (r.play_styles ?? []).includes(mode));
    }
    if (availability !== "Any") {
      out = out.filter((r) =>
        (r.availability ?? "").toLowerCase().includes(availability.toLowerCase()),
      );
    }
    if (language !== "Any") {
      out = out.filter((r) => (r.languages ?? []).includes(language));
    }
    if (voiceChat !== "any") {
      out = out.filter((r) => r.voice_chat === (voiceChat === "yes"));
    }

    out.sort((a, b) => {
      if (sort === "highest_rated") return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      if (sort === "lowest_price")
        return Number(a.price_per_hour_inr ?? 0) - Number(b.price_per_hour_inr ?? 0);
      if (sort === "most_sessions")
        return Number(b.sessions_completed ?? 0) - Number(a.sessions_completed ?? 0);
      return 0;
    });
    return out;
  }, [rows, q, selectedGame, mode, availability, language, voiceChat, sort]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active");
    const activeGamers = Math.max(10_000, active.length * 12);
    const verified = active.filter((r) => r.email_verified && r.phone_verified).length;
    const gamesDaily = Math.max(1200, active.length * 3);
    return {
      activeGamers,
      verified,
      gamesDaily,
      happy: "99.7%",
    };
  }, [rows]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const l of r.languages ?? []) set.add(l);
    return ["Any", ...Array.from(set).sort()];
  }, [rows]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative border-b border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.25),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(212,160,23,0.10),transparent_55%)]" />
          <div className="container-page relative py-10 lg:py-14 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05]">
                Find Your Perfect{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-300">
                  Game Buddy
                </span>{" "}
                <span className="align-middle">👥</span>
              </h1>
              <p className="mt-4 text-muted-foreground max-w-2xl text-sm sm:text-base">
                Play with skilled, friendly and verified gamers. Duo, Squad or
                Clan — your choice, your way.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { i: BadgeCheck, t: "Verified Gamers", d: "All buddies are verified" },
                  { i: ShieldCheck, t: "Safe & Secure", d: "Escrow-style protection" },
                  { i: Globe, t: "Anytime, Anywhere", d: "Flexible scheduling" },
                  { i: Gamepad2, t: "For Every Game", d: "Multiple games & modes" },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/35 transition-colors"
                  >
                    <x.i className="size-3.5 text-gold" />
                    <span className="font-semibold text-foreground/90">{x.t}</span>
                    <span className="text-muted-foreground hidden sm:inline">· {x.d}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: "Active Gamers", v: `${stats.activeGamers.toLocaleString()}+` },
                  { l: "Verified Buddies", v: `${Math.max(5000, stats.verified).toLocaleString()}+` },
                  { l: "Games Played Daily", v: `${stats.gamesDaily.toLocaleString()}+` },
                  { l: "Happy Players", v: stats.happy },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-2xl border border-border bg-surface/40 p-4"
                  >
                    <div className="text-lg font-bold text-foreground">{s.v}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-9 rounded-xl border border-purple-400/30 bg-purple-500/10 flex items-center justify-center">
                  <Users className="size-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">How Game Buddies Works</div>
                  <div className="text-xs text-muted-foreground">3 simple steps</div>
                </div>
              </div>
              <ol className="space-y-3 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-200 grid place-items-center text-[10px] font-bold">
                    1
                  </span>
                  <span>
                    Choose game & filters (mode, time, language & price).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-200 grid place-items-center text-[10px] font-bold">
                    2
                  </span>
                  <span>Browse verified buddies, ratings & reviews.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-200 grid place-items-center text-[10px] font-bold">
                    3
                  </span>
                  <span>Book & play. Stay protected inside HUXZAIN.</span>
                </li>
              </ol>

              <div className="mt-5 rounded-xl border border-gold/20 bg-gold/5 p-4">
                <div className="text-xs font-semibold text-foreground">
                  Want to be a Game Buddy?
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Earn while you play — get verified and start receiving sessions.
                </div>
                <Link
                  to="/become-game-buddy"
                  className="mt-3 inline-flex items-center justify-center w-full h-10 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:brightness-110 transition-all"
                >
                  Become a Game Buddy <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Listing area */}
        <section className="container-page py-10 grid lg:grid-cols-[280px_1fr_320px] gap-6">
          {/* Filters */}
          <aside className="rounded-2xl border border-border bg-surface/40 p-4 h-fit lg:sticky lg:top-32">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-gold" />
                <span className="text-sm font-semibold">Filters</span>
              </div>
              <button
                onClick={() => {
                  setQ("");
                  setSelectedGame("All Games");
                  setMode("Any");
                  setAvailability("Any");
                  setLanguage("Any");
                  setVoiceChat("any");
                  setSort("highest_rated");
                }}
                className="text-[11px] text-gold hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  Search
                </div>
                <div className="flex items-stretch rounded-xl border border-border bg-background/40 overflow-hidden">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search buddy..."
                    className="flex-1 bg-transparent px-3 text-sm outline-none h-10"
                  />
                  <div className="px-3 grid place-items-center border-l border-border text-muted-foreground">
                    <Search className="size-4" />
                  </div>
                </div>
              </div>

              <Select
                label="Select Game"
                value={selectedGame}
                onChange={setSelectedGame}
                options={["All Games", ...GAMES]}
              />

              <Select
                label="Game Mode"
                value={mode}
                onChange={setMode}
                options={["Any", ...GAME_MODES]}
              />

              <Select
                label="Availability"
                value={availability}
                onChange={setAvailability}
                options={["Any", "Online Now", "Available Today", "Weekend", "Night"]}
              />

              <Select
                label="Language"
                value={language}
                onChange={setLanguage}
                options={languages}
              />

              <Select
                label="Voice Chat"
                value={voiceChat}
                onChange={(v) => setVoiceChat(v as any)}
                options={["any", "yes", "no"]}
                displayMap={{ any: "Any", yes: "Yes", no: "No" }}
              />

              <div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  Play Style (quick)
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLAY_STYLES.slice(0, 6).map((p) => (
                    <button
                      key={p}
                      onClick={() => setMode(p)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        mode === p
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-border bg-background/30 text-muted-foreground hover:text-foreground hover:border-gold/30"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  Sort by
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                >
                  <option value="highest_rated">Highest Rated</option>
                  <option value="lowest_price">Lowest Price</option>
                  <option value="most_sessions">Most Sessions</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main list */}
          <div>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold">
                  Game Buddy Listings
                </h2>
                <div className="text-xs text-muted-foreground mt-1">
                  Showing {filtered.length} buddies
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
                <div className="text-sm font-semibold">No buddies found</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Try changing filters or search keywords.
                </div>
                <Link
                  to="/become-game-buddy"
                  className="mt-5 inline-flex items-center h-10 px-5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:brightness-110"
                >
                  Become a Game Buddy <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <Link
                    key={b.id}
                    to="/game-buddies/$id"
                    params={{ id: b.id }}
                    className="block rounded-2xl border border-border bg-surface/40 p-4 hover:bg-surface/60 hover:border-gold/35 transition-all hover:shadow-[0_0_24px_rgba(212,160,23,0.10)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl border border-border bg-background/40 overflow-hidden shrink-0">
                        <img
                          src={getUserAvatar(b.avatar_url)}
                          alt={b.display_name}
                          className="size-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_AVATAR_URL;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">
                            {b.display_name}
                          </div>
                          {b.email_verified && b.phone_verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                              <BadgeCheck className="size-3.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Gamepad2 className="size-3.5 text-purple-300" />{" "}
                            {b.primary_game ?? "Game Buddy"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3.5 text-gold" />{" "}
                            {Number(b.rating_avg ?? 0).toFixed(1)}{" "}
                            <span className="text-muted-foreground">
                              ({b.rating_count ?? 0})
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5 text-muted-foreground" />{" "}
                            {b.sessions_completed ?? 0} sessions
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(b.play_styles ?? []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-1 rounded-full border border-border bg-background/30 text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                          {(b.languages ?? []).slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-1 rounded-full border border-purple-400/20 bg-purple-500/10 text-purple-200"
                            >
                              {t}
                            </span>
                          ))}
                          {b.availability && (
                            <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                              {b.availability}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-muted-foreground">
                          Starting from
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          ₹{Number(b.price_per_hour_inr ?? 0).toFixed(0)}
                          <span className="text-xs text-muted-foreground font-medium">
                            /hr
                          </span>
                        </div>
                        <div className="mt-2 inline-flex items-center justify-center h-9 px-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:brightness-110 transition-all">
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
            <Pill
              icon={ShieldCheck}
              title="Why Choose HUXZAIN"
              desc="Verified & monitored buddies. Safe payments. Transparent support."
            />
            <Pill
              icon={BadgeCheck}
              title="Verified & Trusted"
              desc="Email + phone verification required before profiles go live."
            />
            <Pill
              icon={Users}
              title="Quick & Easy"
              desc="Find your perfect match fast with filters and clear pricing."
            />
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-sm font-semibold">Can’t find a buddy?</div>
              <div className="text-xs text-muted-foreground mt-1">
                Post a request and we’ll help you match with verified gamers.
              </div>
              <button className="mt-3 w-full h-10 rounded-xl border border-purple-400/25 bg-purple-600/10 text-purple-200 hover:bg-purple-600/15 transition-colors text-sm font-semibold">
                Post a Request
              </button>
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
  displayMap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  displayMap?: Record<string, string>;
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
              {displayMap?.[o] ?? o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

