import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) ?? "/dashboard" }),
  head: () => ({ meta: [{ title: "Sign in — HUXZAIN" }] }),
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await auth.signInWithPassword(email, password);
      nav({ to: redirect });
    } catch (ex) { setErr((ex as Error).message); } finally { setBusy(false); }
  };

  const oauth = async (p: "google" | "apple") => {
    setErr(null);
    try { await auth.signInWithOAuth(p); } catch (ex) { setErr((ex as Error).message); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-16 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8">
          <h1 className="font-display text-2xl font-bold">Sign in to HUXZAIN</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Continue to your dashboard.</p>

          {!auth.configured && (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
              Auth backend not configured. Add <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code> to enable sign in.
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
            {err && <div className="text-xs text-red-400">{err}</div>}
            <button disabled={busy} className="w-full h-11 rounded-lg bg-gold text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-gold">Forgot password?</Link>
            <Link to="/signup" className="text-gold hover:underline">Create account</Link>
          </div>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => oauth("google")} className="h-10 rounded-lg border border-border text-sm hover:border-gold/40">Google</button>
            <button onClick={() => oauth("apple")} className="h-10 rounded-lg border border-border text-sm hover:border-gold/40">Apple</button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted-foreground mb-1.5">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        required={props.required}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
      />
    </label>
  );
}
