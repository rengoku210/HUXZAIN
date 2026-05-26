import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/disputes")({
  head: () => ({ meta: [{ title: "Disputes — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Disputes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resolve buyer claims quickly to protect your seller rating.
        </p>
      </div>

      <PanelCard title="Cases">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No disputes</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No disputes. Your transaction history is clean.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
