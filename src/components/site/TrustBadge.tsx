import { ShieldCheck, BadgeCheck, Scale, Headphones } from "lucide-react";

type TrustBadgeVariant = "horizontal" | "vertical" | "inline" | "compact";

interface TrustBadgeProps {
  variant?: TrustBadgeVariant;
  className?: string;
  showEscrow?: boolean;
  showDispute?: boolean;
  showVerified?: boolean;
  showSupport?: boolean;
}

const badges = [
  {
    key: "escrow",
    icon: ShieldCheck,
    label: "Escrow Protected",
    desc: "Payment held safely until delivery",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "verified",
    icon: BadgeCheck,
    label: "Verified Sellers",
    desc: "ID-verified, moderated sellers only",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "dispute",
    icon: Scale,
    label: "Dispute Protection",
    desc: "Fair mediation by our team",
    color: "text-gold",
    bg: "bg-gold/10 border-gold/20",
  },
  {
    key: "support",
    icon: Headphones,
    label: "24/7 Support",
    desc: "Help available around the clock",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
] as const;

/**
 * TrustBadge — Shows HUXZAIN trust indicators.
 *
 * Variants:
 * - `horizontal`: Side-by-side row (default for homepage sections)
 * - `vertical`: Stacked list (for sidebars or product pages)
 * - `inline`: Compact single-line badges (for checkout or cards)
 * - `compact`: Minimal icon-only with tooltip on hover
 *
 * @example
 * <TrustBadge variant="vertical" />
 */
export function TrustBadge({
  variant = "horizontal",
  className = "",
  showEscrow = true,
  showDispute = true,
  showVerified = true,
  showSupport = true,
}: TrustBadgeProps) {
  const visibilityMap: Record<string, boolean> = {
    escrow: showEscrow,
    verified: showVerified,
    dispute: showDispute,
    support: showSupport,
  };

  const visible = badges.filter((b) => visibilityMap[b.key]);

  if (variant === "inline") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {visible.map((b) => {
          const Icon = b.icon;
          return (
            <span
              key={b.key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${b.bg} ${b.color}`}
              title={b.desc}
            >
              <Icon className="size-3.5" />
              {b.label}
            </span>
          );
        })}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {visible.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.key} title={`${b.label}: ${b.desc}`} className="group relative">
              <div className={`size-8 rounded-lg border flex items-center justify-center ${b.bg}`}>
                <Icon className={`size-4 ${b.color}`} />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-background border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`space-y-3 ${className}`}>
        {visible.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.key} className="flex items-start gap-3">
              <div className={`size-9 rounded-lg border flex items-center justify-center shrink-0 ${b.bg}`}>
                <Icon className={`size-4 ${b.color}`} />
              </div>
              <div>
                <div className={`text-xs font-bold ${b.color}`}>{b.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: horizontal
  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {visible.map((b) => {
        const Icon = b.icon;
        return (
          <div key={b.key} className="flex items-center gap-2">
            <div className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${b.bg}`}>
              <Icon className={`size-4 ${b.color}`} />
            </div>
            <div>
              <div className={`text-xs font-bold ${b.color}`}>{b.label}</div>
              <div className="text-[10px] text-muted-foreground">{b.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
