import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Percent, Wallet, Download, RefreshCw, BarChart2 } from "lucide-react";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { getOrCreateWallet, syncAndGetWallet } from "@/lib/wallet.functions";
import { useSellerTier } from "@/lib/seller/tier-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/earnings")({
  head: () => ({ meta: [{ title: "Earnings — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user, profile } = useAuth();
  const { tier } = useSellerTier();
  const [wallet, setWallet] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState(0);
  const [grossSales30, setGrossSales30] = useState(0);
  const [feesDeducted30, setFeesDeducted30] = useState(0);
  const [netCredited30, setNetCredited30] = useState(0);
  const [heldAmount, setHeldAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const w = await syncAndGetWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        
        // Sum up completed order payouts this month
        const { data: sales } = await supabase
          .from("orders")
          .select("seller_payout_inr")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .gte("completed_at", firstDayOfMonth);

        if (sales) {
          const sum = sales.reduce((acc, curr) => acc + Number(curr.seller_payout_inr || 0), 0);
          setMonthlySales(sum);
        }

        // Sum up completed orders in the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: orders30 } = await supabase
          .from("orders")
          .select("amount_inr, commission_inr, seller_payout_inr")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .gte("completed_at", thirtyDaysAgo);

        if (orders30) {
          const gross = orders30.reduce((acc, curr) => acc + Number(curr.amount_inr || 0), 0);
          const fees = orders30.reduce((acc, curr) => acc + Number(curr.commission_inr || 0), 0);
          const net = orders30.reduce((acc, curr) => acc + Number(curr.seller_payout_inr || 0), 0);
          setGrossSales30(gross);
          setFeesDeducted30(fees);
          setNetCredited30(net);
        }

        // Sum up held escrows
        const { data: heldOrders } = await supabase
          .from("orders")
          .select("seller_payout_inr")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .in("payout_status", ["pending_cooling", "dormant"]);

        if (heldOrders) {
          const sumHeld = heldOrders.reduce((acc, curr) => acc + Number(curr.seller_payout_inr || 0), 0);
          setHeldAmount(sumHeld);
        }
      }
    } catch (e: any) {
      toast.error("Failed to load earnings: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  // Platform fee tier label
  const feePercentLabel =
    tier === "pro" ? "1.5%" :
    tier === "elite" ? "1.0%" :
    tier === "enterprise" ? "0.5%" : "1.9%";

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
          <h1 className="font-display text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track gross sales, fees, and net payout.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface bg-surface/25">
            <Download size={14} /> Statement PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Calculating sales breakdown and performance metrics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Lifetime earnings"
              value={fmt(wallet?.total_earnings)}
              icon={DollarSign}
              premium
            />
            <StatCard label="This month" value={fmt(monthlySales)} icon={TrendingUp} />
            <StatCard
              label="Platform fee"
              value={feePercentLabel}
              delta={tier === "standard" ? "Upgrade to lower" : "Premium lowered"}
              icon={Percent}
              positive={tier !== "standard"}
            />
            <StatCard 
              label="Available to withdraw" 
              value={fmt(wallet?.available_balance)} 
              delta={wallet?.available_balance === 0 && heldAmount > 0 ? `${fmt(heldAmount)} currently held in escrow/cooling` : undefined}
              positive={wallet?.available_balance > 0}
              icon={Wallet} 
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <PanelCard title="Earnings overview" className="lg:col-span-2">
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
                <BarChart2 className="size-10 text-gold mb-3 opacity-80" />
                <p className="font-semibold text-foreground">Interactive Revenue History</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Active monthly gross revenue is logged at {fmt(monthlySales)}.
                </p>
              </div>
            </PanelCard>
            <PanelCard title="Breakdown · 30 days">
              <div className="py-12 text-center text-muted-foreground text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/40 text-xs">
                  <span>Gross Sales Volume</span>
                  <span className="font-mono font-bold text-foreground">{fmt(grossSales30)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40 text-xs text-destructive">
                  <span>Platform Fees Deducted</span>
                  <span className="font-mono font-bold">- {fmt(feesDeducted30)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40 text-xs text-emerald-400 font-bold">
                  <span>Net Ledger Credited</span>
                  <span className="font-mono font-bold">{fmt(netCredited30)}</span>
                </div>
              </div>
            </PanelCard>
          </div>
        </>
      )}
    </div>
  );
}
