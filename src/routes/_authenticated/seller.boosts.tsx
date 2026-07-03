import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { Rocket, TrendingUp, Inbox, QrCode, Upload, RefreshCw } from "lucide-react";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet, purchaseBoost } from "@/lib/wallet.functions";
import { activateBoostWithToken } from "@/lib/seller/subscription.functions";
import { toast } from "sonner";
import { PremiumLockScreen } from "@/components/seller/PremiumLockScreen";

export const Route = createFileRoute("/_authenticated/seller/boosts")({
  head: () => ({ meta: [{ title: "Promotion Center — HUXZAIN Seller" }] }),
  component: Page,
});

const boostOptions = [
  {
    id: "push_to_top",
    name: "Push To Top",
    desc: "Bump your listing to the very top of category feeds instantly.",
    price: 49,
    min: "standard" as const,
  },
  {
    id: "homepage_spotlight",
    name: "Homepage Spotlight",
    desc: "Feature your listing in the homepage rotating showcase for 7 days.",
    price: 99,
    min: "pro" as const,
  },
  {
    id: "category_banner",
    name: "Category Banner",
    desc: "Premium ad banner placed directly above category searches for 7 days.",
    price: 199,
    min: "pro" as const,
  },
  {
    id: "featured_newsletter",
    name: "Featured Newsletter",
    desc: "Feature your listing in our weekly buyer spotlight email to 50k+ readers.",
    price: 299,
    min: "elite" as const,
  },
  {
    id: "urgent_sale",
    // Official spec (Category & huxzain features, Part 3): Urgent Sale is a flat
    // ₹149 tag that stays active until the listing's own 30-day expiry.
    name: "Urgent Sale Badge",
    desc: "Add a red urgent tag to draw instant attention. Stays active until the listing expires.",
    price: 149,
    min: "standard" as const,
  },
  {
    id: "glow_highlight",
    name: "Glow Highlight",
    desc: "Wrap your card in a premium animated golden border glow for 5 days.",
    price: 119,
    min: "pro" as const,
  },
];

