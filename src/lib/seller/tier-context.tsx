import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SellerTier = "standard" | "pro" | "elite" | "enterprise";

export type TierMeta = {
  id: SellerTier;
  label: string;
  tagline: string;
  monthly: number;
  accent: string; // tailwind text color util
  ring: string; // tailwind ring utility
  badgeGradient: string; // css gradient
  surfaceGradient: string; // for hero card
  glow: string;
  unlocked: string[];
  rank: number;
};

export const TIERS: Record<SellerTier, TierMeta> = {
  standard: {
    id: "standard",
    label: "Standard",
    tagline: "For new sellers building their reputation.",
    monthly: 0,
    accent: "text-zinc-300",
    ring: "ring-zinc-500/30",
    badgeGradient: "linear-gradient(135deg, #6b7280, #3f3f46)",
    surfaceGradient: "linear-gradient(135deg, oklch(0.22 0.014 250), oklch(0.19 0.013 250))",
    glow: "0 0 0 1px oklch(0.4 0.01 250 / 0.4)",
    rank: 0,
    unlocked: [
      "Up to 10 active listings",
      "Basic analytics",
      "Standard support",
      "2.9% transaction fee",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    tagline: "Serious sellers ready to scale.",
    monthly: 19,
    accent: "text-sky-300",
    ring: "ring-sky-400/30",
    badgeGradient: "linear-gradient(135deg, #38bdf8, #2563eb)",
    surfaceGradient: "linear-gradient(135deg, oklch(0.26 0.05 240), oklch(0.2 0.03 240))",
    glow: "0 0 30px oklch(0.7 0.15 240 / 0.18)",
    rank: 1,
    unlocked: [
      "Unlimited listings",
      "Pro analytics dashboard",
      "Priority chat support",
      "Custom coupons",
      "1.9% transaction fee",
    ],
  },
  elite: {
    id: "elite",
    label: "Elite",
    tagline: "Top performers with verified excellence.",
    monthly: 49,
    accent: "text-gold",
    ring: "ring-gold/40",
    badgeGradient: "linear-gradient(135deg, oklch(0.88 0.13 88), oklch(0.62 0.13 70))",
    surfaceGradient: "linear-gradient(135deg, oklch(0.27 0.06 80), oklch(0.2 0.03 250))",
    glow: "0 0 40px oklch(0.82 0.13 82 / 0.25)",
    rank: 2,
    unlocked: [
      "Elite seller badge on every listing",
      "Advanced funnel analytics",
      "Featured rotation on homepage",
      "Animated store banner",
      "1.4% transaction fee",
      "Dedicated account manager",
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    tagline: "White-glove infrastructure for large studios.",
    monthly: 199,
    accent: "text-violet-300",
    ring: "ring-violet-400/40",
    badgeGradient: "linear-gradient(135deg, #c4b5fd, #7c3aed)",
    surfaceGradient: "linear-gradient(135deg, oklch(0.28 0.09 300), oklch(0.2 0.04 280))",
    glow: "0 0 50px oklch(0.6 0.2 300 / 0.28)",
    rank: 3,
    unlocked: [
      "Executive analytics suite",
      "API access + webhooks",
      "Multi-seat team accounts",
      "Custom payout schedule",
      "0.9% transaction fee",
      "24/7 priority hotline",
      "Co-branded storefront",
    ],
  },
};

type TierState = {
  tier: SellerTier;
  meta: TierMeta;
  setTier: (t: SellerTier) => void;
  upgrade: (t: SellerTier) => void;
  // upgrade modal state
  celebrate: SellerTier | null;
  dismissCelebration: () => void;
};

const Ctx = createContext<TierState | null>(null);
const STORAGE_KEY = "huxzain.seller.tier";

export function SellerTierProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SellerTier>("standard");
  const [celebrate, setCelebrate] = useState<SellerTier | null>(null);

  useEffect(() => {
    // TODO: Once real subscription payments are implemented, read tier from
    // the database instead of localStorage. For now, always start at standard.
    // try {
    //   const v = localStorage.getItem(STORAGE_KEY) as SellerTier | null;
    //   if (v && TIERS[v]) setTierState(v);
    // } catch { /* ignore */ }
  }, []);

  const setTier = useCallback((t: SellerTier) => {
    setTierState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const upgrade = useCallback(
    (t: SellerTier) => {
      setTier(t);
      setCelebrate(t);
    },
    [setTier],
  );

  const value = useMemo<TierState>(
    () => ({
      tier,
      meta: TIERS[tier],
      setTier,
      upgrade,
      celebrate,
      dismissCelebration: () => setCelebrate(null),
    }),
    [tier, setTier, upgrade, celebrate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSellerTier() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSellerTier must be used inside <SellerTierProvider>");
  return ctx;
}

export function tierAtLeast(current: SellerTier, min: SellerTier) {
  return TIERS[current].rank >= TIERS[min].rank;
}
