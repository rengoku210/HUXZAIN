import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { verifyPhoneOtpFn } from "@/lib/sms/phone-verification.functions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Shield,
  Phone,
  Sparkles,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Search,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

// ── Country Data ─────────────────────────────────────────────────────────────
interface Country {
  name: string;
  code: string;   // ISO 3166-1 alpha-2
  dialCode: string;
  flag: string;   // emoji
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
  { name: "Argentina", code: "AR", dialCode: "+54", flag: "🇦🇷" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬" },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
  { name: "Israel", code: "IL", dialCode: "+972", flag: "🇮🇱" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭" },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "Myanmar", code: "MM", dialCode: "+95", flag: "🇲🇲" },
  { name: "Ghana", code: "GH", dialCode: "+233", flag: "🇬🇭" },
  { name: "Ethiopia", code: "ET", dialCode: "+251", flag: "🇪🇹" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", flag: "🇹🇿" },
  { name: "Uganda", code: "UG", dialCode: "+256", flag: "🇺🇬" },
  { name: "Zimbabwe", code: "ZW", dialCode: "+263", flag: "🇿🇼" },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pre-fill phone from profile */
  initialPhone?: string;
}

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

  // close on outside click
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
        className="h-12 px-3 rounded-l-xl border border-r-0 border-border/80 bg-surface/50 flex items-center gap-1.5 hover:border-gold/50 focus:border-gold/50 transition-all outline-none whitespace-nowrap"
      >
        <span className="text-xl leading-none">{selected.flag}</span>
        <span className="text-sm font-semibold text-foreground">{selected.dialCode}</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-2xl border border-border/80 bg-background/98 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search */}
          <div className="p-2 border-b border-border/50">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/60 border border-border/60">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground outline-none"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No country found</div>
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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface/60 transition-colors ${
                    selected.code === c.code ? "bg-gold/10 text-gold" : "text-foreground"
                  }`}
                >
                  <span className="text-base leading-none shrink-0">{c.flag}</span>
                  <span className="text-xs font-medium truncate flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OTP Digit with animation ─────────────────────────────────────────────────
// (uses the existing InputOTP from shadcn, just with premium styling applied)

// ── Main Modal ───────────────────────────────────────────────────────────────
export function PhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  initialPhone,
}: PhoneVerificationModalProps) {
  const { user, refreshUserMeta } = useAuth();

  const defaultCountry = COUNTRIES.find((c) => c.code === "IN")!;
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [localNumber, setLocalNumber] = useState(""); // without dial code
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=phone, 2=otp, 3=success
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Resend countdown
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resendCount = useRef(0);

  // Pre-fill from profile
  useEffect(() => {
    if (initialPhone && initialPhone.length > 2) {
      // Try to detect country from dial code
      const match = COUNTRIES.find((c) => initialPhone.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        setLocalNumber(initialPhone.slice(match.dialCode.length));
      } else {
        setLocalNumber(initialPhone.replace(/^\+\d{1,3}/, ""));
      }
    }
  }, [initialPhone]);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setOtp("");
      setCooldown(0);
      resendCount.current = 0;
    }
  }, [isOpen]);

  // Inject MSG91 Widget Script
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
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
      console.log("Final window.configuration object inside Modal:", { ...config, tokenAuth: "HIDDEN_BUT_EXISTS" });

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
      } else {
        if (typeof (window as any).initSendOTP === "function") {
          (window as any).initSendOTP(config);
        }
      }
    }
  }, [isOpen]);

  const fullPhone = `${selectedCountry.dialCode}${localNumber.replace(/\s/g, "")}`;

  const triggerOtpSend = useCallback(async () => {
    const trimmedNumber = localNumber.replace(/\s/g, "").replace(/^0+/, "");
    if (!trimmedNumber) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (!user) {
      toast.error("You must be signed in to verify your phone number.");
      return;
    }

    // Use full phone without '+' sign for MSG91 widget
    const phoneWithoutPlus = `${selectedCountry.dialCode.replace("+", "")}${trimmedNumber}`;
    if (phoneWithoutPlus.length < 8 || phoneWithoutPlus.length > 16) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    console.log("[PhoneVerificationModal] Sending OTP to:", phoneWithoutPlus);
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

    console.log("Executing window.sendOtp in modal with phone:", phoneWithoutPlus);

    (window as any).sendOtp(
      phoneWithoutPlus,
      (data: any) => {
        console.log("OTP Sent Successfully inside Modal", data);
        resendCount.current += 1;
        setStep(2);
        setCooldown(30);
        toast.success(`Verification code sent to +${phoneWithoutPlus}`);
        
        if (data.reqId) {
          localStorage.setItem("msg91_req_id", data.reqId);
        }
        setSending(false);
      },
      (error: any) => {
        console.error("[PhoneVerificationModal] Send OTP error:", error);
        toast.error(error.message || "Failed to send verification code.");
        setSending(false);
      }
    );
  }, [localNumber, selectedCountry, user]);

  const triggerOtpVerify = useCallback(async () => {
    if (!otp || otp.length < 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    if (!user) return;

    const trimmedNumber = localNumber.replace(/\s/g, "").replace(/^0+/, "");
    const phone = `${selectedCountry.dialCode}${trimmedNumber}`;

    console.log("[PhoneVerificationModal] Verifying OTP via MSG91 Widget...");
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
          const res = await verifyPhoneOtpFn({
            data: { accessToken, phone, userId: user.id },
          });

          console.log("[PhoneVerificationModal] verifyPhoneOtpFn response:", res);

          if (res?.success) {
            await refreshUserMeta();
            setStep(3);
            toast.success("Phone number verified successfully! ✓");
            setTimeout(() => {
              if (onSuccess) onSuccess();
              onClose();
            }, 1800);
          }
        } catch (err: any) {
          console.error("[PhoneVerificationModal] Error verifying OTP:", err);
          const msg = err?.message || "Invalid or expired verification code.";
          toast.error(msg);
          setOtp("");
        } finally {
          setVerifying(false);
        }
      },
      (error: any) => {
        console.error("[PhoneVerificationModal] Verify OTP Widget error:", error);
        toast.error(error.message || "Invalid OTP");
        setOtp("");
        setVerifying(false);
      },
      localStorage.getItem("msg91_req_id")
    );
  }, [otp, localNumber, selectedCountry, user, refreshUserMeta, onSuccess, onClose]);

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
        console.log("OTP Resent in Modal", data);
        setCooldown(30);
        toast.success("Verification code resent.");
        setSending(false);
      },
      (error: any) => {
        console.error("[PhoneVerificationModal] Resend OTP error:", error);
        toast.error(error.message || "Failed to resend OTP");
        setSending(false);
      },
      localStorage.getItem("msg91_req_id")
    );
  }, []);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === 2 && !verifying) {
      triggerOtpVerify();
    }
  }, [otp]);

  const handleReset = () => {
    setStep(1);
    setOtp("");
    setCooldown(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border border-gold/30 bg-background/95 backdrop-blur-md text-white shadow-2xl p-0 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Gold accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="p-6">
          <DialogHeader className="space-y-3 items-center text-center mb-6">
            <div className="relative size-16 mx-auto mt-2 flex items-center justify-center rounded-2xl border border-gold/35 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              {step === 3 ? (
                <CheckCircle2 className="size-8 text-emerald-400" />
              ) : step === 2 ? (
                <Shield className="size-8 text-gold" />
              ) : (
                <Phone className="size-8 text-gold animate-pulse" />
              )}
              <Sparkles className="absolute -top-1.5 -right-1.5 size-4 text-gold" />
            </div>

            <DialogTitle className="font-display text-2xl font-bold tracking-tight">
              {step === 3
                ? "Phone Verified!"
                : step === 2
                ? "Enter Verification Code"
                : "Verify Phone Number"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {step === 3
                ? "Your phone number has been verified successfully."
                : step === 2
                ? `A 6-digit code was sent to ${selectedCountry.dialCode} ${localNumber}. Enter it below.`
                : "Enter your mobile number to receive a one-time verification code via SMS."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: Phone Entry ── */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mobile Number
                </label>
                <div className="flex rounded-xl overflow-hidden border border-border/80 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/30 transition-all">
                  <CountrySelector
                    selected={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                  <input
                    type="tel"
                    value={localNumber}
                    onChange={(e) =>
                      setLocalNumber(e.target.value.replace(/[^\d\s\-()]/g, ""))
                    }
                    placeholder="9876543210"
                    className="flex-1 h-12 px-4 bg-surface/50 text-white placeholder-muted-foreground outline-none font-medium text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sending && localNumber.trim()) {
                        triggerOtpSend();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Full number: {selectedCountry.dialCode}{localNumber || "XXXXXXXXXX"}
                </p>
              </div>

              <button
                type="button"
                disabled={sending || !localNumber.trim()}
                onClick={triggerOtpSend}
                className="w-full h-12 rounded-xl bg-gold text-primary-foreground font-bold text-sm tracking-wide hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-muted-foreground">
                Your number is only used for verification and will not be shared.
              </p>
            </div>
          )}

          {/* ── Step 2: OTP Entry ── */}
          {step === 2 && (
            <div className="space-y-5 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Digit boxes */}
              <div className="space-y-2 w-full flex flex-col items-center">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative w-full flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={verifying}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-2 justify-center">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-12 rounded-xl border border-border/80 bg-surface/50 text-white font-bold text-xl text-center focus:border-gold/60 focus:ring-2 focus:ring-gold/30 data-[active=true]:border-gold data-[active=true]:ring-2 data-[active=true]:ring-gold/40 transition-all"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {verifying && (
                  <div className="flex items-center gap-2 text-xs text-gold animate-pulse">
                    <Loader2 className="size-3.5 animate-spin" />
                    Verifying code...
                  </div>
                )}
              </div>

              <div className="w-full space-y-3">
                <button
                  type="button"
                  disabled={verifying || otp.length < 6}
                  onClick={triggerOtpVerify}
                  className="w-full h-12 rounded-xl bg-gold text-primary-foreground font-bold text-sm tracking-wide hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <Shield className="size-4" />
                      Verify & Confirm
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="hover:text-gold transition-colors font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Change Number
                  </button>

                  <div>
                    {cooldown > 0 ? (
                      <span>
                        Resend in{" "}
                        <strong className="text-gold tabular-nums">{cooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={sending}
                        className="text-gold hover:underline font-bold transition-colors disabled:opacity-50"
                      >
                        {sending ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" /> Sending...
                          </span>
                        ) : (
                          "Resend Code"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Code expires in 5 minutes. Check spam/SMS inbox if not received.
              </p>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div className="flex flex-col items-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="size-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="size-10 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm font-semibold text-emerald-400">Verification Complete</div>
                <div className="text-xs text-muted-foreground">
                  {selectedCountry.dialCode} {localNumber} is now linked to your account.
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
