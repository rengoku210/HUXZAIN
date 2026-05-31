import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Settings, Save, Mail, Percent, Globe, Key, ShieldCheck, RefreshCw, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-client";
import { sendPromotionalEmailCampaign } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  const [saving, setSaving] = useState(false);

  // Platform Form States
  const [platformName, setPlatformName] = useState("HUXZAIN");
  const [supportEmail, setSupportEmail] = useState("support@huxzain.shop");
  const [commissionRate, setCommissionRate] = useState("1.9");
  const [payoutFee, setPayoutFee] = useState("0.0");
  const [kycRequired, setKycRequired] = useState(true);
  const [escrowTimeout, setEscrowTimeout] = useState("24");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Email Broadcaster States
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [featuredListingId, setFeaturedListingId] = useState("");
  const [discountBanner, setDiscountBanner] = useState("");
  const [weeklyDeal, setWeeklyDeal] = useState("");
  const [sendEnabled, setSendEnabled] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Load from localStorage if present
  useEffect(() => {
    const savedName = localStorage.getItem("huxzain_platform_name");
    const savedEmail = localStorage.getItem("huxzain_support_email");
    const savedCommission = localStorage.getItem("huxzain_commission_rate");
    const savedPayout = localStorage.getItem("huxzain_payout_fee");
    const savedKyc = localStorage.getItem("huxzain_kyc_required");
    const savedEscrow = localStorage.getItem("huxzain_escrow_timeout");
    const savedMaint = localStorage.getItem("huxzain_maintenance_mode");

    if (savedName) setPlatformName(savedName);
    if (savedEmail) setSupportEmail(savedEmail);
    if (savedCommission) setCommissionRate(savedCommission);
    if (savedPayout) setPayoutFee(savedPayout);
    if (savedKyc) setKycRequired(savedKyc === "true");
    if (savedEscrow) setEscrowTimeout(savedEscrow);
    if (savedMaint) setMaintenanceMode(savedMaint === "true");
  }, []);

  useEffect(() => {
    async function loadActiveListings() {
      const supabase = getSupabase();
      if (!supabase) {
        setListingsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id, title")
          .eq("status", "active");
        if (error) throw error;
        if (data) setActiveListings(data);
      } catch (err: any) {
        console.error("Failed to load active listings:", err.message);
      } finally {
        setListingsLoading(false);
      }
    }
    loadActiveListings();
  }, []);

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
        toast.error("Failed to broadcast email: " + (res?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Campaign broadcast failed: " + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      localStorage.setItem("huxzain_platform_name", platformName);
      localStorage.setItem("huxzain_support_email", supportEmail);
      localStorage.setItem("huxzain_commission_rate", commissionRate);
      localStorage.setItem("huxzain_payout_fee", payoutFee);
      localStorage.setItem("huxzain_kyc_required", kycRequired ? "true" : "false");
      localStorage.setItem("huxzain_escrow_timeout", escrowTimeout);
      localStorage.setItem("huxzain_maintenance_mode", maintenanceMode ? "true" : "false");
      
      toast.success("Platform settings updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Settings className="text-gold" size={24} /> Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure global marketplace commissions, support endpoints, payout fees, and operational policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* General Branding */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="text-gold size-4" /> Branding & Identity
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Platform Name</label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Support Contact Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 text-muted-foreground size-4" />
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Percent className="text-gold size-4" /> Fee Schedule
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Base Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard tier fee. Pro and elite tiers reduce this dynamically.</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Withdrawal / Payout Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={payoutFee}
                  onChange={(e) => setPayoutFee(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Operational Rules */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="text-gold size-4" /> Trust & Moderation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Default Escrow Timeout (Hours)</label>
                <input
                  type="number"
                  required
                  value={escrowTimeout}
                  onChange={(e) => setEscrowTimeout(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kycRequired}
                  onChange={(e) => setKycRequired(e.target.checked)}
                  className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Enforce KYC Verification</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Require government ID uploads before creating active seller withdraw requests.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Maintenance Settings */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Key className="text-gold size-4" /> System Control
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Activate Maintenance Mode</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Locks the checkout and listing catalog. Platform displays offline maintenance banner.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-gold/5"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Promotional Email Campaigns Cockpit */}
      <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Megaphone className="text-gold" size={18} /> Promotional Email Campaigns Cockpit
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Design and broadcast HTML promotional campaigns directly to every registered HUXZAIN user email.
          </p>
        </div>

        <form onSubmit={handleBroadcastCampaign} className="grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Weekly Spotlight Listing</label>
              {listingsLoading ? (
                <div className="h-10 rounded-lg bg-background/50 border border-border flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                  Loading active listings...
                </div>
              ) : (
                <select
                  value={featuredListingId}
                  onChange={(e) => setFeaturedListingId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                >
                  <option value="">-- Select No Listing --</option>
                  {activeListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Listing will be featured in the email with a special title: **"Best Deal This Week / Limited Time Offer"**.
              </span>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Discount Banner Text Overlay</label>
              <input
                type="text"
                value={discountBanner}
                onChange={(e) => setDiscountBanner(e.target.value)}
                placeholder="e.g. 50% OFF ON ALL VALORANT ACCOUNTS THIS WEEKEND!"
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/50"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Renders as a gold-gradient banner at the top of the email template.
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Weekly Deal / Newsletter Description</label>
              <textarea
                value={weeklyDeal}
                onChange={(e) => setWeeklyDeal(e.target.value)}
                placeholder="Write promotional deal description or custom announcement copy here..."
                rows={4}
                className="w-full p-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden placeholder:text-muted-foreground/50 resize-none"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Main announcement paragraph displayed below the header banner.
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/85 bg-surface/30">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">Send Authorization</span>
                <p className="text-[10px] text-muted-foreground">
                  Confirm to unlock the main broadcast action.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendEnabled}
                  onChange={(e) => setSendEnabled(e.target.checked)}
                  className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={broadcasting || !sendEnabled}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg shadow-gold/5"
              >
                {broadcasting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Broadcasting...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Campaign Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
