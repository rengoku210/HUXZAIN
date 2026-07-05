import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Save,
  Mail,
  Percent,
  Globe,
  Key,
  ShieldCheck,
  RefreshCw,
  Megaphone,
  Send,
  Check,
  Crown,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Upload,
  Zap,
  Activity,
  CreditCard,
  Trash2,
  Plus,
  Search,
  HelpCircle,
  Sliders,
  DollarSign,
  UserCheck,
  Eye,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-client";
import { sendPromotionalEmailCampaign } from "@/lib/email.functions";
import { SignedImage } from "@/components/SignedImage";
import { invalidateFinanceConfigCache } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — HUXZAIN Admin" }] }),
  component: Page,
});

type CategoryInfo = {
  key: string;
  name: string;
  icon: string;
};

const CATEGORIES: CategoryInfo[] = [
  { key: "gaming_accounts", name: "Gaming Accounts", icon: "🎮" },
  { key: "in_game_credits", name: "Ingame Credits", icon: "🪙" },
  { key: "gift_cards", name: "Gift Cards", icon: "🎁" },
  { key: "software_digital_tools", name: "Software & Tools", icon: "💻" },
  { key: "coaching_services", name: "Coaching Services", icon: "👨‍🏫" },
  { key: "game_buddy_services", name: "Game Buddy Services", icon: "🤝" },
  { key: "freelance_services", name: "Freelance Services", icon: "💼" },
  { key: "digital_products", name: "Digital Products", icon: "📦" },
  { key: "subscription_services", name: "Subscriptions", icon: "🔔" },
  { key: "advertising_promotion_services", name: "Advertising & Promotions", icon: "📢" },
  { key: "hosting_web_services", name: "Hosting & Web Services", icon: "🌐" },
  { key: "business_services", name: "Business Services", icon: "📈" },
];

type TabDef = {
  id: string;
  label: string;
  icon: any;
  category: "revenue" | "promotions" | "governance" | "system";
};

const TABS: TabDef[] = [
  { id: "plans", label: "Seller Plans", icon: Crown, category: "revenue" },
  { id: "protection", label: "Protection Fee", icon: ShieldCheck, category: "revenue" },
  { id: "withdrawal", label: "Withdrawal Settings", icon: CreditCard, category: "revenue" },
  { id: "dormant", label: "Dormant Fees", icon: Clock, category: "revenue" },
  
  { id: "verification", label: "Verification Badge", icon: UserCheck, category: "promotions" },
  { id: "homepage", label: "Homepage Featured", icon: SparklesIcon, category: "promotions" },
  { id: "listings", label: "Featured Listing", icon: Sliders, category: "promotions" },
  { id: "boost", label: "Boost To Top", icon: Zap, category: "promotions" },
  { id: "urgent", label: "Urgent Sale Tag", icon: AlertCircle, category: "promotions" },
  { id: "glow", label: "Glow Highlight", icon: Activity, category: "promotions" },
  
  { id: "broadcaster", label: "Email Broadcast", icon: Megaphone, category: "system" }
];

function SparklesIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}

