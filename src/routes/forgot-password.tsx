import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { Field } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — HUXZAIN" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await auth.sendPasswordReset(email);
      setSent(true);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-16 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8">
          <h1 className="font-display text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">We'll email you a secure reset link.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            {err && <div className="text-xs text-red-400">{err}</div>}
            {sent && (
              <div className="text-xs text-gold">
                If an account exists, a reset link has been sent.
              </div>
            )}
            <button
              disabled={busy}
              className="w-full h-11 rounded-lg bg-gold text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Sendingâ€¦" : "Send reset link"}
            </button>
          </form>
          <div className="mt-4 text-xs">
            <Link
              to="/login"
              search={{ redirect: "/dashboard" }}
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
