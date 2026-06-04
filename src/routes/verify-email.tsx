import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { requestOtp, verifyOtpCode } from "@/lib/auth.functions";
import { toast } from "sonner";
import { Shield, Check, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): { email: string; intent?: string } => ({
    email: String(s.email ?? ""),
    intent: s.intent ? String(s.intent) : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify email — HUXZAIN" }] }),
  component: VerifyPage,
});

type AuthState = "idle" | "typing" | "verifying" | "success" | "error";

function VerifyPage() {
  const { email, intent } = Route.useSearch();
  const nav = useNavigate();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Count down resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleChange = (value: string, idx: number) => {
    // Keep only numbers
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (!cleanValue) {
      const newOtp = [...otp];
      newOtp[idx] = "";
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    // Take the last character typed
    newOtp[idx] = cleanValue.substring(cleanValue.length - 1);
    setOtp(newOtp);

    setAuthState("typing");

    // Auto focus next box
    if (idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (!otp[idx] && idx > 0) {
        const newOtp = [...otp];
        newOtp[idx - 1] = "";
        setOtp(newOtp);
        inputRefs.current[idx - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[idx] = "";
        setOtp(newOtp);
      }
      setAuthState("typing");
    } else if (e.key === "Enter" && otp.every((char) => char !== "")) {
      void triggerVerify(otp.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (pastedText.length >= 6) {
      const newOtp = pastedText.substring(0, 6).split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      void triggerVerify(pastedText.substring(0, 6));
    }
  };

  // Check if OTP is fully entered to trigger submit
  useEffect(() => {
    const fullCode = otp.join("");
    if (fullCode.length === 6 && authState !== "verifying" && authState !== "success") {
      void triggerVerify(fullCode);
    }
  }, [otp]);

  const triggerVerify = async (code: string) => {
    setAuthState("verifying");
    setErrorMessage(null);

    // Retrieve cached signup metadata if registering
    let signupMetadata;
    try {
      const signupMetaStr = sessionStorage.getItem("huxzain_signup_metadata");
      if (signupMetaStr) {
        signupMetadata = JSON.parse(signupMetaStr);
      }
    } catch (e) {
      console.warn("Failed to retrieve signup metadata from cache:", e);
    }

    try {
      console.log(`[OTP] Verifying code for: ${email}`);
      const result = await verifyOtpCode({
        data: {
          email,
          code,
          signupMetadata,
          redirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (result.success && result.actionLink) {
        setAuthState("success");
        toast.success("Identity verified successfully! Redirecting...");
        
        // Remove registration cache after success
        sessionStorage.removeItem("huxzain_signup_metadata");
        
        // Redirect browser to login callback URL
        setTimeout(() => {
          window.location.href = result.actionLink;
        }, 1200);
      }
    } catch (ex: any) {
      setAuthState("error");
      const errMsg = ex?.message || "Invalid verification code. Please try again.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
      // Clear inputs for re-entry
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);
    try {
      await requestOtp({ data: { email } });
      toast.success("A new verification code was sent to your email inbox.", { id: "resend-success" });
      setCooldown(60);
      setAuthState("idle");
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (e: any) {
      toast.error(e.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Ring Animation Variants
  const ringVariants: any = {
    idle: {
      rotate: 360,
      scale: [1, 1.04, 1],
      borderColor: "rgba(212, 175, 55, 0.4)",
      boxShadow: "0 0 15px rgba(212, 175, 55, 0.25)",
      transition: {
        rotate: { repeat: Infinity, ease: "linear", duration: 10 },
        scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
      },
    },
    typing: {
      rotate: 360,
      scale: 1.06,
      borderColor: "rgba(212, 175, 55, 0.8)",
      boxShadow: "0 0 25px rgba(212, 175, 55, 0.5)",
      transition: {
        rotate: { repeat: Infinity, ease: "linear", duration: 5 },
      },
    },
    verifying: {
      rotate: [0, 360],
      scale: [1.06, 0.98, 1.06],
      borderColor: "rgba(212, 175, 55, 1)",
      boxShadow: "0 0 35px rgba(212, 175, 55, 0.7)",
      borderStyle: "dashed",
      transition: {
        rotate: { repeat: Infinity, ease: "linear", duration: 1.8 },
        scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
      },
    },
    success: {
      scale: [1, 1.2, 1.05],
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      boxShadow: "0 0 45px rgba(16, 185, 129, 0.8)",
      transition: { duration: 0.5, ease: "easeOut" },
    },
    error: {
      x: [0, -10, 10, -10, 10, -8, 8, -5, 5, 0],
      borderColor: "rgb(239, 68, 68)",
      boxShadow: "0 0 30px rgba(239, 68, 68, 0.6)",
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        {/* Entry Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-lg rounded-3xl border border-gold/15 bg-surface/50 p-8 md:p-12 relative overflow-hidden backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Subtle gold aura background glow */}
          <div className="absolute -top-24 -left-24 size-48 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 size-48 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center">
            {/* Animated Verification Ring */}
            <div className="relative size-24 flex items-center justify-center mb-8">
              <motion.div
                variants={ringVariants}
                animate={authState}
                className="absolute inset-0 rounded-full border-2 border-dashed pointer-events-none"
              />
              <div className="relative z-10 flex items-center justify-center size-20 rounded-full bg-background/80 border border-gold/10">
                {authState === "verifying" && (
                  <Loader2 className="size-8 text-gold animate-spin" />
                )}
                {authState === "success" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Check className="size-9 text-emerald-400" />
                  </motion.div>
                )}
                {authState === "error" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <AlertCircle className="size-9 text-red-500" />
                  </motion.div>
                )}
                {(authState === "idle" || authState === "typing") && (
                  <Shield className="size-8 text-gold" />
                )}
              </div>
            </div>

            {/* Typography */}
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-wide text-foreground">
              Verify Your Email
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-sm leading-relaxed">
              We've sent a verification code to{" "}
              <span className="text-gold font-semibold break-all">{email}</span>.
              Enter the code below to continue.
            </p>

            {/* OTP Input Block */}
            <div className="mt-10 w-full">
              <div className="flex justify-center gap-2 md:gap-3">
                {otp.map((char, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative size-12 md:size-14"
                  >
                    <input
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={char}
                      onChange={(e) => handleChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onPaste={handlePaste}
                      className={`w-full h-full text-center text-xl md:text-2xl font-bold bg-[#101114]/80 border rounded-xl outline-none transition-all duration-200 ${
                        char
                          ? "border-gold text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                          : "border-border/80 text-foreground focus:border-gold/50 focus:shadow-[0_0_8px_rgba(212,175,55,0.1)]"
                      } ${authState === "error" ? "border-red-500 text-red-500" : ""}`}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Validation Feedback Message */}
              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-red-400 mt-4 font-medium flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="size-3.5" />
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cooldown Resend Area */}
            <div className="mt-10 pt-6 border-t border-border/40 w-full text-center text-xs">
              <p className="text-muted-foreground font-medium">
                Didn't receive the code?
              </p>
              
              <div className="mt-3 flex items-center justify-center">
                {cooldown > 0 ? (
                  <motion.span 
                    key={cooldown}
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-gold/60 font-semibold"
                  >
                    Resend available in {cooldown} seconds
                  </motion.span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-gold hover:text-gold/80 font-bold hover:underline transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? "Resending..." : "Resend Code"}
                  </button>
                )}
              </div>
            </div>

            {/* Cancel Button */}
            <div className="mt-6">
              <Link
                to="/login"
                className="text-xs text-muted-foreground hover:text-gold transition-colors font-medium hover:underline"
              >
                Back to Sign In
              </Link>
            </div>

          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
