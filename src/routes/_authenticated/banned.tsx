import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { createAppeal } from "@/lib/admin/moderation.functions";
import { ShieldAlert, Send, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banned")({
  head: () => ({ meta: [{ title: "Account Permanently Restricted — HUXZAIN" }] }),
  component: BannedPage,
});

function BannedPage() {
  const auth = useAuth();
  const [appealReason, setAppealReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reason = auth.profile?.moderation_reason || "Violation of Terms of Service";

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      toast.error("Please explain why you believe the ban is incorrect.");
      return;
    }

    if (!auth.user?.id) return;

    setSubmitting(true);
    try {
      await createAppeal({
        data: {
          user_id: auth.user.id,
          reason: "Ban Appeal",
          additional_info: appealReason.trim(),
        },
      });
      setSubmitted(true);
      toast.success("Appeal submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit appeal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 py-20">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-surface/30 backdrop-blur-md p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />

          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-red-600/15 blur-xl animate-pulse" />
            <div className="relative size-20 rounded-full border border-red-600/40 bg-red-600/5 flex items-center justify-center">
              <ShieldAlert className="size-9 text-red-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-foreground">Account Permanently Restricted</h1>
            <p className="text-sm text-muted-foreground">
              Your HUXZAIN account has been banned due to severe policy violations.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-5 text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Reason for Ban</span>
            <span className="text-xs font-semibold text-foreground leading-relaxed block">{reason}</span>
          </div>

          {!submitted ? (
            <form onSubmit={handleAppealSubmit} className="space-y-4 text-left border-t border-border/40 pt-4">
              <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">File an Appeal</h2>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explain why your account should be reinstated..."
                rows={4}
                required
                disabled={submitting}
                className="w-full p-3.5 rounded-xl border border-border bg-background/70 text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/50 resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" /> Submit Ban Appeal
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Appeal Received</h3>
              <p className="text-[11px] text-muted-foreground">
                Your appeal is under review. Our compliance team will inspect your appeal.
              </p>
            </div>
          )}

          <div className="border-t border-border/40 pt-4">
            <button
              onClick={() => auth.signOut()}
              className="w-full h-10 rounded-xl border border-border bg-surface hover:text-red-400 flex items-center justify-center gap-2 transition-all text-xs font-medium"
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
