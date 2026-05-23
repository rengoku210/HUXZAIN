import { createFileRoute } from "@tanstack/react-router";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Shield } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { transactions } from "@/lib/seller/mock-data";
import { useSellerTier } from "@/lib/seller/tier-context";

export const Route = createFileRoute("/_authenticated/seller/wallet")({
  head: () => ({ meta: [{ title: "Wallet — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { meta } = useSellerTier();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Your HUXZAIN balance, holds, and instant transfers.</p>
      </div>

      <div className="rounded-3xl border border-border p-6 lg:p-8 relative overflow-hidden"
           style={{ background: meta.surfaceGradient, boxShadow: meta.glow }}>
        <div className="absolute -right-20 -top-20 size-64 rounded-full opacity-20"
             style={{ background: "radial-gradient(closest-side, oklch(0.82 0.13 82), transparent)" }} />
        <div className="relative flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Available balance</div>
            <div className="font-display text-5xl font-bold text-gold-gradient mt-2">$2,140.36</div>
            <div className="text-xs text-muted-foreground mt-2">On hold: $324.10 · Pending payouts: $0.00</div>
          </div>
          <div className="flex gap-2">
            <button className="h-11 px-5 rounded-xl bg-gold text-black font-semibold text-sm inline-flex items-center gap-2 hover:bg-gold/90">
              <ArrowUpFromLine size={14} /> Withdraw
            </button>
            <button className="h-11 px-5 rounded-xl border border-border hover:bg-surface text-sm inline-flex items-center gap-2">
              <ArrowDownToLine size={14} /> Top-up
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lifetime received" value="$48,920" icon={Wallet} />
        <StatCard label="Currently on hold" value="$324.10" icon={Shield} />
        <StatCard label="Withdrawn (30d)" value="$1,700" icon={ArrowUpFromLine} />
        <StatCard label="Next auto-payout" value="In 3d" icon={ArrowDownToLine} />
      </div>

      <PanelCard title="Recent wallet activity">
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2.5">Reference</th>
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
        </div>
      </PanelCard>
    </div>
  );
}
