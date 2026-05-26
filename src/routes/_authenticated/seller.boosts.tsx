import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Rocket, TrendingUp } from "lucide-react";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";

export const Route = createFileRoute("/_authenticated/seller/boosts")({
  head: () => ({ meta: [{ title: "Boosts — HUXZAIN Seller" }] }),
  component: Page,
});

const boosts = [
  {
    name: "Homepage Spotlight",
    desc: "Featured carousel on the HUXZAIN homepage for 24h.",
    price: 19,
    min: "pro" as const,
  },
  {
    name: "Category Banner",
    desc: "Banner placement at the top of your category for 48h.",
    price: 29,
    min: "pro" as const,
  },
  {
    name: "Search Top Slot",
    desc: "Pinned to position #1 of relevant searches for 24h.",
    price: 14,
    min: "standard" as const,
  },
  {
    name: "Newsletter Feature",
    desc: "Highlighted in the weekly buyer newsletter (50k+).",
    price: 59,
    min: "elite" as const,
  },
];

function Page() {
  const { tier } = useSellerTier();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Boosts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buy temporary placements to drive traffic and sales.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {boosts.map((b) => {
          const eligible = tierAtLeast(tier, b.min);
          return (
            <div
              key={b.name}
              className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                  <Rocket size={16} />
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold">${b.price}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    one-time
                  </div>
                </div>
              </div>
              <div className="mt-3 font-semibold">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
              {eligible ? (
                <button className="mt-4 w-full h-10 rounded-lg bg-gold text-black font-semibold text-sm hover:bg-gold/90">
                  Activate boost
                </button>
              ) : (
                <Link
                  to="/seller/subscription"
                  className="mt-4 w-full inline-flex items-center justify-center h-10 rounded-lg border border-gold/30 text-gold font-semibold text-sm"
                >
                  Requires {b.min.toUpperCase()} plan
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <PanelCard
        title="Boost performance"
        action={<TrendingUp size={14} className="text-muted-foreground" />}
      >
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <Metric k="Active boosts" v="2" />
          <Metric k="Extra views (7d)" v="3,180" />
          <Metric k="Conversions" v="42" />
        </div>
      </PanelCard>
    </div>
  );
}
function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-4">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-display text-xl font-bold mt-1">{v}</div>
    </div>
  );
}
