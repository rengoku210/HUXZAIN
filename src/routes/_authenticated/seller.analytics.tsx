import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { RevenueArea, OrdersBar, ConversionLine, CategoryPie } from "@/components/seller/charts";
import { revenueSeries, ordersSeries, conversionSeries, categoryShare } from "@/lib/seller/mock-data";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { Eye, MousePointerClick, ShoppingBag, Repeat, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { tier } = useSellerTier();
  const isPro = tierAtLeast(tier, "pro");
  const isElite = tierAtLeast(tier, "elite");
  const isEnt = tierAtLeast(tier, "enterprise");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEnt ? "Executive suite · real-time streaming enabled." : isElite ? "Advanced funnel & cohort analytics." : isPro ? "Pro analytics dashboard." : "Basic insights — upgrade for advanced metrics."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Store views (7d)" value="12,408" delta="+18%" icon={Eye} />
        <StatCard label="Click-through" value="6.4%" delta="+0.8%" icon={MousePointerClick} premium={isPro} />
        <StatCard label="Conversions" value="312" delta="+24" icon={ShoppingBag} />
        <StatCard label="Repeat buyer rate" value="38%" delta={isElite ? "+5%" : "Upgrade for cohort"} icon={Repeat} premium={isElite} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Revenue" className="lg:col-span-2"><RevenueArea data={revenueSeries} /></PanelCard>
        <PanelCard title="Top categories">
          {isPro ? <CategoryPie data={categoryShare} /> : <Locked min="Pro" />}
        </PanelCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelCard title="Orders volume"><OrdersBar data={ordersSeries} /></PanelCard>
        <PanelCard title="Conversion rate trend">
          {isPro ? <ConversionLine data={conversionSeries} /> : <Locked min="Pro" />}
        </PanelCard>
      </div>

      {isElite && (
        <PanelCard title="Funnel analysis (Elite)">
          <div className="space-y-3">
            {[
              { k: "Visited storefront", v: 12408, pct: 100 },
              { k: "Viewed product", v: 6890, pct: 55 },
              { k: "Added to cart", v: 1284, pct: 10 },
              { k: "Initiated checkout", v: 712, pct: 5.7 },
              { k: "Completed purchase", v: 312, pct: 2.5 },
            ].map((s) => (
              <div key={s.k}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>{s.k}</span>
                  <span className="text-muted-foreground">{s.v.toLocaleString()} · {s.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-background/60 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "linear-gradient(90deg, oklch(0.82 0.13 82), oklch(0.6 0.13 70))" }} />
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {isEnt && (
        <PanelCard title="Cohort retention (Enterprise)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium pb-2">Cohort</th>
                  {["W1","W2","W3","W4","W5","W6"].map(w => <th key={w} className="px-2 pb-2 text-center font-medium">{w}</th>)}
                </tr>
              </thead>
              <tbody>
                {["Jan","Feb","Mar","Apr"].map((m, i) => (
                  <tr key={m} className="border-t border-border/50">
                    <td className="py-2 font-medium">{m}</td>
                    {[100, 78-i*4, 62-i*4, 48-i*3, 41-i*3, 38-i*2].map((p, j) => (
                      <td key={j} className="p-1">
                        <div className="h-7 rounded grid place-items-center text-[10px] font-semibold"
                             style={{ background: `oklch(0.82 0.13 82 / ${(p/100)*0.6})`, color: p > 50 ? "#000" : "var(--foreground)" }}>
                          {p}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function Locked({ min }: { min: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-center">
      <Crown className="text-gold mb-2" size={20} />
      <div className="text-sm font-medium">Unlock with {min}</div>
      <Link to="/seller/subscription" className="text-xs text-gold hover:underline mt-1">Upgrade plan</Link>
    </div>
  );
}
