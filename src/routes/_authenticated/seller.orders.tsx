import { createFileRoute } from "@tanstack/react-router";
import { Filter, Download } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { recentOrders } from "@/lib/seller/mock-data";
import { ShoppingBag, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  head: () => ({ meta: [{ title: "Orders — HUXZAIN Seller" }] }),
  component: Page,
});

const all = [
  ...recentOrders,
  { id: "HX-29455", buyer: "luna_z", item: "Apex Legends Coins", amount: 19.99, status: "Delivered", time: "1d ago" },
  { id: "HX-29448", buyer: "marco", item: "Roblox Robux 4500", amount: 49.99, status: "Processing", time: "1d ago" },
  { id: "HX-29440", buyer: "sienna", item: "CSGO Skin Trade", amount: 210, status: "Delivered", time: "2d ago" },
];

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">All buyer orders and their fulfillment status.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="All-time orders" value="312" icon={ShoppingBag} />
        <StatCard label="Pending fulfillment" value="3" delta="2 within 1h" positive={false} icon={Clock} />
        <StatCard label="Delivered (30d)" value="84" delta="+12%" icon={CheckCircle2} />
        <StatCard label="Open disputes" value="1" delta="Needs response" positive={false} icon={AlertTriangle} />
      </div>

      <PanelCard
        title="Order queue"
        action={
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 text-xs rounded-lg border border-border hover:bg-surface inline-flex items-center gap-1.5"><Filter size={12} /> Filters</button>
            <button className="h-9 px-3 text-xs rounded-lg border border-border hover:bg-surface inline-flex items-center gap-1.5"><Download size={12} /> Export CSV</button>
          </div>
        }
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {all.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-surface/40">
                  <td className="py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                  <td className="py-3">{o.buyer}</td>
                  <td className="py-3 max-w-[220px] truncate">{o.item}</td>
                  <td className="py-3 text-right font-semibold">${o.amount.toFixed(2)}</td>
                  <td className="py-3 pl-4"><StatusPill status={o.status} /></td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{o.time}</td>
                  <td className="py-3 text-right">
                    <button className="text-xs text-gold hover:underline">Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
