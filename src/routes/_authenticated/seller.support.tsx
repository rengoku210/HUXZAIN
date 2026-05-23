import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { LifeBuoy, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/support")({
  head: () => ({ meta: [{ title: "Support — HUXZAIN Seller" }] }),
  component: Page,
});

const tickets = [
  { id: "T-7821", subject: "Withdrawal not received", status: "Open", updated: "2h ago" },
  { id: "T-7790", subject: "How to verify TikTok handle", status: "Completed", updated: "2d ago" },
];

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Open a ticket — we respond within 6 hours on average.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
          <Plus size={14} /> New ticket
        </button>
      </div>

      <PanelCard title="Your tickets" action={<LifeBuoy size={14} className="text-muted-foreground" />}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2.5">Ref</th>
              <th className="text-left font-medium">Subject</th>
              <th className="text-left font-medium pl-4">Status</th>
              <th className="text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-border/50">
                <td className="py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                <td className="py-3">{t.subject}</td>
                <td className="py-3 pl-4"><StatusPill status={t.status} /></td>
                <td className="py-3 text-right text-xs text-muted-foreground">{t.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>
    </div>
  );
}
