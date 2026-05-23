// src/routes/_authenticated/admin.payments.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { updateVerificationStatus } from "@/lib/payments/verificationQueueService";
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Verifications — HUXZAIN Admin" }] }),
  component: AdminPayments,
});

interface VerificationRow {
  id: string;
  userEmail: string;
  orderId: string;
  screenshotUrl: string;
  transactionId?: string;
  amount?: number;
  timestamp?: string;
  fraudScore: number;
  fraudLevel: string;
  tags: string[];
  status: string;
}

function AdminPayments() {
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  const loadVerifications = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_verifications")
        .select(`id, user_id, order_id, screenshot_url, ocr_result, fraud_score, status`)
        .eq("status", "pending");

      if (error) throw error;

      if (data) {
        const rows = await Promise.all(
          data.map(async (rec: any) => {
            const { data: userData } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", rec.user_id)
              .maybeSingle();

            const ocr = rec.ocr_result || {};
            const fraud = rec.fraud_score || {};
            return {
              id: rec.id,
              userEmail: userData?.display_name || userData?.username || rec.user_id,
              orderId: rec.order_id,
              screenshotUrl: rec.screenshot_url,
              transactionId: ocr.transactionId || ocr.transaction_id,
              amount: ocr.amount,
              timestamp: ocr.timestamp,
              fraudScore: fraud.score ?? 0,
              fraudLevel: fraud.level ?? "low",
              tags: fraud.tags ?? [],
              status: rec.status,
            } as VerificationRow;
          })
        );
        setVerifications(rows);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load verifications: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
    if (!supabase) return;

    const subscription = supabase
      .channel("payment_verifications_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_verifications" },
        () => {
          loadVerifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    if (!supabase) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const staffUserId = userData.user?.id || "staff-placeholder";

      await updateVerificationStatus({
        verificationId: id,
        status: action,
        staffUserId,
        note: action === "approved" ? "Approved by staff" : "Rejected by staff",
      });

      toast.success(`Payment proof ${action} successfully.`);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(`Action failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-6 text-gold" /> Payment Verifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review buyer payment proofs, UTR duplicate tags, and fraud assist indicators.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : verifications.length === 0 ? (
        <div className="rounded-2xl border border-border border-dashed p-12 text-center bg-surface/10">
          <Clock className="mx-auto size-12 text-muted-foreground/60 mb-4" />
          <h3 className="font-semibold text-lg">No pending verifications</h3>
          <p className="text-sm text-muted-foreground mt-1">
            All submitted payment proofs have been successfully reviewed.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Buyer Info</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Screenshot</th>
                  <th className="px-6 py-4">Txn Details</th>
                  <th className="px-6 py-4">Fraud Risk</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {verifications.map((v) => (
                  <tr key={v.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{v.userEmail}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{v.orderId}</td>
                    <td className="px-6 py-4">
                      <a href={v.screenshotUrl} target="_blank" rel="noreferrer" className="relative group block h-12 w-12 rounded overflow-hidden border border-border bg-black">
                        <img src={v.screenshotUrl} alt="payment" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="size-3 text-white" />
                        </span>
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {v.amount !== undefined ? `₹${v.amount.toLocaleString()}` : "Amount missing"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        UTR: {v.transactionId || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.fraudLevel === "critical" 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : v.fraudLevel === "high" 
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                          : v.fraudLevel === "medium" 
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" 
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                      }`}>
                        <AlertTriangle className="size-3" /> {v.fraudScore}% ({v.fraudLevel})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {v.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          v.tags.map((t) => (
                            <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-xxs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleAction(v.id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold text-black hover:bg-gold/80 transition-colors"
                      >
                        <CheckCircle className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(v.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
