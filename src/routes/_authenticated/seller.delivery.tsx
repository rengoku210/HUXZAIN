import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { Truck, Clock, CheckCircle2, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/delivery")({
  head: () => ({ meta: [{ title: "Delivery — HUXZAIN Seller" }] }),
  component: Page,
});

const queue = [
  { id: "HX-29481", buyer: "rylan_47", item: "Valorant Immortal", mode: "Manual", eta: "Within 10 min", status: "Processing" },
  { id: "HX-29478", buyer: "ngao", item: "PUBG UC 8100", mode: "Auto", eta: "Instant", status: "Delivered" },
  { id: "HX-29470", buyer: "kira_x", item: "Steam Wallet $50", mode: "Auto-code", eta: "Instant", status: "Delivered" },
];

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Delivery Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track auto-delivery codes and manual fulfillment queue.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg. delivery time" value="6 min" delta="Faster than 94% sellers" icon={Zap} premium />
        <StatCard label="Auto-delivery" value="142 codes" delta="In stock" icon={Truck} />
        <StatCard label="Pending manual" value="2" icon={Clock} />
        <StatCard label="On-time rate" value="99.4%" icon={CheckCircle2} />
      </div>

      <PanelCard title="Delivery queue">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2.5">Order</th>
              <th className="text-left font-medium">Buyer</th>
              <th className="text-left font-medium">Item</th>
              <th className="text-left font-medium">Mode</th>
              <th className="text-left font-medium">ETA</th>
              <th className="text-left font-medium pl-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id} className="border-b border-border/50">
                <td className="py-3 font-mono text-xs text-muted-foreground">{q.id}</td>
                <td className="py-3">{q.buyer}</td>
                <td className="py-3">{q.item}</td>
                <td className="py-3 text-xs"><span className="px-2 py-0.5 rounded bg-gold/10 text-gold">{q.mode}</span></td>
                <td className="py-3 text-xs text-muted-foreground">{q.eta}</td>
                <td className="py-3 pl-4"><StatusPill status={q.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>

      <PanelCard title="Auto-delivery code inventory">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { sku: "STM-50", stock: 142, low: false },
            { sku: "PUBG-8100", stock: 99, low: false },
            { sku: "GEN-6480", stock: 12, low: true },
          ].map((s) => (
            <div key={s.sku} className="rounded-xl border border-border/60 bg-background/30 p-4">
              <div className="text-xs text-muted-foreground font-mono">{s.sku}</div>
              <div className="font-display text-xl font-bold mt-1">{s.stock}</div>
              <div className={`text-xs mt-1 ${s.low ? "text-amber-400" : "text-emerald-400"}`}>{s.low ? "Low stock — restock soon" : "Healthy"}</div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
