// src/routes/_authenticated/admin.verifications.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatusPill } from "@/components/seller/SellerShell";
import { onVerificationApproved, onVerificationRejected } from "@/lib/notifications/hooks";
import { 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  FileText,
  UserSquare2,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "KYC Verifications — HUXZAIN Admin" }] }),
  component: KYCVerifications,
});
interface VerificationRecord {
  id: string;
  government_id_url: string | null;
  government_id_status?: string;
  government_id_type_1?: string | null;
  government_id_type_2?: string | null;
  government_id_2_url?: string | null;
  government_id_2_status?: string;
  selfie_url: string | null;
  selfie_status?: string;
  address_proof_url: string | null;
  address_proof_status?: string;
  payout_details: {
    method?: "upi" | "bank_transfer";
    accountHolder?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  } | null;
  status: string;
  admin_notes: string | null;
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
  
  // Auditing details popup
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [notesDecision, setNotesDecision] = useState<"rejected" | "action_required">("rejected");
  const [adminNotes, setAdminNotes] = useState("");
  const [govtDecision, setGovtDecision] = useState<"approved" | "rejected" | "under_review">("under_review");
  const [govt2Decision, setGovt2Decision] = useState<"approved" | "rejected" | "under_review">("under_review");
  const [selfieDecision, setSelfieDecision] = useState<"approved" | "rejected" | "under_review">("under_review");
  const [addrDecision, setAddrDecision] = useState<"approved" | "rejected" | "under_review">("under_review");
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

  const triggerNotesModal = (id: string, decision: "rejected" | "action_required") => {
    setSelectedRecordId(id);
    setNotesDecision(decision);
    setAdminNotes("");
    
    // Find the record to pre-populate current statuses
    const existing = verifications.find(v => v.id === id);
    setGovtDecision(
      existing?.government_id_status === "APPROVED" 
        ? "approved" 
        : existing?.government_id_status === "REJECTED" 
          ? "rejected" 
          : "under_review"
    );
    setGovt2Decision(
      existing?.government_id_2_status === "APPROVED" 
        ? "approved" 
        : existing?.government_id_2_status === "REJECTED" 
          ? "rejected" 
          : "under_review"
    );
    setSelfieDecision(
      existing?.selfie_status === "APPROVED" 
        ? "approved" 
        : existing?.selfie_status === "REJECTED" 
          ? "rejected" 
          : "under_review"
    );
    setAddrDecision(
      existing?.address_proof_status === "APPROVED" 
        ? "approved" 
        : existing?.address_proof_status === "REJECTED" 
          ? "rejected" 
          : "under_review"
    );
    
    setShowNotesModal(true);
  };

  const handleDecision = async (
    id: string, 
    decision: "approved" | "rejected" | "action_required", 
    notes = "",
    docResubmissions?: {
      government_id?: "approved" | "rejected" | "under_review";
      government_id_2?: "approved" | "rejected" | "under_review";
      selfie?: "approved" | "rejected" | "under_review";
      address_proof?: "approved" | "rejected" | "under_review";
    }
  ) => {
    if (!supabase) return;
    
    setActioningId(id);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      const existing = verifications.find(v => v.id === id);
      
      let govtStatus = "APPROVED";
      let govt2Status = "APPROVED";
      let selfieStatus = "APPROVED";
      let addrStatus = "APPROVED";

      if (decision === "approved") {
        govtStatus = "APPROVED";
        govt2Status = "APPROVED";
        selfieStatus = "APPROVED";
        addrStatus = "APPROVED";
      } else if (decision === "rejected") {
        govtStatus = "REJECTED";
        govt2Status = "REJECTED";
        selfieStatus = "REJECTED";
        addrStatus = "REJECTED";
      } else if (decision === "action_required" && docResubmissions) {
        govtStatus = !existing?.government_id_url 
          ? "NOT_STARTED" 
          : (docResubmissions.government_id === "approved" ? "APPROVED" : docResubmissions.government_id === "rejected" ? "REJECTED" : "UNDER_REVIEW");

        govt2Status = !existing?.government_id_2_url 
          ? "NOT_STARTED" 
          : (docResubmissions.government_id_2 === "approved" ? "APPROVED" : docResubmissions.government_id_2 === "rejected" ? "REJECTED" : "UNDER_REVIEW");
          
        selfieStatus = !existing?.selfie_url 
          ? "NOT_STARTED" 
          : (docResubmissions.selfie === "approved" ? "APPROVED" : docResubmissions.selfie === "rejected" ? "REJECTED" : "UNDER_REVIEW");
          
        addrStatus = !existing?.address_proof_url 
          ? "NOT_STARTED" 
          : (docResubmissions.address_proof === "approved" ? "APPROVED" : docResubmissions.address_proof === "rejected" ? "REJECTED" : "UNDER_REVIEW");
      }

      let overallStatus: "approved" | "rejected" | "action_required" | "pending" = decision;
      if (decision === "action_required" && docResubmissions) {
        const statuses = [govtStatus, govt2Status, selfieStatus, addrStatus];
        if (statuses.includes("REJECTED")) {
          overallStatus = "action_required";
        } else if (statuses.every(s => s === "APPROVED" || s === "NOT_STARTED")) {
          overallStatus = "approved";
        } else {
          overallStatus = "pending";
        }
      }

      // 1. Update verifications status and notes
      const { error: vErr } = await supabase
        .from("verifications")
        .update({ 
          status: overallStatus, 
          admin_notes: notes || null,
          government_id_status: govtStatus,
          government_id_2_status: govt2Status,
          selfie_status: selfieStatus,
          address_proof_status: addrStatus,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (vErr) throw vErr;

      // 2. Update profiles table verification status
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ 
          is_verified: decision === "approved", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (pErr) throw pErr;

      // 3. Log staff action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: decision === "approved" ? "approve_kyc" : decision === "action_required" ? "request_kyc_resubmission" : "reject_kyc",
          target_type: "profile",
          target_id: id,
          previous_value: "pending",
          new_value: decision,
          new_value_meta: JSON.stringify({ notes }),
          ip_address: null
        });
      }

