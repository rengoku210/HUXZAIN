import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AlertOctagon, HelpCircle, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/suspended")({
  head: () => ({ meta: [{ title: "Account Suspended — HUXZAIN" }] }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const auth = useAuth();

  const reason = auth.profile?.moderation_reason || "Policy Violation";
  const expiresAtStr = auth.profile?.restricted_until 
    ? new Date(auth.profile.restricted_until).toLocaleString() 
    : "30 Days";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 py-20">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-surface/30 backdrop-blur-md p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
          
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl animate-pulse" />
            <div className="relative size-20 rounded-full border border-red-500/30 bg-red-500/5 flex items-center justify-center">
              <AlertOctagon className="size-9 text-red-500 animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-foreground">Account Suspended</h1>
            <p className="text-sm text-muted-foreground">
              Your HUXZAIN account is temporarily restricted due to policy violations.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-5 text-left space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Reason</span>
              <span className="text-xs font-semibold text-foreground">{reason}</span>
            </div>
            <div className="border-t border-border/40 pt-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Suspension Ends</span>
              <span className="text-xs font-mono font-semibold text-amber-400">{expiresAtStr}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            During suspension, all trading, listing, withdrawals, messaging, and ordering features are blocked.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href="mailto:support@huxzain.shop"
              className="w-full h-11 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <HelpCircle className="size-4" /> Contact Support
            </a>
            <button
              onClick={() => auth.signOut()}
              className="w-full h-11 rounded-xl border border-border bg-surface hover:text-red-400 flex items-center justify-center gap-2 transition-all text-xs font-medium"
            >
              <LogOut className="size-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
