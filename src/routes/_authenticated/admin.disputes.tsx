import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  head: () => ({ meta: [{ title: "Disputes — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <h1 className="font-display text-2xl font-bold">Disputes</h1>
      <p className="text-sm text-muted-foreground mt-1">Mediate open buyer/seller disputes.</p>
      <div className="mt-6">
        <PanelCard title="Disputes">
          <EmptyState title="No data yet" desc="Populated once Supabase tables (see docs/SCHEMA.sql) contain data." />
        </PanelCard>
      </div>
    </>
  );
}
