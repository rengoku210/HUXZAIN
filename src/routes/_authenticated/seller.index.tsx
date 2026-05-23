import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, ShoppingBag, TrendingUp, Star, ArrowUpRight, Zap, Crown } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { TierBadge } from "@/components/seller/TierBadge";
import { RevenueArea, OrdersBar, ConversionLine, CategoryPie } from "@/components/seller/charts";
import { recentOrders, revenueSeries, ordersSeries, conversionSeries, categoryShare } from "@/lib/seller/mock-data";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({ meta: [{ title: "Seller Dashboard — HUXZAIN" }] }),
  component: Overview,
});

function Overview() {
  const { profile, user } = useAuth();
  const { tier, meta } = useSellerTier();
  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "Seller";
  const isPro = tierAtLeast(tier, "pro");
  const isElite = tierAtLeast(tier, "elite");
  const isEnt = tierAtLeast(tier, "enterprise");

  return (
    <div className="space-y-6">
      {/* Hero / welcome */}
      <div
        className="relative rounded-3xl border border-border p-6 lg:p-8 overflow-hidden"
        style={{ background: meta.surfaceGradient, boxShadow: meta.glow }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ background: "radial-gradient(800px 300px at 90% 0%, oklch(0.82 0.13 82 / 0.18), transparent)" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Welcome back</div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold mt-1">
              {name} <span className="text-gold-gradient">·</span> <span className="text-gold-gradient">{meta.label}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              You're on the {meta.label} plan. {isElite ? "Your store is featured across HUXZAIN today." : "Upgrade to unlock premium analytics & featured placement."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TierBadge tier={tier} size="lg" />
            {!isEnt && (
              <Link to="/seller/subscription" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
                <Crown size={14} /> Upgrade
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earnings" value="$12,480" delta="+18.2% vs last month" icon={DollarSign} premium={isElite} />
        <StatCard label="Total Orders" value="312" delta="+24 this week" icon={ShoppingBag} />
        <StatCard label="Conversion Rate" value="3.8%" delta="+0.6%" icon={TrendingUp} premium={isPro} />
        <StatCard label="Avg. Rating" value="4.92" delta="142 reviews" icon={Star} premium={isElite} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard
          title="Revenue · Last 7 days"
          className="lg:col-span-2"
          action={<span className="text-xs text-emerald-400 font-medium">+$2,140</span>}
        >
          <RevenueArea data={revenueSeries} />
        </PanelCard>
        <PanelCard title="Sales by category">
          {isPro ? (
            <>
              <CategoryPie data={categoryShare} />
              <ul className="mt-3 text-xs space-y-1">
                {categoryShare.map((c) => (
                  <li key={c.name} className="flex justify-between text-muted-foreground">
                    <span>{c.name}</span><span className="text-foreground font-medium">{c.v}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <UpgradeTeaser min="Pro" feature="category breakdown chart" />
          )}
        </PanelCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelCard title="Orders per week" action={<span className="text-xs text-muted-foreground">last 7 weeks</span>}>
          <OrdersBar data={ordersSeries} />
        </PanelCard>
        <PanelCard title="Conversion trend" action={<span className="text-xs text-muted-foreground">last 6 months</span>}>
          {isPro ? <ConversionLine data={conversionSeries} /> : <UpgradeTeaser min="Pro" feature="conversion analytics" />}
        </PanelCard>
      </div>

      {/* Elite/Enterprise exclusive widgets */}
      {isElite && (
        <div className="grid lg:grid-cols-3 gap-6">
          <PanelCard
            title="Seller Trust Score"
            className="lg:col-span-1"
          >
            <div className="flex items-center gap-4">
              <div
                className="size-24 rounded-full grid place-items-center font-display font-bold text-2xl"
                style={{
                  background: "conic-gradient(oklch(0.82 0.13 82) 96%, oklch(0.28 0.014 250) 0)",
                }}
              >
                <span className="size-20 rounded-full bg-surface grid place-items-center">96</span>
              </div>
              <div className="text-xs space-y-1.5">
                <Metric k="Response rate" v="98%" />
                <Metric k="Delivery speed" v="6 min avg" />
                <Metric k="Completed orders" v="312" />
                <Metric k="KYC verified" v="Yes" pos />
              </div>
            </div>
          </PanelCard>
          <PanelCard title="Featured placements" className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <FeatureRow label="Homepage spotlight" status="Live · 4h remaining" pos />
              <FeatureRow label="Category banner" status="Live · 2d remaining" pos />
              <FeatureRow label="Search top boost" status="Active" pos />
              <FeatureRow label="Email feature" status={isEnt ? "Scheduled · May 25" : "Enterprise only"} pos={isEnt} />
            </div>
          </PanelCard>
        </div>
      )}

      {/* Recent orders */}
      <PanelCard
        title="Recent Orders"
        action={<Link to="/seller/orders" className="text-xs text-gold hover:underline inline-flex items-center gap-1">View all <ArrowUpRight size={12} /></Link>}
      >
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2.5">Order</th>
                <th className="text-left font-medium">Buyer</th>
                <th className="text-left font-medium">Item</th>
                <th className="text-right font-medium">Amount</th>
                <th className="text-left font-medium pl-4">Status</th>
                <th className="text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-surface/40 transition-colors">
                  <td className="py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                  <td className="py-3">{o.buyer}</td>
                  <td className="py-3 max-w-[220px] truncate">{o.item}</td>
                  <td className="py-3 text-right font-semibold">${o.amount.toFixed(2)}</td>
                  <td className="py-3 pl-4"><StatusPill status={o.status} /></td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{o.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}

function Metric({ k, v, pos = false }: { k: string; v: string; pos?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold ${pos ? "text-emerald-400" : ""}`}>{v}</span>
    </div>
  );
}

function FeatureRow({ label, status, pos }: { label: string; status: string; pos?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3.5 flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className={`text-xs font-medium ${pos ? "text-emerald-400" : "text-muted-foreground"}`}>{status}</span>
    </div>
  );
}

function UpgradeTeaser({ min, feature }: { min: string; feature: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-center px-4">
      <div className="size-10 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-2">
        <Zap size={16} />
      </div>
      <div className="text-sm font-medium">Unlock {feature}</div>
      <div className="text-xs text-muted-foreground mt-1">Available on the {min} plan and above.</div>
      <Link to="/seller/subscription" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
        Upgrade <ArrowUpRight size={12} />
      </Link>
    </div>
  );
}
