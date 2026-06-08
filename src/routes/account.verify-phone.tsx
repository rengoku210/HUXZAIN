// src/routes/account.verify-phone.tsx — Dedicated Mobile Number Verification Page
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { verifyPhoneOtpFn } from "@/lib/sms/phone-verification.functions";
import { toast } from "sonner";
import {
  Phone,
  Shield,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/account/verify-phone")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: s.redirect ? String(s.redirect) : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify Mobile Number — HUXZAIN" }] }),
  component: VerifyPhonePage,
});

// ── Country Data ─────────────────────────────────────────────────────────────
interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰" },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭" },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳" },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭" },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺" },
  { name: "Israel", code: "IL", dialCode: "+972", flag: "🇮🇱" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "Myanmar", code: "MM", dialCode: "+95", flag: "🇲🇲" },
  { name: "Ghana", code: "GH", dialCode: "+233", flag: "🇬🇭" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", flag: "🇹🇿" },
];

// ── Country Selector ─────────────────────────────────────────────────────────
function CountrySelector({
  selected,
  onSelect,
}: {
  selected: Country;
  onSelect: (c: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.dialCode.includes(query)
      )
    : COUNTRIES;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-14 px-4 rounded-l-2xl border border-r-0 border-border/80 bg-surface/40 flex items-center gap-2 hover:border-gold/50 focus:border-gold/50 transition-all outline-none whitespace-nowrap"
      >
        <span className="text-2xl leading-none">{selected.flag}</span>
        <span className="text-sm font-bold text-foreground">{selected.dialCode}</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80 rounded-2xl border border-border/80 bg-background/98 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-border/50">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface/60 border border-border/60">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or dial code..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No country found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/60 transition-colors ${
                    selected.code === c.code ? "bg-gold/10 text-gold" : "text-foreground"
                  }`}
                >
                  <span className="text-xl leading-none shrink-0">{c.flag}</span>
                  <span className="text-sm font-medium flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function VerifyPhonePage() {
  const { user, profile, ready, isAuthenticated, refreshUserMeta } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const defaultCountry = COUNTRIES.find((c) => c.code === "IN")!;
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [localNumber, setLocalNumber] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auth guard
  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/account/verify-phone" } });
    }
  }, [ready, isAuthenticated, navigate]);

  // Redirect if already verified
  useEffect(() => {
    if (ready && profile?.phone_verified) {
      setStep(3);
      if (profile.phone) {
        const match = COUNTRIES.find((c) => profile.phone!.startsWith(c.dialCode));
        if (match) {
          setSelectedCountry(match);
          setLocalNumber(profile.phone!.slice(match.dialCode.length));
        }
      }
    }
  }, [ready, profile]);

  // Pre-fill from profile phone
  useEffect(() => {
    if (profile?.phone && !profile.phone_verified) {
      const match = COUNTRIES.find((c) => profile.phone!.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        setLocalNumber(profile.phone!.slice(match.dialCode.length));
      }
    }
  }, [profile]);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  // Inject MSG91 Widget Script
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawWidgetId = import.meta.env.VITE_MSG91_WIDGET_ID || "";
      const rawToken = import.meta.env.VITE_MSG91_WIDGET_TOKEN || "";
      const widgetId = (rawWidgetId || "").trim().replace(/['"]/g, '');
      const tokenAuth = (rawToken || "").trim().replace(/['"]/g, '');
      console.log("Widget ID:", widgetId);
      console.log("TokenAuth Length:", tokenAuth?.length);

      const config = {
        widgetId,
        tokenAuth,
        exposeMethods: true,
        success: (data: any) => {
          console.log("MSG91 Success callback:", data);
        },
        failure: (error: any) => {
          console.log("MSG91 Failure callback:", error);
        }
      };
      
      (window as any).configuration = config;
      console.log("6. Final window.configuration object:", { ...config, tokenAuth: "HIDDEN_BUT_EXISTS" });

      // Don't inject multiple times
      if (!document.getElementById("msg91-widget-script")) {
        const script = document.createElement("script");
        script.id = "msg91-widget-script";
        script.type = "text/javascript";
        script.src = "https://verify.msg91.com/otp-provider.js";
        script.onload = () => {
          if (typeof (window as any).initSendOTP === "function") {
            (window as any).initSendOTP(config);
          }
        };
        document.head.appendChild(script);
      }
    }
  }, []);

  const fullPhone = `${selectedCountry.dialCode}${localNumber.replace(/\s/g, "")}`;

  const handleSendOtp = useCallback(async () => {
    const trimmed = localNumber.replace(/\s/g, "").replace(/^0+/, "");
    if (!trimmed) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (!user) return;

    // Use full phone without '+' sign for MSG91 widget
    const phoneWithoutPlus = `${selectedCountry.dialCode.replace("+", "")}${trimmed}`;
    if (phoneWithoutPlus.length < 8 || phoneWithoutPlus.length > 16) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    console.log("[VerifyPhone] Sending OTP via MSG91 Widget to:", phoneWithoutPlus);
    setSending(true);

    if (typeof (window as any).sendOtp !== "function") {
      toast.error("OTP Service is still loading. Please wait a moment.");
      setSending(false);
      return;
    }

    const config = (window as any).configuration || {};
    const widgetId = config.widgetId;
    const tokenAuth = config.tokenAuth;
    console.log("Widget ID:", widgetId);
    console.log("TokenAuth Length:", tokenAuth?.length);

    console.log("4. Executing window.sendOtp with phone:", phoneWithoutPlus);
    console.log("5. Current window.configuration:", { ...(window as any).configuration, tokenAuth: "HIDDEN" });

    (window as any).sendOtp(
      phoneWithoutPlus,
      (data: any) => {
        console.log("6. OTP Sent Successfully", data);
        setStep(2);
        setCooldown(30);
        toast.success(`Verification code sent to +${phoneWithoutPlus}`);
        
        if (data.reqId) {
          localStorage.setItem("msg91_req_id", data.reqId);
        }
        setSending(false);
      },
      (error: any) => {
        console.error("[VerifyPhone] Send OTP error:", error);
        toast.error(error.message || "Failed to send verification code.");
        setSending(false);
      }
    );
  }, [localNumber, selectedCountry, user]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length < 6) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }
    if (!user) return;

    const trimmed = localNumber.replace(/\s/g, "").replace(/^0+/, "");
    const phone = `${selectedCountry.dialCode}${trimmed}`;

    console.log("[VerifyPhone] Verifying OTP via MSG91 Widget...");
    setVerifying(true);

    if (typeof (window as any).verifyOtp !== "function") {
      toast.error("OTP Service is not available.");
      setVerifying(false);
      return;
    }

    (window as any).verifyOtp(
      otp,
      async (data: any) => {
        console.log("MSG91 verify response:", data);
        console.log("Extracted access token:", data.message);
        console.log("Access token length:", data.message?.length);
        const accessToken = data.message;
        
        try {
          // Send access token to backend for final secure verification
          const res = await verifyPhoneOtpFn({ data: { accessToken, phone, userId: user.id } });
          if (res?.success) {
            await refreshUserMeta();
            setStep(3);
            toast.success("Phone number verified! ✓");
          }
        } catch (err: any) {
          console.error("[VerifyPhone] Backend verify error:", err);
          toast.error(err?.message || "Failed to secure verification status.");
          setOtp("");
        } finally {
          setVerifying(false);
        }
      },
      (error: any) => {
        console.error("[VerifyPhone] Verify OTP Widget error:", error);
        toast.error(error.message || "Invalid OTP");
        setOtp("");
        setVerifying(false);
      },
      localStorage.getItem("msg91_req_id")
    );
  }, [otp, localNumber, selectedCountry, user, refreshUserMeta]);

  const handleResendOtp = useCallback(() => {
    setSending(true);
    if (typeof (window as any).retryOtp !== "function") {
      toast.error("OTP Service is not available.");
      setSending(false);
      return;
    }
    
    (window as any).retryOtp(
      null,
      (data: any) => {
        console.log("OTP Resent", data);
        setCooldown(30);
        toast.success("Verification code resent.");
        setSending(false);
      },
      (error: any) => {
        console.error("[VerifyPhone] Resend OTP error:", error);
        toast.error(error.message || "Failed to resend OTP");
        setSending(false);
      },
      localStorage.getItem("msg91_req_id")
    );
  }, []);

  // Auto verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === 2 && !verifying) {
      handleVerifyOtp();
    }
  }, [otp]);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 text-gold animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-page py-10 max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>›</span>
          <Link to="/account" className="hover:text-foreground transition-colors">Account</Link>
          <span>›</span>
          <span className="text-foreground">Verify Mobile Number</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center">
              <Phone className="size-6 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Mobile Number Verification</h1>
              <p className="text-sm text-muted-foreground">
                Required to become a Seller, Coach, or Game Buddy
              </p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { n: 1, label: "Enter Number" },
              { n: 2, label: "Verify OTP" },
              { n: 3, label: "Verified" },
            ].map((s, idx) => (
              <div key={s.n} className="flex items-center gap-2">
                {idx > 0 && (
                  <div
                    className={`h-[2px] w-10 rounded transition-colors ${
                      step > idx ? "bg-gold" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    step === s.n
                      ? "bg-gold text-black"
                      : step > s.n
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-surface/40 text-muted-foreground border border-border"
                  }`}
                >
                  {step > s.n ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <span>{s.n}</span>
                  )}
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 1: Phone Entry ── */}
        {step === 1 && (
          <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/5 via-surface/30 to-background p-8 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Glowing accent */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-gold/10 via-transparent to-gold/10 blur-xl pointer-events-none opacity-50" />
            <div className="relative space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Enter Your Mobile Number</h2>
                <p className="text-sm text-muted-foreground">
                  Select your country code and enter your mobile number. We'll send a 6-digit OTP via SMS.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mobile Number
                </label>
                <div className="flex rounded-2xl overflow-visible border border-border/80 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20 transition-all bg-surface/30 relative">
                  <CountrySelector selected={selectedCountry} onSelect={setSelectedCountry} />
                  <input
                    type="tel"
                    value={localNumber}
                    onChange={(e) =>
                      setLocalNumber(e.target.value.replace(/[^\d\s\-()]/g, ""))
                    }
                    placeholder="9876543210"
                    className="flex-1 h-14 px-4 bg-transparent text-white placeholder-muted-foreground outline-none font-medium"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sending && localNumber.trim()) {
                        handleSendOtp();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Full number: <span className="text-gold font-mono">{fullPhone || `${selectedCountry.dialCode}XXXXXXXXXX`}</span>
                </p>
              </div>

              <button
                type="button"
                disabled={sending || !localNumber.trim()}
                onClick={handleSendOtp}
                className="w-full h-14 rounded-2xl bg-gold text-primary-foreground font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base shadow-lg shadow-gold/20"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Sending verification code...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    Send OTP Code
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground">
                Your number is used only for verification and is never shared.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: OTP Entry ── */}
        {step === 2 && (
          <div className="rounded-3xl border border-border/60 bg-surface/30 p-8 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-1">Enter Verification Code</h2>
              <p className="text-sm text-muted-foreground">
                A 6-digit code was sent to{" "}
                <span className="text-gold font-semibold font-mono">{fullPhone}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifying}
                autoFocus
              >
                <InputOTPGroup className="gap-3 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-14 rounded-2xl border-2 border-border/80 bg-surface/50 text-white font-bold text-2xl text-center focus:border-gold/80 focus:ring-2 focus:ring-gold/30 data-[active=true]:border-gold data-[active=true]:ring-2 data-[active=true]:ring-gold/40 transition-all shadow-sm"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {verifying && (
                <div className="flex items-center gap-2 text-sm text-gold animate-pulse">
                  <Loader2 className="size-4 animate-spin" />
                  Verifying your code...
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={verifying || otp.length < 6}
                onClick={handleVerifyOtp}
                className="w-full h-14 rounded-2xl bg-gold text-primary-foreground font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
              >
                {verifying ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="size-5" />
                    Verify & Confirm Number
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(""); setCooldown(0); }}
                  className="flex items-center gap-1.5 hover:text-gold transition-colors"
                >
                  <RotateCcw className="size-3.5" /> Change number
                </button>

                <div>
                  {cooldown > 0 ? (
                    <span>
                      Resend in <strong className="text-gold tabular-nums">{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={sending}
                      className="text-gold hover:underline font-bold disabled:opacity-50"
                    >
                      {sending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin" /> Sending...
                        </span>
                      ) : (
                        "Resend OTP"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Code expires in 5 minutes. Didn't get it? Check spam or try resend.
            </p>
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === 3 && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative size-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative size-24 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-12 text-emerald-400" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4">
                <CheckCircle2 className="size-3.5" /> Phone Verified
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">
                Mobile Number Verified!
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your phone number{" "}
                <span className="text-gold font-semibold font-mono">{fullPhone}</span> has been verified
                successfully. You can now apply as a Seller, Coach, or Game Buddy.
              </p>
            </div>

            {/* Checklist update preview */}
            <div className="rounded-2xl border border-border bg-surface/30 p-4 text-left space-y-3 max-w-xs mx-auto">
              {[
                { label: "Email Address", verified: !!(profile?.email_verified || user?.email_confirmed_at) },
                { label: "Mobile Number", verified: true },
                { label: "Government ID", verified: false, note: "For withdrawals" },
                { label: "Address Proof", verified: false, note: "For withdrawals" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.verified ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="size-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.note || "Pending"}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                to="/dashboard"
                className="h-12 px-6 rounded-xl border border-border text-sm font-semibold hover:border-gold/40 transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="size-4" /> Go to Dashboard
              </Link>
              {redirect ? (
                <Link
                  to={redirect}
                  className="h-12 px-6 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="size-4" /> Return to Application
                </Link>
              ) : (
                <Link
                  to="/become-coach"
                  className="h-12 px-6 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="size-4" /> Become a Coach
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Info cards */}
        {step !== 3 && (
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              { icon: "🔐", title: "Secure OTP", desc: "One-time code expires in 5 minutes." },
              { icon: "📱", title: "SMS Delivery", desc: "Delivered via SMS to your mobile." },
              { icon: "✅", title: "Instant Unlock", desc: "Coach & Game Buddy access granted immediately." },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-border bg-surface/30 p-4">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-xs font-semibold mb-1">{card.title}</div>
                <div className="text-xs text-muted-foreground">{card.desc}</div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
