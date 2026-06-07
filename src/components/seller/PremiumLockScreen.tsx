import { ShieldAlert, CreditCard, ChevronRight, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SellerTier, TIERS } from "@/lib/seller/tier-context";

export function PremiumLockScreen({
  featureName,
  requiredTier,
}: {
  featureName: string;
  requiredTier: SellerTier;
}) {
  const meta = TIERS[requiredTier];

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center p-4">
      {/* Dynamic background glow */}
      <div 
        className="absolute inset-0 max-w-lg mx-auto rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500" 
        style={{
          background: `radial-gradient(circle, ${meta.accent === 'text-gold' ? 'oklch(0.82 0.13 82)' : 'oklch(0.6 0.15 240)'}, transparent 70%)`
        }}
      />
      
      <div className="w-full max-w-lg rounded-3xl border border-gold/15 bg-surface/50 p-8 md:p-12 relative overflow-hidden backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.5)] text-center">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gold/50 to-gold" />
        
        <div className="relative size-20 flex items-center justify-center mx-auto mb-6 rounded-full border border-gold/20 bg-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
          <Lock className="size-8 text-gold" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Premium Feature Locked
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Access to <span className="text-foreground font-semibold">{featureName}</span> is reserved for sellers on the <span className={`font-bold ${meta.accent}`}>{meta.label}</span> tier and higher.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-background/40 p-5 text-left">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Unlocked in {meta.label}:
          </div>
          <ul className="space-y-2.5">
            {meta.unlocked.map((benefit, idx) => (
              <li key={idx} className="text-xs text-foreground flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-gold shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link
            to="/seller/subscription"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all shadow-[0_4px_12px_rgba(212,175,55,0.2)] active:scale-95 cursor-pointer"
          >
            <CreditCard className="size-4" /> Upgrade Plan
          </Link>
          <Link
            to="/seller"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-xl border border-border hover:bg-surface text-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
