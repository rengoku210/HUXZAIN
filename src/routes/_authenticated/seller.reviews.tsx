import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/reviews")({
  head: () => ({ meta: [{ title: "Reviews — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buyer feedback shapes your seller score.
        </p>
      </div>

      <PanelCard title="Buyer reviews">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No reviews yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No reviews yet. Reviews from your buyers will appear here.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
