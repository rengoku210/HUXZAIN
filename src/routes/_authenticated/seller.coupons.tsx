import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox, Ticket, Sparkles, RefreshCw, Key } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { applyCoupon } from "@/lib/wallet.functions";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/coupons")({
  head: () => ({ meta: [{ title: "Coupons — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user, profile, refreshUserMeta } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usedCoupons, setUsedCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("user_coupons")
          .select("*")
          .eq("user_id", user.id)
          .order("used_at", { ascending: false });
        if (data) setUsedCoupons(data);
      }
    } catch (e: any) {
      console.warn("Failed to load user coupons:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, [user?.id]);

  async function handleApply() {
    if (!user) { setLoading(false); return; }
    if (!code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      setSubmitting(true);
      await applyCoupon(user.id, code);
      toast.success("Success! Coupon applied successfully. Pro plan unlocked!");
      setCode("");
      await refreshUserMeta();
      await loadCoupons();
    } catch (e: any) {
      toast.error("Failed to apply coupon: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Coupons & Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Redeem promo codes to unlock premium features and platforms trials.
          </p>
        </div>
        <button
          onClick={loadCoupons}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Apply Promo Code" className="lg:col-span-1">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Enter Code</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                  <Key size={14} />
                </span>
                <input
                  type="text"
                  placeholder="WELCOME"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm font-mono uppercase font-bold text-gold"
                />
              </div>
            </div>
            <button
              onClick={handleApply}
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-gold text-black font-bold mt-2 hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Applying..." : "Redeem Coupon"}
            </button>
            <p className="text-[10px] text-muted-foreground mt-2">
              Promo codes are case-insensitive. Active trials apply instantly upon confirmation.
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Your Redeemed Offers" className="lg:col-span-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Hydrating coupons ledger...
            </div>
          ) : usedCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox size={40} className="text-muted-foreground mb-3 opacity-60" />
              <h2 className="text-sm font-semibold">No offers redeemed</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Apply a valid code (like **WELCOME**) to unlock premium benefits instantly!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {usedCoupons.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface/20 hover:border-gold/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold font-mono text-gold uppercase">{c.coupon_code}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Applied on {new Date(c.used_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <Sparkles size={10} /> Active Trial
                    </span>
                    {profile?.subscription_expires_at && c.coupon_code === "WELCOME" && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
