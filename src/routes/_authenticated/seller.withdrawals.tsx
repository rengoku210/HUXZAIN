import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { ArrowUpFromLine, Clock, Wallet, Inbox, Landmark, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useSellerTier } from "@/lib/seller/tier-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet, requestWithdrawal, checkAndReleaseEscrows, syncAndGetWallet } from "@/lib/wallet.functions";
import { parseWithdrawnOrderIds, getPayoutState, type OrderPayout } from "@/lib/payout-calculator";
import { toast } from "sonner";
import { useFinanceConfig } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/seller/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { tier } = useSellerTier();
  const { config: financeConfig } = useFinanceConfig();
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<OrderPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form State
  // Payouts are bank-transfer only. UPI payouts were removed per platform KYC/payout policy.
  const method = "bank_transfer" as const;
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Active tab for payouts view
  const [payoutTab, setPayoutTab] = useState<"eligible" | "cooling" | "dormant" | "withdrawn">("eligible");

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      try {
        await checkAndReleaseEscrows();
      } catch (err) {
        console.error("Failed to run checkAndReleaseEscrows:", err);
      }
      const w = await syncAndGetWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        // Fetch withdrawals history
        const { data: withdrawalsData } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        const historyList = withdrawalsData || [];
        setHistory(historyList);

        // Fetch completed orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });

        // Fetch user's reactivation transactions to know which order IDs have been reactivated
        const { data: txnsData } = await supabase
          .from("wallet_transactions")
          .select("reference_id")
          .eq("wallet_id", user.id)
          .eq("type", "withdrawal")
          .like("description", "%Reactivation Fee%");

        const reactivatedIds = new Set<string>((txnsData || []).map(t => t.reference_id).filter(Boolean));
        const withdrawnIds = parseWithdrawnOrderIds(historyList);

        const mappedPayouts = (ordersData || []).map(o => 
          getPayoutState(o, withdrawnIds, tier as any, reactivatedIds, financeConfig)
        );

        setPayouts(mappedPayouts);
      }
    } catch (e: any) {
      toast.error("Failed to load withdrawals data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user, tier]);

  const eligiblePayouts = payouts.filter(p => p.state === "eligible" || p.state === "reactivated");
  const coolingPayouts = payouts.filter(p => p.state === "cooling");
  const dormantPayouts = payouts.filter(p => p.state === "dormant");
  const withdrawnPayouts = payouts.filter(p => p.state === "withdrawn");

  // Sum of selected payouts
  const selectedAmount = Array.from(selectedIds).reduce((sum, id) => {
    const p = payouts.find(x => x.orderId === id);
    if (!p) return sum;
    // If state is reactivated, deduct 12% reactivation fee
    const payoutAmt = p.state === "reactivated" ? Math.round(p.netPayout * 0.88) : p.netPayout;
    return sum + payoutAmt;
  }, 0);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === eligiblePayouts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligiblePayouts.map(p => p.orderId)));
    }
  };

  // Reactivate dormant payout
  async function handleReactivate(payout: OrderPayout) {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const feeAmount = Math.round(payout.netPayout * 0.12);
    const confirmed = window.confirm(
      `Reactivating this dormant payout will deduct a 12% fee (₹${feeAmount}) from the payout amount upon withdrawal.\n\nDo you want to proceed?`
    );
    if (!confirmed) return;

    try {
      setReactivatingId(payout.orderId);
      
      // Log the reactivation fee transaction
      const { error: txnErr } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: user.id,
          type: "withdrawal",
          amount: -feeAmount,
          status: "completed",
          reference_id: payout.orderId,
          description: `Reactivation Fee (12%): Order #${payout.orderNumber.replace("AEX-", "")}`
        });

      if (txnErr) throw txnErr;

      // 1. Update order payout_status to 'reactivated'
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ payout_status: "reactivated", updated_at: new Date().toISOString() })
        .eq("id", payout.orderId);

      if (orderErr) throw orderErr;

      // 2. Sync wallet available balance: add netPayout and subtract feeAmount
      const w = await syncAndGetWallet(user.id);
      const { error: wallErr } = await supabase
        .from("wallets")
        .update({
          available_balance: w.available_balance + payout.netPayout - feeAmount,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (wallErr) throw wallErr;

      toast.success(`Payout successfully reactivated! A 12% fee of ₹${feeAmount} has been charged.`);
      await loadData();
    } catch (e: any) {
      toast.error("Failed to reactivate: " + e.message);
    } finally {
      setReactivatingId(null);
    }
  }

  async function handleWithdraw() {
    if (!user) return;
    
    if (selectedIds.size === 0) {
      toast.error("Please select at least one eligible payout to withdraw");
      return;
    }

    if (selectedAmount > (wallet?.available_balance || 0)) {
      toast.error("Selected amount exceeds your available wallet balance");
      return;
    }

    if (!accountHolder || !accountNumber || !ifscCode) {
      toast.error("Please fill in all bank transfer fields");
      return;
    }

    try {
      setSubmitting(true);

      // Serialize selected order IDs in the details column to map them to this withdrawal request
      const orderIdsSuffix = `|orders:${Array.from(selectedIds).join(",")}`;
      
      const details = {
        upi_id: null,
        account_holder: accountHolder + orderIdsSuffix,
        account_number: accountNumber || null,
        ifsc_code: ifscCode || null
      };

      await requestWithdrawal(user.id, selectedAmount, method, details);
      toast.success(`Withdrawal request of ₹${selectedAmount} for ${selectedIds.size} orders submitted!`);
      
      // Reset state
      setSelectedIds(new Set());
      setAccountHolder("");
      setAccountNumber("");
      setIfscCode("");
      await loadData();
    } catch (e: any) {
      toast.error("Withdrawal failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatCountdown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Payouts & Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your escrow release schedules, track cooling times, and claim available earnings.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Connecting to secure payouts database...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Eligible Settlement" value={fmt(wallet?.available_balance)} icon={Wallet} />
            <StatCard label="Total Pending Holds" value={fmt(wallet?.pending_balance)} icon={Clock} />
            <StatCard
              label="Selected for Payout"
              value={fmt(selectedAmount)}
              delta={`${selectedIds.size} orders selected`}
              icon={ShieldCheck}
            />
            <StatCard label="Auto-payout Tier" value={tier.toUpperCase()} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left side: Orders list divided by payout state */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex border-b border-border gap-2">
                <button
                  onClick={() => setPayoutTab("eligible")}
                  className={`pb-2.5 px-3 text-xs font-semibold relative transition-all border-none bg-transparent cursor-pointer ${
                    payoutTab === "eligible" ? "text-gold border-b-2 border-gold font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Eligible ({eligiblePayouts.length})
                </button>
                <button
                  onClick={() => setPayoutTab("cooling")}
                  className={`pb-2.5 px-3 text-xs font-semibold relative transition-all border-none bg-transparent cursor-pointer ${
                    payoutTab === "cooling" ? "text-gold border-b-2 border-gold font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cooling Down ({coolingPayouts.length})
                </button>
                <button
                  onClick={() => setPayoutTab("dormant")}
                  className={`pb-2.5 px-3 text-xs font-semibold relative transition-all border-none bg-transparent cursor-pointer ${
                    payoutTab === "dormant" ? "text-gold border-b-2 border-gold font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dormant ({dormantPayouts.length})
                </button>
                <button
                  onClick={() => setPayoutTab("withdrawn")}
                  className={`pb-2.5 px-3 text-xs font-semibold relative transition-all border-none bg-transparent cursor-pointer ${
                    payoutTab === "withdrawn" ? "text-gold border-b-2 border-gold font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Paid Out ({withdrawnPayouts.length})
                </button>
              </div>

              {payoutTab === "eligible" && (
                <PanelCard
                  title="Select Payouts to Withdraw"
                  action={
                    eligiblePayouts.length > 0 && (
                      <button
                        onClick={toggleSelectAll}
                        className="text-xs text-gold border-none bg-transparent hover:underline cursor-pointer font-semibold"
                      >
                        {selectedIds.size === eligiblePayouts.length ? "Deselect All" : "Select All"}
                      </button>
                    )
                  }
                >
                  {eligiblePayouts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No eligible earnings ready for withdrawal. Check the "Cooling Down" tab.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eligiblePayouts.map((p) => {
                        const isReactivated = p.state === "reactivated";
                        const finalPayout = isReactivated ? Math.round(p.netPayout * 0.88) : p.netPayout;
                        const isSelected = selectedIds.has(p.orderId);

                        return (
                          <div
                            key={p.orderId}
                            onClick={() => toggleSelect(p.orderId)}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? "bg-gold/5 border-gold/40 shadow-sm" 
                                : "bg-surface/20 border-border/60 hover:bg-surface/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Controlled by outer div onClick
                                className="accent-gold size-4 cursor-pointer shrink-0"
                              />
                              <div>
                                <div className="font-bold text-xs text-foreground/90">{p.listingTitle}</div>
                                <div className="text-[10px] text-muted-foreground flex gap-3 mt-1 font-mono">
                                  <span>Order: #{p.orderNumber.replace("AEX-", "")}</span>
                                  <span>Completed: {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : ""}</span>
                                  {isReactivated && (
                                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider">
                                      Reactivated
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-sm text-gold">{fmt(finalPayout)}</div>
                              {isReactivated && (
                                <div className="text-[9px] text-muted-foreground line-through">
                                  {fmt(p.netPayout)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>
              )}

              {payoutTab === "cooling" && (
                <PanelCard title="Escrow Payouts in Cooling Period">
                  <div className="rounded-xl bg-surface/40 border border-border/80 p-4 mb-4 text-xs text-muted-foreground leading-relaxed flex gap-2">
                    <Clock size={16} className="text-gold shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      Payouts are held in cooling based on your seller plan tier to ensure transaction security. 
                      <span className="text-gold font-bold"> {tier.toUpperCase()}</span> plan cooling is{" "}
                      <span className="text-gold font-bold">
                        {tier === "enterprise" ? "1 Day" : tier === "elite" ? "3 Days" : tier === "pro" ? "5 Days" : "7 Days"}
                      </span>.
                    </div>
                  </div>

                  {coolingPayouts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No payouts currently in cooling.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {coolingPayouts.map((p) => (
                        <div key={p.orderId} className="p-4 rounded-2xl border border-border/60 bg-surface/20 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-foreground/80">{p.listingTitle}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-3 mt-1 font-mono">
                              <span>Order: #{p.orderNumber.replace("AEX-", "")}</span>
                              <span>Completed: {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : ""}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-sm text-foreground/60">{fmt(p.netPayout)}</div>
                            <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-1 justify-end">
                              <Clock size={11} /> Eligible in {formatCountdown(p.timeLeftMs)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PanelCard>
              )}

              {payoutTab === "dormant" && (
                <PanelCard title="Dormant Earnings (Exceeded 30-Day Claim Window)">
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-4 text-xs text-muted-foreground leading-relaxed flex gap-2">
                    <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      Payouts that are not withdrawn within 30 days of becoming eligible enter a dormant state. 
                      Reactivating a dormant payout requires a <span className="text-gold font-bold">12% fee</span>, which will be automatically adjusted upon withdrawal.
                    </div>
                  </div>

                  {dormantPayouts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No dormant payouts. Great job claiming your earnings on time!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dormantPayouts.map((p) => {
                        const fee = Math.round(p.netPayout * 0.12);
                        const reactivatedAmt = p.netPayout - fee;

                        return (
                          <div key={p.orderId} className="p-4 rounded-2xl border border-border/60 bg-surface/20 flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <div className="font-bold text-xs text-foreground/80">{p.listingTitle}</div>
                              <div className="text-[10px] text-muted-foreground flex gap-3 mt-1 font-mono">
                                <span>Order: #{p.orderNumber.replace("AEX-", "")}</span>
                                <span>Net: {fmt(p.netPayout)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="font-mono font-bold text-xs text-destructive">Fee: {fmt(fee)}</div>
                                <div className="font-mono font-bold text-xs text-emerald-400">Claims: {fmt(reactivatedAmt)}</div>
                              </div>
                              <button
                                type="button"
                                disabled={reactivatingId === p.orderId}
                                onClick={() => handleReactivate(p)}
                                className="h-8 px-4 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer"
                              >
                                {reactivatingId === p.orderId ? "Reactivating…" : "Reactivate"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>
              )}

              {payoutTab === "withdrawn" && (
                <PanelCard title="Withdrawn Order Payouts">
                  {withdrawnPayouts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No completed withdrawals.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {withdrawnPayouts.map((p) => (
                        <div key={p.orderId} className="p-4 rounded-2xl border border-border/40 bg-surface/10 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-foreground/60">{p.listingTitle}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-3 mt-1 font-mono">
                              <span>Order: #{p.orderNumber.replace("AEX-", "")}</span>
                              <span>Completed: {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : ""}</span>
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-xs text-muted-foreground flex items-center gap-1.5 bg-surface/30 px-2.5 py-1 rounded-full border border-border/40">
                            <CheckCircle size={12} className="text-emerald-400" />
                            {fmt(p.netPayout)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PanelCard>
              )}
            </div>

            {/* Right side: Withdrawal details & request form */}
            <div className="lg:col-span-1 space-y-6">
              <PanelCard title="Request Payout">
                <div className="space-y-4 text-sm">
                  <div className="p-3.5 rounded-2xl border border-border bg-surface/30 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Total Request Amount
                    </div>
                    <div className="font-display text-3xl font-bold text-gold mt-1.5">
                      {fmt(selectedAmount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
                      {selectedIds.size} order payouts selected
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Payout Method</span>
                    <div className="mt-1.5 h-9 rounded-lg bg-gold text-black font-bold text-xs flex items-center justify-center">
                      Bank Transfer
                    </div>
                  </div>

                  {(
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Account Holder Name</span>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="mt-1.5 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Account Number</span>
                        <input
                          type="text"
                          placeholder="1234567890"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="mt-1.5 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">IFSC Code</span>
                        <input
                          type="text"
                          placeholder="SBIN0001234"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          className="mt-1.5 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={submitting || selectedIds.size === 0}
                    className="w-full h-10 rounded-lg bg-gold text-black font-bold mt-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 border-none cursor-pointer"
                  >
                    {submitting ? "Processing Request..." : "Confirm Payout"}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    Withdrawal requests are audited by moderators. Processing generally takes less than 24 hours.
                  </p>
                </div>
              </PanelCard>
            </div>
          </div>

          {/* Withdrawals Audit History */}
          <PanelCard title="Withdrawal Audit History">
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                  <Inbox size={20} />
                </div>
                <p className="font-semibold text-sm">No withdrawals yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your withdrawal history will appear here once you make your first payout request.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left font-medium pb-2">Request Date</th>
                      <th className="text-left font-medium">Method</th>
                      <th className="text-left font-medium">Details</th>
                      <th className="text-right font-medium">Status</th>
                      <th className="text-right font-medium pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const cleanUpi = String(h.upi_id || "").split("|")[0];
                      const cleanHolder = String(h.account_holder || "").split("|")[0];
                      return (
                        <tr key={h.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-semibold text-foreground text-xs">
                            {h.method === "upi" ? "UPI ID" : "Bank Transfer"}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {h.method === "upi" ? cleanUpi : `${cleanHolder} · ${h.account_number} (${h.ifsc_code})`}
                          </td>
                          <td className="py-3 text-right">
                            <StatusPill
                              status={
                                h.status === "pending"
                                  ? "Request"
                                  : h.status === "review"
                                    ? "Review"
                                    : h.status === "approved"
                                      ? "Approved"
                                      : h.status === "completed" || h.status === "paid"
                                        ? "Paid"
                                        : "Rejected"
                              }
                            />
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-foreground">
                            {fmt(h.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>
        </>
      )}
    </div>
  );
}
