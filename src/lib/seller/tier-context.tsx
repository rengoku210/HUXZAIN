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
import { getSellerSubscription } from "@/lib/seller/subscription.functions";

export type SellerTier = "standard" | "verified" | "pro" | "elite" | "enterprise";

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
      "Up to 1 listing per category",
      "Basic analytics",
      "Standard support",
    ],
  },
  verified: {
    id: "verified",
    label: "Verified",
    tagline: "For verified sellers with trust benefits.",
    monthly: 149,
    accent: "text-emerald-400",
    ring: "ring-emerald-400/30",
    badgeGradient: "linear-gradient(135deg, #34d399, #059669)",
    surfaceGradient: "linear-gradient(135deg, oklch(0.24 0.04 150), oklch(0.18 0.02 150))",
    glow: "0 0 30px oklch(0.7 0.12 150 / 0.15)",
    rank: 1,
    unlocked: [
      "Up to 1 listing per category",
      "Trust badge on listings",
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
    rank: 2,
    unlocked: [
      "Up to 6 listings per category",
      "Advanced analytics dashboard",
      "Featured listing manager",
      "10 boost tokens monthly",
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
    rank: 3,
    unlocked: [
      "Up to 11 listings per category",
      "Elite seller badge on listings",
      "Featured homepage spotlight",
      "20 boost tokens monthly",
      "Faster settlement eligibility",
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
    rank: 4,
    unlocked: [
      "Unlimited listings",
      "Bulk upload & inventory tools",
      "Team accounts & staff permissions",
      "Dedicated premium support",
      "Fastest settlement access",
    ],
  },
};

type TierState = {
  tier: SellerTier;
  meta: TierMeta;
  setTier: (t: SellerTier) => void;
  upgrade: (t: SellerTier) => void;
  celebrate: SellerTier | null;
  dismissCelebration: () => void;
  // Dynamic fields from DB
  subscription: {
    plan_name: string;
    status: string;
    suspension_status: boolean;
    expiry_date: string | null;
    boost_tokens_remaining: number;
  } | null;
  limits: {
    listing_limit_per_category: number;
    boost_tokens_per_month: number;
    visibility_multiplier: number;
    settlement_days: number;
    verification_required: boolean;
    monthly_price_inr: number;
  } | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
};

const Ctx = createContext<TierState | null>(null);

export function SellerTierProvider({ children }: { children: ReactNode }) {
  const { profile, refreshUserMeta } = useAuth();
  const [tier, setTierState] = useState<SellerTier>("standard");
  const [celebrate, setCelebrate] = useState<SellerTier | null>(null);
  
  const [subscription, setSubscription] = useState<TierState["subscription"]>(null);
  const [limits, setLimits] = useState<TierState["limits"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbSubscription = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getSellerSubscription({ data: { sellerId: profile.id } });
      setSubscription({
        plan_name: res.plan_name,
        status: res.status,
        suspension_status: res.suspension_status,
        expiry_date: res.expiry_date,
        boost_tokens_remaining: res.boost_tokens_remaining,
      });
      setLimits(res.limits);
      
      // Map database plan_name to SellerTier for Tanstack UI Compatibility
      let nextTier: SellerTier = "standard";
      const planL = res.plan_name.toLowerCase();
      if (planL === "verified") nextTier = "verified";
      else if (planL === "pro") nextTier = "pro";
      else if (planL === "elite") nextTier = "elite";
      else if (planL === "enterprise") nextTier = "enterprise";


      if (nextTier !== tier) {
        setTierState(nextTier);
        if (tier !== "standard") {
          setCelebrate(nextTier);
        }
      }
    } catch (err) {
      console.error("[SellerTierProvider] Failed to fetch DB subscription details:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, tier]);

  // Sync state with database profile subscription_tier
  useEffect(() => {
    fetchDbSubscription();
  }, [profile?.id]);

  const setTier = useCallback((t: SellerTier) => {
    setTierState(t);
  }, []);

  const upgrade = useCallback(
    async (t: SellerTier) => {
      setTier(t);
      setCelebrate(t);
      await refreshUserMeta();
      await fetchDbSubscription();
    },
    [setTier, refreshUserMeta, fetchDbSubscription],
  );

  const value = useMemo<TierState>(
    () => ({
      tier,
      meta: TIERS[tier],
      setTier,
      upgrade,
      celebrate,
      dismissCelebration: () => setCelebrate(null),
      subscription,
      limits,
      loading,
      refreshSubscription: fetchDbSubscription,
    }),
    [tier, setTier, upgrade, celebrate, subscription, limits, loading, fetchDbSubscription],
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
