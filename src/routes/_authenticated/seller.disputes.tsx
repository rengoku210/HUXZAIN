import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatusPill, StatCard } from "@/components/seller/SellerShell";
import { disputes } from "@/lib/seller/mock-data";
import { AlertCircle, Shield, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/disputes")({
  head: () => ({ meta: [{ title: "Disputes — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Disputes</h1>
        <p className="text-sm text-muted-foreground mt-1">Resolve buyer claims quickly to protect your seller rating.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open disputes" value="1" icon={AlertCircle} positive={false} />
        <StatCard label="Won this month" value="3" delta="+2" icon={CheckCircle2} />
        <StatCard label="Lost this month" value="0" icon={Shield} />
        <StatCard label="Dispute rate" value="0.3%" delta="Industry-low" />
      </div>

      <PanelCard title="Cases">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2.5">Case</th>
              <th className="text-left font-medium">Order</th>
              <th className="text-left font-medium">Buyer</th>
              <th className="text-left font-medium">Reason</th>
              <th className="text-left font-medium pl-4">Status</th>
              <th className="text-right font-medium">Opened</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id} className="border-b border-border/50">
                <td className="py-3 font-mono text-xs text-muted-foreground">{d.id}</td>
                <td className="py-3 font-mono text-xs">{d.order}</td>
                <td className="py-3">{d.buyer}</td>
                <td className="py-3">{d.reason}</td>
                <td className="py-3 pl-4"><StatusPill status={d.status} /></td>
                <td className="py-3 text-right text-xs text-muted-foreground">{d.opened}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>
    </div>
  );
}
