import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Download, Receipt, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/transactions")({
  head: () => ({ meta: [{ title: "Transactions — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete ledger of sales, refunds, withdrawals and fees.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface">
          <Download size={14} /> Export
        </button>
      </div>

      <PanelCard
        title="All transactions"
        action={<Receipt size={14} className="text-muted-foreground" />}
      >
        <div className="py-16 text-center">
          <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
            <Inbox size={20} />
          </div>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Your transaction history will appear here once you start receiving orders and payments.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
