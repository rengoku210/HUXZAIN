// src/routes/_authenticated/admin.withdrawals.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatusPill } from "@/components/seller/SellerShell";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Search, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck,
  ClipboardList
} from "lucide-react";
import { updateWithdrawalStatus } from "@/lib/seller/subscription.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals Ledger — HUXZAIN Admin" }] }),
  component: WithdrawalsPage,
});

interface WithdrawalRecord {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  upi_id: string | null;
  upi_qr_url: string | null;
  account_holder: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    frozen_at: string | null;
    available_balance?: number;
    pending_balance?: number;
  };
}

function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Status notes modal
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WithdrawalRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<"pending" | "review" | "approved" | "completed" | "rejected">("review");
  const [adminNotes, setAdminNotes] = useState("");

  const supabase = getSupabase();

  const fetchWithdrawals = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: wData, error: wError } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (wError) throw wError;

      if (wData && wData.length > 0) {
        // Fetch profiles
        const userIds = wData.map(w => w.user_id);
        const [profilesRes, walletsRes] = await Promise.all([
          supabase.from("profiles").select("id, username, display_name, frozen_at").in("id", userIds),
          supabase.from("wallets").select("user_id, available_balance, pending_balance").in("user_id", userIds)
        ]);

        const mapped = wData.map((w: any) => {
          const profile = profilesRes.data?.find(p => p.id === w.user_id);
          const wallet = walletsRes.data?.find(wt => wt.user_id === w.user_id);
          return {
            ...w,
            profile: profile ? {
              username: profile.username,
              display_name: profile.display_name,
              frozen_at: profile.frozen_at,
              available_balance: wallet?.available_balance ?? 0,
              pending_balance: wallet?.pending_balance ?? 0
            } : undefined
          };
        });
        setWithdrawals(mapped);
      } else {
        setWithdrawals([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load withdrawals: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const triggerNotesModal = (w: WithdrawalRecord, status: typeof targetStatus) => {
    setSelectedRecord(w);
    setTargetStatus(status);
    setAdminNotes("");
    setShowNotesModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRecord) return;
    setActioningId(selectedRecord.id);

    try {
      // Execute the status change server action
      await updateWithdrawalStatus({
        data: {
          withdrawalId: selectedRecord.id,
          status: targetStatus,
          adminNotes: adminNotes.trim()
        }
      });

      // Log action to staff action logs
      const { data: authUser } = await supabase!.auth.getUser();
      const staffId = authUser.user?.id;
      if (staffId) {
        await supabase!.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "update_withdrawal_status",
          target_type: "withdrawal",
          target_id: selectedRecord.id,
          previous_value: selectedRecord.status,
          new_value: targetStatus,
          new_value_meta: JSON.stringify({ notes: adminNotes })
        });
      }

      toast.success(`Withdrawal status updated to ${targetStatus}`);
      setShowNotesModal(false);
      await fetchWithdrawals();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update status: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleFreeze = async (w: WithdrawalRecord) => {
    if (!supabase) return;
    const isFrozen = !!w.profile?.frozen_at;
    const confirmMsg = isFrozen 
      ? "Do you want to unfreeze this seller account?" 
      : "Are you sure you want to freeze this seller account? This will block their withdrawals and listings.";
    
    if (!confirm(confirmMsg)) return;

    setActioningId(w.id);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      const frozenVal = isFrozen ? null : new Date().toISOString();
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ frozen_at: frozenVal })
        .eq("id", w.user_id);

      if (updErr) throw updErr;

      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: isFrozen ? "unfreeze_user" : "freeze_user",
          target_type: "profile",
          target_id: w.user_id,
          previous_value: isFrozen ? "frozen" : "active",
          new_value: isFrozen ? "active" : "frozen",
          notes: isFrozen ? "Unfroze user payouts" : "Froze user payouts due to audit verification"
        });
      }

      toast.success(isFrozen ? "Account unfrozen." : "Account frozen successfully.");
      await fetchWithdrawals();
    } catch (e: any) {
      console.error(e);
      toast.error(`Action failed: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filtered = withdrawals.filter((w) => {
    const matchesStatus = filter === "all" || w.status === filter;
    
    const name = w.profile?.display_name || w.profile?.username || "";
    const upi = w.upi_id || "";
    const bank = w.account_number || "";
    
    const matchesSearch =
      w.user_id.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      upi.toLowerCase().includes(search.toLowerCase()) ||
      bank.toLowerCase().includes(search.toLowerCase());
      
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-6 text-gold" /> Withdrawals Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, audit, approve, and process payouts using the strict Request → Review → Approved → Paid ledger workflow.
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20 animate-in fade-in"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60 font-sans">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Seller ID, Name, Account, UPI..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Request (Pending)</option>
            <option value="review">Review (Under Review)</option>
            <option value="approved">Approved (Payment Queued)</option>
            <option value="completed">Paid (Completed)</option>
            <option value="rejected">Rejected (Refunded)</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-mono font-bold">
          Total Queue: {filtered.length} requests
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No payouts found" desc="No payouts requests match the selected filters." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Account Details</th>
                  <th className="px-6 py-4">Request Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((w) => {
                  let displayStatus = "Request";
                  if (w.status === "review") displayStatus = "Review";
                  else if (w.status === "approved") displayStatus = "Approved";
                  else if (w.status === "completed" || w.status === "paid") displayStatus = "Paid";
                  else if (w.status === "rejected") displayStatus = "Rejected";

                  const cleanUpi = String(w.upi_id || "").split("|")[0];
                  const cleanHolder = String(w.account_holder || "").split("|")[0];

                  return (
                    <tr 
                      key={w.id} 
                      className={`hover:bg-surface/20 transition-colors ${
                        w.profile?.frozen_at ? "bg-red-500/5 hover:bg-red-500/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {w.profile?.display_name || w.profile?.username || w.user_id}
                          {w.profile?.frozen_at && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 uppercase">
                              Frozen
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {w.user_id}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        {fmt(w.amount)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-muted-foreground uppercase">
                        {w.method === "upi" ? "UPI ID" : "Bank"}
                      </td>
                      <td className="px-6 py-4">
                        {w.method === "upi" ? (
                          <div className="font-mono text-foreground truncate max-w-[200px]">{cleanUpi}</div>
                        ) : (
                          <div className="space-y-0.5 text-foreground max-w-[220px]">
                            <div className="truncate font-sans font-semibold">{cleanHolder}</div>
                            <div className="font-mono">Ac: {w.account_number}</div>
                            <div className="font-mono text-muted-foreground text-[10px]">IFSC: {w.ifsc_code}</div>
                          </div>
                        )}
                        {w.admin_notes && (
                          <div className="mt-1 text-[10px] text-amber-500 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded truncate max-w-[200px]">
                            {w.admin_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono">
                        {new Date(w.created_at).toLocaleDateString()} {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={displayStatus} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {w.status === "pending" && (
                          <>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "review")}
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Move to Review
                            </button>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "rejected")}
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {w.status === "review" && (
                          <>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "approved")}
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Approve Details
                            </button>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "rejected")}
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {w.status === "approved" && (
                          <>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "completed")}
                              className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-bold bg-gold text-black hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none"
                            >
                              Release Payout (Paid)
                            </button>
                            <button
                              disabled={actioningId !== null || !!w.profile?.frozen_at}
                              onClick={() => triggerNotesModal(w, "rejected")}
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleFreeze(w)}
                          className={`inline-flex items-center justify-center size-8 rounded-lg border border-border transition-all cursor-pointer ${
                            w.profile?.frozen_at 
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400" 
                              : "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                          }`}
                          title={w.profile?.frozen_at ? "Unfreeze Payouts" : "Freeze Payouts"}
                        >
                          {w.profile?.frozen_at ? <UserCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit action notes modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="text-gold size-4" /> 
              {targetStatus === "review" 
                ? "Move request to Under Review" 
                : targetStatus === "approved"
                  ? "Approve payout details"
                  : targetStatus === "completed"
                    ? "Release funds / Mark as Paid"
                    : "Reject withdrawal request"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide ledger notes detailing document statuses, bank txn IDs, or reasons for rejection.
            </p>
            <textarea
              required={targetStatus === "rejected"}
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                targetStatus === "completed"
                  ? "e.g. Dispatched funds via GPay reference txn: IMPS9385720184."
                  : targetStatus === "rejected"
                    ? "e.g. Account number digit mismatch. Please re-enter Bank Transfer details."
                    : "e.g. Checking account with compliance department."
              }
              className="w-full p-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50 resize-none"
            />
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
                onClick={handleUpdateStatus}
                disabled={actioningId !== null || (targetStatus === "rejected" && !adminNotes.trim())}
                className="flex-1 h-10 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
