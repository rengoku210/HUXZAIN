import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your store performance, revenue, and buyer insights.
        </p>
      </div>

      <PanelCard title="Overview">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No analytics data yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Your analytics will appear once you start receiving orders and
            traffic.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
