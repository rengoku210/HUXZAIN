import { useEffect } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { TIERS, useSellerTier } from "@/lib/seller/tier-context";
import { TierBadge } from "./TierBadge";

export function UpgradeCelebration() {
  const { celebrate, dismissCelebration } = useSellerTier();

  useEffect(() => {
    if (!celebrate) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissCelebration();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [celebrate, dismissCelebration]);

  if (!celebrate) return null;
  const meta = TIERS[celebrate];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "oklch(0 0 0 / 0.7)", backdropFilter: "blur(8px)" }}
      onClick={dismissCelebration}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-border bg-surface/95 p-8 animate-scale-in overflow-hidden"
        style={{ boxShadow: `0 30px 80px oklch(0 0 0 / 0.6), ${meta.glow}` }}
      >
        {/* ambient gradient */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: meta.surfaceGradient }}
        />
        {/* sparkle particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <Sparkles
              key={i}
              size={10 + (i % 3) * 4}
              className="absolute text-gold/60 animate-fade-in"
              style={{
                top: `${(i * 53) % 100}%`,
                left: `${(i * 31) % 100}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        <button
          onClick={dismissCelebration}
          className="absolute top-4 right-4 z-10 size-8 rounded-full border border-border bg-background/60 hover:bg-background flex items-center justify-center"
        >
          <X size={14} />
        </button>

        <div className="relative">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Welcome to</div>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="font-display text-3xl font-bold text-gold-gradient">{meta.label} Seller</h2>
            <TierBadge tier={celebrate} size="lg" showLabel={false} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{meta.tagline}</p>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/30 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Unlocked benefits</div>
            <ul className="space-y-2.5">
              {meta.unlocked.map((u, i) => (
                <li
                  key={u}
                  className="flex items-start gap-3 text-sm animate-fade-in"
                  style={{ animationDelay: `${100 + i * 60}ms` }}
                >
                  <span className="mt-0.5 size-5 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={dismissCelebration}
              className="flex-1 h-11 rounded-xl font-semibold text-black"
              style={{ background: meta.badgeGradient }}
            >
              Enter my upgraded dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