function Page() {
  const { user } = useAuth();
  const { tier, subscription, refreshSubscription } = useSellerTier();
  
  // Boosts requires Pro or above (rank >= 2)
  const isLocked = !tierAtLeast(tier, "pro");

  const [wallet, setWallet] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (isLocked) {
    return <PremiumLockScreen featureName="Campaign Boosts & Spotlight Placements" requiredTier="pro" />;
  }

  // Form State
  const [selectedListing, setSelectedListing] = useState("");
  const [selectedOption, setSelectedOption] = useState(boostOptions[0]);
  const [payMethod, setPayMethod] = useState<"token" | "wallet" | "manual">("wallet");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingBoostRef = useRef(false);
  const [spotlightCount, setSpotlightCount] = useState(0);
  const [spotlightLimit, setSpotlightLimit] = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Set default payment method when tokens are loaded
  useEffect(() => {
    if (subscription && subscription.boost_tokens_remaining > 0) {
      setPayMethod("token");
    } else {
      setPayMethod("wallet");
    }
  }, [subscription?.boost_tokens_remaining]);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const w = await getOrCreateWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        // Load active seller listings (expiry_date drives Urgent Sale duration)
        const { data: lst } = await supabase
          .from("listings")
          .select("id, title, expiry_date")
          .eq("seller_id", user.id)
          .eq("status", "active");
        if (lst) {
          setListings(lst);
          if (lst.length > 0 && !selectedListing) setSelectedListing(lst[0].id);
        }

        // Load active boosts
        const { data: bst } = await supabase
          .from("listing_boosts")
          .select("*, listings:listing_id(title)")
          .eq("seller_id", user.id);
        if (bst) setActiveBoosts(bst);

        // Load active homepage spotlights count
        const { count: sCount, error: countErr } = await supabase
          .from("listing_boosts")
          .select("id", { count: "exact", head: true })
          .eq("boost_type", "homepage_spotlight")
          .eq("status", "active")
          .gt("ends_at", new Date().toISOString());

        if (!countErr && sCount !== null) {
          setSpotlightCount(sCount);
        }

        // Load spotlight limit from platform_settings
        const { data: ps } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "homepage_boosts")
          .maybeSingle();
        
        if (ps?.value?.max_spotlight_slots) {
          setSpotlightLimit(ps.value.max_spotlight_slots);
        } else {
          setSpotlightLimit(5);
        }
      }
    } catch (e: any) {
      toast.error("Failed to load boosts data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload JPG, PNG, or PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }

    setPaymentFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    toast.success("Receipt screenshot proof loaded successfully!");
  }

  async function handleBoost(bypassConfirm = false) {
    if (!user) return;
    if (!selectedListing) {
      toast.error("Please select a listing to boost first. You must have at least one active listing.");
      return;
    }

    const eligible = tierAtLeast(tier, selectedOption.min);
    if (!eligible) {
      toast.error(`This boost option requires a ${selectedOption.min.toUpperCase()} plan. Upgrade or select another.`);
      return;
    }

    if (selectedOption.id === "homepage_spotlight" && spotlightCount >= spotlightLimit) {
      toast.error(`Homepage Spotlight slots are currently fully booked (Limit: ${spotlightLimit}). Please select another boost option or try again later.`);
      return;
    }

    // Token check
    if (payMethod === "token" && (!subscription || subscription.boost_tokens_remaining <= 0)) {
      toast.error("You do not have any boost tokens remaining under your active subscription.");
      return;
    }

    if ((payMethod === "wallet" || payMethod === "token") && !bypassConfirm) {
      setShowConfirmModal(true);
      return;
    }

    if (payMethod === "manual" && !paymentFile) {
      toast.error("Please upload your payment screenshot first.");
      return;
    }

    if (isSubmittingBoostRef.current) return;

    try {
      isSubmittingBoostRef.current = true;
      setSubmitting(true);
      // Urgent Sale stays active until the listing's own expiry (spec); fall back
      // to a full 30-day cycle if the expiry_date is not yet stamped.
      const urgentDays = (() => {
        const l = listings.find((x) => x.id === selectedListing);
        if (l?.expiry_date) {
          const d = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / 86400000);
          return d > 0 ? d : 30;
        }
        return 30;
      })();
      const durationDays = selectedOption.id === "urgent_sale" ? urgentDays : selectedOption.id === "glow_highlight" ? 5 : 7;

      if (payMethod === "token") {
        await activateBoostWithToken({
          data: {
            sellerId: user.id,
            listingId: selectedListing,
            boostType: selectedOption.id,
            durationDays
          }
        });
        toast.success("Listing boosted successfully using plan token! Live instantly.");
      } else {
        let finalScreenshotUrl = "";
        if (payMethod === "manual" && paymentFile) {
          setUploading(true);
          const supabaseClient = getSupabase();
          if (!supabaseClient) throw new Error("Supabase client not initialized");

          const ext = paymentFile.name.split(".").pop() ?? "png";
          const filePath = `${user.id}/boost/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

          const { error: uploadErr } = await supabaseClient.storage
            .from("payment-proofs")
            .upload(filePath, paymentFile, { upsert: true, contentType: paymentFile.type });

          if (uploadErr) {
            throw new Error("Failed to upload payment proof. Please try again. (" + uploadErr.message + ")");
          }
          finalScreenshotUrl = filePath;
          setUploading(false);
        }

        await purchaseBoost(
          user.id,
          selectedListing,
          selectedOption.id,
          selectedOption.price,
          payMethod === "manual" ? "manual" : "wallet",
          finalScreenshotUrl || undefined
        );
        toast.success(
          payMethod === "wallet"
            ? "Listing boosted successfully! Live instantly."
            : "Boost request submitted successfully. Awaiting admin review."
        );
      }

      setPaymentFile(null);
      setPreviewUrl(null);
      setShowConfirmModal(false);
      await loadData();
      await refreshSubscription();
    } catch (err: any) {
      toast.error("Failed to purchase boost: " + err.message);
      setUploading(false);
    } finally {
      setSubmitting(false);
      isSubmittingBoostRef.current = false;
    }
  }

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const tokensCount = subscription?.boost_tokens_remaining || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Promotion Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your promotions in one place — Boost to Top, Homepage &amp; Category Featured, Urgent Sale, and Glow Highlight.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Loading active catalog campaigns...
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Boost Form Card */}
            <PanelCard title="Boost a Listing" action={<Rocket className="text-gold" />}>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Select Listing to Sponsor</span>
                  {listings.length === 0 ? (
                    <div className="mt-1.5 text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10 p-3 rounded-lg">
                      No active listings found. You must create and publish a listing before boosting.
                    </div>
                  ) : (
                    <select
                      value={selectedListing}
                      onChange={(e) => setSelectedListing(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    >
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Choose Promotion Option</span>
                  <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                    {boostOptions.map((opt) => {
                      const active = selectedOption.id === opt.id;
                      const eligible = tierAtLeast(tier, opt.min);
                      const isSpotlightBooked = opt.id === "homepage_spotlight" && spotlightCount >= 5;
                      const duration = opt.id === "urgent_sale" ? "until listing expires" : opt.id === "glow_highlight" ? "5 days" : "7 days";
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOption(opt)}
                          className={`p-3 rounded-xl border text-left transition-all ${active ? "bg-gold/5 border-gold ring-1 ring-gold/20" : "border-border/60 hover:bg-surface/20"} ${isSpotlightBooked ? "opacity-75 cursor-not-allowed border-rose-500/30" : ""}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">{opt.name}</span>
                            <span className="font-mono text-gold font-bold">{fmt(opt.price)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{opt.desc} ({duration})</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {!eligible && (
                              <span className="inline-block text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                                Requires {opt.min.toUpperCase()}
                              </span>
                            )}
                            {isSpotlightBooked && (
                              <span className="inline-block text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase animate-pulse">
                                Spotlight Fully Booked
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Choose Payment Method</span>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <button
                      type="button"
                      disabled={tokensCount <= 0}
                      onClick={() => setPayMethod("token")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payMethod === "token" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface disabled:opacity-40"}`}
                    >
                      Plan Token ({tokensCount} left)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("wallet")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payMethod === "wallet" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Wallet ({fmt(wallet?.available_balance || 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("manual")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payMethod === "manual" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Manual UPI QR
                    </button>
                  </div>
                </div>

                {payMethod === "manual" && (
                  <div className="p-4 rounded-xl border border-border/80 bg-surface/30 space-y-4 animate-in fade-in duration-200">
                    <div className="flex gap-4 items-center flex-wrap sm:flex-nowrap">
                      <div className="size-24 bg-white p-1 rounded-xl flex items-center justify-center shrink-0">
                        <QrCode className="size-20 text-black" />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-foreground">Scan UPI QR to Pay {fmt(selectedOption.price)}</p>
                        <p className="text-muted-foreground leading-relaxed">
                          Scan the code using any UPI app (GPay, PhonePe, Paytm). Upload the receipt below.
                        </p>
                        <p className="text-[10px] text-gold font-semibold">UPI ID: shprivateltd@upi</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Upload Payment Screenshot</span>
                      <label className="mt-1 flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                          <Upload className="size-6 text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">Click to browse or drop file</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                      {previewUrl && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                            ✓ Screenshot Proof Loaded! ({paymentFile?.name})
                          </div>
                          {previewUrl.startsWith("blob:") ? (
                            <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg border border-border object-contain mx-auto" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedOption.id === "homepage_spotlight" && spotlightCount >= 5 ? (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-400 font-medium">
                    ⚠️ The Homepage Spotlight slots are currently **Fully Booked / No Slots Available** (Max 5 Spotlight active slots allowed). 
                    Please choose another boost option or try again later when an existing spotlight campaign expires.
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleBoost()}
                  disabled={submitting || uploading || (selectedOption.id === "homepage_spotlight" && spotlightCount >= 5)}
                  className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {selectedOption.id === "homepage_spotlight" && spotlightCount >= 5
                    ? "Spotlight Fully Booked"
                    : submitting 
                      ? "Processing Boost..." 
                      : payMethod === "token"
                        ? `Activate using 1 Plan Boost Token`
                        : `Activate ${selectedOption.name} for ${fmt(selectedOption.price)}`}
                </button>
              </div>
            </PanelCard>
          </div>

          <div className="space-y-6">
            {/* Boost Performance / Stats */}
            <PanelCard title="Live Campaign Stats" action={<TrendingUp size={14} className="text-gold" />}>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Active Boost Campaigns</div>
                  <div className="font-display text-2xl font-bold mt-1">
                    {activeBoosts.filter((b) => b.status === "active").length}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Lifetime Ad Spend</div>
                  <div className="font-display text-2xl font-bold mt-1">
                    {fmt(activeBoosts.reduce((acc, curr) => acc + Number(curr.amount_inr || 0), 0))}
                  </div>
                </div>
              </div>
            </PanelCard>

            {/* Active Boosts Log */}
            <PanelCard title="Active Placements">
              {activeBoosts.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No active boosts on your listings yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeBoosts.map((b) => (
                    <div key={b.id} className="p-3 rounded-lg border border-border bg-surface/10 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gold uppercase">{b.boost_type.replace(/_/g, " ")}</span>
                        <StatusPill status={b.status === "active" ? "Active" : "Paused"} />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">
                        Listing: {b.listings?.title || "Marketplace listing"}
                      </p>
                      <div className="text-[10px] text-muted-foreground mt-2">
                        Expires: {new Date(b.ends_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="size-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                <Rocket className="size-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Confirm Boost Purchase</h3>
                <p className="text-[11px] text-muted-foreground">{payMethod === "token" ? "Deduct Plan Boost Token" : "Wallet Balance Checkout"}</p>
              </div>
            </div>
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {payMethod === "token" 
                  ? `Do you want to activate this boost using 1 subscription boost token?`
                  : `Do you want to purchase this boost for ${fmt(selectedOption.price)} from wallet balance?`}
              </p>
              <div className="rounded-xl bg-background/50 border border-border p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listing:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {listings.find(l => l.id === selectedListing)?.title || "Selected Listing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boost Type:</span>
                  <span className="font-semibold text-gold uppercase">{selectedOption.name}</span>
                </div>
                {payMethod === "token" ? (
                  <div className="flex justify-between border-t border-border/60 pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Remaining Boost Tokens:</span>
                    <span className="font-semibold text-foreground">{tokensCount} left</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-border/60 pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Available Wallet Balance:</span>
                    <span className="font-semibold text-foreground">{fmt(wallet?.available_balance || 0)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBoost(true)}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
