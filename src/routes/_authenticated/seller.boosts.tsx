import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { Rocket, TrendingUp, Inbox, QrCode, Upload, RefreshCw } from "lucide-react";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet, purchaseBoost } from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/boosts")({
  head: () => ({ meta: [{ title: "Boosts — HUXZAIN Seller" }] }),
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
];

function Page() {
  const { user } = useAuth();
  const { tier } = useSellerTier();
  const [wallet, setWallet] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedListing, setSelectedListing] = useState("");
  const [selectedOption, setSelectedOption] = useState(boostOptions[0]);
  const [payMethod, setPayMethod] = useState<"wallet" | "manual">("wallet");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const w = await getOrCreateWallet(user.id);
      setWallet(w);

      const supabase = getSupabase();
      if (supabase) {
        // Load active seller listings
        const { data: lst } = await supabase
          .from("listings")
          .select("id, title")
          .eq("seller_id", user.id)
          .eq("status", "active");
        if (lst) {
          setListings(lst);
          if (lst.length > 0) setSelectedListing(lst[0].id);
        }

        // Load active boosts
        const { data: bst } = await supabase
          .from("listing_boosts")
          .select("*, listings:listing_id(title)")
          .eq("seller_id", user.id);
        if (bst) setActiveBoosts(bst);
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

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotUrl(reader.result as string);
        toast.success("Receipt screenshot proof loaded successfully!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("File upload failed: " + err.message);
      setUploading(false);
    }
  }

  async function handleBoost() {
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

    try {
      setSubmitting(true);
      await purchaseBoost(
        user.id,
        selectedListing,
        selectedOption.id,
        selectedOption.price,
        payMethod,
        screenshotUrl || undefined
      );

      toast.success(
        payMethod === "wallet"
          ? "Listing boosted successfully! Live instantly."
          : "Manual verification proof submitted. Our administrators will confirm this within 24-48h!"
      );

      setScreenshotUrl("");
      await loadData();
    } catch (err: any) {
      toast.error("Failed to purchase boost: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Boosts & Advertising</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activate premium placements to drive traffic and increase sales.
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
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOption(opt)}
                          className={`p-3 rounded-xl border text-left transition-all ${active ? "bg-gold/5 border-gold ring-1 ring-gold/20" : "border-border/60 hover:bg-surface/20"}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">{opt.name}</span>
                            <span className="font-mono text-gold font-bold">{fmt(opt.price)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                          {!eligible && (
                            <span className="inline-block mt-2 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                              Requires {opt.min.toUpperCase()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Choose Payment Method</span>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setPayMethod("wallet")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payMethod === "wallet" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Wallet Balance ({fmt(wallet?.available_balance || 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("manual")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payMethod === "manual" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Manual UPI Transfer
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
                        <p className="font-bold text-foreground">Scan UPI QR to Pay ₹{selectedOption.price}</p>
                        <p className="text-muted-foreground leading-relaxed">
                          Scan the code using any UPI app (GPay, PhonePe, Paytm). Upload the receipt below.
                        </p>
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
                      {screenshotUrl && (
                        <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                          ✓ Screenshot Proof Loaded!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBoost}
                  disabled={submitting || uploading}
                  className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Processing Boost..." : `Activate ${selectedOption.name} for ${fmt(selectedOption.price)}`}
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
    </div>
  );
}
