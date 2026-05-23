import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Lock, Smartphone, Monitor, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/security")({
  head: () => ({ meta: [{ title: "Security — HUXZAIN Seller" }] }),
  component: Page,
});

const sessions = [
  { device: "MacBook Pro · Chrome", loc: "Mumbai, IN", ip: "103.21.x.x", time: "Active now", icon: Monitor },
  { device: "iPhone 15 · Safari", loc: "Mumbai, IN", ip: "49.36.x.x", time: "2 hours ago", icon: Smartphone },
];

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Protect your seller account with 2FA and active session control.</p>
      </div>

      <PanelCard title="Password & two-factor" action={<Shield size={14} className="text-muted-foreground" />}>
        <div className="space-y-4 text-sm">
          <Row label="Password" desc="Last changed 28 days ago" cta="Change" />
          <Row label="Two-factor authentication" desc="Authenticator app · enabled" cta="Manage" enabled />
          <Row label="Backup codes" desc="6 of 8 codes remaining" cta="View" />
        </div>
      </PanelCard>

      <PanelCard title="Active sessions" action={<Lock size={14} className="text-muted-foreground" />}>
        <ul className="divide-y divide-border/50">
          {sessions.map((s) => (
            <li key={s.device} className="py-3 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-background/60 grid place-items-center text-muted-foreground"><s.icon size={16} /></div>
              <div className="flex-1">
                <div className="text-sm font-medium">{s.device}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.loc} · {s.ip}</div>
              </div>
              <div className="text-xs text-emerald-400">{s.time}</div>
              <button className="text-xs text-destructive hover:underline">Revoke</button>
            </li>
          ))}
        </ul>
      </PanelCard>
    </div>
  );
}

function Row({ label, desc, cta, enabled }: { label: string; desc: string; cta: string; enabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <div className="flex items-center gap-3">
        {enabled && <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Enabled</span>}
        <button className="h-9 px-3 rounded-lg border border-border text-xs hover:bg-surface">{cta}</button>
      </div>
    </div>
  );
}
