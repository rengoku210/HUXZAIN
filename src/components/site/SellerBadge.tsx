// Reusable seller verification / tier badge (KYC-11).
// Single source of truth so the badge renders identically on listing cards,
// the product detail page, search results, and order pages.

type Props = {
  subscriptionTier?: string | null;
  isVerified?: boolean | null;
  className?: string;
};

export function SellerBadge({ subscriptionTier, isVerified, className = "" }: Props) {
  const base = "text-[9px] font-bold px-1.5 py-0.5 rounded border";
  if (subscriptionTier === "pro") {
    return <span className={`${base} text-sky-400 bg-sky-500/10 border-sky-500/20 ${className}`}>PRO</span>;
  }
  if (subscriptionTier === "elite") {
    return <span className={`${base} text-gold bg-gold/10 border-gold/20 ${className}`}>ELITE</span>;
  }
  if (subscriptionTier === "enterprise") {
    return <span className={`${base} text-violet-400 bg-violet-500/10 border-violet-500/20 ${className}`}>ENTERPRISE</span>;
  }
  if (isVerified) {
    return <span className={`${base} text-emerald-400 bg-emerald-500/10 border-emerald-500/20 ${className}`}>VERIFIED</span>;
  }
  return null;
}
