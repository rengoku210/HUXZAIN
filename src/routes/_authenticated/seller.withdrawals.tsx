import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { ArrowUpFromLine, Clock, Wallet, Inbox, Landmark, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet, requestWithdrawal } from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"upi" | "bank_transfer">("upi");
  const [upiId, setUpiId] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const w = await getOrCreateWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setHistory(data);
      }
    } catch (e: any) {
      toast.error("Failed to load withdrawals data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleWithdraw() {
    if (!user) return;
    const value = Math.round(Number(amount));
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }
    if (value > wallet?.available_balance) {
      toast.error("Insufficient available balance");
      return;
    }

    if (method === "upi" && !upiId) {
      toast.error("Please provide a valid UPI ID");
      return;
    }
    if (method === "bank_transfer" && (!accountHolder || !accountNumber || !ifscCode)) {
      toast.error("Please fill in all bank transfer fields");
      return;
    }

    try {
      setSubmitting(true);
      const details = {
        upi_id: upiId,
        account_holder: accountHolder,
        account_number: accountNumber,
        ifsc_code: ifscCode
      };

      await requestWithdrawal(user.id, value, method, details);
      toast.success(`Withdrawal request of ₹${value} submitted successfully!`);
      setAmount("");
      setUpiId("");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-1">Request payouts and review history.</p>
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
            <StatCard label="Available" value={fmt(wallet?.available_balance)} icon={Wallet} />
            <StatCard label="Pending Approval" value={fmt(wallet?.pending_balance)} icon={Clock} />
            <StatCard
              label="Last payout"
              value={wallet?.last_payout_date ? new Date(wallet.last_payout_date).toLocaleDateString() : "—"}
              delta={wallet?.last_payout_date ? "Completed payout successfully" : "No payouts completed yet"}
              icon={ArrowUpFromLine}
            />
            <StatCard label="Auto-payout" value="Manual/Instant" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <PanelCard title="New withdrawal" className="lg:col-span-1">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Amount (INR)</span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-10 pl-7 pr-3 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Payout Method</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setMethod("upi")}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-all ${method === "upi" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("bank_transfer")}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-all ${method === "bank_transfer" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Bank Transfer
                    </button>
                  </div>
                </div>

                {method === "upi" ? (
                  <div>
                    <span className="text-xs text-muted-foreground">UPI ID</span>
                    <input
                      type="text"
                      placeholder="username@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div>
                      <span className="text-xs text-muted-foreground">Account Holder Name</span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Account Number</span>
                      <input
                        type="text"
                        placeholder="1234567890"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">IFSC Code</span>
                      <input
                        type="text"
                        placeholder="SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-gold text-black font-bold mt-2 hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Processing Request..." : "Confirm Payout"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Instant transfers generally arrive in 24 hours. Verification chimes automated.
                </p>
              </div>
            </PanelCard>

            <PanelCard title="History" className="lg:col-span-2">
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <Inbox size={20} />
                  </div>
                  <p className="font-medium">No withdrawals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your withdrawal history will appear here once you make your first payout request.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2">Date</th>
                        <th className="text-left font-medium">Method</th>
                        <th className="text-left font-medium">Details</th>
                        <th className="text-right font-medium">Status</th>
                        <th className="text-right font-medium pr-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-semibold text-foreground">
                            {h.method === "upi" ? "UPI ID" : "Bank Transfer"}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {h.method === "upi" ? h.upi_id : `${h.account_number} (${h.ifsc_code})`}
                          </td>
                          <td className="py-3 text-right">
                            <StatusPill
                              status={h.status === "pending" ? "Pending" : h.status === "completed" ? "Completed" : "Disputed"}
                            />
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-foreground">
                            {fmt(h.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelCard>
          </div>
        </>
      )}
    </div>
  );
}
