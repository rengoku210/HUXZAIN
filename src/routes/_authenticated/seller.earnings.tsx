import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, TrendingUp, Percent, Wallet, Download } from "lucide-react";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/seller/earnings")({
  head: () => ({ meta: [{ title: "Earnings — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track gross sales, fees, and net payout.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-lg border border-border hover:bg-surface">
          <Download size={14} /> Statement PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime earnings"
          value="₹0"
          icon={DollarSign}
          premium
        />
        <StatCard label="This month" value="₹0" icon={TrendingUp} />
        <StatCard
          label="Platform fee"
          value="1.9%"
          delta="Upgrade to lower"
          icon={Percent}
          positive={false}
        />
        <StatCard label="Available to withdraw" value="₹0" icon={Wallet} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Earnings — last 7 days" className="lg:col-span-2">
          <div className="py-12 text-center text-muted-foreground text-sm">
            Earnings chart will appear once you have transaction history.
          </div>
        </PanelCard>
        <PanelCard title="Breakdown · 30 days">
          <div className="py-12 text-center text-muted-foreground text-sm">
            Your earnings breakdown will appear here once you start receiving orders.
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
