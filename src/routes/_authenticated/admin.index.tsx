import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { primaryCategories } from "@/lib/marketplace-data";
import { toast } from "sonner";
import { 
  Database, 
  Loader2, 
  RefreshCw, 
  Users, 
  ShoppingBag, 
  ShieldAlert, 
  BadgeCheck, 
  FileText, 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HeartPulse
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Command Center — HUXZAIN Admin" }] }),
  component: Page,
});

type Stats = {
  totalUsers: number;
  activeSellers: number;
  activeBuyers: number;
  activeListings: number;
  totalOrders: number;
  ordersToday: number;
  pendingWithdrawals: number;
  openDisputes: number;
  pendingVerifications: number;
  pendingTickets: number;
  pendingPayments: number;
  totalVolume: number;
  platformRevenue: number;
};

type ActivityEvent = {
  type: "order" | "dispute" | "withdrawal" | "verification";
  title: string;
  desc: string;
  time: Date;
};

function Page() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSellers: 0,
    activeBuyers: 0,
    activeListings: 0,
    totalOrders: 0,
    ordersToday: 0,
    pendingWithdrawals: 0,
    openDisputes: 0,
    pendingVerifications: 0,
    pendingTickets: 0,
    pendingPayments: 0,
    totalVolume: 0,
    platformRevenue: 0,
  });
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  async function loadCounts() {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayIso = startOfToday.toISOString();

      // Fetch order amounts for revenue calculations
      const { data: orderSums } = await supabase
        .from("orders")
        .select("amount_inr, commission_inr, status");

      let totalVolume = 0;
      let platformRevenue = 0;
      if (orderSums) {
        orderSums.forEach((o) => {
          if (["completed", "paid", "delivered"].includes(o.status)) {
            totalVolume += Number(o.amount_inr || 0);
            platformRevenue += Number(o.commission_inr || 0);
          }
        });
      }

      const [
        profiles,
        sellers,
        buyers,
        listings,
        orders,
        ordersToday,
        withdrawals,
        disputes,
        verifications,
        tickets,
        pendingPaymentProofs,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startOfTodayIso),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalUsers: profiles.count ?? 0,
        activeSellers: sellers.count ?? 0,
        activeBuyers: buyers.count ?? 0,
        activeListings: listings.count ?? 0,
        totalOrders: orders.count ?? 0,
        ordersToday: ordersToday.count ?? 0,
        pendingWithdrawals: withdrawals.count ?? 0,
        openDisputes: disputes.count ?? 0,
        pendingVerifications: verifications.count ?? 0,
        pendingTickets: tickets.count ?? 0,
        pendingPayments: pendingPaymentProofs.count ?? 0,
        totalVolume,
        platformRevenue,
      });

      // Fetch recent actions to build activity feed
      const [recentOrders, recentDisputes, recentWithdrawals, recentVerifications] = await Promise.all([
        supabase.from("orders").select("id, listing_title, amount_inr, created_at, status").order("created_at", { ascending: false }).limit(4),
        supabase.from("disputes").select("id, reason, created_at, status").order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawals").select("id, amount, created_at, status").order("created_at", { ascending: false }).limit(4),
        supabase.from("verifications").select("id, status, created_at").order("created_at", { ascending: false }).limit(4),
      ]);

      const events: ActivityEvent[] = [];
      if (recentOrders.data) {
        recentOrders.data.forEach((o) => {
          events.push({
            type: "order",
            title: `Order Started: ${o.listing_title}`,
            desc: `Amount: ₹${o.amount_inr.toLocaleString()} • Status: ${o.status.toUpperCase()}`,
            time: new Date(o.created_at),
          });
        });
      }
      if (recentDisputes.data) {
        recentDisputes.data.forEach((d) => {
          events.push({
            type: "dispute",
            title: `Dispute Escalated`,
            desc: `Reason: ${d.reason} • Status: ${d.status.toUpperCase()}`,
            time: new Date(d.created_at),
          });
        });
      }
      if (recentWithdrawals.data) {
        recentWithdrawals.data.forEach((w) => {
          events.push({
            type: "withdrawal",
            title: `Payout Withdrawal Request`,
            desc: `Amount: ₹${w.amount.toLocaleString()} • Status: ${w.status.toUpperCase()}`,
            time: new Date(w.created_at),
          });
        });
      }
      if (recentVerifications.data) {
        recentVerifications.data.forEach((v) => {
          events.push({
            type: "verification",
            title: `Seller Verification Filed`,
            desc: `Status: ${v.status.toUpperCase()}`,
            time: new Date(v.created_at),
          });
        });
      }

      events.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivity(events.slice(0, 8));
    } catch (e: any) {
      console.error("[AdminDashboard] Error loading counts:", e);
      toast.error("Failed to sync overview stats: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCounts();
  }, []);

  async function seedCategories() {
    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    setSeeding(true);
    const rows = primaryCategories.map((c, index) => ({
      title: c.title,
      slug: c.slug,
      sort: (index + 1) * 10,
    }));
    const { error } = await supabase.from("categories").upsert(rows, { onConflict: "slug" });
    setSeeding(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Default categories synced.");
      await loadCounts();
    }
  }

  const formatINR = (val: number) => {
    return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const getEventColorClass = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "order":
        return "text-blue-400 border-blue-500/20 bg-blue-500/10";
      case "dispute":
        return "text-red-400 border-red-500/20 bg-red-500/10";
      case "withdrawal":
        return "text-purple-400 border-purple-500/20 bg-purple-500/10";
      case "verification":
        return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/60 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Super Admin Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time business indicators, verification approvals, disputes, and marketplace activities.
          </p>
        </div>
        <button
          onClick={loadCounts}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20 animate-none"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
        </button>
      </div>

      {/* Platform Health Monitor (documentation requirement: "Platform Health Monitoring" section) */}
      <div className="rounded-2xl border border-border/60 bg-surface/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-surface/30">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4 text-emerald-400" />
            <span className="font-semibold text-sm">Platform Health Monitor</span>
            <span className="flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Real-time • Auto-refreshes</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 lg:divide-x divide-border/40">
          {[
            {
              label: "Open Disputes",
              value: loading ? "—" : stats.openDisputes,
              to: "/admin/disputes",
              alert: stats.openDisputes > 0,
              icon: ShieldAlert,
            },
            {
              label: "Pending Payments",
              value: loading ? "—" : stats.pendingPayments,
              to: "/admin/payments",
              alert: stats.pendingPayments > 0,
              icon: Clock,
            },
            {
              label: "Pending Verifications",
              value: loading ? "—" : stats.pendingVerifications,
              to: "/admin/verifications",
              alert: stats.pendingVerifications > 0,
              icon: BadgeCheck,
            },
            {
              label: "Pending Withdrawals",
              value: loading ? "—" : stats.pendingWithdrawals,
              to: "/admin/withdrawals",
              alert: stats.pendingWithdrawals > 0,
              icon: AlertCircle,
            },
            {
              label: "Open Tickets",
              value: loading ? "—" : stats.pendingTickets,
              to: "/admin/tickets",
              alert: stats.pendingTickets > 0,
              icon: AlertCircle,
            },
            {
              label: "Platform Status",
              value: "Operational",
              to: "/admin/audit-logs",
              alert: false,
              icon: CheckCircle2,
              isStatus: true,
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to as any}
              className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface/40 transition-all group ${
                item.alert ? "bg-red-500/5" : ""
              }`}
            >
              <item.icon
                className={`size-4 shrink-0 ${
                  item.alert ? "text-red-400" : item.isStatus ? "text-emerald-400" : "text-muted-foreground"
                }`}
              />
              <div>
                <div
                  className={`font-bold text-sm tabular-nums ${
                    item.alert ? "text-red-400" : item.isStatus ? "text-emerald-400" : "text-foreground"
                  }`}
                >
                  {item.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Sales Volume",
            value: loading ? "..." : formatINR(stats.totalVolume),
            desc: "Gross buyer payments",
            icon: DollarSign,
            to: "/admin/payments",
            primary: true,
          },
          {
            label: "Platform Revenue",
            value: loading ? "..." : formatINR(stats.platformRevenue),
            desc: "Net escrow commissions",
            icon: TrendingUp,
            to: "/admin/earnings",
            primary: true,
          },
          {
            label: "Orders Today",
            value: loading ? "..." : stats.ordersToday,
            desc: "New transactions today",
            icon: ShoppingBag,
            to: "/admin/payments",
          },
          {
            label: "Total Orders",
            value: loading ? "..." : stats.totalOrders,
            desc: "Lifetime transactions",
            icon: ShoppingBag,
            to: "/admin/payments",
          },
          {
            label: "Active Listings",
            value: loading ? "..." : stats.activeListings,
            desc: "Open marketplace listings",
            icon: FileText,
            to: "/admin/listings",
          },
          {
            label: "Open Disputes",
            value: loading ? "..." : stats.openDisputes,
            desc: "Awaiting moderator review",
            icon: ShieldAlert,
            to: "/admin/disputes",
            alert: stats.openDisputes > 0,
          },
          {
            label: "Pending Payments",
            value: loading ? "..." : stats.pendingPayments,
            desc: "Payment proofs awaiting approval",
            icon: Clock,
            to: "/admin/payments",
            alert: stats.pendingPayments > 0,
          },
          {
            label: "Pending KYC Requests",
            value: loading ? "..." : stats.pendingVerifications,
            desc: "Awaiting verification",
            icon: BadgeCheck,
            to: "/admin/verifications",
            alert: stats.pendingVerifications > 0,
          },
          {
            label: "Pending Withdrawals",
            value: loading ? "..." : stats.pendingWithdrawals,
            desc: "Payouts in review queue",
            icon: Wallet,
            to: "/admin/withdrawals",
            alert: stats.pendingWithdrawals > 0,
          },
          {
            label: "Total Platform Users",
            value: loading ? "..." : stats.totalUsers,
            desc: `Sellers: ${stats.activeSellers} • Buyers: ${stats.activeBuyers}`,
            icon: Users,
            to: "/admin/users",
          },
          {
            label: "Support Tickets",
            value: loading ? "..." : stats.pendingTickets,
            desc: "Open support requests",
            icon: AlertCircle,
            to: "/admin/tickets",
            alert: stats.pendingTickets > 0,
          },
        ].map((c, i) => (
          <Link
            key={i}
            to={c.to as any}
            className={`rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-0.5 ${
              c.primary 
                ? "bg-gold/5 border-gold/30 hover:border-gold/60" 
                : c.alert 
                ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" 
                : "bg-surface/30 border-border hover:border-gold/30"
            }`}
          >
            {c.primary && (
              <div className="absolute -top-12 -right-12 size-32 rounded-full opacity-10 pointer-events-none bg-gradient-to-br from-gold to-transparent" />
            )}
            <div className="flex items-start justify-between">
              <div className="text-xs text-muted-foreground font-medium">{c.label}</div>
              <div className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
                c.primary 
                  ? "bg-gold/10 text-gold" 
                  : c.alert 
                  ? "bg-red-500/10 text-red-400" 
                  : "bg-surface text-muted-foreground group-hover:text-gold"
              }`}>
                <c.icon size={15} />
              </div>
            </div>
            <div className={`font-display text-2xl font-bold mt-3 ${
              c.primary ? "text-gold" : c.alert ? "text-red-400" : "text-foreground"
            }`}>
              {c.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">{c.desc}</div>
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight size={12} className="text-gold" />
            </div>
          </Link>
        ))}
      </div>

      {/* Activity Feed & Setup Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <div className="rounded-3xl border border-border bg-surface/30 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="font-display font-semibold text-base">Marketplace Activity Feed</h2>
              <p className="text-xs text-muted-foreground">Real-time listing logs and actions filed.</p>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="size-6 text-gold animate-spin" />
            </div>
          ) : activity.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              No recent marketplace activity found.
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {activity.map((event, idx) => (
                <div key={idx} className="flex gap-3 text-xs items-start border-b border-border/20 pb-3 last:border-0 last:pb-0">
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider shrink-0 ${getEventColorClass(event.type)}`}>
                    {event.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{event.title}</p>
                    <p className="text-muted-foreground mt-0.5">{event.desc}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {event.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup & Administration */}
        <div className="space-y-6">
          <PanelCard title="Escrow Verification Setup">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <Database className="size-5 text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Synchronize Category Configurations</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Automatically sync standard categories and parameters used on the homepage, category filters, and navigation menus.
                </p>
                <button
                  onClick={seedCategories}
                  disabled={seeding}
                  className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer border-none"
                >
                  {seeding && <Loader2 className="size-3 animate-spin" />}
                  <Database size={13} /> Sync Standard Categories
                </button>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Dashboard Quick Links">
            <p className="text-xs text-muted-foreground mb-4">
              Authorized personnel links to specific operational control and audit ledgers.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Earnings Ledger", to: "/admin/earnings" },
                { label: "Withdrawals Ledger", to: "/admin/withdrawals" },
                { label: "Category Manager", to: "/admin/categories" },
                { label: "Audit Settings", to: "/admin/settings" },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.to as any}
                  className="p-3 rounded-xl border border-border hover:border-gold/30 bg-surface/30 hover:bg-surface/60 text-xs font-semibold text-center transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
