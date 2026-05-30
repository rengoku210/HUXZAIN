import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { Download, Receipt, Inbox, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/transactions")({
  head: () => ({ meta: [{ title: "Transactions — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTransactions() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setTxns(data);
      }
    } catch (e: any) {
      toast.error("Failed to load transactions: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete ledger of sales, refunds, withdrawals and fees.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface bg-surface/20">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Loading audit transaction log...
        </div>
      ) : (
        <PanelCard
          title="All transactions"
          action={<Receipt size={14} className="text-gold" />}
        >
          {txns.length === 0 ? (
            <div className="py-16 text-center">
              <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                <Inbox size={20} />
              </div>
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Your transaction history will appear here once you start receiving orders, top-ups, and payout transfers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left font-medium pb-2.5">Date</th>
                    <th className="text-left font-medium">Description</th>
                    <th className="text-left font-medium">Type</th>
                    <th className="text-right font-medium">Status</th>
                    <th className="text-right font-medium pr-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 font-medium text-foreground">{t.description}</td>
                      <td className="py-3">
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full border bg-surface/40 border-border text-gold/80">
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs font-bold uppercase ${t.status === "completed" ? "text-emerald-400" : t.status === "rejected" ? "text-destructive" : "text-amber-400"}`}
                        >
                          {t.status}
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
      )}
    </div>
  );
}