      // 4. HX-006: verification approved/rejected notifications via the engine.
      //    "action_required" has no matrix event yet, so it keeps its in-app note.
      if (decision === "approved") {
        try {
          await onVerificationApproved(id);
        } catch (notifEx) {
          console.warn("[AdminVerifications] Verification-approved notification exception:", notifEx);
        }
      } else if (decision === "rejected") {
        try {
          await onVerificationRejected(id);
        } catch (notifEx) {
          console.warn("[AdminVerifications] Verification-rejected notification exception:", notifEx);
        }
      } else {
        await supabase.from("notifications").insert({
          user_id: id,
          kind: "kyc.action_required",
          title: "KYC Action Required: Resubmission Request",
          body: `Your verification requires attention. Please view details and re-upload documents. Reason: ${notes || "Missing document files."}`,
        });
      }

      // If approved, update active subscription to 'Verified' plan if they are currently on 'Free'
      if (decision === "approved") {
        const { data: sub } = await supabase
          .from("seller_subscriptions")
          .select("plan_name")
          .eq("seller_id", id)
          .maybeSingle();

        if (sub && sub.plan_name === "Free") {
          await supabase
            .from("seller_subscriptions")
            .update({ 
              plan_name: "Verified",
              updated_at: new Date().toISOString()
            })
            .eq("seller_id", id);
        }
      }

