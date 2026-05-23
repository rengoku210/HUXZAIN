import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatusPill, StatCard } from "@/components/seller/SellerShell";
import { withdrawals } from "@/lib/seller/mock-data";
import { ArrowUpFromLine, Clock, CheckCircle2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-1">Request payouts and review history.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90">
          <ArrowUpFromLine size={14} /> Request withdrawal
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available" value="$2,140.36" icon={Wallet} />
        <StatCard label="Pending" value="$350" icon={Clock} />
        <StatCard label="Last payout" value="$1,200" delta="May 02" icon={CheckCircle2} />
        <StatCard label="Auto-payout" value="Weekly" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="New withdrawal" className="lg:col-span-1">
          <div className="space-y-3 text-sm">
            <Field label="Amount (USD)" value="$ 500.00" />
            <Field label="Method" value="Razorpay UPI · rylan@upi" />
            <button className="w-full h-10 rounded-lg bg-gold text-black font-semibold mt-2 hover:bg-gold/90">Confirm withdrawal</button>
            <p className="text-[11px] text-muted-foreground">Withdrawals typically arrive within 24h. A 0.5% network fee may apply.</p>
          </div>
        </PanelCard>

        <PanelCard title="History" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-2.5">Ref</th>
                <th className="text-left font-medium">Method</th>
                <th className="text-right font-medium">Amount</th>
                <th className="text-left font-medium pl-4">Status</th>
                <th className="text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-border/50">
                  <td className="py-3 font-mono text-xs text-muted-foreground">{w.id}</td>
                  <td className="py-3">{w.method}</td>
                  <td className="py-3 text-right font-semibold">${w.amount.toFixed(2)}</td>
                  <td className="py-3 pl-4"><StatusPill status={w.status} /></td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{w.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelCard>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input defaultValue={value} className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
    </label>
  );
}
