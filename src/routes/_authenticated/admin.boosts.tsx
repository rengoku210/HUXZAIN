// src/routes/_authenticated/admin.boosts.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatusPill } from "@/components/seller/SellerShell";
import { 
  Rocket, 
  RefreshCw, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { resolveSignedUrl } from "@/lib/storage/signedUrls";

export const Route = createFileRoute("/_authenticated/admin/boosts")({
  head: () => ({ meta: [{ title: "Boost Requests — HUXZAIN Admin" }] }),
  component: BoostRequests,
});

interface BoostRequestRecord {
  id: string;
  user_id: string;
  listing_id: string;
  payment_proof_id: string | null;
  boost_type: string;
  amount: number;
  duration_days: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  listings?: {
    title: string;
  } | null;
  payment_proofs?: {
    screenshot_url: string;
    utr_reference: string | null;
    status: string;
    amount: number;
  } | null;
  profile?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

function BoostRequests() {
  const [requests, setRequests] = useState<BoostRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  
  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewingScreenshotUrl, setViewingScreenshotUrl] = useState<string | null>(null);
  const [signedScreenshotUrl, setSignedScreenshotUrl] = useState<string>("");

  const { user } = useAuth();
  const supabase = getSupabase();

  const loadRequests = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("boost_requests")
        .select(`
          *,
          listings:listing_id (
            title
          ),
          payment_proofs:payment_proof_id (
            screenshot_url,
            utr_reference,
            status,
            amount
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const uids = data.map(r => r.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", uids);

        const mapped = data.map((r: any) => {
          const profile = profiles?.find(p => p.id === r.user_id);
          return {
            ...r,
            profile: profile ? {
              display_name: profile.display_name,
              username: profile.username
            } : null
          };
        });
        setRequests(mapped);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      console.error("[AdminBoosts] Load error:", e);
      toast.error(`Failed to load boost requests: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Resolve signed URLs for screenshots
  useEffect(() => {
    if (!viewingScreenshotUrl) {
      setSignedScreenshotUrl("");
      return;
    }

    if (viewingScreenshotUrl.startsWith("http://") || viewingScreenshotUrl.startsWith("https://") || viewingScreenshotUrl.startsWith("blob:") || viewingScreenshotUrl.startsWith("data:")) {
      setSignedScreenshotUrl(viewingScreenshotUrl);
      return;
    }

    let active = true;
    resolveSignedUrl(viewingScreenshotUrl, "payment-proofs").then((url) => {
      if (active && url) {
        setSignedScreenshotUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [viewingScreenshotUrl]);

  const handleApprove = async (record: BoostRequestRecord) => {
    if (!supabase) return;
    setActioningId(record.id);
    try {
      // 1. Update boost request status
      const { error: reqErr } = await supabase
        .from("boost_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", record.id);

      if (reqErr) throw reqErr;

      // 2. If it has a manual payment proof, update it to approved
      if (record.payment_proof_id) {
        await supabase
          .from("payment_proofs")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", record.payment_proof_id);
      }

      // 3. Create active boost in listing_boosts
      const startsAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + record.duration_days * 24 * 60 * 60 * 1000).toISOString();

      const { error: boostErr } = await supabase
        .from("listing_boosts")
        .insert({
          listing_id: record.listing_id,
          seller_id: record.user_id,
          boost_type: record.boost_type as any,
          amount_inr: record.amount,
          duration_days: record.duration_days,
          starts_at: startsAt,
          ends_at: endsAt,
          status: "active" as any
        });

      if (boostErr) throw boostErr;

      // 4. Log staff action
      try {
        await supabase.from("staff_action_logs").insert({
          staff_id: user?.id || record.user_id,
          action: "approve_boost_payment",
          target_type: "boost_request",
          target_id: record.id,
          previous_value: "pending",
          new_value: "approved",
          notes: `Approved manual boost: ${record.boost_type.replace(/_/g, " ").toUpperCase()}`
        });
      } catch (e) { console.error("Staff log failed:", e); }

      // 5. Notify user
      await supabase.from("notifications").insert({
        user_id: record.user_id,
        kind: "boost.active",
        title: "Listing Boost Activated!",
        body: `Your payment of ₹${record.amount} was verified and your listing boost "${record.boost_type.replace(/_/g, ' ').toUpperCase()}" is now active!`
      });

      toast.success("Boost request approved and activated successfully!");
      await loadRequests();
    } catch (err: any) {
      console.error("[AdminBoosts] Approve error:", err);
      toast.error(`Approve failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!supabase || !selectedRecordId) return;
    const record = requests.find(r => r.id === selectedRecordId);
    if (!record) return;

    setActioningId(selectedRecordId);
    setShowRejectModal(false);
    try {
      const reason = rejectionReason.trim() || "No reason specified";

      // 1. Update boost request status
      const { error: reqErr } = await supabase
        .from("boost_requests")
        .update({ 
          status: "rejected", 
          rejection_reason: reason, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", record.id);

      if (reqErr) throw reqErr;

      // 2. If it has a manual payment proof, update it to rejected
      if (record.payment_proof_id) {
        await supabase
          .from("payment_proofs")
          .update({ 
            status: "rejected", 
            rejection_reason: reason, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", record.payment_proof_id);
      }

      // 3. Log staff action
      try {
        await supabase.from("staff_action_logs").insert({
          staff_id: user?.id || record.user_id,
          action: "reject_boost_payment",
          target_type: "boost_request",
          target_id: record.id,
          previous_value: "pending",
          new_value: "rejected",
          notes: `Rejected boost: ${reason}`
        });
      } catch (e) { console.error("Staff log failed:", e); }

      // 4. Notify user
      await supabase.from("notifications").insert({
        user_id: record.user_id,
        kind: "payment.rejected",
        title: "Boost Request Rejected",
        body: `Your boost request was rejected. Reason: ${reason}.`
      });

      toast.success("Boost request rejected successfully.");
      setRejectionReason("");
      setSelectedRecordId(null);
      await loadRequests();
    } catch (err: any) {
      console.error("[AdminBoosts] Reject error:", err);
      toast.error(`Reject failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filtered = requests.filter(r => {
    const matchesStatus = filter === "all" || r.status === filter;
    
    const sellerName = r.profile?.display_name || r.profile?.username || "";
    const listingTitle = r.listings?.title || "";
    const matchesSearch = 
      sellerName.toLowerCase().includes(search.toLowerCase()) ||
      listingTitle.toLowerCase().includes(search.toLowerCase()) ||
      r.boost_type.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Rocket className="size-6 text-gold" /> Boost Campaign Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve manual sponsored campaign listings, spotlight bookings, and newsletter placements.
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20 animate-in fade-in"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller, listing, type..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e: any) => setFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="pending">Pending Queue</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium font-mono">
          Total in view: {filtered.length} requests
        </div>
      </div>

      {/* Boost Queue Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No boost requests found" desc="All campaigns have been fully processed." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4">Seller</th>
                  <th className="px-5 py-4">Listing Title</th>
                  <th className="px-5 py-4">Campaign Details</th>
                  <th className="px-5 py-4">Payment Proof</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">
                        {r.profile?.display_name || r.profile?.username || "Anonymous Seller"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {r.user_id}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground max-w-[200px] truncate">
                      {r.listings?.title || "Unknown Listing"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gold uppercase tracking-wider">
                        {r.boost_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Amount: {fmt(r.amount)} | Duration: {r.duration_days} Days
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {r.payment_proofs ? (
                        <div className="space-y-1">
                          {r.payment_proofs.screenshot_url && r.payment_proofs.screenshot_url !== "wallet_payment" && r.payment_proofs.screenshot_url !== "token_payment" ? (
                            <button
                              onClick={() => setViewingScreenshotUrl(r.payment_proofs!.screenshot_url)}
                              className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer font-semibold"
                            >
                              <Eye size={12} /> View Screenshot
                            </button>
                          ) : (
                            <span className="text-muted-foreground/60">
                              {r.payment_proofs.screenshot_url === "wallet_payment" ? "Wallet Paid" : "Token Paid"}
                            </span>
                          )}
                          {r.payment_proofs.utr_reference && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              UTR: {r.payment_proofs.utr_reference}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending"} />
                      {r.rejection_reason && (
                        <div className="text-[10px] text-red-400 mt-1 max-w-[180px] truncate" title={r.rejection_reason}>
                          Reason: {r.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {r.status === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(r)}
                            disabled={actioningId !== null}
                            className="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-40"
                            title="Approve & Activate Boost"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecordId(r.id);
                              setShowRejectModal(true);
                            }}
                            disabled={actioningId !== null}
                            className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-40"
                            title="Reject Request"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Reject Boost Request</h3>
                <p className="text-[11px] text-muted-foreground">Please provide a reason for rejecting this sponsored placement.</p>
              </div>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Receipt screenshot was blurry / UTR verification failed / Payment amount mismatch..."
              className="w-full h-24 p-3 rounded-xl border border-border bg-black text-xs text-foreground outline-none focus:border-red-500"
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRecordId(null);
                  setRejectionReason("");
                }}
                className="flex-1 h-10 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document View Lightbox Modal */}
      {viewingScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setViewingScreenshotUrl(null)}
              className="h-10 w-10 rounded-full bg-surface/80 text-foreground flex items-center justify-center border border-border/80 hover:bg-surface hover:text-gold cursor-pointer transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>
          <div className="w-full max-w-3xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-surface/20 p-2 shadow-2xl">
            {signedScreenshotUrl ? (
              signedScreenshotUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe src={signedScreenshotUrl} className="w-full h-[70vh] rounded-xl" title="Receipt PDF" />
              ) : (
                <img
                  src={signedScreenshotUrl}
                  alt="Payment Receipt Screenshot"
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              )
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
                Generating signed document URL...
              </div>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground/60 mt-3 max-w-md text-center leading-relaxed font-mono">
            Secure temporary staff access link. Expirable token injected.
          </div>
        </div>
      )}
    </div>
  );
}
