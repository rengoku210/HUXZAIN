import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Order, payout, review and system alerts.
        </p>
      </div>

      <PanelCard title="Recent">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No notifications yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No notifications yet. You'll be notified about orders, reviews, and
            payouts.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
