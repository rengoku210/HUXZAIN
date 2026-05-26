import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/messages")({
  head: () => ({ meta: [{ title: "Messages — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Direct conversations with your buyers.
        </p>
      </div>

      <PanelCard title="Conversations">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No messages yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No messages yet. Buyer conversations will appear here.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
