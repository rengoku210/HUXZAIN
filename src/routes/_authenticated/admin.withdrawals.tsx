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
  UserCheck 
} from "lucide-react";
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
  created_at: string;
  updated_at: string;
  // Joined profile info
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

  const handleApprove = async (w: WithdrawalRecord) => {
    if (!supabase) return;
    if (!confirm(`Are you sure you want to approve this withdrawal of ₹${(w.amount / 100).toLocaleString()}?`)) return;

    setActioningId(w.id);
    try {
      // 1. Get staff info
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      // 2. Update status
      const { error: updErr } = await supabase
        .from("withdrawals")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", w.id);

      if (updErr) throw updErr;

      // 3. Log action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "approve_withdrawal",
          target_type: "withdrawal",
          target_id: w.id,
          previous_value: "pending",
          new_value: "completed",
          notes: `Approved payout of ₹${w.amount / 100}`
        });
      }

      toast.success("Withdrawal approved successfully.");
      await fetchWithdrawals();
    } catch (e: any) {
      console.error(e);
      toast.error(`Approval failed: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (w: WithdrawalRecord) => {
    if (!supabase) return;
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return; // cancelled

    setActioningId(w.id);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      // 1. Update status
      const { error: updErr } = await supabase
        .from("withdrawals")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", w.id);

      if (updErr) throw updErr;

      // 2. Return funds to wallet available_balance
      const currentAvailable = w.profile?.available_balance ?? 0;
      const { error: wErr } = await supabase
        .from("wallets")
        .update({ available_balance: currentAvailable + w.amount, updated_at: new Date().toISOString() })
        .eq("user_id", w.user_id);

      if (wErr) throw wErr;

      // 3. Create a transaction record for refund/rejection
      await supabase.from("wallet_transactions").insert({
        wallet_id: w.user_id,
        type: "refund",
        amount: w.amount,
        status: "completed",
        reference_id: w.id,
        description: `Payout rejection refund: ${reason || 'Details check failed'}`
      });

      // 4. Log action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "reject_withdrawal",
          target_type: "withdrawal",
          target_id: w.id,
          previous_value: "pending",
          new_value: "rejected",
          notes: `Rejected payout of ₹${w.amount / 100}. Reason: ${reason}`
        });
      }

      // 5. Notify seller
      await supabase.from("notifications").insert({
        user_id: w.user_id,
        kind: "withdrawal.rejected",
        title: "Withdrawal Request Rejected",
        body: `Your withdrawal of ₹${(w.amount / 100).toLocaleString()} was rejected. Reason: ${reason || 'Details verification failed'}. Funds returned to available balance.`
      });

      toast.success("Withdrawal rejected and funds refunded to seller wallet.");
      await fetchWithdrawals();
    } catch (e: any) {
      console.error(e);
      toast.error(`Rejection failed: ${e.message}`);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-6 text-gold" /> Withdrawals Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve seller payout withdrawals, check account details, and enforce freezes.
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
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
            <option value="all">All Withdrawals</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium">
          Showing {filtered.length} withdrawal records
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
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payout Method</th>
                  <th className="px-6 py-4">Account Details</th>
                  <th className="px-6 py-4">Request Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((w) => (
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
                      ₹{(w.amount / 100).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-muted-foreground uppercase">
                      {w.method === "upi" ? "UPI" : "Bank Transfer"}
                    </td>
                    <td className="px-6 py-4">
                      {w.method === "upi" ? (
                        <div className="font-mono text-foreground">{w.upi_id}</div>
                      ) : (
                        <div className="space-y-0.5 text-foreground">
                          <div><strong>Holder:</strong> {w.account_holder}</div>
                          <div className="font-mono"><strong>A/C:</strong> {w.account_number}</div>
                          <div className="font-mono text-muted-foreground text-[10px]"><strong>IFSC:</strong> {w.ifsc_code}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(w.created_at).toLocaleDateString()} {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={w.status === 'pending' ? 'Pending' : w.status === 'completed' ? 'Completed' : 'Disputed'} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {w.status === "pending" && (
                        <>
                          <button
                            disabled={actioningId !== null || !!w.profile?.frozen_at}
                            onClick={() => handleApprove(w)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId !== null || !!w.profile?.frozen_at}
                            onClick={() => handleReject(w)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
