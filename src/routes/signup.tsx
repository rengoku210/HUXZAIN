import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { Field } from "./login";
import { requestOtp } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { intent?: string } => ({
    intent: s.intent ? String(s.intent) : undefined,
  }),
  head: () => ({ meta: [{ title: "Create account — HUXZAIN" }] }),
  component: SignupPage,
});

function SignupPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const { intent } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // prevent double-submit
    setErr(null);

    // Client-side validation
    if (!name.trim()) {
      setErr("Display name is required.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      console.log(`[Signup] Requesting OTP code for signup: ${email}...`);
      
      // Cache display name, password, and intent to register them securely after OTP verification
      sessionStorage.setItem(
        "huxzain_signup_metadata", 
        JSON.stringify({ name: name.trim(), password, intent })
      );

      await requestOtp({ data: { email } });
      console.log(`[Signup] OTP sent successfully.`);
      
      toast.success("Verification code sent successfully. Check your email inbox.", { id: "signup-otp-success" });
      setDone(true);
      setTimeout(() => nav({ to: "/verify-email", search: { email, intent } }), 500);
    } catch (ex: any) {
      console.error("[Signup] Exception during OTP request:", ex);
      setErr(ex.message || "Failed to request verification code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-16 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8">
          <h1 className="font-display text-2xl font-bold">
            {intent === "seller" ? "Create your seller account" : "Create your HUXZAIN account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {intent === "seller"
              ? "Join thousands of verified sellers on the marketplace."
              : "Join the marketplace as a buyer. Upgrade to seller anytime."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Display name" value={name} onChange={setName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
            {err && <div className="text-xs text-red-400">{err}</div>}
            {done && (
              <div className="text-xs text-gold">Check your inbox to verify your email.</div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-gold text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              search={{ redirect: "/dashboard" }}
              className="text-gold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
