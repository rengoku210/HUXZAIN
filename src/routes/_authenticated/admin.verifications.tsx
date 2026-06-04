// src/routes/_authenticated/admin.verifications.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatusPill } from "@/components/seller/SellerShell";
import { 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  FileText
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "KYC Verifications — HUXZAIN Admin" }] }),
  component: KYCVerifications,
});

interface VerificationRecord {
  id: string;
  government_id_url: string | null;
  address_proof_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    email: string | null;
  };
}

function KYCVerifications() {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);

  const supabase = getSupabase();

  const loadKYC = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const uids = data.map(v => v.id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, email")
          .in("id", uids);

        const mapped = data.map((v: any) => {
          const profile = profiles?.find(p => p.id === v.id);
          return {
            ...v,
            profile: profile ? {
              username: profile.username,
              display_name: profile.display_name,
              email: profile.email
            } : undefined
          };
        });
        setVerifications(mapped);
      } else {
        setVerifications([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load KYC verifications: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKYC();
  }, []);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    if (!supabase) return;
    const confirmMsg = `Are you sure you want to mark this KYC verification as ${decision}?`;
    if (!confirm(confirmMsg)) return;

    setActioningId(id);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      // 1. Update verifications status
      const { error: vErr } = await supabase
        .from("verifications")
        .update({ status: decision, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (vErr) throw vErr;

      // 2. Update profiles table verification status
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ is_verified: decision === "approved", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (pErr) throw pErr;

      // 3. Log staff action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: decision === "approved" ? "approve_kyc" : "reject_kyc",
          target_type: "profile",
          target_id: id,
          previous_value: "pending",
          new_value: decision,
          notes: `KYC verification request resolved: ${decision}`
        });
      }

      // 4. Notify user
      await supabase.from("notifications").insert({
        user_id: id,
        kind: decision === "approved" ? "kyc.approved" : "kyc.rejected",
        title: decision === "approved" ? "KYC Verification Approved!" : "KYC Verification Rejected",
        body: decision === "approved" 
          ? "Congratulations! Your account verification has been approved. You now have a verified seller status badge!"
          : "Your account verification request was rejected. Please ensure uploaded documents are clear and submit again."
      });

      toast.success(`Verification status set to ${decision}.`);
      await loadKYC();
    } catch (e: any) {
      console.error(e);
      toast.error(`Recreation failed: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filtered = verifications.filter((v) => {
    const matchesStatus = filter === "all" || v.status === filter;
    
    const name = v.profile?.display_name || v.profile?.username || "";
    const email = v.profile?.email || "";
    
    const matchesSearch =
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
      
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-gold" /> KYC Verification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review uploaded seller identity verifications, compare documents, and grant verified badges.
          </p>
        </div>
        <button
          onClick={loadKYC}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
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
            placeholder="Search User ID, Name, Email..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="all">All Submissions</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium">
          Showing {filtered.length} verification requests
        </div>
      </div>

      {/* KYC Submissions Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No KYC requests found" desc="All submitted verifications have been fully audited." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Seller Details</th>
                  <th className="px-6 py-4">Government ID Link</th>
                  <th className="px-6 py-4">Address Proof Link</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Audited Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">
                        {v.profile?.display_name || v.profile?.username || "Anonymous User"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {v.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      {v.government_id_url ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingDocUrl(v.government_id_url)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer"
                          >
                            <Eye size={12} /> View ID Document
                          </button>
                          <a href={v.government_id_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {v.address_proof_url ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingDocUrl(v.address_proof_url)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer"
                          >
                            <Eye size={12} /> View Address Proof
                          </button>
                          <a href={v.address_proof_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(v.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={v.status === 'pending' ? 'Pending' : v.status === 'approved' ? 'Completed' : 'Paused'} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {v.status === "pending" && (
                        <>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleDecision(v.id, "approved")}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 disabled:opacity-50 transition-all border-none cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleDecision(v.id, "rejected")}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document View Lightbox Modal */}
      {viewingDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-border bg-black overflow-hidden shadow-2xl">
            <button
              onClick={() => setViewingDocUrl(null)}
              className="absolute top-4 right-4 z-10 size-9 rounded-full bg-black/60 border border-border text-white hover:bg-black flex items-center justify-center cursor-pointer font-bold"
            >
              &times;
            </button>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[400px]">
              <img 
                src={viewingDocUrl} 
                alt="Document Verification Proof" 
                className="max-w-full max-h-[75vh] object-contain rounded" 
              />
            </div>
            <div className="p-4 border-t border-border/60 bg-surface/30 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">URL: {viewingDocUrl}</span>
              <a 
                href={viewingDocUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1 text-gold hover:underline font-semibold"
              >
                <ExternalLink size={12} /> Open in new window
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
