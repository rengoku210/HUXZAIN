import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Gamepad2,
  Globe,
  ShieldCheck,
  Star,
  Timer,
} from "lucide-react";

type Coach = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  languages: string[] | null;
  years_experience: number | null;
  primary_game: string | null;
  secondary_games: string[] | null;
  current_rank: string | null;
  highest_rank: string | null;
  specialization: string | null;
  coaching_categories: string[] | null;
  session_price_inr: number;
  session_durations_min: number[] | null;
  availability: string | null;
  intro: string | null;
  why_choose: string | null;
  experience: string | null;
  rating_avg: number;
  rating_count: number;
  sessions_completed: number;
  email_verified: boolean;
  phone_verified: boolean;
  status: string;
};

export const Route = createFileRoute("/coaching/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const [coach, setCoach] = useState<Coach | null>(null);
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
      const { data, error } = await sb.from("coaches").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      if (error) console.error("Failed to load coach profile:", error);
      setCoach((data as any) ?? null);
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
            to="/coaching"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Coaching
          </Link>

          {loading ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface/30 p-8 animate-pulse">
              <div className="h-12 w-12 rounded-2xl bg-surface" />
              <div className="mt-4 h-4 w-1/2 bg-surface rounded" />
              <div className="mt-2 h-3 w-1/3 bg-surface rounded" />
            </div>
          ) : !coach ? (
            <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-10 text-center">
              <div className="text-sm font-semibold">Profile not found</div>
              <div className="text-xs text-muted-foreground mt-2">
                This coach profile may be unavailable.
              </div>
            </div>
          ) : (
            <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-surface/40 p-6">
                  <div className="flex items-start gap-5">
                    <div className="size-20 rounded-2xl border border-border bg-background/40 overflow-hidden shrink-0">
                      {coach.avatar_url ? (
                        <img src={coach.avatar_url} alt={coach.display_name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full grid place-items-center text-xl font-bold text-gold">
                          {coach.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display text-2xl font-bold">{coach.display_name}</h1>
                        {coach.email_verified && coach.phone_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                            <BadgeCheck className="size-3.5" /> Verified Coach
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Star className="size-4 text-gold" />
                          {Number(coach.rating_avg ?? 0).toFixed(1)}{" "}
                          <span className="text-xs">
                            ({coach.rating_count ?? 0} reviews)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BarChart3 className="size-4 text-muted-foreground" />
                          {coach.sessions_completed ?? 0} sessions
                        </span>
                        {coach.country && (
                          <span className="inline-flex items-center gap-1.5">
                            <Globe className="size-4 text-muted-foreground" />
                            {coach.country}
                          </span>
                        )}
                      </div>

                      {coach.intro && (
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                          {coach.intro}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Info
                    icon={Gamepad2}
                    title="Game & Rank"
                    lines={[
                      coach.primary_game ? `Primary: ${coach.primary_game}` : "Primary: —",
                      coach.current_rank ? `Current: ${coach.current_rank}` : "Current: —",
                      coach.highest_rank ? `Highest: ${coach.highest_rank}` : "Highest: —",
                    ]}
                  />
                  <Info
                    icon={Timer}
                    title="Availability"
                    lines={[
                      coach.availability ?? "—",
                      coach.years_experience
                        ? `${coach.years_experience} years experience`
                        : "Experience: —",
                    ]}
                  />
                  <Info
                    icon={ShieldCheck}
                    title="Coaching Types"
                    lines={[
                      (coach.coaching_categories ?? []).length
                        ? (coach.coaching_categories ?? []).join(", ")
                        : "—",
                    ]}
                  />
                  <Info
                    icon={Globe}
                    title="Languages"
                    lines={[
                      (coach.languages ?? []).length ? (coach.languages ?? []).join(", ") : "—",
                    ]}
                  />
                </div>

                {coach.why_choose && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6">
                    <div className="font-semibold">Why students should choose me</div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {coach.why_choose}
                    </p>
                  </div>
                )}
              </div>

              <aside className="space-y-4 h-fit lg:sticky lg:top-32">
                <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 via-surface/30 to-background p-6">
                  <div className="text-xs text-muted-foreground">Session price</div>
                  <div className="mt-1 text-3xl font-bold">
                    ₹{Number(coach.session_price_inr ?? 0).toFixed(0)}
                    <span className="text-sm text-muted-foreground font-medium">/session</span>
                  </div>
                  <button className="mt-4 w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:brightness-110 transition-all">
                    Request Session
                  </button>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Bookings & communication happen inside HUXZAIN.
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-6">
                  <div className="font-semibold">Session durations</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(coach.session_durations_min ?? []).length ? (
                      (coach.session_durations_min ?? []).map((d) => (
                        <span
                          key={d}
                          className="text-[11px] px-2 py-1 rounded-full border border-border bg-background/30 text-muted-foreground"
                        >
                          {d} min
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
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

