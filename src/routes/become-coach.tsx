import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { PhoneVerificationModal } from "@/components/site/PhoneVerificationModal";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import {
  COACHING_CATEGORIES,
  GAMES,
  SESSION_DURATIONS,
} from "@/lib/buddy-coach";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Crown,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  Shield,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
// InputOTP is used inside PhoneVerificationModal; not needed directly here

export const Route = createFileRoute("/become-coach")({
  head: () => ({ meta: [{ title: "Become a Coach — HUXZAIN" }] }),
  component: Page,
});

type CoachRow = {
  id: string;
  user_id: string;
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
  highest_rank_screenshot_url: string | null;
  achievement_screenshot_url: string | null;
  tournament_screenshot_url: string | null;
  achievements_text: string | null;
  status: string;
};

function Page() {
  const nav = useNavigate();
  const { isAuthenticated, user, profile, refreshUserMeta } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // verification
  const isEmailVerified = !!(profile?.email_verified || user?.email_confirmed_at);
  const isPhoneVerified = !!profile?.phone_verified;
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // form
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [languages, setLanguages] = useState<string[]>([]);
  const [years, setYears] = useState<string>("");

  const [primaryGame, setPrimaryGame] = useState<string>("Valorant");
  const [secondaryGames, setSecondaryGames] = useState<string[]>([]);
  const [currentRank, setCurrentRank] = useState<string>("");
  const [highestRank, setHighestRank] = useState<string>("");
  const [specialization, setSpecialization] = useState<string>("");

  const [categories, setCategories] = useState<string[]>([]);
  const [sessionPrice, setSessionPrice] = useState<string>("");
  const [durations, setDurations] = useState<number[]>([60]);
  const [availability, setAvailability] = useState<string>("");
  const [intro, setIntro] = useState<string>("");
  const [whyChoose, setWhyChoose] = useState<string>("");
  const [experience, setExperience] = useState<string>("");

  const [rankProofUrl, setRankProofUrl] = useState<string>("");
  const [achievementProofUrl, setAchievementProofUrl] = useState<string>("");
  const [tournamentProofUrl, setTournamentProofUrl] = useState<string>("");
  const [achievementsText, setAchievementsText] = useState<string>("");

  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to apply.");
      nav({ to: "/login", search: { redirect: "/become-coach" } });
    }
  }, [isAuthenticated, nav]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const userId = user.id;
    let active = true;
    async function loadExisting() {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data } = await sb.from("coaches").select("*").eq("user_id", userId).maybeSingle();
      if (!active) return;
      if (data) {
        const r = data as CoachRow;
        setDisplayName(r.display_name ?? displayName);
        setAvatarUrl(r.avatar_url ?? "");
        setCountry(r.country ?? country);
        setLanguages(r.languages ?? []);
        setYears(r.years_experience ? String(r.years_experience) : "");

        setPrimaryGame(r.primary_game ?? "Valorant");
        setSecondaryGames(r.secondary_games ?? []);
        setCurrentRank(r.current_rank ?? "");
        setHighestRank(r.highest_rank ?? "");
        setSpecialization(r.specialization ?? "");

        setCategories(r.coaching_categories ?? []);
        setSessionPrice(r.session_price_inr ? String(r.session_price_inr) : "");
        setDurations(r.session_durations_min ?? [60]);
        setAvailability(r.availability ?? "");
        setIntro(r.intro ?? "");
        setWhyChoose(r.why_choose ?? "");
        setExperience(r.experience ?? "");

        setRankProofUrl(r.highest_rank_screenshot_url ?? "");
        setAchievementProofUrl(r.achievement_screenshot_url ?? "");
        setTournamentProofUrl(r.tournament_screenshot_url ?? "");
        setAchievementsText(r.achievements_text ?? "");
      }
      setLoading(false);
    }
    void loadExisting();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const canSubmit = useMemo(() => {
    const priceNum = Number(sessionPrice);
    const yearsNum = years ? Number(years) : 0;
    return (
      !!user &&
      !!displayName.trim() &&
      !!country.trim() &&
      !!primaryGame &&
      categories.length > 0 &&
      Number.isFinite(priceNum) &&
      priceNum > 0 &&
      durations.length > 0 &&
      !!rankProofUrl &&
      !!achievementProofUrl &&
      agree &&
      isEmailVerified &&
      isPhoneVerified &&
      (years === "" || (Number.isFinite(yearsNum) && yearsNum >= 0))
    );
  }, [
    user,
    displayName,
    country,
    primaryGame,
    categories,
    sessionPrice,
    durations,
    rankProofUrl,
    achievementProofUrl,
    agree,
    isEmailVerified,
    isPhoneVerified,
    years,
  ]);

  async function uploadAvatar(file: File) {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) throw new Error("Backend not configured");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatars/coach-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  }

  async function uploadProof(file: File, kind: "rank" | "achievement" | "tournament") {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) throw new Error("Backend not configured");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from("coach-proofs").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = sb.storage.from("coach-proofs").getPublicUrl(path);
    if (kind === "rank") setRankProofUrl(data.publicUrl);
    if (kind === "achievement") setAchievementProofUrl(data.publicUrl);
    if (kind === "tournament") setTournamentProofUrl(data.publicUrl);
  }

  const addLang = (v: string) => {
    const t = v.trim();
    if (!t) return;
    setLanguages((prev) => Array.from(new Set([...prev, t])));
  };

  async function submit() {
    if (!user) return;
    if (!agree) return toast.error("Please accept the agreement to submit.");
    if (!isEmailVerified) return toast.error("Please verify your email first.");
    if (!isPhoneVerified) {
      toast.error("Please verify your phone number first.");
      nav({ to: "/account/verify-phone", search: { redirect: "/become-coach" } });
      return;
    }

    const priceNum = Number(sessionPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error("Enter a valid session price.");

    try {
      setSaving(true);
      const sb = getSupabase();
      if (!sb) throw new Error("Backend not configured");

      const payload: any = {
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl || null,
        country: country.trim(),
        languages,
        years_experience: years ? Number(years) : null,

        primary_game: primaryGame,
        secondary_games: secondaryGames,
        current_rank: currentRank.trim() || null,
        highest_rank: highestRank.trim() || null,
        specialization: specialization.trim() || null,

        coaching_categories: categories,
        session_price_inr: priceNum,
        session_durations_min: durations,
        availability: availability.trim() || null,
        intro: intro.trim() || null,
        why_choose: whyChoose.trim() || null,
        experience: experience.trim() || null,

        highest_rank_screenshot_url: rankProofUrl,
        achievement_screenshot_url: achievementProofUrl,
        tournament_screenshot_url: tournamentProofUrl || null,
        achievements_text: achievementsText.trim() || null,

        email_verified: isEmailVerified,
        phone_verified: isPhoneVerified,
        status: "pending_review",
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("coaches").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      toast.success("Coach application submitted! We will review and publish your profile.");
      nav({ to: "/coaching" });
    } catch (e: any) {
      toast.error(`Submission failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative border-b border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(212,160,23,0.18),transparent_55%),radial-gradient(circle_at_75%_35%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="container-page relative py-10">
            <div className="text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link> <span className="mx-1">›</span>{" "}
              <Link to="/coaching" className="hover:text-foreground">Coaching</Link> <span className="mx-1">›</span>{" "}
              Become a Coach
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-3">
              Become a <span className="text-gold">Coach</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Earn more, build trust, and get priority placement across HUXZAIN.
            </p>
          </div>
        </section>

        <section className="container-page py-10 grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 via-surface/30 to-background p-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center">
                  <Crown className="size-6 text-gold" />
                </div>
                <div>
                  <div className="font-semibold">Become a Verified Coach</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Unlock greater visibility, earn more students, and build trust.
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                {[
                  "Verified Coach Badge",
                  "Higher Search Ranking",
                  "More Students & Bookings",
                  "Homepage Feature",
                  "Better Trust & Credibility",
                  "Higher Earning Potential",
                ].map((x) => (
                  <div key={x} className="flex items-center gap-2">
                    <span className="size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center text-gold">
                      ✓
                    </span>
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <Section title="1. Basic Information">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Display Name *">
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your coach name" />
                </Field>
                <Field label="Profile Picture">
                  <label className="flex flex-col items-center justify-center w-full h-10 rounded-xl border border-dashed border-border/70 bg-background/30 cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload className="size-4 text-gold" /> Upload Image
                    </div>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadAvatar(f).catch((err: any) => toast.error(err.message));
                      }}
                    />
                  </label>
                </Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Country *">
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
                </Field>
                <Field label="Languages Spoken">
                  <Input
                    placeholder="Type a language and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLang((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  {languages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {languages.map((l) => (
                        <button
                          type="button"
                          key={l}
                          onClick={() => setLanguages((p) => p.filter((x) => x !== l))}
                          className="text-[11px] px-2 py-1 rounded-full border border-gold/20 bg-gold/10 text-gold hover:bg-gold/15"
                        >
                          {l} ×
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <Field label="Years of Experience">
                <Input value={years} onChange={(e) => setYears(e.target.value)} placeholder="3" />
              </Field>
            </Section>

            <Section title="2. Gaming Details">
              <div className="grid md:grid-cols-2 gap-4">
                <Select label="Primary Game *" value={primaryGame} onChange={setPrimaryGame} options={GAMES} />
                <Field label="Secondary Games">
                  <Input
                    placeholder="Comma separated (e.g. BGMI, CS2)"
                    value={secondaryGames.join(", ")}
                    onChange={(e) =>
                      setSecondaryGames(
                        e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Current Rank">
                  <Input value={currentRank} onChange={(e) => setCurrentRank(e.target.value)} placeholder="e.g. Diamond 2" />
                </Field>
                <Field label="Highest Rank Achieved *">
                  <Input value={highestRank} onChange={(e) => setHighestRank(e.target.value)} placeholder="e.g. Radiant" />
                </Field>
              </div>
              <Field label="Role / Specialization (Optional)">
                <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Duelist, IGL, Sniper" />
              </Field>
            </Section>

            <Section title="3. Coaching Details">
              <Field label="Coaching Categories *">
                <div className="grid sm:grid-cols-2 gap-2">
                  {COACHING_CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-2 hover:border-gold/35 transition-colors">
                      <Checkbox
                        checked={categories.includes(c)}
                        onCheckedChange={(v) =>
                          setCategories((prev) =>
                            v ? Array.from(new Set([...prev, c])) : prev.filter((x) => x !== c),
                          )
                        }
                      />
                      <span className="text-sm">{c}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Session Price (₹) *">
                  <Input value={sessionPrice} onChange={(e) => setSessionPrice(e.target.value)} placeholder="499" />
                </Field>
                <Field label="Session Duration Options *">
                  <div className="flex flex-wrap gap-2">
                    {SESSION_DURATIONS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() =>
                          setDurations((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                          )
                        }
                        className={`text-[11px] px-3 py-2 rounded-xl border transition-colors ${
                          durations.includes(d)
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-border bg-background/30 text-muted-foreground hover:text-foreground hover:border-gold/35"
                        }`}
                      >
                        {d} Min
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => toast.info("Custom duration can be requested by students during booking.")}
                      className="text-[11px] px-3 py-2 rounded-xl border border-border bg-background/30 text-muted-foreground hover:border-gold/35"
                    >
                      Custom
                    </button>
                  </div>
                </Field>
              </div>

              <Field label="Availability Schedule">
                <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Weeknights 7pm-11pm, weekends flexible" />
              </Field>
              <Field label="Short Introduction (max 250 chars)">
                <Textarea value={intro} onChange={(e) => setIntro(e.target.value.slice(0, 250))} placeholder="Tell students about your coaching style..." />
                <div className="text-[11px] text-muted-foreground mt-1 text-right">{intro.length}/250</div>
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Why Students Should Choose You (max 200 chars)">
                  <Textarea value={whyChoose} onChange={(e) => setWhyChoose(e.target.value.slice(0, 200))} placeholder="What makes your coaching unique?" />
                  <div className="text-[11px] text-muted-foreground mt-1 text-right">{whyChoose.length}/200</div>
                </Field>
                <Field label="Coaching Experience">
                  <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Describe your experience, students trained, results..." />
                </Field>
              </div>
            </Section>

            <Section title="4. Achievements & Proof">
              <div className="grid md:grid-cols-2 gap-4">
                <UploadBox
                  label="Highest Rank Screenshot *"
                  value={rankProofUrl}
                  onUpload={(f) => uploadProof(f, "rank")}
                />
                <UploadBox
                  label="Achievement Screenshot *"
                  value={achievementProofUrl}
                  onUpload={(f) => uploadProof(f, "achievement")}
                />
              </div>
              <UploadBox
                label="Tournament / Award Screenshot (Optional)"
                value={tournamentProofUrl}
                onUpload={(f) => uploadProof(f, "tournament")}
              />
              <Field label="Achievements & Accomplishments (max 500 chars)">
                <Textarea value={achievementsText} onChange={(e) => setAchievementsText(e.target.value.slice(0, 500))} placeholder="List your achievements, tournaments, awards, recognitions..." />
                <div className="text-[11px] text-muted-foreground mt-1 text-right">{achievementsText.length}/500</div>
              </Field>
            </Section>

            <Section title="5. Review & Submit">
              <label className="flex items-start gap-3 rounded-xl border border-border bg-background/30 p-4">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} />
                <div className="text-sm">
                  <div className="font-medium">
                    I agree to HUXZAIN’s Coach Agreement, Terms of Service and Privacy Policy.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Once submitted, your profile will be reviewed. You will be notified via email and notification.
                  </div>
                </div>
              </label>
              <button
                disabled={!canSubmit || saving}
                onClick={submit}
                className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Coach Application"}
              </button>
              {!isEmailVerified || !isPhoneVerified ? (
                <div className="text-xs text-amber-300 mt-2">
                  Please complete <b>Email OTP</b> and <b>Mobile OTP</b> verification before submitting.
                </div>
              ) : null}
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 h-fit lg:sticky lg:top-32">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-gold" />
                <div className="font-semibold">Why Become a Coach on HUXZAIN?</div>
              </div>
              <ul className="mt-3 text-xs text-muted-foreground space-y-2">
                <li>• Earn more: set your own prices and earn based on your expertise</li>
                <li>• Flexible schedule: coach when you want, from anywhere</li>
                <li>• Build your brand: grow reputation and become a top coach</li>
                <li>• Help players grow: make a real impact on players</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="font-semibold">Coach Profile Preview</div>
              <div className="mt-3 rounded-2xl border border-border bg-background/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl border border-border bg-surface/40 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full grid place-items-center text-xs font-bold text-gold">
                        {displayName ? displayName.slice(0, 2).toUpperCase() : "CO"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{displayName || "Your Name"}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {primaryGame} · {years ? `${years}+ years` : "New"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Students</span>
                  <span className="text-gold font-bold">—</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sessions</span>
                  <span className="text-gold font-bold">—</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="size-4 text-gold" />
                <div className="font-semibold">Verification Benefits</div>
              </div>
              <VerifyRow icon={Mail} label="Email Verified" ok={isEmailVerified} actionHref="/verify-email" />
              <div className="mt-2" />
              <VerifyRow icon={Phone} label="Phone Verified" ok={isPhoneVerified} actionHref="/account/verify-phone" search={{ redirect: "/become-coach" }} />
              <div className="mt-3 rounded-xl border border-border bg-background/30 p-3 text-[11px] text-muted-foreground">
                Email + phone verification is mandatory before your coach profile can go live.
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="font-semibold">How It Works</div>
              <ol className="mt-3 text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2"><span className="size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center text-gold text-[10px] font-bold">1</span> Submit application</li>
                <li className="flex gap-2"><span className="size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center text-gold text-[10px] font-bold">2</span> Review proofs</li>
                <li className="flex gap-2"><span className="size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center text-gold text-[10px] font-bold">3</span> Get approved</li>
                <li className="flex gap-2"><span className="size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center text-gold text-[10px] font-bold">4</span> Start coaching</li>
              </ol>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-6">
      <div className="font-semibold mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-2">{label}</div>
      {children}
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
    <Field label={label}>
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
    </Field>
  );
}

function UploadBox({
  label,
  value,
  onUpload,
}: {
  label: string;
  value: string;
  onUpload: (f: File) => Promise<void>;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-2">{label}</div>
      <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-border/70 rounded-xl cursor-pointer hover:bg-surface/20 transition-all">
        <Upload className="size-6 text-gold mb-2" />
        <div className="text-xs text-muted-foreground">Upload Image (JPG/PNG up to 10MB)</div>
        <input
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f).catch((err: any) => toast.error(err.message));
          }}
        />
      </label>
      {value && (
        <div className="mt-2 text-xs text-emerald-300 font-semibold">✓ Uploaded</div>
      )}
    </div>
  );
}

function VerifyRow({
  icon: Icon,
  label,
  ok,
  actionHref,
  search,
}: {
  icon: any;
  label: string;
  ok: boolean;
  actionHref?: string;
  search?: any;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-gold" />
        <span>{label}</span>
      </div>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
          <CheckCircle2 className="size-3.5" /> Verified
        </span>
      ) : actionHref ? (
        <Link to={actionHref} search={search} className="text-[11px] text-gold hover:underline font-semibold">
          Verify
        </Link>
      ) : (
        <span className="text-[11px] text-muted-foreground">Pending</span>
      )}
    </div>
  );
}
