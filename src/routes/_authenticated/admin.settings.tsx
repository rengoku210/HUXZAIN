import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <h1 className="font-display text-2xl font-bold">Platform Settings</h1>
      <p className="text-sm text-muted-foreground mt-1">Fees, payout schedules, and feature flags.</p>
      <div className="mt-6">
        <PanelCard title="Platform Settings">
          <EmptyState title="No data yet" desc="Populated once Supabase tables (see docs/SCHEMA.sql) contain data." />
        </PanelCard>
      </div>
    </>
  );
}
