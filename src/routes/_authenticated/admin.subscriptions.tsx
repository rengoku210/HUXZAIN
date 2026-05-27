import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  RefreshCw,
  Search
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions Review — Admin" }] }),
  component: AdminSubscriptionsPage,
});

type PaymentProof = {
  id: string;
  user_id: string;
  selected_plan: string;
  amount: number;
  screenshot_url: string;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

function AdminSubscriptionsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProof, setActiveProof] = useState<PaymentProof | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actioning, setActioning] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

  async function fetchProofs() {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscription_payment_proofs")
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProofs(data as PaymentProof[]);
    } catch (err: any) {
      console.error("[AdminSubscriptions] Error fetching proofs:", err);
      toast.error(`Failed to fetch payment proofs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProofs();
  }, []);

  const handleApprove = async (proof: PaymentProof) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    if (!confirm(`Are you sure you want to APPROVE this subscription payment of ₹${proof.amount} for ${proof.selected_plan}?`)) return;
    
    setActioning(true);
    try {
      console.log(`[Admin Approval] Approving proof ${proof.id} for user ${proof.user_id}...`);
      
      // 1. Update payment proof status to 'approved'
      const { error: proofErr } = await supabase
        .from("subscription_payment_proofs")
        .update({ status: "approved", rejection_reason: null })
        .eq("id", proof.id);

      if (proofErr) throw proofErr;

      // 2. Activate plan on user's profile table
      const planName = proof.selected_plan.toLowerCase(); // pro, elite, enterprise
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ subscription_tier: planName })
        .eq("id", proof.user_id);

      if (profileErr) throw profileErr;

      toast.success(`Subscription payment approved! ${proof.selected_plan} plan is now active for this seller.`);
      setActiveProof(null);
      fetchProofs();
    } catch (err: any) {
      console.error("[Admin Approval] Failure:", err);
      toast.error(`Failed to approve payment: ${err.message}`);
    } finally {
      setActioning(false);
    }
  };

  const handleRejectSubmit = async () => {
    const supabase = getSupabase();
    if (!supabase || !activeProof) return;

    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    setActioning(true);
    try {
      console.log(`[Admin Rejection] Rejecting proof ${activeProof.id}...`);

      // 1. Update status to 'rejected' and save reason
      const { error } = await supabase
        .from("subscription_payment_proofs")
        .update({ 
          status: "rejected", 
          rejection_reason: rejectionReason.trim() 
        })
        .eq("id", activeProof.id);

      if (error) throw error;

      toast.success("Subscription payment proof has been rejected.");
      setShowRejectModal(false);
      setRejectionReason("");
      setActiveProof(null);
      fetchProofs();
    } catch (err: any) {
      console.error("[Admin Rejection] Failure:", err);
      toast.error(`Failed to reject payment: ${err.message}`);
    } finally {
      setActioning(false);
    }
  };

  const filtered = proofs.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const name = p.profiles?.display_name || p.profiles?.username || "";
    const email = p.profiles?.email || "";
    const matchesSearch = 
      name.toLowerCase().includes(search.toLowerCase()) || 
      email.toLowerCase().includes(search.toLowerCase()) ||
      p.selected_plan.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "rejected": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "pending":
      default: return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Subscription Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and verify manual UPI payment screenshots for seller subscriptions.
          </p>
        </div>
        <button
          onClick={fetchProofs}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-border bg-surface/30 hover:bg-surface inline-flex items-center gap-1.5 transition-all text-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh List
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface/20 border border-border p-4 rounded-2xl">
        <div className="flex gap-2 shrink-0">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${filter === f ? "bg-gold text-black border-gold" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search seller name, email, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-surface/60 text-xs focus:outline-none focus:border-gold/50"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-gold" /> Loading receipts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No subscription payment proofs found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-surface/20">
                  <th className="text-left font-medium py-3 px-4">User</th>
                  <th className="text-left font-medium">Selected Plan</th>
                  <th className="text-right font-medium">Amount</th>
                  <th className="text-left font-medium pl-6">Status</th>
                  <th className="text-left font-medium">Submitted</th>
                  <th className="text-right font-medium pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown Seller"}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.profiles?.email}</div>
                    </td>
                    <td className="py-3 font-semibold text-gold uppercase">{p.selected_plan}</td>
                    <td className="py-3 text-right font-bold">₹{Number(p.amount).toFixed(2)}</td>
                    <td className="py-3 pl-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right pr-4">
                      <button
                        onClick={() => setActiveProof(p)}
                        className="h-8 px-3 rounded-lg bg-surface hover:bg-gold/10 text-muted-foreground hover:text-gold border border-border flex items-center justify-center gap-1.5 text-xs ml-auto transition-colors"
                      >
                        <Eye size={12} /> Inspect Proof
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveProof(null)} />
          <div className="relative w-full max-w-xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold">Inspect Subscription Proof</h2>
                <button
                  onClick={() => setActiveProof(null)}
                  className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-surface/20 p-4 border border-border rounded-2xl mb-4">
                <div>
                  <div className="text-muted-foreground">Seller Display Name</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {activeProof.profiles?.display_name ?? "Unknown Seller"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Requested Subscription</div>
                  <div className="font-bold text-gold uppercase mt-0.5">{activeProof.selected_plan}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount Paid</div>
                  <div className="font-bold text-foreground mt-0.5">₹{Number(activeProof.amount).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border mt-1 ${getStatusColor(activeProof.status)}`}>
                    {activeProof.status}
                  </span>
                </div>
                <div className="col-span-2 border-t border-border/40 pt-2">
                  <div className="text-muted-foreground">Submitted Date</div>
                  <div className="text-foreground mt-0.5">{new Date(activeProof.created_at).toLocaleString()}</div>
                </div>
                {activeProof.rejection_reason && (
                  <div className="col-span-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 font-mono">
                    <strong>Rejection Reason:</strong> {activeProof.rejection_reason}
                  </div>
                )}
              </div>

              {/* High-Resolution Screenshot Proof Image */}
              <div className="mb-6">
                <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Uploaded Screenshot proof</span>
                  <a
                    href={activeProof.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline inline-flex items-center gap-1"
                  >
                    Open in new tab <ExternalLink size={10} />
                  </a>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border/80 bg-black aspect-[9/16] max-h-[360px] flex items-center justify-center">
                  <img
                    src={activeProof.screenshot_url}
                    alt="Manual Payment Screenshot proof"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Approval / Rejection Actions */}
              {activeProof.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actioning}
                    className="flex-1 h-11 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Reject Proof
                  </button>
                  <button
                    onClick={() => handleApprove(activeProof)}
                    disabled={actioning}
                    className="flex-1 h-11 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:brightness-110 inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-50"
                  >
                    {actioning ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Approve & Activate Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON PROMPT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <AlertCircle size={16} /> Enter Rejection Reason
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Please enter the explanation for why this payment proof was rejected. The seller will see this reason in their subscription panel.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Image uploaded is blur, incorrect transaction amount, or transaction reference ID not found."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface/60 text-xs focus:outline-none focus:border-red-500/50 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={actioning}
                className="flex-1 h-9 rounded-lg border border-border text-xs hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actioning || !rejectionReason.trim()}
                className="flex-1 h-9 rounded-lg bg-red-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {actioning ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
