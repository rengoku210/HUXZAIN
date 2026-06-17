import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Star,
  BadgeCheck,
  Check,
  ShieldCheck,
  ShoppingCart,
  Heart,
  Share2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { cartStore } from "@/lib/cart/cart-store";
import { wishlistStore } from "@/lib/wishlist/wishlist-store";
import {
  listingImage,
  listingPrice,
  formatPrice,
  listingRating,
  listingReviewCount,
  listingSellerName,
  type ListingLike,
} from "@/lib/marketplace/listing-adapter";
import { submitReport } from "@/lib/reports.functions";
import { sanitizeHexColor } from "@/lib/security";
import { friendlyError } from "@/lib/error-messages";
import { TrustBadge } from "@/components/site/TrustBadge";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Listing — HUXZAIN" },
      { name: "description", content: "View and purchase this listing on HUXZAIN — India's secure digital marketplace." },
      { property: "og:title", content: "Listing — HUXZAIN" },
      { property: "og:description", content: "Buy safely with escrow protection on HUXZAIN." },
      { property: "og:type", content: "product" },
      { property: "og:image", content: "https://huxzain.shop/og-image.png" },
    ],
  }),
  component: ProductPage,
});

type DbListing = ListingLike & {
  seller_id?: string | null;
  category_id?: string | null;
  currency?: string | null;
  categories?: { name?: string | null; slug?: string | null } | null;
};

const FEATURES = [
  "Secure HUXZAIN order protection",
  "Seller delivery tracked in dashboard",
  "Payment verification tied to this order",
  "Dispute support available after purchase",
];
const TABS = ["Description", "Reviews", "FAQs", "Support"];

