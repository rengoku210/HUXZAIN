import { createFileRoute } from "@tanstack/react-router";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { reviews } from "@/lib/seller/mock-data";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/reviews")({
  head: () => ({ meta: [{ title: "Reviews — HUXZAIN Seller" }] }),
  component: Page,
});

const dist = [
  { s: 5, c: 124 }, { s: 4, c: 12 }, { s: 3, c: 4 }, { s: 2, c: 1 }, { s: 1, c: 1 },
];
const total = dist.reduce((a, b) => a + b.c, 0);

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Buyer feedback shapes your seller score.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Average rating" value="4.92" icon={Star} premium />
        <StatCard label="Total reviews" value={String(total)} delta="+8 this week" />
        <StatCard label="5★ share" value="91%" delta="+2%" />
        <StatCard label="Response rate" value="98%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Rating distribution">
          <div className="space-y-2">
            {dist.map((d) => (
              <div key={d.s} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground">{d.s}★</span>
                <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${(d.c / total) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs text-muted-foreground">{d.c}</span>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Recent reviews" className="lg:col-span-2">
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{r.buyer}</div>
                  <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} className="fill-gold text-gold" />)}</div>
                </div>
                <p className="text-sm mt-2">{r.text}</p>
                <div className="text-xs text-muted-foreground mt-2">{r.time}</div>
              </li>
            ))}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
