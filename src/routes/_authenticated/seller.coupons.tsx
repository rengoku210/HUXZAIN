import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox, Plus } from "lucide-react";

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
          <p className="text-sm text-muted-foreground mt-1">
            Create discount codes to boost conversions.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
          <Plus size={14} /> New coupon
        </button>
      </div>

      <PanelCard title="Active codes">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No coupons yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No coupons yet. Create your first coupon to offer discounts.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
