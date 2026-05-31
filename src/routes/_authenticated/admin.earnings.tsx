import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Shield, Receipt, Calendar, ArrowRightLeft, TrendingUp, Info } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/earnings")({
  head: () => ({ meta: [{ title: "Platform Earnings Ledger — HUXZAIN Admin" }] }),
  component: EarningsPage,
});

type OrderEarning = {
  id: string;
  order_number: string;
  amount_inr: number;
  commission_inr: number;
  seller_payout_inr: number;
  status: string;
  created_at: string;
};

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderEarning[]>([]);
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    totalVolume: 0,
    totalPayouts: 0,
    orderCount: 0
  });

  async function loadEarnings() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, amount_inr, commission_inr, seller_payout_inr, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = (data ?? []) as OrderEarning[];
      setOrders(items);

      // Compute stats for completed orders
      const completed = items.filter(o => o.status === "completed" || o.status === "delivered");
      const totalEarnings = completed.reduce((acc, curr) => acc + (curr.commission_inr || 0), 0);
      const totalVolume = completed.reduce((acc, curr) => acc + (curr.amount_inr || 0), 0);
      const totalPayouts = completed.reduce((acc, curr) => acc + (curr.seller_payout_inr || 0), 0);

      setMetrics({
        totalEarnings,
        totalVolume,
        totalPayouts,
        orderCount: completed.length
      });

    } catch (e: any) {
      toast.error("Failed to load earnings ledger: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEarnings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2.5">
          <Shield className="text-gold" size={24} /> Platform Earnings Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review commissions collected from HUXZAIN marketplace sales and transaction payouts.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
          Retrieving ledger entries...
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden ring-1 ring-gold/10">
              <div className="absolute -top-12 -right-12 size-32 rounded-full opacity-20 pointer-events-none bg-gradient-to-br from-gold to-transparent" />
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">Total Platform Earnings</div>
                <div className="size-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold mt-2 text-gold">{formatINR(metrics.totalEarnings)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Net commissions collected</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">Commissions Collected</div>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold mt-2 text-emerald-400">{formatINR(metrics.totalEarnings)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">From {metrics.orderCount} finalized orders</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">Seller Payouts Volume</div>
                <div className="size-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <ArrowRightLeft size={14} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold mt-2 text-sky-400">{formatINR(metrics.totalPayouts)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Transferred to seller balances</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">Total Marketplace Volume</div>
                <div className="size-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Receipt size={14} />
                </div>
              </div>
              <div className="font-display text-2xl font-bold mt-2 text-purple-400">{formatINR(metrics.totalVolume)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Gross paid buyer volume</div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-sm">Transaction Logs</h2>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Info size={12} /> Commissions are calculated based on seller plan tier percentages.
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No platform transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="py-2.5 font-medium">Order Reference</th>
                      <th className="font-medium">Date</th>
                      <th className="font-medium text-right">Buyer Pays</th>
                      <th className="font-medium text-right text-sky-400">Seller Receives</th>
                      <th className="font-medium text-right text-gold">Platform Cut</th>
                      <th className="font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-border/40 hover:bg-surface/30 transition-colors">
                        <td className="py-3.5 font-mono text-xs text-zinc-400">
                          {o.order_number || o.id.slice(0, 12)}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="text-right font-medium">
                          {formatINR(o.amount_inr)}
                        </td>
                        <td className="text-right font-medium text-sky-400/90">
                          {formatINR(o.seller_payout_inr || (o.amount_inr - (o.commission_inr || 0)))}
                        </td>
                        <td className="text-right font-semibold text-gold">
                          {formatINR(o.commission_inr || 0)}
                        </td>
                        <td className="text-center">
                          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            o.status === "completed" 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : o.status === "delivered"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
