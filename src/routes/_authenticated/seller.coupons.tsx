import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { coupons } from "@/lib/seller/mock-data";
import { Plus, Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/coupons")({
  head: () => ({ meta: [{ title: "Coupons — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-1">Create discount codes to boost conversions.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
          <Plus size={14} /> New coupon
        </button>
      </div>

      <PanelCard title="Active codes" action={<Ticket size={14} className="text-muted-foreground" />}>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2.5">Code</th>
                <th className="text-left font-medium">Discount</th>
                <th className="text-right font-medium">Uses</th>
                <th className="text-left font-medium pl-4">Status</th>
                <th className="text-right font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-border/50">
                  <td className="py-3 font-mono font-semibold text-gold">{c.code}</td>
                  <td className="py-3">{c.discount}</td>
                  <td className="py-3 text-right">{c.uses}</td>
                  <td className="py-3 pl-4"><StatusPill status={c.status} /></td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{c.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
