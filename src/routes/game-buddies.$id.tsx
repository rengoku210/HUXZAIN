import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Gamepad2,
  Globe,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

type Buddy = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  languages: string[] | null;
  primary_game: string | null;
  additional_games: string[] | null;
  play_styles: string[] | null;
  availability: string | null;
  voice_chat: boolean;
  bio: string | null;
  price_per_hour_inr: number;
  why_choose: string | null;
  rating_avg: number;
  rating_count: number;
  sessions_completed: number;
  email_verified: boolean;
  phone_verified: boolean;
  status: string;
};

export const Route = createFileRoute("/game-buddies/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const [buddy, setBuddy] = useState<Buddy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("game_buddies")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (error) console.error("Failed to load buddy profile:", error);
      setBuddy((data as any) ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container-page py-8">
          <Link
            to="/game-buddies"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Game Buddies
          </Link>

          {loading ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface/30 p-8 animate-pulse">
              <div className="h-12 w-12 rounded-2xl bg-surface" />
              <div className="mt-4 h-4 w-1/2 bg-surface rounded" />
              <div className="mt-2 h-3 w-1/3 bg-surface rounded" />
            </div>
          ) : !buddy ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-10 text-center">
              <div className="text-sm font-semibold">Profile not found</div>
              <div className="text-xs text-muted-foreground mt-2">
                This game buddy profile may be unavailable.
              </div>
            </div>
          ) : (
            <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6">
                {/* Header card */}
                <div className="rounded-2xl border border-border bg-surface/40 p-6">
                  <div className="flex items-start gap-5">
                    <div className="size-20 rounded-2xl border border-border bg-background/40 overflow-hidden shrink-0">
                      {buddy.avatar_url ? (
                        <img
                          src={buddy.avatar_url}
                          alt={buddy.display_name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full grid place-items-center text-xl font-bold text-gold">
                          {buddy.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display text-2xl font-bold">
                          {buddy.display_name}
                        </h1>
                        {buddy.email_verified && buddy.phone_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                            <BadgeCheck className="size-3.5" /> Verified Game Buddy
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Star className="size-4 text-gold" />
                          {Number(buddy.rating_avg ?? 0).toFixed(1)}{" "}
                          <span className="text-xs">
                            ({buddy.rating_count ?? 0} reviews)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-4 text-muted-foreground" />
                          {buddy.sessions_completed ?? 0} sessions
                        </span>
                        {buddy.country && (
                          <span className="inline-flex items-center gap-1.5">
                            <Globe className="size-4 text-muted-foreground" />
                            {buddy.country}
                          </span>
                        )}
                      </div>
                      {buddy.bio && (
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                          {buddy.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Info
                    icon={Gamepad2}
                    title="Games"
                    lines={[
                      buddy.primary_game ? `Primary: ${buddy.primary_game}` : "Primary: —",
                      (buddy.additional_games ?? []).length
                        ? `Additional: ${(buddy.additional_games ?? []).join(", ")}`
                        : "Additional: —",
                    ]}
                  />
                  <Info
                    icon={Calendar}
                    title="Availability"
                    lines={[
                      buddy.availability ?? "—",
                      buddy.voice_chat ? "Voice chat: Yes" : "Voice chat: No",
                    ]}
                  />
                  <Info
                    icon={ShieldCheck}
                    title="Play Style"
                    lines={[
                      (buddy.play_styles ?? []).length
                        ? (buddy.play_styles ?? []).join(", ")
                        : "—",
                    ]}
                  />
                  <Info
                    icon={MessageSquare}
                    title="Languages"
                    lines={[
                      (buddy.languages ?? []).length
                        ? (buddy.languages ?? []).join(", ")
                        : "—",
                    ]}
                  />
                </div>

                {/* Why choose */}
                {buddy.why_choose && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6">
                    <div className="font-semibold">Why players should choose me</div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {buddy.why_choose}
                    </p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <aside className="space-y-4 h-fit lg:sticky lg:top-32">
                <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 via-surface/30 to-background p-6">
                  <div className="text-xs text-muted-foreground">Session price</div>
                  <div className="mt-1 text-3xl font-bold">
                    ₹{Number(buddy.price_per_hour_inr ?? 0).toFixed(0)}
                    <span className="text-sm text-muted-foreground font-medium">/hr</span>
                  </div>
                  <button className="mt-4 w-full h-11 rounded-xl bg-purple-600 text-white font-semibold hover:brightness-110 transition-all">
                    Book Session
                  </button>
                  <div className="mt-3 text-xs text-muted-foreground">
                    All communication stays inside HUXZAIN. No external contact sharing.
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-6">
                  <div className="font-semibold">Safety</div>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-2">
                    <li>• Email + Phone verification required before profile goes live.</li>
                    <li>• Dispute support available 24/7.</li>
                    <li>• Your data is encrypted and never shared.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Info({
  icon: Icon,
  title,
  lines,
}: {
  icon: any;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center">
          <Icon className="size-4 text-gold" />
        </div>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
}

