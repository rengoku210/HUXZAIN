import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Landmark,
  Search,
  Calendar,
  AlertOctagon,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Briefcase,
  History,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  getFinancialOverview,
  searchTransactions,
  getWithdrawalRiskFlags,
} from "@/lib/admin/finances.functions";

export const Route = createFileRoute("/_authenticated/admin/finances")({
  head: () => ({ meta: [{ title: "Financial Control Center — HUXZAIN Admin" }] }),
  component: FinancialControl,
});

type Tab = "overview" | "transactions" | "settlements" | "withdrawal-risk";

function FinancialControl() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);

  // Risk Scan states
  const [riskUserId, setRiskUserId] = useState("");
  const [riskAmount, setRiskAmount] = useState(5000);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [riskScanned, setRiskScanned] = useState(false);
  const [riskScanBusy, setRiskScanBusy] = useState(false);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const data = await getFinancialOverview();
      setOverview(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load financial overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadOverviewData();
    } else if (activeTab === "transactions" || activeTab === "settlements") {
      handleSearch();
    }
  }, [activeTab]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchBusy(true);
    try {
      const data = await searchTransactions({
        data: {
          query: searchQuery,
          status_filter: statusFilter === "all" ? undefined : statusFilter,
          date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        },
      });
      setTransactions(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to search transactions");
    } finally {
      setSearchBusy(false);
    }
  };

  const handleRiskScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskUserId) {
      toast.error("Please enter a valid User ID.");
      return;
    }
    setRiskScanBusy(true);
    setRiskScanned(false);
    try {
      const flags = await getWithdrawalRiskFlags({
        data: {
          user_id: riskUserId.trim(),
          amount: Number(riskAmount),
        },
      });
      setRiskFlags(flags || []);
      setRiskScanned(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to scan risk factors");
    } finally {
      setRiskScanBusy(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const tabs = [
    { id: "overview", label: "Financial Overview", icon: TrendingUp },
    { id: "transactions", label: "Transaction Audit", icon: Search },
    { id: "settlements", label: "Sellers Settlements", icon: Briefcase },
    { id: "withdrawal-risk", label: "Risk Scanner", icon: AlertOctagon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Landmark className="text-gold" size={24} /> Financial Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit system revenue, monitor commission margins, track release settlement statuses, and scan withdrawal risks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const ActiveIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === t.id
                  ? "border-gold text-gold bg-gold/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/20"
              }`}
            >
              <ActiveIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && activeTab === "overview" ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Aggregating platform metrics...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && overview && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Total Volume (Completed)</span>
                    <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-3">{formatCurrency(overview.total_buyer_paid)}</div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden ring-1 ring-gold/20">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Platform Commission (Margin)</span>
                    <div className="size-7 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gold mt-3">{formatCurrency(overview.total_commission)}</div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Seller Net Earnings</span>
                    <div className="size-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Briefcase size={14} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-3">{formatCurrency(overview.total_seller_earnings)}</div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Total Paid Withdrawals</span>
                    <div className="size-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-400 mt-3">{formatCurrency(overview.total_withdrawn)}</div>
                </div>
              </div>

              {/* Sub-status breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Escrow On Hold (Disputes)</span>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(overview.total_on_hold)}</div>
                  <p className="text-[10px] text-muted-foreground">Locked funds currently being investigated by moderators.</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Pending cooling settlements</span>
                  <div className="text-xl font-bold text-amber-400">{formatCurrency(overview.total_pending)}</div>
                  <p className="text-[10px] text-muted-foreground">Funds passing through cooling-down security holds.</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Total Volume Refunded</span>
                  <div className="text-xl font-bold text-rose-500">{formatCurrency(overview.total_refunded)}</div>
                  <p className="text-[10px] text-muted-foreground">Margins lost due to dispute judgements or failed handshakes.</p>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {(activeTab === "transactions" || activeTab === "settlements") && (
            <>
              {/* Filter Row */}
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface/10 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Search Query</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Order ID, email, username..."
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold text-foreground"
                  />
                </div>
                {activeTab === "transactions" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold text-foreground"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="delivered">Delivered</option>
                      <option value="paid">Paid</option>
                      <option value="disputed">Disputed</option>
                      <option value="refunded">Refunded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1 text-xs outline-none focus:border-gold text-foreground"
                  />
                </div>
                <div className="space-y-1 flex items-end">
                  <button
                    type="submit"
                    disabled={searchBusy}
                    className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl bg-gold text-primary-foreground font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Search size={12} /> {searchBusy ? "Searching..." : "Apply Filter"}
                  </button>
                </div>
              </form>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 font-bold">Order ID</th>
                      <th className="p-4 font-bold">Buyer</th>
                      <th className="p-4 font-bold">Seller</th>
                      <th className="p-4 font-bold">Product</th>
                      <th className="p-4 font-bold">Paid (INR)</th>
                      <th className="p-4 font-bold">Commission</th>
                      <th className="p-4 font-bold">Payout Status</th>
                      <th className="p-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                          No transaction logs found matching filters.
                        </td>
                      </tr>
                    ) : (
                      transactions
                        .filter((t) => activeTab !== "settlements" || t.payout_status === "pending_cooling")
                        .map((t) => {
                          let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                          if (t.status === "completed" || t.status === "paid") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          if (t.status === "disputed") statusColor = "bg-red-500/15 text-red-400 border-red-500/25";
                          if (t.status === "refunded") statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                          return (
                            <tr key={t.id} className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs">
                              <td className="p-4 font-mono font-semibold text-gold text-[11px]">
                                {t.id}
                              </td>
                              <td className="p-4">
                                <div className="font-semibold">{t.buyer?.display_name || "Unknown"}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{t.buyer?.email}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-semibold">{t.seller?.display_name || "Unknown"}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{t.seller?.email}</div>
                              </td>
                              <td className="p-4 font-medium max-w-[150px] truncate">{t.listing?.title || "Product"}</td>
                              <td className="p-4 font-bold font-mono text-emerald-400">{formatCurrency(t.amount_inr)}</td>
                              <td className="p-4 font-bold font-mono text-gold">{formatCurrency(t.commission_inr)}</td>
                              <td className="p-4">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                    t.payout_status === "paid_out"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : t.payout_status === "pending_cooling"
                                      ? "bg-amber-500/10 text-amber-400 animate-pulse"
                                      : "bg-zinc-500/10 text-zinc-400"
                                  }`}
                                >
                                  {t.payout_status || "n/a"}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor}`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* WITHDRAWAL RISK SCANNER */}
          {activeTab === "withdrawal-risk" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleRiskScan}
                className="lg:col-span-1 p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 h-fit"
              >
                <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                  <ShieldCheck size={18} /> Withdrawal Security Scanner
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verify user risk profiles before releasing cashouts. Scans account age, recent disputes, and fraud logs.
                </p>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Seller User ID (UUID)</label>
                  <input
                    type="text"
                    required
                    value={riskUserId}
                    onChange={(e) => setRiskUserId(e.target.value)}
                    placeholder="Enter seller's Supabase auth UUID..."
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cashout Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(Number(e.target.value))}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={riskScanBusy}
                  className="w-full py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  {riskScanBusy ? "Scanning Database..." : "Scan Risk Factors"}
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md p-6">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-4">
                    <History size={16} /> Risk Scans Verdict Output
                  </h3>

                  {riskScanBusy && (
                    <div className="flex flex-col items-center py-10 gap-2">
                      <div className="size-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                      <span className="text-xs text-muted-foreground">Querying security aggregates...</span>
                    </div>
                  )}

                  {!riskScanBusy && !riskScanned && (
                    <div className="text-center py-10 text-xs text-muted-foreground italic">
                      Submit User ID on the left to review automated security audit flags.
                    </div>
                  )}

                  {!riskScanBusy && riskScanned && (
                    <div className="space-y-4">
                      {riskFlags.length === 0 ? (
                        <div className="p-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-3">
                          <ShieldCheck size={20} className="text-emerald-400" />
                          <div>
                            <h4 className="text-xs font-bold text-emerald-400">Zero Risk Flags Tripped</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              This seller profile is clean. Trusted tenure, no active disputes, and no flagged reports.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 flex items-center gap-3">
                            <AlertOctagon size={20} className="text-rose-400 shrink-0" />
                            <div>
                              <h4 className="text-xs font-bold text-rose-400">
                                {riskFlags.length} Warning Indicators Tripped
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Review flags below prior to confirming manual payout settlements.
                              </p>
                            </div>
                          </div>
                          <ul className="space-y-1.5 pt-2">
                            {riskFlags.map((flag, idx) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded-lg bg-surface/60 border border-border/60 text-xs font-semibold text-rose-400"
                              >
                                <span className="size-1.5 rounded-full bg-rose-400" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