function Page() {
  const [activeTab, setActiveTab] = useState<string>("plans");
  const [selectedPlan, setSelectedPlan] = useState<string>("enterprise");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Brand Settings ---
  const [platformName, setPlatformName] = useState("HUXZAIN");
  const [supportEmail, setSupportEmail] = useState("support@huxzain.shop");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // --- Withdrawal & Dormancy Settings ---
  const [payoutFee, setPayoutFee] = useState("0.0");
  const [kycRequired, setKycRequired] = useState(true);
  const [escrowTimeout, setEscrowTimeout] = useState("24");
  const [dormancyDays, setDormancyDays] = useState("365");
  const [dormancyFee, setDormancyFee] = useState("150");

  // --- Transaction Fees Settings ---
  const [processingFee, setProcessingFee] = useState("0");
  const [bpMinOrder, setBpMinOrder] = useState("1000");
  const [processingFeePayer, setProcessingFeePayer] = useState("buyer");

  // --- Subscription Pricing Terms (Single Price Model) ---
  const [pricingTerms, setPricingTerms] = useState<Record<string, { monthly: number }>>({
    free: { monthly: 0 },
    verified: { monthly: 499 },
    pro: { monthly: 2999 },
    elite: { monthly: 4999 },
    enterprise: { monthly: 9999 }
  });

  // --- Subscription Features ---
  const [planFeatures, setPlanFeatures] = useState<Record<string, {
    withdrawal_requests: number;
    withdrawal_period_days: number;
    verification_badge: boolean;
    homepage_featured_tokens: number;
    homepage_featured_tokens_time_days: number;
    featured_listing_credits: number;
    featured_listing_duration_days: number;
  }>>({
    free: { withdrawal_requests: 1, withdrawal_period_days: 10, verification_badge: false, homepage_featured_tokens: 0, homepage_featured_tokens_time_days: 0, featured_listing_credits: 0, featured_listing_duration_days: 0 },
    verified: { withdrawal_requests: 1, withdrawal_period_days: 10, verification_badge: true, homepage_featured_tokens: 0, homepage_featured_tokens_time_days: 0, featured_listing_credits: 0, featured_listing_duration_days: 0 },
    pro: { withdrawal_requests: 2, withdrawal_period_days: 10, verification_badge: false, homepage_featured_tokens: 2, homepage_featured_tokens_time_days: 7, featured_listing_credits: 5, featured_listing_duration_days: 30 },
    elite: { withdrawal_requests: 3, withdrawal_period_days: 10, verification_badge: false, homepage_featured_tokens: 3, homepage_featured_tokens_time_days: 7, featured_listing_credits: 10, featured_listing_duration_days: 30 },
    enterprise: { withdrawal_requests: 5, withdrawal_period_days: 10, verification_badge: true, homepage_featured_tokens: 5, homepage_featured_tokens_time_days: 7, featured_listing_credits: 20, featured_listing_duration_days: 30 }
  });

  // --- Category Rules state ---
  const [categoryRules, setCategoryRules] = useState<Record<string, Record<string, {
    commission_percent: number;
    escrow_days: number;
    settlement_days: number;
    dispute_days: number;
    listing_limit: number;
  }>>>({});

  // --- Promotion Tags Pricing ---
  const [promoPrices, setPromoPrices] = useState({
    verification_badge_price: 499,
    verification_badge_duration: 30,
    homepage_featured_price: 999,
    homepage_featured_max_slots: 5,
    featured_listing_price: 299,
    featured_listing_duration: 15,
    boost_token_price: 99,
    urgent_tag_price: 199,
    urgent_tag_duration: 7,
    glow_tag_price: 149,
    glow_tag_duration: 7
  });

  // --- Buyer Protection Ranges ---
  const [bpRanges, setBpRanges] = useState<Array<{
    id?: string;
    scope: "general" | "gaming";
    min_amount_inr: number;
    max_amount_inr: number | null;
    fee_percent: number | null;
    fee_flat_inr: number | null;
  }>>([]);

  // --- Email Campaign Cockpit states ---
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [featuredListingId, setFeaturedListingId] = useState("");
  const [discountBanner, setDiscountBanner] = useState("");
  const [weeklyDeal, setWeeklyDeal] = useState("");
  const [sendEnabled, setSendEnabled] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const supabase = getSupabase();

  // Load all configurations
  useEffect(() => {
    async function loadData() {
      if (!supabase) return;
      setLoading(true);
      try {
        // 1. Platform general settings
        let loadedPricing: Record<string, any> = {
          free: { monthly: 0 },
          verified: { monthly: 499 },
          pro: { monthly: 2999 },
          elite: { monthly: 4999 },
          enterprise: { monthly: 9999 }
        };

        const { data: dbSettings } = await supabase.from("platform_settings").select("*");
        if (dbSettings) {
          dbSettings.forEach((item) => {
            if (item.key === "branding") {
              setPlatformName(item.value.platform_name || "HUXZAIN");
              setSupportEmail(item.value.support_email || "support@huxzain.shop");
            } else if (item.key === "maintenance") {
              setMaintenanceMode(!!item.value.maintenance_mode);
            } else if (item.key === "fees") {
              setPayoutFee(String(item.value.payout_fee_percent ?? "0.0"));
            } else if (item.key === "moderation") {
              setKycRequired(!!item.value.kyc_required);
              setEscrowTimeout(String(item.value.escrow_timeout_hours ?? "24"));
            } else if (item.key === "dormancy") {
              setDormancyDays(String(item.value.dormancy_days ?? "365"));
              setDormancyFee(String(item.value.dormancy_monthly_fee ?? "150"));
            } else if (item.key === "subscription_pricing_terms") {
              loadedPricing = { ...loadedPricing, ...item.value };
            } else if (item.key === "subscription_plan_features") {
              setPlanFeatures(item.value);
            } else if (item.key === "promo_prices") {
              setPromoPrices((prev) => ({ ...prev, ...item.value }));
            } else if (item.key === "transaction_fees") {
              setProcessingFee(String(item.value.processing_fee_inr ?? "0"));
              setBpMinOrder(String(item.value.buyer_protection_min_order_inr ?? "1000"));
              setProcessingFeePayer(item.value.processing_fee_payer || "buyer");
            }
          });
        }

        // 2. Fetch category rules from commission_config, escrow_config, settlement_config, etc.
        const [commRes, escRes, plansConfigRes] = await Promise.all([
          supabase.from("commission_config").select("*"),
          supabase.from("escrow_config").select("*"),
          supabase.from("subscription_plans_config").select("*")
        ]);

        const commData = commRes.data || [];
        const escData = escRes.data || [];
        const plansConfig = plansConfigRes.data || [];

        // Build composite category rules nested map: rules[planId][categoryKey] = values
        const rulesMap: typeof categoryRules = {};
        const plansList = ["free", "verified", "pro", "elite", "enterprise"];
        
        plansList.forEach((planId) => {
          rulesMap[planId] = {};
          CATEGORIES.forEach((cat) => {
            // Find DB row or use default spec values
            const commRow = commData.find((c) => c.category_key === cat.key && c.plan === planId);
            const escRow = escData.find((e) => e.category_key === cat.key && e.plan === planId);
            const planRow = plansConfig.find((p) => p.id === planId);

            let defaultComm = 10;
            let defaultEscrow = 3;
            if (cat.key === "gaming_accounts") {
              defaultComm = planId === "free" ? 18 : planId === "pro" ? 16 : planId === "elite" ? 14 : 12;
              defaultEscrow = planId === "free" ? 14 : planId === "pro" ? 10 : planId === "elite" ? 7 : 5;
            }

            rulesMap[planId][cat.key] = {
              commission_percent: commRow ? Number(commRow.commission_percent) : defaultComm,
              escrow_days: escRow ? Number(escRow.hold_days) : defaultEscrow,
              settlement_days: planRow ? Number(planRow.settlement_days) : 3,
              dispute_days: 5, // spec dispute window
              listing_limit: planRow ? Number(planRow.listing_limit_per_category) : 5,
            };
          });
        });

        setCategoryRules(rulesMap);

        // Update plans prices from plans config
        if (plansConfig.length > 0) {
          plansConfig.forEach((p) => {
            if (loadedPricing[p.id]) {
              loadedPricing[p.id].monthly = p.monthly_price_inr;
            }
          });
        }
        setPricingTerms(loadedPricing);

        // 3. Fetch Buyer Protection Ranges
        const { data: bpData } = await supabase
          .from("buyer_protection_config")
          .select("*")
          .order("min_amount_inr", { ascending: true });
        
        if (bpData) {
          setBpRanges(bpData as any);
        }

        // 4. Fetch Active Listings for Broadcaster
        const { data: activeListingsData } = await supabase
          .from("listings")
          .select("id, title")
          .eq("status", "active")
          .limit(20);
        
        if (activeListingsData) {
          setActiveListings(activeListingsData);
        }
      } catch (err: any) {
        console.error("Failed to load settings from DB:", err.message);
        toast.error("Failed to load platform configurations.");
      } finally {
        setLoading(false);
        setListingsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabase) return;
    setSaving(true);

    try {
      // 1. General & Brand
      await supabase.from("platform_settings").upsert({
        key: "branding",
        value: { platform_name: platformName, support_email: supportEmail }
      });

      await supabase.from("platform_settings").upsert({
        key: "maintenance",
        value: { maintenance_mode: maintenanceMode }
      });

      // 2. Fees & Moderation
      await supabase.from("platform_settings").upsert({
        key: "fees",
        value: { payout_fee_percent: parseFloat(payoutFee) }
      });

      await supabase.from("platform_settings").upsert({
        key: "moderation",
        value: { kyc_required: kycRequired, escrow_timeout_hours: parseInt(escrowTimeout) }
      });

      await supabase.from("platform_settings").upsert({
        key: "dormancy",
        value: { dormancy_days: parseInt(dormancyDays), dormancy_monthly_fee: parseFloat(dormancyFee) }
      });

      await supabase.from("platform_settings").upsert({
        key: "transaction_fees",
        value: {
          processing_fee_inr: parseInt(processingFee) || 0,
          buyer_protection_min_order_inr: parseInt(bpMinOrder) || 1000,
          processing_fee_payer: processingFeePayer
        }
      });

      // 3. Save Promo Prices
      await supabase.from("platform_settings").upsert({
        key: "promo_prices",
        value: promoPrices
      });

      // 4. Save Pricing Terms & Features
      await supabase.from("platform_settings").upsert({
        key: "subscription_pricing_terms",
        value: pricingTerms
      });

      await supabase.from("platform_settings").upsert({
        key: "subscription_plan_features",
        value: planFeatures
      });

      // 5. Update subscription_plans_config table per plan
      const plansList = ["free", "verified", "pro", "elite", "enterprise"];
      for (const planId of plansList) {
        const terms = pricingTerms[planId];
        const feat = planFeatures[planId];
        const rules = categoryRules[planId] || {};

        // Find standard settlement & listing limit from gaming_accounts (our anchor)
        const settlement = rules.gaming_accounts?.settlement_days ?? 3;
        const limit = rules.gaming_accounts?.listing_limit ?? 5;

        await supabase
          .from("subscription_plans_config")
          .update({
            monthly_price_inr: terms.monthly,
            listing_limit_per_category: limit,
            boost_tokens_per_month: feat.homepage_featured_tokens * 10,
            settlement_days: settlement,
            verification_required: feat.verification_badge,
            updated_at: new Date().toISOString()
          })
          .eq("id", planId);

        // Also update settlement_config table
        await supabase
          .from("settlement_config")
          .upsert({
            plan: planId,
            processing_days: settlement,
            withdrawal_request_count: feat.withdrawal_requests,
            withdrawal_period_days: feat.withdrawal_period_days,
            updated_at: new Date().toISOString()
          });

        // 6. Bulk save Category Rules to commission_config and escrow_config
        for (const catKey of Object.keys(rules)) {
          const rule = rules[catKey];
          await supabase.from("commission_config").upsert({
            category_key: catKey,
            plan: planId,
            commission_percent: rule.commission_percent,
            updated_at: new Date().toISOString()
          });

          await supabase.from("escrow_config").upsert({
            category_key: catKey,
            plan: planId,
            hold_days: rule.escrow_days,
            updated_at: new Date().toISOString()
          });
        }
      }

      // 7. Save Buyer Protection Config Ranges
      // Delete all and re-insert
      await supabase.from("buyer_protection_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      for (const range of bpRanges) {
        await supabase.from("buyer_protection_config").insert({
          scope: range.scope,
          min_amount_inr: range.min_amount_inr,
          max_amount_inr: range.max_amount_inr,
          fee_percent: range.fee_percent,
          fee_flat_inr: range.fee_flat_inr
        });
      }

      // Flush in-memory config cache so changes affect platform instantly
      invalidateFinanceConfigCache();

      toast.success("All platform settings and plan rules saved successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendEnabled) {
      toast.error("Please enable 'Send Authorization' first.");
      return;
    }
    
    setBroadcasting(true);
    try {
      const res = await sendPromotionalEmailCampaign({
        data: {
          featuredListingId: featuredListingId || null,
          discountBanner: discountBanner.trim(),
          weeklyDeal: weeklyDeal.trim(),
        }
      });
      
      if (res?.success) {
        toast.success(res.message || "Email campaign broadcasted successfully!");
        setDiscountBanner("");
        setWeeklyDeal("");
        setFeaturedListingId("");
        setSendEnabled(false);
      } else {
        toast.error("Failed to broadcast email campaign.");
      }
    } catch (err: any) {
      toast.error("Campaign broadcast failed: " + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleBpRangeChange = (idx: number, field: string, val: any) => {
    const updated = [...bpRanges];
    updated[idx] = { ...updated[idx], [field]: val };
    setBpRanges(updated);
  };

  const addBpRange = () => {
    setBpRanges([...bpRanges, { scope: "general", min_amount_inr: 1000, max_amount_inr: null, fee_percent: 5, fee_flat_inr: null }]);
  };

  const removeBpRange = (idx: number) => {
    const updated = bpRanges.filter((_, i) => i !== idx);
    setBpRanges(updated);
  };

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return TABS;
    return TABS.filter((t) => t.label.toLowerCase().includes(query));
  }, [searchQuery]);

  useEffect(() => {
    // If the active tab gets filtered out, auto select the first matched tab
    if (filteredTabs.length > 0 && !filteredTabs.some((t) => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [filteredTabs, activeTab]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw className="animate-spin text-gold size-8" />
      </div>
    );
  }

  const currentPlanTerms = pricingTerms[selectedPlan] || { monthly: 0 };
  const currentPlanFeats = planFeatures[selectedPlan] || {
    withdrawal_requests: 1,
    withdrawal_period_days: 10,
    verification_badge: false,
    homepage_featured_tokens: 0,
    homepage_featured_tokens_time_days: 0,
    featured_listing_credits: 0,
    featured_listing_duration_days: 0
  };

  return (
    <div className="min-h-screen pb-16 relative">
      
      {/* Premium Sticky Control Dashboard Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 py-4 mb-8 flex items-center justify-between flex-wrap gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
            <Settings className="text-gold" size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Platform Configuration Cockpit</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Securely moderate and fine-tune global transaction rules, commissions, fees, and membership tiers.
            </p>
          </div>
        </div>

        {/* Global actions and Settings Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 pl-9 pr-3 rounded-xl bg-surface/30 border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/50 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-surface text-muted-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="h-9 px-5 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border-none shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main split-screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start px-2">
        
        {/* Left Side Tab Navigation categorized elegantly */}
        <aside className="space-y-6">
          
          {/* Revenue Controls Group */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 mb-2">Revenue & Vaults</h3>
            {filteredTabs
              .filter((t) => t.category === "revenue")
              .map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 h-10 px-3.5 rounded-xl text-xs font-bold text-left transition-all border border-transparent cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-gold text-black border-gold/10 font-bold shadow-lg shadow-gold/5"
                        : "bg-surface/20 text-muted-foreground hover:bg-surface/40 hover:text-foreground"
                    }`}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                  </button>
                );
              })}
          </div>

          {/* Promotions Controls Group */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 mb-2">Listing Promotions</h3>
            {filteredTabs
              .filter((t) => t.category === "promotions")
              .map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 h-10 px-3.5 rounded-xl text-xs font-bold text-left transition-all border border-transparent cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-gold text-black border-gold/10 font-bold shadow-lg shadow-gold/5"
                        : "bg-surface/20 text-muted-foreground hover:bg-surface/40 hover:text-foreground"
                    }`}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                  </button>
                );
              })}
          </div>

          {/* System Control Group */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 mb-2">Communications</h3>
            {filteredTabs
              .filter((t) => t.category === "system")
              .map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 h-10 px-3.5 rounded-xl text-xs font-bold text-left transition-all border border-transparent cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-gold text-black border-gold/10 font-bold shadow-lg shadow-gold/5"
                        : "bg-surface/20 text-muted-foreground hover:bg-surface/40 hover:text-foreground"
                    }`}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                  </button>
                );
              })}
          </div>
          
          {filteredTabs.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">No settings tabs match your query.</p>
          )}
        </aside>

        {/* Right side Settings Workspace */}
        <main className="min-w-0 space-y-6">
          
          {/* Tab 1: Seller Plans */}
          {activeTab === "plans" && (
            <div className="grid md:grid-cols-4 gap-6 items-start animate-in fade-in duration-300">
              
              {/* Left Select Plan panel */}
              <div className="md:col-span-1 rounded-2xl border border-border bg-surface/30 p-4 space-y-2">
                <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider px-2 mb-3">Tiers</h3>
                {[
                  { id: "free", label: "Standard (Free)", desc: "Default Tier" },
                  { id: "verified", label: "Verified Seller", desc: "Trust Badge" },
                  { id: "pro", label: "Pro Seller", desc: "Serious Sellers" },
                  { id: "elite", label: "Elite Seller", desc: "Top Performance" },
                  { id: "enterprise", label: "Enterprise", desc: "Maximum Limits" }
                ].map((plan) => {
                  const priceVal = pricingTerms[plan.id]?.monthly ?? 0;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all border cursor-pointer flex flex-col gap-0.5 relative ${
                        selectedPlan === plan.id
                          ? "bg-gold/10 border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]"
                          : "bg-background/40 border-border/80 hover:border-border"
                      }`}
                    >
                      <span className="font-bold text-xs text-foreground">{plan.label}</span>
                      <span className="text-[9px] text-muted-foreground">{plan.desc}</span>
                      <span className="text-[10px] text-gold font-bold font-mono mt-1.5">
                        ₹ {priceVal.toLocaleString()} / mo
                      </span>
                      {selectedPlan === plan.id && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full bg-gold animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right configuration panel */}
              <div className="md:col-span-3 space-y-6">
                
                {/* Configuration Card: Plan Specs */}
                <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-5 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-border/30 pb-4">
                    <h3 className="font-display font-bold text-base text-foreground font-sans">
                      {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Tier Parameters
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-[8px] font-bold uppercase tracking-wider font-sans">Editable</span>
                  </div>

                  {/* Plan Pricing (Only Display Monthly Price) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sans">
                      Pricing Terms
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-sans">Base Monthly Price (₹ INR / month)</label>
                        <div className="relative mt-1">
                          <span className="absolute left-2.5 top-2.5 text-muted-foreground text-[11px] font-sans">₹</span>
                          <input
                            type="number"
                            value={currentPlanTerms.monthly === 0 && selectedPlan !== "free" ? "" : currentPlanTerms.monthly}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricingTerms((prev) => ({
                                ...prev,
                                [selectedPlan]: {
                                  ...(prev[selectedPlan] || {}),
                                  monthly: val === "" ? 0 : parseInt(val) || 0
                                }
                              }));
                            }}
                            className="w-full h-9 pl-6 pr-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Features grid */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Limits & Operations Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-sans">Withdrawal Requests / Cycle</label>
                        <input
                          type="number"
                          value={currentPlanFeats.withdrawal_requests}
                          onChange={(e) => {
                            const updated = { ...planFeatures };
                            updated[selectedPlan].withdrawal_requests = parseInt(e.target.value) || 1;
                            setPlanFeatures(updated);
                          }}
                          className="mt-1 w-full h-9 px-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-sans">Withdrawal Request Rest Frequency (Days)</label>
                        <input
                          type="number"
                          value={currentPlanFeats.withdrawal_period_days}
                          onChange={(e) => {
                            const updated = { ...planFeatures };
                            updated[selectedPlan].withdrawal_period_days = parseInt(e.target.value) || 10;
                            setPlanFeatures(updated);
                          }}
                          className="mt-1 w-full h-9 px-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-sans">Homepage Spotlight Tokens / Month</label>
                        <input
                          type="number"
                          value={currentPlanFeats.homepage_featured_tokens}
                          onChange={(e) => {
                            const updated = { ...planFeatures };
                            updated[selectedPlan].homepage_featured_tokens = parseInt(e.target.value) || 0;
                            setPlanFeatures(updated);
                          }}
                          className="mt-1 w-full h-9 px-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-sans">Featured Listing Tokens / Month</label>
                        <input
                          type="number"
                          value={currentPlanFeats.featured_listing_credits}
                          onChange={(e) => {
                            const updated = { ...planFeatures };
                            updated[selectedPlan].featured_listing_credits = parseInt(e.target.value) || 0;
                            setPlanFeatures(updated);
                          }}
                          className="mt-1 w-full h-9 px-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={currentPlanFeats.verification_badge}
                          onChange={(e) => {
                            const updated = { ...planFeatures };
                            updated[selectedPlan].verification_badge = e.target.checked;
                            setPlanFeatures(updated);
                          }}
                          className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground font-sans">Includes Verified Badge by default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Configuration Card: Category Matrix */}
                <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Category Escrow & Fee Matrix</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Tune commissions, escrow limits, and settlement delays on a per-category basis for this tier.
                    </p>
                  </div>

                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground text-[9px] uppercase tracking-wider font-sans">
                          <th className="py-2.5 font-bold">Category</th>
                          <th className="py-2.5 font-bold pl-2">Platform Fee (%)</th>
                          <th className="py-2.5 font-bold pl-2">Escrow (Days)</th>
                          <th className="py-2.5 font-bold pl-2">Settlement (Days)</th>
                          <th className="py-2.5 font-bold pl-2">Dispute (Days)</th>
                          <th className="py-2.5 font-bold pl-2">Listing Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {CATEGORIES.map((cat) => {
                          const rule = (categoryRules[selectedPlan] || {})[cat.key] || {
                            commission_percent: 10,
                            escrow_days: 3,
                            settlement_days: 3,
                            dispute_days: 5,
                            listing_limit: 5
                          };

                          const handleRuleChange = (field: string, val: any) => {
                            setCategoryRules((prev) => ({
                              ...prev,
                              [selectedPlan]: {
                                ...(prev[selectedPlan] || {}),
                                [cat.key]: {
                                  ...((prev[selectedPlan] || {})[cat.key] || {}),
                                  [field]: val
                                }
                              }
                            }));
                          };

                          return (
                            <tr key={cat.key} className="hover:bg-surface/20">
                              <td className="py-3 font-bold text-foreground/90 whitespace-nowrap">
                                <span className="mr-1.5">{cat.icon}</span> {cat.name}
                              </td>
                              <td className="py-2 pl-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={rule.commission_percent}
                                  onChange={(e) => handleRuleChange("commission_percent", parseFloat(e.target.value) || 0)}
                                  className="w-16 h-7 px-1 rounded bg-background border border-border text-center font-mono focus:ring-1 focus:ring-gold/30 outline-hidden"
                                />
                              </td>
                              <td className="py-2 pl-2">
                                <input
                                  type="number"
                                  value={rule.escrow_days}
                                  onChange={(e) => handleRuleChange("escrow_days", parseInt(e.target.value) || 0)}
                                  className="w-16 h-7 px-1 rounded bg-background border border-border text-center font-mono focus:ring-1 focus:ring-gold/30 outline-hidden"
                                />
                              </td>
                              <td className="py-2 pl-2">
                                <input
                                  type="number"
                                  value={rule.settlement_days}
                                  onChange={(e) => handleRuleChange("settlement_days", parseInt(e.target.value) || 0)}
                                  className="w-16 h-7 px-1 rounded bg-background border border-border text-center font-mono focus:ring-1 focus:ring-gold/30 outline-hidden"
                                />
                              </td>
                              <td className="py-2 pl-2">
                                <input
                                  type="number"
                                  value={rule.dispute_days}
                                  onChange={(e) => handleRuleChange("dispute_days", parseInt(e.target.value) || 0)}
                                  className="w-16 h-7 px-1 rounded bg-background border border-border text-center font-mono focus:ring-1 focus:ring-gold/30 outline-hidden"
                                />
                              </td>
                              <td className="py-2 pl-2">
                                <input
                                  type="number"
                                  value={rule.listing_limit}
                                  onChange={(e) => handleRuleChange("listing_limit", parseInt(e.target.value) || 0)}
                                  className="w-16 h-7 px-1 rounded bg-background border border-border text-center font-mono focus:ring-1 focus:ring-gold/30 outline-hidden"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Buyer Protection Fee */}
          {activeTab === "protection" && (
            <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-6 shadow-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border/40 pb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <ShieldCheck className="text-gold" size={18} /> Escrow Order Protection Fee Matrix
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Define custom percentages and flat fees charged to orders based on price limits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addBpRange}
                  className="h-8 px-3.5 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none shadow-[0_2px_10px_rgba(212,175,55,0.1)]"
                >
                  <Plus size={12} /> Add Price Range
                </button>
              </div>

              {/* Min order protection criteria */}
              <div className="grid md:grid-cols-2 gap-4 bg-background/30 p-4 rounded-xl border border-border/50">
                <div>
                  <label className="text-xs font-bold text-foreground/90 block font-sans">Protection Minimum Threshold (₹)</label>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Orders below this value are not eligible for optional protection.</p>
                  <input
                    type="number"
                    value={bpMinOrder}
                    onChange={(e) => setBpMinOrder(e.target.value)}
                    className="mt-2 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Range table */}
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-[9px] uppercase font-sans">
                      <th className="py-2.5">Price Scope</th>
                      <th className="py-2.5 pl-2">Min order (₹)</th>
                      <th className="py-2.5 pl-2">Max order (₹)</th>
                      <th className="py-2.5 pl-2">Fee percent (%)</th>
                      <th className="py-2.5 pl-2">Flat Fee (₹)</th>
                      <th className="py-2.5 pr-2 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {bpRanges.map((range, idx) => (
                      <tr key={range.id || idx} className="hover:bg-surface/10">
                        <td className="py-2.5">
                          <select
                            value={range.scope}
                            onChange={(e) => handleBpRangeChange(idx, "scope", e.target.value)}
                            className="h-7 px-2 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-sans"
                          >
                            <option value="general">General</option>
                            <option value="gaming">Gaming</option>
                          </select>
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="number"
                            value={range.min_amount_inr}
                            onChange={(e) => handleBpRangeChange(idx, "min_amount_inr", parseInt(e.target.value) || 0)}
                            className="w-24 h-7 px-1.5 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="number"
                            placeholder="No Limit"
                            value={range.max_amount_inr || ""}
                            onChange={(e) => handleBpRangeChange(idx, "max_amount_inr", parseInt(e.target.value) || null)}
                            className="w-24 h-7 px-1.5 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="number"
                            placeholder="N/A"
                            value={range.fee_percent ?? ""}
                            onChange={(e) => handleBpRangeChange(idx, "fee_percent", e.target.value ? parseFloat(e.target.value) : null)}
                            disabled={range.fee_flat_inr !== null}
                            className="w-24 h-7 px-1.5 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono disabled:opacity-50"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="number"
                            placeholder="N/A"
                            value={range.fee_flat_inr ?? ""}
                            onChange={(e) => handleBpRangeChange(idx, "fee_flat_inr", e.target.value ? parseInt(e.target.value) : null)}
                            disabled={range.fee_percent !== null}
                            className="w-24 h-7 px-1.5 rounded bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono disabled:opacity-50"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeBpRange(idx)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer border-none bg-transparent transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Withdrawal Settings */}
          {activeTab === "withdrawal" && (
            <div className="grid md:grid-cols-2 gap-6 items-start animate-in fade-in duration-300">
              <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                  <CreditCard className="text-gold" size={16} /> Withdrawal Fees & KYC Rules
                </h3>
                <div className="space-y-4 font-sans">
                  <div>
                    <label className="text-xs text-muted-foreground block font-sans">Payout Gateway Charge (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={payoutFee}
                      onChange={(e) => setPayoutFee(e.target.value)}
                      className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block font-sans">Flat Processing Fee per payout transaction (₹)</label>
                    <input
                      type="number"
                      value={processingFee}
                      onChange={(e) => setProcessingFee(e.target.value)}
                      className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block font-sans">Processing Fee Payer</label>
                    <select
                      value={processingFeePayer}
                      onChange={(e) => setProcessingFeePayer(e.target.value)}
                      className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-sans"
                    >
                      <option value="buyer">Buyer Pays Fee</option>
                      <option value="seller">Seller Pays Fee</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block font-sans">Default Order Escrow hold time (Hours)</label>
                    <input
                      type="number"
                      value={escrowTimeout}
                      onChange={(e) => setEscrowTimeout(e.target.value)}
                      className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                    />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer select-none pt-2 font-sans">
                    <input
                      type="checkbox"
                      checked={kycRequired}
                      onChange={(e) => setKycRequired(e.target.checked)}
                      className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground font-sans">Enforce User identity checks</span>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                        Requires Aadhaar/PAN upload and manual verification by admin before a user is permitted to request cash withdrawals.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl">
                <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-widest font-sans border-b border-border/30 pb-3">Identity Safeguards</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  By enabling identity checks, the platform is protected from payment fraud, chargebacks, and wash trading. Withdrawal transactions will be routed to a pending status until verified by compliance officers in the Admin Verifications queue.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Dormant Account Fees */}
          {activeTab === "dormant" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-5 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <Clock className="text-gold" size={16} /> Dormant Wallet Maintenance Fees
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Set inactivity limits and fee policies for wallets holding positive balances without active orders.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Inactivity Period threshold (Days)</label>
                  <input
                    type="number"
                    value={dormancyDays}
                    onChange={(e) => setDormancyDays(e.target.value)}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Monthly Maintenance Fee (₹ INR)</label>
                  <input
                    type="number"
                    value={dormancyFee}
                    onChange={(e) => setDormancyFee(e.target.value)}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Verification Badge */}
          {activeTab === "verification" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <UserCheck className="text-gold" size={16} /> Standalone Verification Badge Price
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Monthly Badge Fee (₹ INR / month)</label>
                  <input
                    type="number"
                    value={promoPrices.verification_badge_price}
                    onChange={(e) => setPromoPrices({ ...promoPrices, verification_badge_price: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Verification Badge Validity (Days)</label>
                  <input
                    type="number"
                    value={promoPrices.verification_badge_duration}
                    onChange={(e) => setPromoPrices({ ...promoPrices, verification_badge_duration: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Homepage Featured */}
          {activeTab === "homepage" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <SparklesIcon className="text-gold" size={16} /> Homepage Featured Spotlight Tokens
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Price per Token (₹ INR / token)</label>
                  <input
                    type="number"
                    value={promoPrices.homepage_featured_price}
                    onChange={(e) => setPromoPrices({ ...promoPrices, homepage_featured_price: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Maximum Concurrent Homepage Spotlight Slots</label>
                  <input
                    type="number"
                    value={promoPrices.homepage_featured_max_slots}
                    onChange={(e) => setPromoPrices({ ...promoPrices, homepage_featured_max_slots: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Featured Listing */}
          {activeTab === "listings" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <Sliders className="text-gold" size={16} /> Featured Listing Activation Tokens
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Price per Token (₹ INR / token)</label>
                  <input
                    type="number"
                    value={promoPrices.featured_listing_price}
                    onChange={(e) => setPromoPrices({ ...promoPrices, featured_listing_price: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Activation Duration per Token (Days)</label>
                  <input
                    type="number"
                    value={promoPrices.featured_listing_duration}
                    onChange={(e) => setPromoPrices({ ...promoPrices, featured_listing_duration: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: Boost To Top */}
          {activeTab === "boost" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <Zap className="text-gold" size={16} /> Boost To Top Token Price
              </h3>
              <div>
                <label className="text-xs text-muted-foreground block font-sans">Price per single Boost token (₹ INR)</label>
                <input
                  type="number"
                  value={promoPrices.boost_token_price}
                  onChange={(e) => setPromoPrices({ ...promoPrices, boost_token_price: parseInt(e.target.value) || 0 })}
                  className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                />
              </div>
            </div>
          )}

          {/* Tab 9: Urgent Sale Tag */}
          {activeTab === "urgent" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <AlertCircle className="text-gold" size={16} /> Urgent Sale tag pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Tag Price (₹ INR / tag)</label>
                  <input
                    type="number"
                    value={promoPrices.urgent_tag_price}
                    onChange={(e) => setPromoPrices({ ...promoPrices, urgent_tag_price: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Tag validity (Days)</label>
                  <input
                    type="number"
                    value={promoPrices.urgent_tag_duration}
                    onChange={(e) => setPromoPrices({ ...promoPrices, urgent_tag_duration: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 10: Glow Highlight */}
          {activeTab === "glow" && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface/30 p-6 space-y-4 shadow-xl animate-in fade-in duration-300">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <Activity className="text-gold" size={16} /> Glow Highlight Pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Highlight Price (₹ INR / item)</label>
                  <input
                    type="number"
                    value={promoPrices.glow_tag_price}
                    onChange={(e) => setPromoPrices({ ...promoPrices, glow_tag_price: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-sans">Glow validity (Days)</label>
                  <input
                    type="number"
                    value={promoPrices.glow_tag_duration}
                    onChange={(e) => setPromoPrices({ ...promoPrices, glow_tag_duration: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 11: Email Broadcast Cockpit */}
          {activeTab === "broadcaster" && (
            <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 shadow-xl animate-in fade-in duration-300 font-sans">
              <div className="border-b border-border/30 pb-4">
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Megaphone className="text-gold" size={18} /> Promotional Newsletter & Broadcast Cockpit
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Send high-converting HTML campaign emails directly to the inbox of every registered user on the platform.
                </p>
              </div>

              <form onSubmit={handleBroadcastCampaign} className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-sans">Weekly Spotlight Deal (Pick Listing)</label>
                    {listingsLoading ? (
                      <div className="h-10 rounded-lg bg-background/50 border border-border flex items-center justify-center text-xs text-muted-foreground animate-pulse font-sans">
                        Loading active marketplace items...
                      </div>
                    ) : (
                      <select
                        value={featuredListingId}
                        onChange={(e) => setFeaturedListingId(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden font-sans"
                      >
                        <option value="">-- No Spotlight Item --</option>
                        {activeListings.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-1.5 block leading-normal font-sans">
                      The selected listing will be beautifully formatted and featured with direct click links at the center of the email body.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-sans">Promo Discount Banner Header Text</label>
                    <input
                      type="text"
                      value={discountBanner}
                      onChange={(e) => setDiscountBanner(e.target.value)}
                      placeholder="e.g. FLAT 30% OFF ON ALL PUBG MOBILE ACCOUNTS THIS WEEK!"
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/30 font-sans"
                    />
                    <span className="text-[9px] text-muted-foreground mt-1.5 block leading-normal font-sans">
                      Displays in a premium gold banner accent at the very top of the email template.
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-sans">Custom Copywriter Announcement Text</label>
                    <textarea
                      value={weeklyDeal}
                      onChange={(e) => setWeeklyDeal(e.target.value)}
                      placeholder="Write your email body, announcements, rules, or deals details here..."
                      rows={5}
                      className="w-full p-3.5 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/30 resize-none font-sans"
                    />
                    <span className="text-[9px] text-muted-foreground mt-1.5 block leading-normal font-sans">
                      HTML email body announcement text.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface/30">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground font-sans">Send Authorization</span>
                      <p className="text-[9px] text-muted-foreground font-sans">
                        Confirm that you intend to send this broadcast.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendEnabled}
                      onChange={(e) => setSendEnabled(e.target.checked)}
                      className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={broadcasting || !sendEnabled}
                      className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-40 cursor-pointer border-none shadow-lg shadow-gold/5"
                    >
                      {broadcasting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Broadcasting...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Dispatch Promotional Broadcast
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
