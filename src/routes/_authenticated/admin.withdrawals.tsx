import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { Check, X, Inbox, CreditCard, RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { processWithdrawalStatus } from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals Review — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("withdrawals")
          .select("*, profiles:user_id(display_name, email)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setRequests(data);
      }
    } catch (e: any) {
      toast.error("Failed to load withdrawals: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAction(id: string, status: "completed" | "rejected") {
    try {
      setProcessing(id);
      await processWithdrawalStatus(id, status);
      toast.success(`Withdrawal request ${status === "completed" ? "approved & marked paid" : "rejected"} successfully!`);
      await loadRequests();
    } catch (err: any) {
      toast.error("Process failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  }

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
          <h1 className="font-display text-2xl font-bold">Withdrawal Payout Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review UPI or Bank Payout requests and mark them as paid.
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Loading payouts queue...
        </div>
      ) : (
        <PanelCard title="Withdrawals Pending / History" action={<CreditCard size={14} className="text-gold" />}>
          {requests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                <Inbox size={20} />
              </div>
              <p className="font-medium">No payout requests found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Withdrawal requests will appear here when sellers submit payout tickets.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left font-medium pb-2.5">Date</th>
                    <th className="text-left font-medium">Seller</th>
                    <th className="text-left font-medium">Amount</th>
                    <th className="text-left font-medium">Method</th>
                    <th className="text-left font-medium">Details</th>
                    <th className="text-left font-medium">Status</th>
                    <th className="text-right font-medium pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-foreground">{r.profiles?.display_name || "Guest"}</div>
                        <div className="text-[10px] text-muted-foreground">{r.profiles?.email}</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-gold">{fmt(r.amount)}</td>
                      <td className="py-3">
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full border bg-surface/40 border-border">
                          {r.method === "upi" ? "UPI ID" : "Bank"}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.method === "upi" ? (
                          <span>UPI ID: {r.upi_id}</span>
                        ) : (
                          <span>
                            Acc: {r.account_number} · IFSC: {r.ifsc_code} · Name: {r.account_holder}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <StatusPill status={r.status === "pending" ? "Pending" : r.status === "completed" ? "Completed" : "Disputed"} />
                      </td>
                      <td className="py-3 text-right">
                        {r.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleAction(r.id, "completed")}
                              disabled={processing !== null}
                              className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                              title="Mark Paid"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "rejected")}
                              disabled={processing !== null}
                              className="size-8 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 flex items-center justify-center hover:bg-destructive/30 transition-all active:scale-95 disabled:opacity-50"
                              title="Reject Request"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
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
