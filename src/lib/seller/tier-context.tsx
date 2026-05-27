import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/auth-context";

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
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    tagline: "Serious sellers ready to scale.",
    monthly: 299,
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
    ],
  },
  elite: {
    id: "elite",
    label: "Elite",
    tagline: "Top performers with verified excellence.",
    monthly: 599,
    accent: "text-gold",
    ring: "ring-gold/40",
    badgeGradient: "linear-gradient(135deg, oklch(0.88 0.13 88), oklch(0.62 0.13 70))",
    surfaceGradient: "linear-gradient(135deg, oklch(0.27 0.06 80), oklch(0.2 0.03 250))",
    glow: "0 0 40px oklch(0.82 0.13 82 / 0.25)",
    rank: 2,
    unlocked: [
      "Elite seller badge on every listing",
      "Featured homepage rotation",
      "Advanced analytics",
      "Lower transaction fee",
      "Dedicated account support",
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    tagline: "White-glove infrastructure for large studios.",
    monthly: 999,
    accent: "text-violet-300",
    ring: "ring-violet-400/40",
    badgeGradient: "linear-gradient(135deg, #c4b5fd, #7c3aed)",
    surfaceGradient: "linear-gradient(135deg, oklch(0.28 0.09 300), oklch(0.2 0.04 280))",
    glow: "0 0 50px oklch(0.6 0.2 300 / 0.28)",
    rank: 3,
    unlocked: [
      "Full premium plan",
      "Executive analytics",
      "Multi-user/store team access",
      "Priority payout",
      "Highest visibility/support",
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

export function SellerTierProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [tier, setTierState] = useState<SellerTier>("standard");
  const [celebrate, setCelebrate] = useState<SellerTier | null>(null);

  // Sync state with database profile subscription_tier
  useEffect(() => {
    if (profile?.subscription_tier && TIERS[profile.subscription_tier as SellerTier]) {
      const dbTier = profile.subscription_tier as SellerTier;
      if (dbTier !== tier) {
        setTierState(dbTier);
        // Trigger celebratory popup when user upgraded successfully!
        if (tier !== "standard") {
          setCelebrate(dbTier);
        }
      }
    }
  }, [profile?.subscription_tier, tier]);

  const setTier = useCallback((t: SellerTier) => {
    setTierState(t);
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
