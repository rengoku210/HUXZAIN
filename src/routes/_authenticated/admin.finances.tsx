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
  Settings,
  Trash2,
  Plus,
  RefreshCw,
  XCircle,
  HelpCircle,
  Play
} from "lucide-react";
import {
  getFinancialOverview,
  searchTransactions,
  getWithdrawalRiskFlags,
  updateFinanceConfig,
} from "@/lib/admin/finances.functions";
import {
  useFinanceConfig,
  computeTransactionSummary,
  invalidateFinanceConfigCache,
  DOCUMENTED_FINANCE_CONFIG,
  ALL_CATEGORY_KEYS,
  ALL_PLANS,
  CATEGORY_LABELS,
} from "@/lib/finance";
import { getSupabase } from "@/lib/supabase-client";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/admin/finances")({
  head: () => ({ meta: [{ title: "Financial Control Center — HUXZAIN Admin" }] }),
  component: FinancialControl,
});

type Tab = "overview" | "transactions" | "settlements" | "withdrawal-risk" | "config";

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

  // Super admin permission check
  const ADMIN_OVERRIDE_EMAIL = (import.meta as any).env?.VITE_ADMIN_OVERRIDE_EMAIL || "";
  const isSuperAdmin = auth.hasAnyRole(["super_admin", "owner"]) || (ADMIN_OVERRIDE_EMAIL && auth.user?.email === ADMIN_OVERRIDE_EMAIL);

  // Configuration States
  const { config: dbConfig, loading: configLoading } = useFinanceConfig();
  const [commissionState, setCommissionState] = useState<any>(null);
  const [escrowState, setEscrowState] = useState<any>(null);
  const [settlementState, setSettlementState] = useState<any>(null);
  const [bpTiersState, setBpTiersState] = useState<any[]>([]);
  const [miscState, setMiscState] = useState<any>(null);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const autosaveTimeoutRef = useRef<any>(null);

  // Config sub-tabs
  const [configSubTab, setConfigSubTab] = useState<"commission" | "escrow" | "settlement" | "bp_fees">("commission");

  // Live Simulator States
  const [previewPrice, setPreviewPrice] = useState<number>(5999);
  const [previewCategory, setPreviewCategory] = useState<string>("gaming_accounts");
  const [previewPlan, setPreviewPlan] = useState<string>("standard");
  const [previewProtection, setPreviewProtection] = useState<boolean>(true);

  // Load configuration into local state on retrieve
  useEffect(() => {
    if (dbConfig) {
      setCommissionState(structuredClone(dbConfig.commission));
      setEscrowState(structuredClone(dbConfig.escrow));
      setSettlementState(structuredClone(dbConfig.settlement));
      setBpTiersState(structuredClone(dbConfig.protectionTiers));
      setMiscState(structuredClone(dbConfig.misc));
    }
  }, [dbConfig]);

  // Dirty state detection
  useEffect(() => {
    if (!dbConfig || !commissionState || !escrowState || !settlementState || !miscState) {
      setDirty(false);
      return;
    }
    const isDirty =
      JSON.stringify(dbConfig.commission) !== JSON.stringify(commissionState) ||
      JSON.stringify(dbConfig.escrow) !== JSON.stringify(escrowState) ||
      JSON.stringify(dbConfig.settlement) !== JSON.stringify(settlementState) ||
      JSON.stringify(dbConfig.protectionTiers) !== JSON.stringify(bpTiersState) ||
      JSON.stringify(dbConfig.misc) !== JSON.stringify(miscState);
    setDirty(isDirty);
  }, [commissionState, escrowState, settlementState, bpTiersState, miscState, dbConfig]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, []);

  const triggerAutosave = () => {
    if (!isSuperAdmin) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 2000);
  };

  const cancelChanges = () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    setCommissionState(structuredClone(dbConfig.commission));
    setEscrowState(structuredClone(dbConfig.escrow));
    setSettlementState(structuredClone(dbConfig.settlement));
    setBpTiersState(structuredClone(dbConfig.protectionTiers));
    setMiscState(structuredClone(dbConfig.misc));
    toast.info("Changes cancelled and reverted to database values.");
  };

  const restoreDefaults = () => {
    setCommissionState(structuredClone(DOCUMENTED_FINANCE_CONFIG.commission));
    setEscrowState(structuredClone(DOCUMENTED_FINANCE_CONFIG.escrow));
    setSettlementState(structuredClone(DOCUMENTED_FINANCE_CONFIG.settlement));
    setBpTiersState(structuredClone(DOCUMENTED_FINANCE_CONFIG.protectionTiers));
    setMiscState(structuredClone(DOCUMENTED_FINANCE_CONFIG.misc));
    toast.success("Restored documented defaults. Autosaving soon...");
    triggerAutosave();
  };

  const handleMiscChange = (field: string, val: any) => {
    const updated = { ...miscState, [field]: val };
    setMiscState(updated);
    triggerAutosave();
  };

  const saveChanges = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Database client not configured");
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication token is missing. Please log in again.");

      // Validate overlaps & contiguity locally before submit
      const generalTiers = bpTiersState.filter(t => t.scope === "general");
      const gamingTiers = bpTiersState.filter(t => t.scope === "gaming");

      const validateTiers = (tiers: any[], scope: string) => {
        if (tiers.length === 0) return;
        const sorted = [...tiers].sort((a, b) => a.minAmountInr - b.minAmountInr);
        if (sorted[0].minAmountInr !== miscState.buyerProtectionMinOrderInr) {
          throw new Error(`The first tier for ${scope} must start exactly at the minimum order limit (₹${miscState.buyerProtectionMinOrderInr})`);
        }
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].minAmountInr < 0) throw new Error(`Negative value in ${scope} tier min`);
          if (sorted[i].maxAmountInr !== null && sorted[i].maxAmountInr < sorted[i].minAmountInr) {
            throw new Error(`Range max less than min in ${scope} tier`);
          }
          if ((sorted[i].feePercent !== null) === (sorted[i].feeFlatInr !== null)) {
            throw new Error(`Exactly one fee type must be set in ${scope} tier`);
          }
          if (i > 0) {
            const prev = sorted[i - 1];
            if (prev.maxAmountInr === null) {
              throw new Error(`Unbounded range in ${scope} followed by another tier`);
            }
            if (sorted[i].minAmountInr !== prev.maxAmountInr + 1) {
              if (sorted[i].minAmountInr <= prev.maxAmountInr) {
                throw new Error(`Overlapping ranges detected in ${scope}: [${prev.minAmountInr}-${prev.maxAmountInr}] and [${sorted[i].minAmountInr}-${sorted[i].maxAmountInr ?? 'Infinity'}]`);
              } else {
                throw new Error(`Gap detected in ${scope} between ₹${prev.maxAmountInr} and ₹${sorted[i].minAmountInr}`);
              }
            }
          }
        }
      };
      validateTiers(generalTiers, "general");
      validateTiers(gamingTiers, "gaming");

      const commissionList = [];
      for (const cat of Object.keys(commissionState)) {
        for (const plan of Object.keys(commissionState[cat])) {
          commissionList.push({
            category_key: cat,
            plan,
            commission_percent: Number(commissionState[cat][plan])
          });
        }
      }

      const escrowList = [];
      for (const cat of Object.keys(escrowState)) {
        for (const plan of Object.keys(escrowState[cat])) {
          escrowList.push({
            category_key: cat,
            plan,
            hold_days: Math.round(escrowState[cat][plan])
          });
        }
      }

      const settlementList = [];
      for (const plan of Object.keys(settlementState)) {
        settlementList.push({
          plan,
          processing_days: Math.round(settlementState[plan].processingDays),
          withdrawal_request_count: Math.round(settlementState[plan].withdrawalRequestCount),
          withdrawal_period_days: Math.round(settlementState[plan].withdrawalPeriodDays)
        });
      }

      const bpTiers = bpTiersState.map(t => ({
        scope: t.scope,
        min_amount_inr: Math.round(t.minAmountInr),
        max_amount_inr: t.maxAmountInr === null ? null : Math.round(t.maxAmountInr),
        fee_percent: t.feePercent === null ? null : Number(t.feePercent),
        fee_flat_inr: t.feeFlatInr === null ? null : Math.round(t.feeFlatInr)
      }));

      const res = await updateFinanceConfig({
        data: {
          token,
          commission: commissionList,
          escrow: escrowList,
          settlement: settlementList,
          buyerProtectionTiers: bpTiers,
          misc: {
            processing_fee_inr: Number(miscState.processingFeeInr),
            processing_fee_payer: miscState.processingFeePayer,
            buyer_protection_min_order_inr: Number(miscState.buyerProtectionMinOrderInr),
            buyer_protection_enabled: miscState.buyerProtectionMinOrderInr > 0
          }
        }
      });

      if (res.success) {
        toast.success("Finance configuration saved successfully!");
        invalidateFinanceConfigCache();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

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
    { id: "config", label: "Finance Settings", icon: Settings },
  ];

  // Pre-calculate live preview summary
  let previewSummary: any = null;
  if (commissionState && escrowState && settlementState && miscState) {
    try {
      previewSummary = computeTransactionSummary(
        {
          commission: commissionState,
          escrow: escrowState,
          settlement: settlementState,
          protectionTiers: bpTiersState,
          misc: {
            processingFeeInr: miscState.processingFeeInr,
            processingFeePayer: miscState.processingFeePayer,
            buyerProtectionMinOrderInr: miscState.buyerProtectionMinOrderInr
          }
        },
        {
          categoryKey: previewCategory as any,
          tier: previewPlan,
          priceInr: previewPrice,
          protectionSelected: previewProtection
        }
      );
    } catch (err) {
      console.error("Preview calc error:", err);
    }
  }

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

          {/* FINANCE CONFIGURATION TAB */}
          {activeTab === "config" && (
            <div className="space-y-6">
              {!isSuperAdmin && (
                <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-300 text-xs font-semibold flex items-center gap-2">
                  <Lock size={14} className="shrink-0" />
                  <span>Read-Only Console: You can view configurations and run simulations, but only Super Admins or Owners may modify rates.</span>
                </div>
              )}

              {configLoading || !commissionState ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                  <span className="text-xs text-muted-foreground tracking-widest uppercase">Loading finance configuration...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: Editors */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Toolbar / Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-surface/20 p-4 rounded-2xl border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Status:</span>
                        {dirty ? (
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                            Unsaved Changes (Autosaving...)
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            Synchronized with database
                          </span>
                        )}
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelChanges}
                            disabled={!dirty || saving}
                            className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-white transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1"
                          >
                            <XCircle size={13} /> Cancel Changes
                          </button>
                          <button
                            type="button"
                            onClick={restoreDefaults}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 text-xs transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <RefreshCw size={13} className={saving ? "animate-spin" : ""} /> Restore Defaults
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Editor Sub-navigation */}
                    <div className="border-b border-border/60 flex flex-wrap gap-1">
                      <button
                        onClick={() => setConfigSubTab("commission")}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                          configSubTab === "commission"
                            ? "bg-surface/40 text-gold border-t border-x border-border font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Commission Matrix
                      </button>
                      <button
                        onClick={() => setConfigSubTab("escrow")}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                          configSubTab === "escrow"
                            ? "bg-surface/40 text-gold border-t border-x border-border font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Escrow Holds
                      </button>
                      <button
                        onClick={() => setConfigSubTab("settlement")}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                          configSubTab === "settlement"
                            ? "bg-surface/40 text-gold border-t border-x border-border font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Plan Settlements
                      </button>
                      <button
                        onClick={() => setConfigSubTab("bp_fees")}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                          configSubTab === "bp_fees"
                            ? "bg-surface/40 text-gold border-t border-x border-border font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Buyer Protection & Fees
                      </button>
                    </div>

                    {/* COMMISSION MATRIX */}
                    {configSubTab === "commission" && (
                      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
                        <div className="p-4 border-b border-border bg-surface/20">
                          <h3 className="text-sm font-bold text-white">Platform Commission Matrix (%)</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Category × Seller Membership Plan commission rates. Values from 0% to 100%.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-surface/10 text-muted-foreground uppercase font-mono tracking-wider font-bold">
                                <th className="p-3">Category</th>
                                <th className="p-3 text-center">Standard</th>
                                <th className="p-3 text-center">Pro</th>
                                <th className="p-3 text-center">Elite</th>
                                <th className="p-3 text-center">Enterprise</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ALL_CATEGORY_KEYS.map((catKey) => (
                                <tr key={catKey} className="border-b border-border/40 hover:bg-surface/10 transition-colors">
                                  <td className="p-3 font-semibold text-white">{CATEGORY_LABELS[catKey]}</td>
                                  {ALL_PLANS.map((plan) => (
                                    <td key={plan} className="p-2 text-center">
                                      <div className="relative inline-block w-20">
                                        <input
                                          type="number"
                                          step="0.1"
                                          disabled={!isSuperAdmin}
                                          value={commissionState[catKey]?.[plan] ?? 0}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const num = parseFloat(val);
                                            if (num < 0 || num > 100) return;
                                            const updated = { ...commissionState };
                                            updated[catKey] = { ...updated[catKey], [plan]: val === "" ? "" : num };
                                            setCommissionState(updated);
                                            triggerAutosave();
                                          }}
                                          className="w-full bg-[#101114] border border-border/80 focus:border-gold rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                                        />
                                        <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ESCROW MATRIX */}
                    {configSubTab === "escrow" && (
                      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
                        <div className="p-4 border-b border-border bg-surface/20">
                          <h3 className="text-sm font-bold text-white">Escrow Hold Days (Cooling Days)</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Category × Seller Membership Plan hold periods. Use 0 for instant settlements.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-surface/10 text-muted-foreground uppercase font-mono tracking-wider font-bold">
                                <th className="p-3">Category</th>
                                <th className="p-3 text-center">Standard</th>
                                <th className="p-3 text-center">Pro</th>
                                <th className="p-3 text-center">Elite</th>
                                <th className="p-3 text-center">Enterprise</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ALL_CATEGORY_KEYS.map((catKey) => (
                                <tr key={catKey} className="border-b border-border/40 hover:bg-surface/10 transition-colors">
                                  <td className="p-3 font-semibold text-white">{CATEGORY_LABELS[catKey]}</td>
                                  {ALL_PLANS.map((plan) => (
                                    <td key={plan} className="p-2 text-center">
                                      <div className="relative inline-block w-20">
                                        <input
                                          type="number"
                                          disabled={!isSuperAdmin}
                                          value={escrowState[catKey]?.[plan] ?? 0}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const num = parseInt(val, 10);
                                            if (num < 0) return;
                                            const updated = { ...escrowState };
                                            updated[catKey] = { ...updated[catKey], [plan]: val === "" ? "" : num };
                                            setEscrowState(updated);
                                            triggerAutosave();
                                          }}
                                          className="w-full bg-[#101114] border border-border/80 focus:border-gold rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                                        />
                                        <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">d</span>
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* SETTLEMENT EDITOR */}
                    {configSubTab === "settlement" && (
                      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
                        <div className="p-4 border-b border-border bg-surface/20">
                          <h3 className="text-sm font-bold text-white">Settlement Rules per Seller Plan</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Set the processing duration and withdrawal frequency limits for standard payouts.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-surface/10 text-muted-foreground uppercase font-mono tracking-wider font-bold">
                                <th className="p-3">Seller Plan</th>
                                <th className="p-3 text-center">Processing Days</th>
                                <th className="p-3 text-center">Max Withdrawals</th>
                                <th className="p-3 text-center">In Period (Days)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ALL_PLANS.map((plan) => (
                                <tr key={plan} className="border-b border-border/40 hover:bg-surface/10 transition-colors">
                                  <td className="p-3 font-semibold uppercase text-gold font-mono">{plan}</td>
                                  <td className="p-2 text-center">
                                    <div className="relative inline-block w-24">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        value={settlementState[plan]?.processingDays ?? 0}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const num = parseInt(val, 10);
                                          if (num < 0) return;
                                          const updated = { ...settlementState };
                                          updated[plan].processingDays = val === "" ? "" : num;
                                          setSettlementState(updated);
                                          triggerAutosave();
                                        }}
                                        className="w-full bg-[#101114] border border-border/80 focus:border-gold rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                                      />
                                      <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">Days</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="relative inline-block w-24">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        value={settlementState[plan]?.withdrawalRequestCount ?? 1}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const num = parseInt(val, 10);
                                          if (num < 1) return;
                                          const updated = { ...settlementState };
                                          updated[plan].withdrawalRequestCount = val === "" ? "" : num;
                                          setSettlementState(updated);
                                          triggerAutosave();
                                        }}
                                        className="w-full bg-[#101114] border border-border/80 focus:border-gold rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                                      />
                                      <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">times</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="relative inline-block w-24">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        value={settlementState[plan]?.withdrawalPeriodDays ?? 1}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const num = parseInt(val, 10);
                                          if (num < 1) return;
                                          const updated = { ...settlementState };
                                          updated[plan].withdrawalPeriodDays = val === "" ? "" : num;
                                          setSettlementState(updated);
                                          triggerAutosave();
                                        }}
                                        className="w-full bg-[#101114] border border-border/80 focus:border-gold rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                                      />
                                      <span className="absolute right-2 top-1 text-[10px] text-muted-foreground">Days</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* BUYER PROTECTION & FEES */}
                    {configSubTab === "bp_fees" && (
                      <div className="space-y-6">
                        {/* General Knobs */}
                        <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
                          <h3 className="text-sm font-bold text-white border-b border-border pb-2">Global Knobs & Processing Fee</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted-foreground font-semibold">Buyer Protection Min Order</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  disabled={!isSuperAdmin}
                                  value={miscState?.buyerProtectionMinOrderInr ?? 1000}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = parseInt(val, 10);
                                    if (num < 0) return;
                                    handleMiscChange("buyerProtectionMinOrderInr", val === "" ? "" : num);
                                  }}
                                  className="w-full bg-[#101114] border border-border rounded-xl pl-6 pr-3 py-1.5 text-xs outline-none focus:border-gold text-white font-mono"
                                />
                                <span className="absolute left-2.5 top-2 text-[10px] text-muted-foreground">₹</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted-foreground font-semibold">Processing Fee Amount</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  disabled={!isSuperAdmin}
                                  value={miscState?.processingFeeInr ?? 0}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = parseInt(val, 10);
                                    if (num < 0) return;
                                    handleMiscChange("processingFeeInr", val === "" ? "" : num);
                                  }}
                                  className="w-full bg-[#101114] border border-border rounded-xl pl-6 pr-3 py-1.5 text-xs outline-none focus:border-gold text-white font-mono"
                                />
                                <span className="absolute left-2.5 top-2 text-[10px] text-muted-foreground">₹</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted-foreground font-semibold">Processing Fee Payer</label>
                              <select
                                disabled={!isSuperAdmin}
                                value={miscState?.processingFeePayer ?? "buyer"}
                                onChange={(e) => handleMiscChange("processingFeePayer", e.target.value)}
                                className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold text-white"
                              >
                                <option value="buyer">Buyer</option>
                                <option value="seller">Seller</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Tiers List */}
                        <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                              <h3 className="text-sm font-bold text-white">Buyer Protection Tiers (Range-Based)</h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Tiers must be fully contiguous and starting exactly at Min Order limit.</p>
                            </div>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  const lastTier = bpTiersState[bpTiersState.length - 1];
                                  const min = lastTier && lastTier.maxAmountInr !== null ? lastTier.maxAmountInr + 1 : miscState.buyerProtectionMinOrderInr;
                                  const newTier = {
                                    scope: "general",
                                    minAmountInr: min,
                                    maxAmountInr: null,
                                    feePercent: 5,
                                    feeFlatInr: null
                                  };
                                  setBpTiersState([...bpTiersState, newTier]);
                                  triggerAutosave();
                                }}
                                className="px-2.5 py-1 rounded-xl bg-gold/10 border border-gold/20 text-[10px] text-gold hover:bg-gold/20 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} /> Add Tier
                              </button>
                            )}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-border text-muted-foreground uppercase font-mono tracking-wider font-bold">
                                  <th className="p-2">Scope</th>
                                  <th className="p-2 text-center">Min (INR)</th>
                                  <th className="p-2 text-center">Max (INR)</th>
                                  <th className="p-2 text-center">Type</th>
                                  <th className="p-2 text-center">Value</th>
                                  {isSuperAdmin && <th className="p-2 text-right">Delete</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {bpTiersState.map((tier, idx) => (
                                  <tr key={idx} className="border-b border-border/40 hover:bg-surface/5">
                                    <td className="p-1">
                                      <select
                                        disabled={!isSuperAdmin}
                                        value={tier.scope}
                                        onChange={(e) => {
                                          const next = [...bpTiersState];
                                          next[idx].scope = e.target.value as any;
                                          setBpTiersState(next);
                                          triggerAutosave();
                                        }}
                                        className="bg-[#101114] border border-border/60 rounded px-2 py-1 outline-none text-white text-xs"
                                      >
                                        <option value="general">General</option>
                                        <option value="gaming">Gaming</option>
                                      </select>
                                    </td>
                                    <td className="p-1 text-center">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        value={tier.minAmountInr}
                                        onChange={(e) => {
                                          const next = [...bpTiersState];
                                          next[idx].minAmountInr = parseInt(e.target.value) || 0;
                                          setBpTiersState(next);
                                          triggerAutosave();
                                        }}
                                        className="w-20 bg-[#101114] border border-border/60 rounded px-2 py-1 text-center text-white font-mono"
                                      />
                                    </td>
                                    <td className="p-1 text-center">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        placeholder="Infinite"
                                        value={tier.maxAmountInr === null ? "" : tier.maxAmountInr}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const next = [...bpTiersState];
                                          next[idx].maxAmountInr = val === "" ? null : parseInt(val);
                                          setBpTiersState(next);
                                          triggerAutosave();
                                        }}
                                        className="w-20 bg-[#101114] border border-border/60 rounded px-2 py-1 text-center text-white font-mono"
                                      />
                                    </td>
                                    <td className="p-1 text-center">
                                      <select
                                        disabled={!isSuperAdmin}
                                        value={tier.feePercent !== null ? "percentage" : "flat"}
                                        onChange={(e) => {
                                          const next = [...bpTiersState];
                                          if (e.target.value === "percentage") {
                                            next[idx].feePercent = 5;
                                            next[idx].feeFlatInr = null;
                                          } else {
                                            next[idx].feePercent = null;
                                            next[idx].feeFlatInr = 499;
                                          }
                                          setBpTiersState(next);
                                          triggerAutosave();
                                        }}
                                        className="bg-[#101114] border border-border/60 rounded px-2 py-1 outline-none text-white text-xs"
                                      >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat (INR)</option>
                                      </select>
                                    </td>
                                    <td className="p-1 text-center">
                                      <input
                                        type="number"
                                        disabled={!isSuperAdmin}
                                        value={tier.feePercent !== null ? (tier.feePercent ?? 0) : (tier.feeFlatInr ?? 0)}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const next = [...bpTiersState];
                                          if (tier.feePercent !== null) {
                                            next[idx].feePercent = val;
                                          } else {
                                            next[idx].feeFlatInr = Math.round(val);
                                          }
                                          setBpTiersState(next);
                                          triggerAutosave();
                                        }}
                                        className="w-20 bg-[#101114] border border-border/60 rounded px-2 py-1 text-center text-white font-mono"
                                      />
                                    </td>
                                    {isSuperAdmin && (
                                      <td className="p-1 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = bpTiersState.filter((_, i) => i !== idx);
                                            setBpTiersState(next);
                                            triggerAutosave();
                                          }}
                                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] p-3 text-[10px] text-yellow-300/80 leading-relaxed">
                            <span className="font-bold">Important Rules:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              <li>The first tier for each scope must start at ₹{miscState?.buyerProtectionMinOrderInr ?? 1000}.</li>
                              <li>Tiers must be contiguous (e.g. Tier 2 min must equal Tier 1 max + 1).</li>
                              <li>General categories (non-gaming) orders above ₹1,00,000 will be left unconfigured as documented.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Calculator / Simulator */}
                  <div className="xl:col-span-1 space-y-6">
                    <div className="rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.06] to-transparent p-5 space-y-4">
                      <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                        <Play size={16} /> Transaction Simulator
                      </h3>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Simulate how the configured rates affect live orders. Runs on the exact computeTransactionSummary() code.
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-muted-foreground font-semibold">Category Type</label>
                          <select
                            value={previewCategory}
                            onChange={(e) => setPreviewCategory(e.target.value)}
                            className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-white"
                          >
                            {ALL_CATEGORY_KEYS.map((catKey) => (
                              <option key={catKey} value={catKey}>
                                {CATEGORY_LABELS[catKey]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-muted-foreground font-semibold">Seller Plan Tier</label>
                          <select
                            value={previewPlan}
                            onChange={(e) => setPreviewPlan(e.target.value)}
                            className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-white"
                          >
                            <option value="standard">Standard</option>
                            <option value="pro">Pro</option>
                            <option value="elite">Elite</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-muted-foreground font-semibold">Price of Listing (INR)</label>
                          <input
                            type="number"
                            value={previewPrice}
                            onChange={(e) => setPreviewPrice(parseInt(e.target.value) || 0)}
                            className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-white font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1.5">
                          <input
                            type="checkbox"
                            id="previewBp"
                            checked={previewProtection}
                            onChange={(e) => setPreviewProtection(e.target.checked)}
                            className="accent-gold size-4 border-border bg-[#101114] rounded cursor-pointer"
                          />
                          <label htmlFor="previewBp" className="text-xs text-white font-medium cursor-pointer">
                            Select Buyer Protection (Checkout)
                          </label>
                        </div>
                      </div>

                      {previewSummary && (
                        <div className="border-t border-border/80 pt-4 space-y-3.5">
                          <h4 className="text-xs uppercase tracking-wider text-gold font-bold">Calculation Breakdown</h4>
                          <div className="space-y-2 rounded-xl bg-surface/30 p-4 border border-border">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Commission ({previewSummary.commissionPercent}%)</span>
                              <span className="font-semibold text-white font-mono">− ₹{previewSummary.commissionInr}</span>
                            </div>
                            {previewSummary.protectionSelected && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Buyer Protection Fee</span>
                                <span className="font-semibold text-amber-300 font-mono">+ ₹{previewSummary.protectionFeeInr}</span>
                              </div>
                            )}
                            {previewSummary.processingFeeInr > 0 && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Processing Fee ({previewSummary.processingFeePayer})</span>
                                <span className="font-semibold text-white font-mono">
                                  {previewSummary.processingFeePayer === "buyer" ? "+" : "−"} ₹{previewSummary.processingFeeInr}
                                </span>
                              </div>
                            )}
                            <div className="h-px bg-border/60 my-1" />
                            <div className="flex justify-between text-xs font-bold text-white">
                              <span>Seller Receives</span>
                              <span className="text-emerald-400 font-mono">₹{previewSummary.sellerReceivesInr}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-white">
                              <span>Buyer Pays</span>
                              <span className="text-sky-400 font-mono">₹{previewSummary.buyerPaysInr}</span>
                            </div>
                          </div>

                          <div className="space-y-2 rounded-xl bg-surface/30 p-4 border border-border text-xs">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Escrow Hold Days</span>
                              <span className="text-white font-semibold">{previewSummary.escrowHoldDays} Days</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Settlement Processing</span>
                              <span className="text-white font-semibold">{previewSummary.settlementProcessingDays} Days</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Withdrawal Limits</span>
                              <span className="text-white font-semibold">
                                {previewSummary.withdrawal.requestCount} requests / {previewSummary.withdrawal.periodDays}d
                              </span>
                            </div>
                          </div>

                          {previewSummary.flags.unmappedCategory && (
                            <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 text-[10px] text-amber-300">
                              Warning: Unmapped category, falling back to legacy cooling days/fees.
                            </div>
                          )}
                          {previewSummary.flags.protectionUnavailableForAmount && (
                            <div className="p-2.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-[10px] text-rose-300">
                              Notice: Buyer protection not available for this transaction amount.
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
      )}
    </div>
  );
}
