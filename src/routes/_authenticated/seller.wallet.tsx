import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Shield, CreditCard, Receipt, Inbox, RefreshCw } from "lucide-react";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { useSellerTier } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet } from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/wallet")({
  head: () => ({ meta: [{ title: "Wallet — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { meta } = useSellerTier();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const w = await getOrCreateWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setTxns(data);
      }
    } catch (e: any) {
      toast.error("Failed to load wallet: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your HUXZAIN balance, holds, and instant transfers.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Loading your financial secure vault...
        </div>
      ) : (
        <>
          <div
            className="rounded-3xl border border-border p-6 lg:p-8 relative overflow-hidden"
            style={{ background: meta.surfaceGradient, boxShadow: meta.glow }}
          >
            <div
              className="absolute -right-20 -top-20 size-64 rounded-full opacity-20"
              style={{ background: "radial-gradient(closest-side, oklch(0.82 0.13 82), transparent)" }}
            />
            <div className="relative flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Available balance
                </div>
                <div className="font-display text-5xl font-bold text-gold-gradient mt-2">
                  {fmt(wallet?.available_balance)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  On hold: {fmt(wallet?.pending_balance)} · Pending payouts: {fmt(wallet?.pending_balance)}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/seller/withdrawals"
                  className="h-11 px-5 rounded-xl bg-gold text-black font-semibold text-sm inline-flex items-center gap-2 hover:bg-gold/90 transition-all active:scale-95"
                >
                  <ArrowUpFromLine size={14} /> Withdraw
                </Link>
                <Link
                  to="/seller/support"
                  className="h-11 px-5 rounded-xl border border-border hover:bg-surface text-sm inline-flex items-center gap-2 transition-all active:scale-95 bg-surface/20"
                >
                  <ArrowDownToLine size={14} /> Top-up
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Lifetime received" value={fmt(wallet?.total_earnings)} icon={Wallet} />
            <StatCard label="Currently on hold" value={fmt(wallet?.pending_balance)} icon={Shield} />
            <StatCard label="Withdrawn" value={fmt(wallet?.withdrawn_amount)} icon={ArrowUpFromLine} />
            <StatCard
              label="Last Payout Date"
              value={wallet?.last_payout_date ? new Date(wallet.last_payout_date).toLocaleDateString() : "—"}
              icon={ArrowDownToLine}
            />
          </div>

          <PanelCard
            title="Recent wallet activity"
            action={
              <Link to="/seller/transactions" className="text-xs text-gold hover:underline">
                View statement ledger
              </Link>
            }
          >
            {txns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No transactions yet. Your wallet activity will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left font-medium pb-2">Date</th>
                      <th className="text-left font-medium">Description</th>
                      <th className="text-left font-medium">Type</th>
                      <th className="text-right font-medium">Status</th>
                      <th className="text-right font-medium pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.slice(0, 5).map((t) => (
                      <tr key={t.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-medium text-foreground">{t.description}</td>
                        <td className="py-3">
                          <span className="text-xs uppercase px-2 py-0.5 rounded-full border bg-surface/40 border-border">
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`text-xs font-semibold ${t.status === "completed" ? "text-emerald-400" : "text-amber-400"}`}
                          >
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${t.amount < 0 ? "text-destructive" : "text-emerald-400"}`}>
                          {t.amount < 0 ? "-" : "+"}{fmt(Math.abs(t.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>
        </>
      )}
    </div>
  );
}
