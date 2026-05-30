import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { Check, X, Inbox, Shield, RefreshCw, Eye } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "KYC Verifications — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("verifications")
          .select("*, profiles:id(display_name, email)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setRequests(data);
      }
    } catch (e: any) {
      toast.error("Failed to load verifications: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAction(id: string, status: "approved" | "rejected") {
    try {
      setProcessing(id);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      // 1. Update verification record status
      const { error: vErr } = await supabase
        .from("verifications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (vErr) throw vErr;

      // 2. Sync to profiles user metadata
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          is_verified: status === "approved",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (pErr) throw pErr;

      // 3. Notify user
      try {
        await supabase.from("notifications").insert({
          user_id: id,
          kind: "verification.status",
          title: status === "approved" ? "KYC Profile Verified!" : "KYC Verification Rejected",
          body: status === "approved"
            ? "Congratulations! Your profile is verified as a gold secure HUXZAIN seller store."
            : "Your KYC document uploads were rejected. Please re-upload valid government receipts."
        });
      } catch (e) { console.error("Notification trigger failed:", e); }

      toast.success(`Verification ${status === "approved" ? "approved" : "rejected"} successfully!`);
      await loadRequests();
    } catch (err: any) {
      toast.error("Failed to process verification: " + err.message);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Seller KYC Verification Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review Government IDs and Address proofs uploaded by sellers to grant Gold trust badges.
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
          Loading verification requests...
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PanelCard title="KYC Queue" action={<Shield size={14} className="text-gold" />}>
              {requests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <Inbox size={20} />
                  </div>
                  <p className="font-medium">No verifications found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploaded government documentation will appear here for review.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2.5">Date</th>
                        <th className="text-left font-medium">User</th>
                        <th className="text-left font-medium">Govt ID</th>
                        <th className="text-left font-medium">Address Proof</th>
                        <th className="text-left font-medium">Status</th>
                        <th className="text-right font-medium pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="font-medium text-foreground">{r.profiles?.display_name || "Guest"}</div>
                            <div className="text-[10px] text-muted-foreground">{r.profiles?.email}</div>
                          </td>
                          <td className="py-3">
                            {r.government_id_url ? (
                              <button
                                onClick={() => setActiveImage(r.government_id_url)}
                                className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-semibold"
                              >
                                <Eye size={12} /> Inspect ID
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {r.address_proof_url ? (
                              <button
                                onClick={() => setActiveImage(r.address_proof_url)}
                                className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-semibold"
                              >
                                <Eye size={12} /> Inspect Proof
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            <StatusPill status={r.status === "pending" ? "Pending" : r.status === "approved" ? "Completed" : "Disputed"} />
                          </td>
                          <td className="py-3 text-right">
                            {r.status === "pending" && (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleAction(r.id, "approved")}
                                  disabled={processing !== null}
                                  className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                                  title="Approve / Verify"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => handleAction(r.id, "rejected")}
                                  disabled={processing !== null}
                                  className="size-8 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 flex items-center justify-center hover:bg-destructive/30 transition-all active:scale-95 disabled:opacity-50"
                                  title="Reject KYC"
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
          </div>

          <div className="space-y-6">
            <PanelCard title="Inspection Viewer">
              {activeImage ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border overflow-hidden h-48 bg-background flex items-center justify-center">
                    <img src={activeImage} className="w-full h-full object-contain" alt="KYC Document Preview" />
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => setActiveImage(null)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear Inspection Window
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground leading-relaxed">
                  Select "Inspect" to render verification receipts and security documentation in high fidelity.
                </div>
              )}
            </PanelCard>
          </div>
        </div>
      )}
    </div>
  );
}
