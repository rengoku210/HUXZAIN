import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, TrendingUp, Percent, Wallet, Download } from "lucide-react";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { RevenueArea } from "@/components/seller/charts";
import { revenueSeries } from "@/lib/seller/mock-data";

export const Route = createFileRoute("/_authenticated/seller/earnings")({
  head: () => ({ meta: [{ title: "Earnings — HUXZAIN Seller" }] }),
  component: Page,
});

const breakdown = [
  { k: "Gross sales (30d)", v: "$8,420.00" },
  { k: "Platform fees (1.9%)", v: "-$160.00" },
  { k: "Refunds", v: "-$38.90" },
  { k: "Promotions", v: "-$24.00" },
  { k: "Net earnings", v: "$8,197.10", bold: true },
];

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track gross sales, fees, and net payout.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface">
          <Download size={14} /> Statement PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lifetime earnings" value="$48,920" delta="+$8,197 this month" icon={DollarSign} premium />
        <StatCard label="This month" value="$8,197" delta="+18.2%" icon={TrendingUp} />
        <StatCard label="Platform fee" value="1.9%" delta="Upgrade to lower" icon={Percent} positive={false} />
        <StatCard label="Available to withdraw" value="$2,140" icon={Wallet} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Earnings — last 7 days" className="lg:col-span-2">
          <RevenueArea data={revenueSeries} />
        </PanelCard>
        <PanelCard title="Breakdown · 30 days">
          <ul className="space-y-3 text-sm">
            {breakdown.map((b) => (
              <li key={b.k} className={`flex items-center justify-between ${b.bold ? "pt-3 border-t border-border font-semibold" : ""}`}>
                <span className={b.bold ? "" : "text-muted-foreground"}>{b.k}</span>
                <span>{b.v}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
