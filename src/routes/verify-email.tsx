import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { sendVerificationEmail } from "../lib/email.functions";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): { email: string; intent?: string } => ({
    email: String(s.email ?? ""),
    intent: s.intent ? String(s.intent) : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify your email — HUXZAIN" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const auth = useAuth();
  const { email, intent } = Route.useSearch();
  const [msg, setMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      setMsg(null);
      const res = await sendVerificationEmail({ data: { email } });
      if (res && res.success) {
        setMsg("Verification email re-sent.");
        setCooldown(60);
      } else {
        setMsg(res?.error || "Failed to resend email.");
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-16 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We sent a verification link to{" "}
            <span className="text-gold">{email || "your inbox"}</span>. Click it to activate your
            account.
          </p>
          <button
            onClick={resend}
            disabled={cooldown > 0}
            className="mt-6 h-10 px-5 rounded-lg border border-border hover:border-gold/40 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
          </button>
          {msg && <div className="mt-3 text-xs text-gold">{msg}</div>}
          <div className="mt-6 text-xs">
            <Link
              to="/login"
              search={{ redirect: intent === "seller" ? "/seller" : "/dashboard" }}
              className="text-gold hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


