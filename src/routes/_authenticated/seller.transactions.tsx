import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { transactions } from "@/lib/seller/mock-data";
import { Download, Receipt } from "lucide-react";

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
          <p className="text-sm text-muted-foreground mt-1">Complete ledger of sales, refunds, withdrawals and fees.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface">
          <Download size={14} /> Export
        </button>
      </div>

      <PanelCard title="All transactions" action={<Receipt size={14} className="text-muted-foreground" />}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2.5">Ref</th>
              <th className="text-left font-medium">Type</th>
              <th className="text-right font-medium">Gross</th>
              <th className="text-right font-medium">Fee</th>
              <th className="text-right font-medium">Net</th>
              <th className="text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-surface/40">
                <td className="py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                <td className="py-3"><StatusPill status={t.type === "Refund" ? "Disputed" : t.type === "Withdrawal" ? "Pending" : "Completed"} /></td>
                <td className="py-3 text-right">${Math.abs(t.amount).toFixed(2)}</td>
                <td className="py-3 text-right text-muted-foreground">${t.fee.toFixed(2)}</td>
                <td className={`py-3 text-right font-semibold ${t.net < 0 ? "text-destructive" : "text-emerald-400"}`}>{t.net < 0 ? "-" : "+"}${Math.abs(t.net).toFixed(2)}</td>
                <td className="py-3 text-right text-xs text-muted-foreground">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>
    </div>
  );
}
