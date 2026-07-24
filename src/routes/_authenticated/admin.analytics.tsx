import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Users as UsersIcon, ShoppingBag, DollarSign, Loader2, ArrowRightLeft, TrendingUp, HelpCircle, Activity, Globe } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics Dashboard — HUXZAIN Admin" }] }),
  component: AnalyticsPage,
});

type UserProfile = {
  id: string;
  is_seller: boolean;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  amount_inr: number;
  commission_inr: number;
  seller_payout_inr: number;
  status: string;
  created_at: string;
};

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "sales" | "earnings" | "traffic">("users");

  // Collected Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  // Computed Metrics
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalBuyers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    totalVolume: 0,
    totalPayouts: 0,
    totalCommissions: 0
  });

  async function loadAnalyticsData() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, is_seller, created_at"),
        supabase.from("orders").select("id, amount_inr, commission_inr, seller_payout_inr, status, created_at")
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const pData = (profilesRes.data ?? []) as UserProfile[];
      const oData = (ordersRes.data ?? []) as OrderRow[];

      setUsers(pData);
      setOrders(oData);

      // Math aggregations
      const totalUsers = pData.length;
      const totalSellers = pData.filter(u => u.is_seller).length;
      const totalBuyers = totalUsers - totalSellers;

      const totalOrders = oData.length;
      const completedOrders = oData.filter(o => o.status === "completed").length;
      const pendingOrders = oData.filter(o => o.status === "pending" || o.status === "paid" || o.status === "delivering").length;
      const cancelledOrders = oData.filter(o => o.status === "cancelled" || o.status === "refunded").length;

      const completedRows = oData.filter(o => o.status === "completed" || o.status === "delivered");
      const totalVolume = completedRows.reduce((sum, o) => sum + (o.amount_inr || 0), 0);
      const totalPayouts = completedRows.reduce((sum, o) => sum + (o.seller_payout_inr || 0), 0);
      const totalCommissions = completedRows.reduce((sum, o) => sum + (o.commission_inr || 0), 0);

      setMetrics({
        totalUsers,
        totalSellers,
        totalBuyers,
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalVolume,
        totalPayouts,
        totalCommissions
      });

    } catch (e: any) {
      toast.error("Failed to load analytics datasets: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="size-8 animate-spin text-gold" />
        <span className="text-sm text-muted-foreground animate-pulse">Assembling platform analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-gold" size={24} /> Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live telemetry of marketplace registrations, sales channels, and commissions.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex overflow-x-auto scrollbar-none flex-nowrap border-b border-border/80 text-xs">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "users"
              ? "border-gold text-gold bg-gold/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UsersIcon size={14} /> Users
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-6 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "sales"
              ? "border-gold text-gold bg-gold/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag size={14} /> Sales
        </button>
        <button
          onClick={() => setActiveTab("earnings")}
          className={`px-6 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "earnings"
              ? "border-gold text-gold bg-gold/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign size={14} /> Earnings & Revenue
        </button>
        <button
          onClick={() => setActiveTab("traffic")}
          className={`px-6 py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "traffic"
              ? "border-gold text-gold bg-gold/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity size={14} /> Traffic & SEO
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Total Users</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-white">{metrics.totalUsers}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Registered accounts in database</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Sellers</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-gold">{metrics.totalSellers}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Active merchants ({((metrics.totalSellers / (metrics.totalUsers || 1)) * 100).toFixed(1)}%)</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Buyers</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-sky-400">{metrics.totalBuyers}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Customer accounts</div>
            </div>
          </div>

          {/* User Registration list */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5">
            <h3 className="font-semibold text-sm mb-4">Recent Account Activity</h3>
            {users.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No accounts registered yet.</div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {users.slice(0, 15).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/30 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`size-2.5 rounded-full ${u.is_seller ? "bg-gold" : "bg-sky-400"}`} />
                      <span className="font-mono text-zinc-400">{u.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${u.is_seller ? "bg-gold/15 text-gold border border-gold/20" : "bg-sky-500/15 text-sky-400 border-sky-500/20"} border`}>
                        {u.is_seller ? "Seller" : "Buyer"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Total Orders</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-white">{metrics.totalOrders}</div>
              <div className="text-[10px] text-zinc-400 mt-1">Total orders processed</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-emerald-400">{metrics.completedOrders}</div>
              <div className="text-[10px] text-emerald-400/90 mt-1">Fully finalized order delivery</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Pending / Escrow</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-amber-500">{metrics.pendingOrders}</div>
              <div className="text-[10px] text-amber-500/90 mt-1">In processing state</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Cancelled / Refunded</div>
              <div className="font-display text-3xl font-extrabold mt-2 text-destructive">{metrics.cancelledOrders}</div>
              <div className="text-[10px] text-destructive/90 mt-1">Cancelled trades</div>
            </div>
          </div>

          {/* Sales List */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5">
            <h3 className="font-semibold text-sm mb-4">Latest Order Log</h3>
            {orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No orders in database logs.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border pb-2">
                      <th className="py-2 font-medium">Order Number</th>
                      <th className="font-medium">Date</th>
                      <th className="font-medium text-right">Value (INR)</th>
                      <th className="font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map(o => (
                      <tr key={o.id} className="border-b border-border/30 hover:bg-surface/20">
                        <td className="py-2.5 font-mono text-zinc-400">{o.order_number || o.id.slice(0, 12)}</td>
                        <td className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="text-right font-medium">{formatINR(o.amount_inr)}</td>
                        <td className="text-center">
                          <span className={`inline-flex items-center text-[9px] uppercase px-2 py-0.5 rounded-full border font-bold ${
                            o.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                            o.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                            "bg-surface text-muted-foreground border-border"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "earnings" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5 ring-1 ring-gold/10">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Platform Commissions</span>
                <TrendingUp size={12} className="text-gold" />
              </div>
              <div className="font-display text-2xl font-extrabold mt-2 text-gold">{formatINR(metrics.totalCommissions)}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Net cuts collected globally</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Seller Payouts Sum</span>
                <ArrowRightLeft size={12} className="text-sky-400" />
              </div>
              <div className="font-display text-2xl font-extrabold mt-2 text-sky-400">{formatINR(metrics.totalPayouts)}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Funds settled to seller wallets</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <div className="text-xs text-muted-foreground">Total Marketplace Revenue (GMV)</div>
              <div className="font-display text-2xl font-extrabold mt-2 text-white">{formatINR(metrics.totalVolume)}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">Gross finalized trade volume</div>
            </div>
          </div>

          {/* Earnings Breakdown summary */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5">
            <h3 className="font-semibold text-sm mb-4">Marketplace Commission Ledger</h3>
            {orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No transaction ledger entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border pb-2">
                      <th className="py-2 font-medium">Order Number</th>
                      <th className="font-medium text-right">Gross Amount</th>
                      <th className="font-medium text-right text-sky-400">Seller Share</th>
                      <th className="font-medium text-right text-gold">Platform Commission (Cut)</th>
                      <th className="font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map(o => (
                      <tr key={o.id} className="border-b border-border/30 hover:bg-surface/20">
                        <td className="py-2.5 font-mono text-zinc-400">{o.order_number || o.id.slice(0, 12)}</td>
                        <td className="text-right font-medium">{formatINR(o.amount_inr)}</td>
                        <td className="text-right text-sky-400 font-medium">
                          {formatINR(o.seller_payout_inr || (o.amount_inr - (o.commission_inr || 0)))}
                        </td>
                        <td className="text-right text-gold font-semibold">{formatINR(o.commission_inr || 0)}</td>
                        <td className="text-right text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "traffic" && (
        <TrafficAnalyticsTab />
      )}
    </div>
  );
}

function TrafficAnalyticsTab() {
  const [analytics, setAnalytics] = useState<{ logs: any[], keywords: any[] }>({ logs: [], keywords: [] });

  useEffect(() => {
    // Dynamic import to avoid SSR issues if any
    import("@/lib/traffic-store").then(({ getSearchAnalytics }) => {
      setAnalytics(getSearchAnalytics());
    });
  }, []);

  const totalViews = analytics.logs.length;
  const uniqueSessions = new Set(analytics.logs.map(l => l.sessionToken)).size;
  
  // Sort keywords by volume
  const topKeywords = [...analytics.keywords].sort((a, b) => b.searchVolume - a.searchVolume).slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface/40 p-5 ring-1 ring-gold/10">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Total Page Views</span>
            <Activity size={12} className="text-gold" />
          </div>
          <div className="font-display text-2xl font-extrabold mt-2 text-white">{totalViews}</div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Tracked views locally</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Unique Sessions</span>
            <UsersIcon size={12} className="text-sky-400" />
          </div>
          <div className="font-display text-2xl font-extrabold mt-2 text-sky-400">{uniqueSessions}</div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Estimated unique visitors</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Tracked Keywords</span>
            <Globe size={12} className="text-purple-400" />
          </div>
          <div className="font-display text-2xl font-extrabold mt-2 text-purple-400">{analytics.keywords.length}</div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Unique search queries logged</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="font-semibold text-sm mb-4">Trending Search Keywords</h3>
          {topKeywords.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No search keywords logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-muted-foreground border-b border-border pb-2">
                    <th className="py-2 font-medium">Keyword</th>
                    <th className="font-medium text-right">Volume</th>
                    <th className="font-medium text-right text-emerald-400">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topKeywords.map(k => (
                    <tr key={k.query} className="border-b border-border/30 hover:bg-surface/20">
                      <td className="py-2.5 text-zinc-300 font-medium">{k.query}</td>
                      <td className="text-right font-mono">{k.searchVolume}</td>
                      <td className="text-right text-emerald-400 font-semibold">{k.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="font-semibold text-sm mb-4">Recent Traffic Log</h3>
          {analytics.logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No traffic logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-muted-foreground border-b border-border pb-2">
                    <th className="py-2 font-medium">Path</th>
                    <th className="font-medium">Device</th>
                    <th className="font-medium">Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.logs.slice(-10).reverse().map((l, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-surface/20">
                      <td className="py-2.5 font-mono text-zinc-400 max-w-[150px] truncate">{l.path}</td>
                      <td className="capitalize text-muted-foreground">{l.device}</td>
                      <td className="text-muted-foreground truncate max-w-[150px]">{l.referrer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
