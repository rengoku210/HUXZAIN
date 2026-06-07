import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { PhoneVerificationModal } from "@/components/site/PhoneVerificationModal";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { GAMES, PLAY_STYLES } from "@/lib/buddy-coach";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  Lock,
  Mail,
  Phone,
  Shield,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// InputOTP is used inside PhoneVerificationModal; not needed directly here

export const Route = createFileRoute("/become-game-buddy")({
  head: () => ({ meta: [{ title: "Become a Game Buddy — HUXZAIN" }] }),
  component: Page,
});

type BuddyRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
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
  status: string;
  rejection_reason: string | null;
  email_verified: boolean;
  phone_verified: boolean;
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

  // form state
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [languages, setLanguages] = useState<string[]>([]);
  const [primaryGame, setPrimaryGame] = useState<string>("Valorant");
  const [additionalGames, setAdditionalGames] = useState<string[]>([]);
  const [playStyles, setPlayStyles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string>("");
  const [voiceChat, setVoiceChat] = useState<"yes" | "no">("yes");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [whyChoose, setWhyChoose] = useState("");
  const [agree, setAgree] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      isAuthenticated &&
      !!user &&
      !!displayName.trim() &&
      !!country.trim() &&
      !!primaryGame &&
      !!price &&
      agree &&
      isEmailVerified &&
      isPhoneVerified
    );
  }, [isAuthenticated, user, displayName, country, primaryGame, price, agree, isEmailVerified, isPhoneVerified]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    async function loadExisting() {
      if (!user) return;
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data } = await sb
        .from("game_buddies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const r = data as BuddyRow;
        setDisplayName(r.display_name ?? displayName);
        setAvatarUrl(r.avatar_url ?? "");
        setDob(r.date_of_birth ?? "");
        setCountry(r.country ?? country);
        setLanguages(r.languages ?? []);
        setPrimaryGame(r.primary_game ?? "Valorant");
        setAdditionalGames(r.additional_games ?? []);
        setPlayStyles(r.play_styles ?? []);
        setAvailability(r.availability ?? "");
        setVoiceChat(r.voice_chat ? "yes" : "no");
        setBio(r.bio ?? "");
        setPrice(r.price_per_hour_inr ? String(r.price_per_hour_inr) : "");
        setWhyChoose(r.why_choose ?? "");
      }
      setLoading(false);
    }
    void loadExisting();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to apply.");
      nav({ to: "/login", search: { redirect: "/become-game-buddy" } });
    }
  }, [isAuthenticated, nav]);

  async function uploadAvatar(file: File) {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) throw new Error("Backend not configured");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatars/game-buddy-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  }

  async function submit() {
    if (!user) return;
    if (!agree) return toast.error("Please accept the agreement to submit.");
    if (!isEmailVerified) return toast.error("Please verify your email first.");
    if (!isPhoneVerified) { setShowPhoneVerification(true); return; }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid hourly price.");
      return;
    }

    try {
      setSaving(true);
      const sb = getSupabase();
      if (!sb) throw new Error("Backend not configured");

      const payload: any = {
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl || null,
        date_of_birth: dob || null,
        country: country.trim(),
        languages,
        primary_game: primaryGame,
        additional_games: additionalGames,
        play_styles: playStyles,
        availability: availability.trim() || null,
        voice_chat: voiceChat === "yes",
        bio: bio.trim() || null,
        price_per_hour_inr: priceNum,
        why_choose: whyChoose.trim() || null,
        email_verified: isEmailVerified,
        phone_verified: isPhoneVerified,
        status: "pending_review",
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("game_buddies").upsert(payload, {
        onConflict: "user_id",
      });
      if (error) throw error;

      toast.success("Application submitted! Our team will review and publish your profile.");
      nav({ to: "/game-buddies" });
    } catch (e: any) {
      toast.error(`Submission failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const addLang = (v: string) => {
    const t = v.trim();
    if (!t) return;
    setLanguages((prev) => Array.from(new Set([...prev, t])));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative border-b border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.25),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(212,160,23,0.10),transparent_55%)]" />
          <div className="container-page relative py-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">
                  <Link to="/" className="hover:text-foreground">
                    Back to Home
                  </Link>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">
                  Become a{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-300">
                    Game Buddy
                  </span>
                </h1>
                <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                  Join thousands of gamers and start earning by playing your favorite games with others.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5">
                  <Gamepad2 className="size-4 text-purple-300" /> Play Your Way
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5">
                  <Shield className="size-4 text-gold" /> Earn Rewards
                </span>
                <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5">
                  <BadgeCheck className="size-4 text-emerald-300" /> Grow Reputation
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-10 grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            {/* Section 1 */}
            <Section title="1. Basic Information">
              <Field label="Display Name (Public Name) *">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your gaming name" />
                <div className="text-[11px] text-muted-foreground mt-1">This name will be visible to players.</div>
              </Field>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Date of Birth">
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </Field>
                <Field label="Country *">
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
                </Field>
              </div>

              <Field label="Profile Picture">
                <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-border/70 rounded-xl cursor-pointer hover:bg-surface/20 transition-all">
                  <Upload className="size-6 text-purple-300 mb-2" />
                  <div className="text-xs text-muted-foreground">
                    Upload Image (JPG/PNG up to 5MB)
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
                {avatarUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="size-12 rounded-xl border border-border bg-background/40 overflow-hidden">
                      <img src={avatarUrl} alt="" className="size-full object-cover" />
                    </div>
                    <div className="text-xs text-emerald-300 font-semibold">Profile picture uploaded</div>
                  </div>
                )}
              </Field>
            </Section>

            {/* Section 2 */}
            <Section title="2. About You">
              <Field label="Languages Spoken *">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add language (e.g. English)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLang((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addLang("English")}
                    className="h-10 px-4 rounded-xl border border-border bg-background/40 hover:border-gold/35 text-sm"
                  >
                    + English
                  </button>
                </div>
                {languages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {languages.map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setLanguages((prev) => prev.filter((x) => x !== l))}
                        className="text-[11px] px-2 py-1 rounded-full border border-purple-400/20 bg-purple-600/10 text-purple-200 hover:bg-purple-600/15"
                      >
                        {l} ×
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Short Introduction / Bio (max 250 chars)">
                <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 250))} placeholder="Tell players about you, your experience and playstyle..." />
                <div className="text-[11px] text-muted-foreground mt-1 text-right">{bio.length}/250</div>
              </Field>
            </Section>

            {/* Section 3 */}
            <Section title="3. Games & Play Style">
              <div className="grid md:grid-cols-2 gap-4">
                <Select label="Primary Game *" value={primaryGame} onChange={setPrimaryGame} options={GAMES} />
                <Field label="Additional Games">
                  <Input
                    placeholder="Comma separated (e.g. BGMI, CS2)"
                    value={additionalGames.join(", ")}
                    onChange={(e) =>
                      setAdditionalGames(
                        e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </Field>
              </div>

              <Field label="Play Style (Select all that apply) *">
                <div className="grid sm:grid-cols-2 gap-2">
                  {PLAY_STYLES.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-2 hover:border-gold/35 transition-colors"
                    >
                      <Checkbox
                        checked={playStyles.includes(s)}
                        onCheckedChange={(v) => {
                          setPlayStyles((prev) =>
                            v
                              ? Array.from(new Set([...prev, s]))
                              : prev.filter((x) => x !== s),
                          );
                        }}
                      />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </Section>

            {/* Section 4 */}
            <Section title="4. Availability & Preferences">
              <Field label="Availability Schedule">
                <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Weeknights 8pm-12am, Weekends flexible" />
              </Field>

              <Field label="Voice Chat Available">
                <RadioGroup value={voiceChat} onValueChange={(v) => setVoiceChat(v as any)} className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes, I use voice chat
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No, I prefer text chat
                  </label>
                </RadioGroup>
              </Field>
            </Section>

            {/* Section 5 */}
            <Section title="5. Pricing & Experience">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Session Price Per Hour (₹) *">
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="149" />
                </Field>
                <Field label="Why Players Should Choose You (max 200 chars)">
                  <Input value={whyChoose} onChange={(e) => setWhyChoose(e.target.value.slice(0, 200))} placeholder="What makes you different?" />
                  <div className="text-[11px] text-muted-foreground mt-1 text-right">{whyChoose.length}/200</div>
                </Field>
              </div>

              <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center">
                    <Shield className="size-5 text-gold" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">Important Notice</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      You must not impersonate another individual, streamer, creator, public figure, or coach. False representation may result in account suspension.
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border bg-background/30 p-4">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} />
                <div className="text-sm">
                  <div className="font-medium">
                    I confirm all information is true and I will not impersonate anyone.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Once submitted, your profile will be reviewed and published.
                  </div>
                </div>
              </label>

              <button
                disabled={!canSubmit || saving}
                onClick={submit}
                className="w-full h-11 rounded-xl bg-purple-600 text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Application"}
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
              <div className="font-semibold">Start Simple, Grow Big</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                You can become a Game Buddy with just email and phone verification. Full verification is only required when you withdraw your earnings.
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <VerifyRow icon={Mail} label="Email Verified" ok={isEmailVerified} actionHref="/verify-email" />
                <VerifyRow icon={Phone} label="Phone Verified" ok={isPhoneVerified} />
              </div>
            </div>

            {/* Phone Verification */}
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="size-4 text-gold" />
                <div className="font-semibold">Mobile OTP Verification</div>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {isPhoneVerified
                  ? "Your phone number is verified."
                  : "Phone verification is required to submit your application."}
              </div>
              <VerifyRow icon={Phone} label="Phone Verified" ok={isPhoneVerified} actionHref="/account/verify-phone" />
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="font-semibold">Benefits of Being a Game Buddy</div>
              <ul className="mt-3 text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center">
                    ₹
                  </span>
                  Earn money by playing games
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center">
                    ⏱
                  </span>
                  Flexible schedule — play when you want
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center">
                    ★
                  </span>
                  Build reputation with reviews and trust
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-5 rounded-full bg-gold/10 border border-gold/20 grid place-items-center">
                    ✅
                  </span>
                  Verified badge unlocks more sessions
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="size-4 text-gold" />
                <div className="font-semibold">Secure & Trusted Platform</div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Your information is encrypted and protected</li>
                <li>• All payments are secure and protected</li>
                <li>• We never share your data with anyone</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
      {showPhoneVerification && (
        <PhoneVerificationModal
          isOpen={showPhoneVerification}
          onClose={() => setShowPhoneVerification(false)}
          onSuccess={() => {
            setShowPhoneVerification(false);
            submit();
          }}
        />
      )}
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

function VerifyRow({
  icon: Icon,
  label,
  ok,
  actionHref,
}: {
  icon: any;
  label: string;
  ok: boolean;
  actionHref?: string;
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
        <Link to={actionHref} className="text-[11px] text-gold hover:underline font-semibold">
          Verify
        </Link>
      ) : (
        <span className="text-[11px] text-muted-foreground">Pending</span>
      )}
    </div>
  );
}
