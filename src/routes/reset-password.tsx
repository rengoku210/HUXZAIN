import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { Field } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — HUXZAIN" }] }),
  component: ResetPage,
});

function ResetPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await auth.updatePassword(password);
      nav({ to: "/dashboard" });
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
          <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
            {err && <div className="text-xs text-red-400">{err}</div>}
            <button
              disabled={busy}
              className="w-full h-11 rounded-lg bg-gold text-primary-foreground font-semibold text-sm hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
