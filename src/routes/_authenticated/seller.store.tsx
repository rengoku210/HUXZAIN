import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Palette, Image as ImageIcon, Sparkles } from "lucide-react";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";

export const Route = createFileRoute("/_authenticated/seller/store")({
  head: () => ({ meta: [{ title: "Store Customization — HUXZAIN Seller" }] }),
  component: Page,
});

const themes = [
  { id: "midnight", name: "Midnight Gold", colors: ["#0e0e12", "#1a1a22", "#d4b46a"] },
  { id: "noir", name: "Noir Ember", colors: ["#0a0a0a", "#2d2d2d", "#e85d3a"] },
  { id: "indigo", name: "Indigo Royal", colors: ["#0a0a1a", "#1e1e5a", "#4f46e5"], min: "pro" },
  { id: "platinum", name: "Platinum", colors: ["#1a1a1a", "#d1d5db", "#fafafa"], min: "elite" },
  {
    id: "violet",
    name: "Violet Suite",
    colors: ["#1a0e2e", "#5b21b6", "#c4b5fd"],
    min: "enterprise",
  },
];

function Page() {
  const { tier } = useSellerTier();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Customization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Make your storefront stand out with banners and themes.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PanelCard title="Storefront banner" className="lg:col-span-2">
          <div className="rounded-xl border border-dashed border-border h-44 flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon size={24} />
            <div className="text-sm mt-2">Drop banner image · 1600×400 recommended</div>
            <button className="mt-3 h-9 px-4 rounded-lg bg-gold text-black text-sm font-semibold">
              Upload banner
            </button>
          </div>
        </PanelCard>
        <PanelCard title="Store logo">
          <div className="rounded-xl border border-dashed border-border h-44 flex flex-col items-center justify-center text-muted-foreground">
            <div className="size-16 rounded-full border border-border bg-background/60 grid place-items-center text-gold font-display text-xl font-bold">
              H
            </div>
            <button className="mt-3 h-9 px-4 rounded-lg border border-border text-xs">
              Replace logo
            </button>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Theme" action={<Palette size={14} className="text-muted-foreground" />}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {themes.map((t) => {
            const locked = !!(t.min && !tierAtLeast(tier, t.min as any));
            return (
              <button
                key={t.id}
                disabled={locked}
                className={`rounded-xl border p-3 text-left transition ${locked ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:border-gold/40"}`}
              >
                <div className="flex gap-1 h-14 rounded-lg overflow-hidden border border-border/60">
                  {t.colors.map((c) => (
                    <div key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
                <div className="mt-2 text-sm font-medium flex items-center gap-1.5">
                  {t.name}
                  {locked && <Sparkles size={12} className="text-gold" />}
                </div>
                {locked && (
                  <div className="text-[10px] text-muted-foreground">
                    {t.min!.toUpperCase()} plan
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </PanelCard>
    </div>
  );
}
