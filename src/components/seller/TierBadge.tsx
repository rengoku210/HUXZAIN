import { Crown, Sparkles, Shield, Star } from "lucide-react";
import { TIERS, type SellerTier } from "@/lib/seller/tier-context";

const ICONS: Record<SellerTier, typeof Crown> = {
  standard: Shield,
  verified: Shield,
  pro: Star,
  elite: Crown,
  enterprise: Sparkles,
};

export function TierBadge({
  tier,
  size = "md",
  showLabel = true,
}: {
  tier: SellerTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const meta = TIERS[tier];
  const Icon = ICONS[tier];
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  }[size];
  const iconSize = { sm: 10, md: 12, lg: 14 }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider text-black ${sizes}`}
      style={{ background: meta.badgeGradient, boxShadow: meta.glow }}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
