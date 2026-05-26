import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { ArrowUpFromLine, Clock, Wallet, Inbox } from "lucide-react";

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
        <StatCard label="Available" value="₹0.00" icon={Wallet} />
        <StatCard label="Pending" value="₹0" icon={Clock} />
        <StatCard label="Last payout" value="—" delta="No payouts yet" icon={ArrowUpFromLine} />
        <StatCard label="Auto-payout" value="Weekly" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="New withdrawal" className="lg:col-span-1">
          <div className="space-y-3 text-sm">
            <Field label="Amount (INR)" value="₹ 0.00" />
            <Field label="Method" value="UPI / Bank Transfer" />
            <button className="w-full h-10 rounded-lg bg-gold text-black font-semibold mt-2 hover:bg-gold/90">
              Confirm withdrawal
            </button>
            <p className="text-[11px] text-muted-foreground">
              Withdrawals typically arrive within 24h. A 0.5% network fee may apply.
            </p>
          </div>
        </PanelCard>

        <PanelCard title="History" className="lg:col-span-2">
          <div className="py-12 text-center">
            <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
              <Inbox size={20} />
            </div>
            <p className="font-medium">No withdrawals yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your withdrawal history will appear here once you make your first payout request.
            </p>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        defaultValue={value}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
      />
    </label>
  );
}
