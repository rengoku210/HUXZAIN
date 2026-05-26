import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { Megaphone, Plus, Eye, MousePointerClick, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/ads")({
  head: () => ({ meta: [{ title: "Advertise — HUXZAIN Seller" }] }),
  component: Page,
});

const campaigns = [
  {
    name: "Valorant Accounts Q2",
    status: "Active",
    spend: 124,
    views: 8210,
    clicks: 412,
    sales: 18,
  },
  { name: "Steam Wallet Promo", status: "Paused", spend: 56, views: 3140, clicks: 188, sales: 7 },
];

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Advertise</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run sponsored campaigns across HUXZAIN.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
          <Plus size={14} /> New campaign
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ad spend (30d)" value="$180" icon={Megaphone} />
        <StatCard label="Impressions" value="11.3k" delta="+22%" icon={Eye} />
        <StatCard label="Clicks" value="600" delta="CTR 5.3%" icon={MousePointerClick} />
        <StatCard label="Sales from ads" value="25" delta="ROAS 3.8x" icon={ShoppingBag} premium />
      </div>

      <PanelCard title="Campaigns">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2.5">Campaign</th>
              <th className="text-left font-medium">Status</th>
              <th className="text-right font-medium">Spend</th>
              <th className="text-right font-medium">Impr.</th>
              <th className="text-right font-medium">Clicks</th>
              <th className="text-right font-medium">Sales</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} className="border-b border-border/50">
                <td className="py-3 font-medium">{c.name}</td>
                <td className="py-3 text-emerald-400 text-xs">{c.status}</td>
                <td className="py-3 text-right">${c.spend}</td>
                <td className="py-3 text-right">{c.views.toLocaleString()}</td>
                <td className="py-3 text-right">{c.clicks}</td>
                <td className="py-3 text-right font-semibold">{c.sales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>
    </div>
  );
}