// Predefined GAME ranks configuration for dynamic calculator
const GAME_RANKS: Record<string, string[]> = {
  "valorant": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
  "league of legends": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
  "cs2": ["Silver I", "Silver Elite", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme Master", "Global Elite"],
  "mobile legends": ["Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend", "Mythic", "Mythic Glory", "Mythical Immortal"]
};

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, ready } = useAuth();
  const [listing, setListing] = useState<DbListing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(wishlistStore.isWishlisted(id));
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<"listing" | "seller">("listing");
  const [reportReason, setReportReason] = useState("Fraud / Scam");
  const [reportDescription, setReportDescription] = useState("");
  const [reportScreenshotFile, setReportScreenshotFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);


  const [currentRank, setCurrentRank] = useState("");
  const [desiredRank, setDesiredRank] = useState("");
  const [matchedRanks, setMatchedRanks] = useState<string[]>([]);
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    if (!listing) return;
    const catSlug = listing.categories?.slug ?? "";
    const attrType = (listing.attributes as any)?.type ?? "";
    const isBoostCat = catSlug === "boosting-services" || attrType === "boosting";
    setIsBoosting(isBoostCat);

    if (isBoostCat) {
      const gameName = (listing.attributes as any)?.game?.toLowerCase() || "";
      const matched = Object.entries(GAME_RANKS).find(([k]) => gameName.includes(k) || k.includes(gameName))?.[1] || ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"];
      setMatchedRanks(matched);
      setCurrentRank(matched[0]);
      setDesiredRank(matched[1] || matched[0]);
    }
  }, [listing]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      setIsWishlisted(wishlistStore.isWishlisted(id));
    };
    window.addEventListener("wishlist-updated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlist-updated", handleWishlistUpdate);
  }, [id]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Marketplace backend is not configured.");
        setLoading(false);
        return;
      }

      // Check if parameter is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let query = supabase.from("listings").select("*, categories:category_id(*)");
      if (isUuid) {
        query = query.eq("id", id);
      } else {
        query = query.eq("slug", id);
      }

      const { data, error: err } = await query.maybeSingle();

      if (!active) return;
      if (err) setError(err.message);
      else if (!data || data.status === 'deleted') setError("Listing not found.");
      else {
        setListing(data as DbListing);
        
        // Fetch seller profile separately
        if (data.seller_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", data.seller_id)
            .maybeSingle();
            
          const { data: cust } = await supabase
            .from("seller_customizations")
            .select("*")
            .eq("id", data.seller_id)
            .maybeSingle();
            
          if (active) {
            setSellerProfile({ ...prof, customizations: cust });
          }
        }
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  // Update document title dynamically once listing is loaded
  useEffect(() => {
    if (listing?.title) {
      document.title = `${listing.title} — HUXZAIN`;
    }
  }, [listing?.title]);

  async function handleBuyNow() {
    try {
      console.log('STEP 1 Buy Now clicked', {
        isAuthenticated,
        userId: user?.id,
        listingId: id,
        listingSellerId: listing?.seller_id,
        listingTitle: listing?.title,
      });

      if (!isAuthenticated || !user) {
        console.log('STEP 1.1: Buyer not authenticated, redirecting to login...');
        toast.error("Please sign in to purchase.");
        navigate({ to: "/login", search: { redirect: `/product/${id}` } });
        return;
      }
      if (!listing?.seller_id) {
        console.log('STEP 1.2: Listing is missing seller_id.');
        toast.error("This listing is missing seller information.");
        return;
      }
      if (listing.status !== "active") {
        toast.error("This listing is not available for purchase.");
        return;
      }
      if (listing.seller_id === user.id) {
        console.log('STEP 1.3: Seller trying to purchase their own listing.');
        toast.error("You cannot buy your own listing.");
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        console.log('STEP 1.4: Supabase client is not configured.');
        toast.error("Marketplace backend is not configured.");
        return;
      }

      console.log('STEP 2 creating order', {
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id: listing.id,
        listing_title: listing.title,
      });

      setOrdering(true);
      
      const basePrice = listingPrice(listing);
      const currentIdx = matchedRanks.indexOf(currentRank);
      const desiredIdx = matchedRanks.indexOf(desiredRank);
      const rankDifference = currentIdx !== -1 && desiredIdx !== -1 ? Math.max(0, desiredIdx - currentIdx) : 0;
      const calculatedPrice = isBoosting && rankDifference > 0
        ? basePrice + rankDifference * Math.max(100, Math.round(basePrice * 0.15))
        : basePrice;
      const priceVal = isBoosting ? calculatedPrice : basePrice;

      const finalTitle = isBoosting && rankDifference > 0
        ? `${listing.title} (${currentRank} to ${desiredRank})`
        : listing.title;

      // Create order using correct live DB columns and enum values
      console.log('STEP 2.1: Inserting order into Supabase...');
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_id: listing.id,
          listing_title: finalTitle,
          amount_inr: priceVal,
          status: "pending_payment",
          payment_status: "created",
          payment_method: "manual"
        })
        .select("id")
        .single();

      if (orderError) {
        console.error('STEP 2.2: Order insert failed with error:', orderError);
        throw orderError;
      }

      console.log('STEP 3 order created', order);

      if (!order?.id) {
        console.error('STEP 3.1: Returned order ID is missing/null!');
        throw new Error("Returned order ID is missing.");
      }

      // Insert transaction charge tracking
      console.log('STEP 4 creating payment (transaction tracking)...');
      try {
        const amountCents = Math.round(priceVal * 100);
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: user.id,
          order_id: order.id,
          type: "charge",
          amount_cents: amountCents,
          currency: "INR",
          ref: `manual:${order.id}`,
          status: "pending",
        });
        if (txError) {
          console.warn("[BuyNow] Transaction insert non-blocking error:", txError);
        } else {
          console.log("STEP 4.1: Transaction record inserted successfully.");
        }
      } catch (txEx) {
        console.warn("[BuyNow] Transaction insert non-blocking exception:", txEx);
      }

      // Safe notification insert (do not block checkout if RLS restricts buyer insert)
      try {
        await supabase.from("notifications").insert({
          user_id: listing.seller_id,
          kind: "order.created",
          title: "New order received",
          body: `${user.email ?? "A buyer"} started checkout for ${finalTitle}`,
        });
      } catch (notifEx) {
        console.warn("[BuyNow] Notifications insert non-blocking exception:", notifEx);
      }

      const redirectPath = "/checkout/payment";
      const searchParams = { orderId: order.id, listingId: listing.id, price: String(priceVal), title: finalTitle };
      console.log('STEP 5 navigating checkout', {
        path: redirectPath,
        search: searchParams,
      });

      navigate({
        to: redirectPath,
        search: searchParams,
      });
      
      console.log('STEP 6 navigation complete');
    } catch (err: any) {
      console.error('[BuyNow Error]', err);
      toast.error(friendlyError(err, "Unable to start checkout. Please try again."));
    } finally {
      setOrdering(false);
    }
  }

  async function handleAddToCart() {
    if (!listing) return;
    if (listing.status !== "active") {
      toast.error("This listing is not available.");
      return;
    }
    const res = cartStore.addItem(listing);
    if (res === "added") {
      toast.success("Added to cart");
    } else {
      toast.info("Already in cart");
    }
  }

  async function handleToggleWishlist() {
    const res = wishlistStore.toggle(id);
    if (res === "added") {
      toast.success("Added to wishlist");
    } else {
      toast.success("Removed from wishlist");
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 text-gold animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container-page py-16 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">{error ?? "Listing not found."}</p>
          <Link
            to="/"
            className="h-10 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center"
          >
            Browse Listings
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const title = listing.title;
  const basePrice = listingPrice(listing);
  const currentIdx = matchedRanks.indexOf(currentRank);
  const desiredIdx = matchedRanks.indexOf(desiredRank);
  const rankDifference = currentIdx !== -1 && desiredIdx !== -1 ? Math.max(0, desiredIdx - currentIdx) : 0;
  const calculatedPrice = isBoosting && rankDifference > 0
    ? basePrice + rankDifference * Math.max(100, Math.round(basePrice * 0.15))
    : basePrice;
  const price = isBoosting ? calculatedPrice : basePrice;

  const finalTitle = isBoosting && rankDifference > 0
    ? `${title} (${currentRank} to ${desiredRank})`
    : title;

  const seller = sellerProfile?.display_name ?? sellerProfile?.username ?? "Verified Seller";
  const rating = listingRating(listing);
  const reviews = listingReviewCount(listing);
  const image = listingImage(listing);
  const isThemeEnabled = sellerProfile?.customizations?.theme_enabled !== false;
  const themeColor = isThemeEnabled ? sellerProfile?.customizations?.theme_color || 'midnight' : 'midnight';
  const accentColor = sanitizeHexColor(
    isThemeEnabled ? sellerProfile?.customizations?.accent_color : null,
    "#d4b46a"
  );
  const categorySlug = listing.categories?.slug ?? "digital-products";
  const categoryName = listing.categories?.name ?? "Digital Products";


  return (
    <div className="min-h-screen flex flex-col">
      {isThemeEnabled && sellerProfile?.customizations?.accent_color && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --gold: ${accentColor} !important;
            --primary: ${accentColor} !important;
            --ring: ${accentColor}80 !important;
          }
          .text-gold {
            color: ${accentColor} !important;
          }
          .bg-gold {
            background-color: ${accentColor} !important;
            color: #000000 !important;
          }
          .border-gold {
            border-color: ${accentColor} !important;
          }
          .border-gold\\/40 {
            border-color: ${accentColor}66 !important;
          }
          .bg-gold\\/10 {
            background-color: ${accentColor}1a !important;
          }
          .bg-gold\\/15 {
            background-color: ${accentColor}26 !important;
          }
          .bg-gold\\/5 {
            background-color: ${accentColor}0d !important;
          }
          .hover\\:bg-gold\\/10:hover {
            background-color: ${accentColor}1a !important;
          }
          .hover\\:border-gold\\/40:hover {
            border-color: ${accentColor}66 !important;
          }
        `}} />
      )}
      <Header />
      <main className="flex-1 container-page py-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="size-3" />
          <Link
            to="/category/$slug"
            params={{ slug: categorySlug }}
            className="hover:text-foreground"
          >
            {categoryName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div>
            <div className="aspect-[16/10] rounded-2xl border border-border bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center overflow-hidden">
              {image ? (
                <img src={image} alt={title} className="size-full object-cover" />
              ) : (
                <div className="font-display text-3xl font-bold text-white tracking-wider text-center whitespace-pre-line drop-shadow-lg">
                  {title.split(" ").slice(0, 3).join("\n")}
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>

            {/* Branded Storefront Card */}
            <div className="mt-6 rounded-2xl border border-border bg-surface/30 overflow-hidden relative group">
              {/* Card Banner */}
              <div className="h-24 w-full relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 overflow-hidden">
                {isThemeEnabled && sellerProfile?.customizations?.banner_url ? (
                  <img 
                    src={sellerProfile.customizations.banner_url} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt="Seller banner" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              </div>

              {/* Profile Details Container */}
              <div className="p-4 pt-0 relative flex flex-col gap-3">
                {/* Logo and Name header */}
                <div className="flex items-end gap-3 -mt-6">
                  {sellerProfile?.customizations?.logo_url ? (
                    <div className="size-14 rounded-xl border border-border overflow-hidden bg-background shadow-xl shrink-0 z-10">
                      <img src={sellerProfile.customizations.logo_url} className="w-full h-full object-cover" alt={seller} />
                    </div>
                  ) : (
                    <div className="size-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-lg font-bold text-gold shadow-xl shrink-0 z-10">
                      {seller[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 mb-1 z-10">
                    <h3 className="font-display font-bold text-sm truncate text-foreground flex items-center gap-1.5">
                      {seller}
                      <span className="inline-flex items-center justify-center size-4 rounded-full bg-gold/10 border border-gold/20 text-gold" title="Verified Seller">
                        <BadgeCheck className="size-3" />
                      </span>
                    </h3>
                    
                    {/* Slogan */}
                    {isThemeEnabled && sellerProfile?.customizations?.storefront_banner_customization && (
                      <p className="text-[10px] text-gold/80 italic font-medium truncate mt-0.5 max-w-[200px]">
                        "{sellerProfile.customizations.storefront_banner_customization}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating and Tier stats row */}
                <div className="flex items-center justify-between text-xs border-t border-border/40 pt-3 mt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="size-3.5 fill-gold text-gold" />
                    <span className="font-semibold text-foreground">{rating ? rating.toFixed(1) : "New"}</span>
                    <span className="text-muted-foreground">({reviews} reviews)</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                    <span>Verified Digital Merchant</span>
                    <span className="text-muted-foreground/30">|</span>
                    <button
                      onClick={() => {
                        if (!isAuthenticated || !user) {
                          toast.error("Please sign in to report a seller.");
                          navigate({ to: "/login", search: { redirect: `/product/${id}` } });
                          return;
                        }
                        setReportTargetType("seller");
                        setReportOpen(true);
                      }}
                      className="text-[9px] text-destructive/80 hover:text-destructive hover:underline lowercase font-semibold cursor-pointer"
                    >
                      report seller
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const attrs = listing.attributes as any;
              const catSlug = listing.categories?.slug || "";
              const isGameAcc = attrs?.type === "game-accounts" || catSlug === "gaming-accounts" || catSlug.includes("account");
              if (!isGameAcc) return null;

              // Calculate Security Score
              let score = 0;
              const factors = [];

              // Factor 1: Original Email Included (+25)
              const hasOrigEmail = attrs?.originalEmailIncluded === true || attrs?.originalEmailIncluded === "true";
              if (hasOrigEmail) {
                score += 25;
                factors.push({ name: "Original Email Included", desc: "Includes access to the initial registration email account.", status: true, points: 25 });
              } else {
                factors.push({ name: "Original Email Included", desc: "Original registration email is not provided with purchase.", status: false, points: 25 });
              }

              // Factor 2: First Owner Status / Original Owner (+20)
              const isFirstOwner = attrs?.firstOwnerStatus === true || attrs?.firstOwnerStatus === "true" || attrs?.originalOwner === true || attrs?.originalOwner === "true";
              if (isFirstOwner) {
                score += 20;
                factors.push({ name: "First Owner Verified", desc: "Seller is the original creator of the gaming account.", status: true, points: 20 });
              } else {
                factors.push({ name: "First Owner Verified", desc: "Account was resold or traded previously by other owners.", status: false, points: 20 });
              }

              // Factor 3: Recovery History / Recovery Info Available (+15)
              const hasRecovery = !!(attrs?.recoveryHistory || attrs?.recoveryInfo);
              if (hasRecovery) {
                score += 15;
                factors.push({ name: "Recovery History Provided", desc: "Detailed recovery details & security answers are supplied.", status: true, points: 15 });
              } else {
                factors.push({ name: "Recovery History Provided", desc: "No recovery details or history supplied by the seller.", status: false, points: 15 });
              }

              // Factor 4: Warranty Availability (+15)
              const hasWarranty = !!(attrs?.warrantyInformation || attrs?.warrantyPeriod) && !String(attrs?.warrantyInformation || attrs?.warrantyPeriod).toLowerCase().includes("none");
              if (hasWarranty) {
                score += 15;
                factors.push({ name: "Warranty Period Active", desc: `Account is covered by a seller warranty: ${attrs?.warrantyInformation || attrs?.warrantyPeriod}.`, status: true, points: 15 });
              } else {
                factors.push({ name: "Warranty Period Active", desc: "No refund or replacement warranty is offered for this account.", status: false, points: 15 });
              }

              // Factor 5: Purchase Receipts (+15)
              const hasReceipts = attrs?.purchaseReceiptsAvailable === true || attrs?.purchaseReceiptsAvailable === "true";
              if (hasReceipts) {
                score += 15;
                factors.push({ name: "Purchase Receipts Available", desc: "First purchase receipt/invoices are provided to buyer.", status: true, points: 15 });
              } else {
                factors.push({ name: "Purchase Receipts Available", desc: "No transaction receipts or purchase history proofs available.", status: false, points: 15 });
              }

              // Factor 6: Linked Accounts (+10)
              const hasLinked = !!attrs?.linkedAccounts && !String(attrs?.linkedAccounts).toLowerCase().includes("none");
              if (hasLinked) {
                score += 10;
                factors.push({ name: "Linked Connections Checked", desc: `Linked social/console accounts detailed: ${attrs?.linkedAccounts}.`, status: true, points: 10 });
              } else {
                factors.push({ name: "Linked Connections Checked", desc: "No linked third-party consoles or platforms specified.", status: false, points: 10 });
              }

              // Determine color class based on score
              let scoreColor = "text-red-500 border-red-500/20 bg-red-500/5";
              let scoreLabel = "High Risk";
              if (score >= 80) {
                scoreColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                scoreLabel = "Excellent Security";
              } else if (score >= 50) {
                scoreColor = "text-gold border-gold/20 bg-gold/5";
                scoreLabel = "Moderate Security";
              }

              return (
                <div className="mt-6 p-5 rounded-2xl border border-border bg-surface/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gold">Gaming Account Security Score</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Automated safety verification indicator</p>
                    </div>
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${scoreColor}`}>
                      <div className="text-3xl font-extrabold tracking-tight">{score}</div>
                      <div className="text-left shrink-0">
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-65">Score</div>
                        <div className="text-xs font-bold">{scoreLabel}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs">
                        <div className={`mt-0.5 shrink-0 size-4 rounded-full flex items-center justify-center text-[9px] font-bold ${f.status ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {f.status ? "✓" : "✗"}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-1.5 text-white">
                            {f.name}
                            <span className="text-[9px] text-muted-foreground">({f.points} pts)</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Verification proofs */}
                  {(attrs?.proofRankUrl || attrs?.proofInventoryUrl || attrs?.proofPurchaseUrl || attrs?.proofScreenshotsUrl) && (
                    <div className="border-t border-border/40 pt-4 mt-4">
                      <div className="text-[10px] uppercase tracking-widest text-gold/80 font-bold mb-2.5">Verified Seller Uploads</div>
                      <div className="flex flex-wrap gap-2">
                        {attrs?.proofRankUrl && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Rank Proof Attached
                          </span>
                        )}
                        {attrs?.proofInventoryUrl && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Inventory Proof Attached
                          </span>
                        )}
                        {attrs?.proofPurchaseUrl && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Receipt Proof Attached
                          </span>
                        )}
                        {attrs?.proofScreenshotsUrl && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            In-Game Proof Screenshots
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {listing.attributes && Object.keys(listing.attributes).length > 0 && listing.attributes.type !== "generic" && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3 text-gold">Specifications</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {Object.entries(listing.attributes).filter(([k]) => k !== 'type' && k !== 'game').map(([key, value]) => (
                    <div key={key} className="flex flex-col p-3 rounded-xl border border-border bg-surface/30">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium mt-0.5 text-foreground truncate" title={String(value)}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 font-display text-4xl font-bold text-gold">
              {formatPrice(price)}
            </div>

            <ul className="mt-6 space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-gold" /> {f}
                </li>
              ))}
            </ul>

            {/* Trust Indicators */}
            <div className="mt-6 p-4 rounded-2xl border border-border/60 bg-surface/20">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">Buyer Protection</div>
              <TrustBadge variant="vertical" showSupport={false} />
            </div>

            {isBoosting && matchedRanks.length > 0 && (
              <div className="mt-6 p-5 rounded-2xl border border-gold/20 bg-surface/20 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Rank Boosting Calculator</h3>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Instant Estimate</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">
                      Current Rank
                    </label>
                    <select
                      value={currentRank}
                      onChange={(e) => {
                        const newRank = e.target.value;
                        setCurrentRank(newRank);
                        const currIdx = matchedRanks.indexOf(newRank);
                        const desIdx = matchedRanks.indexOf(desiredRank);
                        if (desIdx <= currIdx && currIdx < matchedRanks.length - 1) {
                          setDesiredRank(matchedRanks[currIdx + 1]);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground cursor-pointer"
                    >
                      {matchedRanks.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">
                      Desired Rank
                    </label>
                    <select
                      value={desiredRank}
                      onChange={(e) => {
                        const newRank = e.target.value;
                        setDesiredRank(newRank);
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground cursor-pointer"
                    >
                      {matchedRanks.map((r, idx) => (
                        <option 
                          key={r} 
                          value={r}
                          disabled={idx <= matchedRanks.indexOf(currentRank)}
                        >
                          {r} {idx <= matchedRanks.indexOf(currentRank) ? "(Invalid)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gap info box */}
                {matchedRanks.indexOf(desiredRank) > matchedRanks.indexOf(currentRank) ? (
                  <div className="p-3 rounded-xl bg-gold/5 border border-gold/20 flex flex-col gap-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-gold tracking-wide">Estimate Details</span>
                    <p className="text-muted-foreground">
                      Boosting from <strong className="text-foreground">{currentRank}</strong> to <strong className="text-foreground">{desiredRank}</strong>.
                    </p>
                    <p className="text-muted-foreground">
                      Rank difference: <strong className="text-foreground">{matchedRanks.indexOf(desiredRank) - matchedRanks.indexOf(currentRank)} steps</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive-foreground">
                    Please select a desired rank higher than your current rank.
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 flex gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 h-12 rounded-lg border border-gold/40 text-gold text-sm font-semibold hover:bg-gold/10 inline-flex items-center justify-center gap-2"
              >
                <ShoppingCart className="size-4" /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!ready || ordering}
                className="flex-1 h-12 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {(!ready || ordering) && <Loader2 className="size-4 animate-spin" />}
                {!ready ? "Loading auth..." : ordering ? "Creating order..." : "Buy Now"}
              </button>
              <button
                className={`size-12 rounded-lg border border-border hover:border-gold/40 flex items-center justify-center transition-colors ${isWishlisted ? 'text-gold border-gold/40 bg-gold/5' : 'text-muted-foreground hover:text-gold'}`}
                aria-label="Save"
                onClick={handleToggleWishlist}
              >
                <Heart className={`size-4 ${isWishlisted ? 'fill-gold' : ''}`} />
              </button>
              <button
                className="size-12 rounded-lg border border-border hover:border-gold/40 flex items-center justify-center text-muted-foreground hover:text-gold"
                aria-label="Share"
                onClick={handleShare}
              >
                <Share2 className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-gold" />
              Payment verification and order history are connected to this listing.
            </div>

            <div className="mt-4 border-t border-border/40 pt-4 flex justify-between items-center flex-wrap gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                <span>Concerned about this product?</span>
              </div>
              <button
                onClick={() => {
                  if (!isAuthenticated || !user) {
                    toast.error("Please sign in to report a listing.");
                    navigate({ to: "/login", search: { redirect: `/product/${id}` } });
                    return;
                  }
                  setReportTargetType("listing");
                  setReportOpen(true);
                }}
                className="text-gold hover:underline font-semibold cursor-pointer"
              >
                Report Listing
              </button>
            </div>
          </div>
        </div>

        <div className="mt-14 border-b border-border flex gap-6 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-sm font-medium whitespace-nowrap ${activeTab === i ? "text-gold border-b-2 border-gold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="py-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
          {activeTab === 0 && (listing.description ?? "No description has been added yet.")}
          {activeTab === 1 && (
            <div className="flex items-center gap-2">
              <Star className="size-4 fill-gold text-gold" /> {rating ? rating.toFixed(1) : "New"}{" "}
              average - {reviews} reviews
            </div>
          )}
          {activeTab === 2 && (
            <p>Contact support before buying if you have questions about this listing.</p>
          )}
          {activeTab === 3 && <p>Post-purchase support is available from your order page.</p>}
        </div>
      </main>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setReportOpen(false)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-lg text-white mb-2">Report {reportTargetType === "listing" ? "Listing" : "Seller"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Please specify the reason for reporting this {reportTargetType === "listing" ? `listing "${title}"` : `seller "${seller}"`}.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmittingReport(true);
              try {
                const supabase = getSupabase();
                if (!supabase || !user) throw new Error("Authentication required");

                let screenshotUrl = "";
                if (reportScreenshotFile) {
                  const fileExt = reportScreenshotFile.name.split(".").pop();
                  const filePath = `${user.id}/${Date.now()}.${fileExt}`;
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("report-screenshots")
                    .upload(filePath, reportScreenshotFile);
                  if (uploadError) throw uploadError;
                  const { data: publicUrlData } = supabase.storage
                    .from("report-screenshots")
                    .getPublicUrl(filePath);
                  screenshotUrl = publicUrlData.publicUrl;
                }

                const res = await submitReport({
                  data: {
                    targetType: reportTargetType,
                    targetId: reportTargetType === "listing" ? listing.id : (listing.seller_id || ""),
                    reason: reportReason,
                    note: reportDescription,
                    screenshotUrl: screenshotUrl || undefined
                  }
                });

                if (res.error) throw new Error(res.error);
                toast.success(`${reportTargetType === "listing" ? "Listing" : "Seller"} reported successfully. Admins will review this shortly.`);
                setReportOpen(false);
                setReportDescription("");
                setReportScreenshotFile(null);
              } catch (err: any) {
                toast.error("Failed to submit report: " + err.message);
              } finally {
                setSubmittingReport(false);
              }
            }} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground"
                >
                  <option value="Fraud / Scam">Fraud / Scam</option>
                  <option value="Fake Listing">Fake Listing</option>
                  <option value="Wrong Product Description">Wrong Product Description</option>
                  <option value="Seller Not Responding">Seller Not Responding</option>
                  <option value="Delivery Issue">Delivery Issue</option>
                  <option value="Payment Issue">Payment Issue</option>
                  <option value="Suspicious Activity">Suspicious Activity</option>
                  <option value="Copyright Violation">Copyright Violation</option>
                  <option value="Abuse / Harassment">Abuse / Harassment</option>
                  <option value="Spam">Spam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description / Details</label>
                <textarea
                  required
                  placeholder="Provide supporting details..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full h-24 p-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Screenshot Proof (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReportScreenshotFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold/10 file:text-gold file:cursor-pointer hover:file:bg-gold/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-surface text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="h-9 px-4 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/90 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingReport && <Loader2 size={12} className="animate-spin" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