      toast.success(`Verification status updated to ${decision}.`);
      setShowNotesModal(false);
      await loadKYC();
    } catch (e: any) {
      console.error(e);
      toast.error(`Operation failed: ${e.message}`);
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

  const selectedRecord = verifications.find(v => v.id === selectedRecordId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-gold" /> KYC Verification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auditing verifications ledger: Government ID, Selfie holds, utility address proofs, and payout account details.
          </p>
        </div>
        <button
          onClick={loadKYC}
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
            <option value="action_required">Action Required (Resubmit)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium font-mono">
          Total Queue: {filtered.length} submissions
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
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4">Seller</th>
                  <th className="px-5 py-4"><span className="flex items-center gap-1"><FileText size={12}/> Government ID 1</span></th>
                  <th className="px-5 py-4"><span className="flex items-center gap-1"><FileText size={12}/> Government ID 2</span></th>
                  <th className="px-5 py-4"><span className="flex items-center gap-1"><UserSquare2 size={12}/> Verification Selfie</span></th>
                  <th className="px-5 py-4"><span className="flex items-center gap-1"><FileText size={12}/> Address Proof</span></th>
                  <th className="px-5 py-4"><span className="flex items-center gap-1"><Wallet size={12}/> Payout Account Details</span></th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">
                        {v.profile?.display_name || v.profile?.username || "Anonymous User"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {v.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      {v.government_id_url ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setViewingDocUrl(v.government_id_url || null)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer font-semibold"
                          >
                            <Eye size={12} /> View ID 1
                          </button>
                          {v.government_id_type_1 && (
                            <div className="text-[9px] uppercase font-bold text-muted-foreground">
                              Type: {v.government_id_type_1}
                            </div>
                          )}
                          <div>
                            <StatusPill 
                              status={
                                v.government_id_status === "APPROVED" 
                                  ? "Completed" 
                                  : v.government_id_status === "REJECTED" 
                                    ? "Rejected" 
                                    : v.government_id_status === "UNDER_REVIEW" 
                                      ? "Review" 
                                      : "Pending"
                              } 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {v.government_id_2_url ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setViewingDocUrl(v.government_id_2_url || null)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer font-semibold"
                          >
                            <Eye size={12} /> View ID 2
                          </button>
                          {v.government_id_type_2 && (
                            <div className="text-[9px] uppercase font-bold text-muted-foreground">
                              Type: {v.government_id_type_2}
                            </div>
                          )}
                          <div>
                            <StatusPill 
                              status={
                                v.government_id_2_status === "APPROVED" 
                                  ? "Completed" 
                                  : v.government_id_2_status === "REJECTED" 
                                    ? "Rejected" 
                                    : v.government_id_2_status === "UNDER_REVIEW" 
                                      ? "Review" 
                                      : "Pending"
                              } 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {v.selfie_url ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setViewingDocUrl(v.selfie_url || null)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer font-semibold"
                          >
                            <Eye size={12} /> View Selfie
                          </button>
                          <div>
                            <StatusPill 
                              status={
                                v.selfie_status === "APPROVED" 
                                  ? "Completed" 
                                  : v.selfie_status === "REJECTED" 
                                    ? "Rejected" 
                                    : v.selfie_status === "UNDER_REVIEW" 
                                      ? "Review" 
                                      : "Pending"
                              } 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {v.address_proof_url ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setViewingDocUrl(v.address_proof_url || null)}
                            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline bg-transparent border-none cursor-pointer font-semibold"
                          >
                            <Eye size={12} /> View Address
                          </button>
                          <div>
                            <StatusPill 
                              status={
                                v.address_proof_status === "APPROVED" 
                                  ? "Completed" 
                                  : v.address_proof_status === "REJECTED" 
                                    ? "Rejected" 
                                    : v.address_proof_status === "UNDER_REVIEW" 
                                      ? "Review" 
                                      : "Pending"
                              } 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {v.payout_details ? (
                        <div className="space-y-1 text-[10px] max-w-[220px] bg-background/30 p-2 rounded border border-border/50">
                          <div className="font-bold uppercase text-gold">
                            {v.payout_details.method === "upi" ? "UPI Payout" : "Bank Transfer"}
                          </div>
                          {v.payout_details.method === "upi" ? (
                            <div className="font-mono truncate">{v.payout_details.upiId}</div>
                          ) : (
                            <div className="space-y-0.5 font-mono">
                              <div className="truncate font-sans font-semibold text-foreground">{v.payout_details.accountHolder}</div>
                              <div>Ac: {v.payout_details.accountNumber}</div>
                              <div>IFSC: {v.payout_details.ifscCode}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill 
                        status={
                          v.status === 'pending' 
                            ? 'Pending' 
                            : v.status === 'approved' 
                              ? 'Completed' 
                              : v.status === 'action_required'
                                ? 'Review'
                                : 'Paused'
                        } 
                      />
                    </td>
                    <td className="px-5 py-4 text-right space-y-1.5 whitespace-nowrap">
                      {v.status === "pending" && (
                        <div className="flex flex-col gap-1.5 justify-end">
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleDecision(v.id, "approved")}
                            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 disabled:opacity-50 transition-all border-none cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => triggerNotesModal(v.id, "action_required")}
                            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            Need Resubmit
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => triggerNotesModal(v.id, "rejected")}
                            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            Reject
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

      {/* Audit Action Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
              {notesDecision === "action_required" ? "KYC Action Required Notes" : "Reject KYC Verification"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide feedback detailing the document issues or resubmission instructions. This message will be sent to the seller.
            </p>
            <textarea
              required
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Please upload a clearer selfie holding your passport. The ID image was blurry."
              className="w-full p-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50 resize-none"
            />
            {notesDecision === "action_required" && selectedRecord && (
              <div className="space-y-3 border-y border-border/50 py-3 text-left">
                <div className="text-xs font-bold text-foreground">Set Document Audit Results:</div>
                
                {selectedRecord.government_id_url && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground block">Government ID 1 Status</label>
                    <select
                      value={govtDecision}
                      onChange={(e) => setGovtDecision(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:border-gold outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected (Needs Resubmit)</option>
                    </select>
                  </div>
                )}

                {selectedRecord.government_id_2_url && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground block">Government ID 2 Status</label>
                    <select
                      value={govt2Decision}
                      onChange={(e) => setGovt2Decision(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:border-gold outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected (Needs Resubmit)</option>
                    </select>
                  </div>
                )}

                {selectedRecord.selfie_url && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground block">Verification Selfie Status</label>
                    <select
                      value={selfieDecision}
                      onChange={(e) => setSelfieDecision(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:border-gold outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected (Needs Resubmit)</option>
                    </select>
                  </div>
                )}

                {selectedRecord.address_proof_url && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground block">Address Proof Status</label>
                    <select
                      value={addrDecision}
                      onChange={(e) => setAddrDecision(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:border-gold outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected (Needs Resubmit)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="flex-1 h-10 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecision(selectedRecordId!, notesDecision, adminNotes, { government_id: govtDecision, government_id_2: govt2Decision, selfie: selfieDecision, address_proof: addrDecision })}
                disabled={actioningId !== null || !adminNotes.trim()}
                className="flex-1 h-10 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
              >
                Submit Action
              </button>
            </div>
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
