import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import { PanelCard } from "@/components/seller/SellerShell";
import { TierBadge } from "@/components/seller/TierBadge";
import { TIERS, type SellerTier, useSellerTier } from "@/lib/seller/tier-context";

export const Route = createFileRoute("/_authenticated/seller/subscription")({
  head: () => ({ meta: [{ title: "Subscription — HUXZAIN Seller" }] }),
  component: Page,
});

const order: SellerTier[] = ["standard", "pro", "elite", "enterprise"];

function Page() {
  const { tier, upgrade, setTier } = useSellerTier();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You're on the <span className="text-gold font-semibold">{TIERS[tier].label}</span> plan.
          Upgrade any time to unlock more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {order.map((t) => {
          const m = TIERS[t];
          const current = t === tier;
          const upgradable = TIERS[t].rank > TIERS[tier].rank;
          return (
            <div
              key={t}
              className={`relative rounded-2xl border p-6 flex flex-col overflow-hidden ${
                current ? "border-gold/40" : "border-border"
              }`}
              style={{ background: m.surfaceGradient, boxShadow: current ? m.glow : undefined }}
            >
              <div
                className="absolute -right-16 -top-16 size-40 rounded-full opacity-15"
                style={{
                  background: `radial-gradient(closest-side, oklch(0.82 0.13 82), transparent)`,
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <TierBadge tier={t} size="sm" />
                  {current && (
                    <span className="text-[10px] text-gold uppercase tracking-wider font-bold">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-4 font-display text-3xl font-bold">
                  {m.monthly === 0 ? 'Free' : `₹${m.monthly * 80}`}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{m.tagline}</div>

                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {m.unlocked.map((u) => (
                    <li key={u} className="flex items-start gap-2">
                      <Check size={14} className="text-gold mt-0.5 shrink-0" /> <span>{u}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {current ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-lg border border-border text-sm text-muted-foreground cursor-not-allowed"
                    >
                      Active plan
                    </button>
                  ) : upgradable ? (
                    <button
                      onClick={() => upgrade(t)}
                      className="w-full h-10 rounded-lg font-semibold text-sm text-black inline-flex items-center justify-center gap-1.5"
                      style={{ background: m.badgeGradient }}
                    >
                      <Crown size={14} /> Upgrade to {m.label}
                    </button>
                  ) : (
                    <button
                      onClick={() => setTier(t)}
                      className="w-full h-10 rounded-lg border border-border text-sm hover:bg-surface"
                    >
                      Downgrade
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PanelCard title="Billing">
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Payment method</div>
            <div className="mt-1">Razorpay · UPI</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Next renewal</div>
            <div className="mt-1">Jun 18, 2026</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Invoices</div>
            <a className="mt-1 text-gold hover:underline inline-block" href="#">
              Download all
            </a>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
