import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";

export const Route = createFileRoute("/_authenticated/seller/settings")({
  head: () => ({ meta: [{ title: "Settings — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Profile, payouts and seller preferences.</p>
      </div>

      <PanelCard title="Profile">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Display name" value="HUXZAIN Originals" />
          <Field label="Public handle" value="@huxzain" />
          <Field label="Email" value="seller@huxzain.shop" />
          <Field label="Country" value="India" />
          <Field label="Time zone" value="Asia/Kolkata" />
          <Field label="Default currency" value="USD" />
        </div>
        <div className="mt-5 flex gap-2">
          <button className="h-10 px-4 rounded-lg bg-gold text-black font-semibold text-sm">Save changes</button>
          <button className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface">Cancel</button>
        </div>
      </PanelCard>

      <PanelCard title="Payout details">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Payout method" value="Razorpay UPI" />
          <Field label="UPI ID" value="rylan@upi" />
          <Field label="Auto-payout schedule" value="Weekly · Mondays" />
          <Field label="Minimum payout" value="$50" />
        </div>
      </PanelCard>
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
