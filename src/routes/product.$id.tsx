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

export const Route = createFileRoute("/product/$id")({
  head: () => ({ meta: [{ title: "Listing - HUXZAIN" }] }),
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
  const [reportReason, setReportReason] = useState("Fraud / Scam");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

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
      else if (!data) setError("Listing not found.");
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
      
      const price = listingPrice(listing);

      // Create order using correct live DB columns and enum values
      console.log('STEP 2.1: Inserting order into Supabase...');
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_id: listing.id,
          listing_title: listing.title,
          amount_inr: price,
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
        const amountCents = Math.round(price * 100);
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
          body: `${user.email ?? "A buyer"} started checkout for ${listing.title}`,
        });
      } catch (notifEx) {
        console.warn("[BuyNow] Notifications insert non-blocking exception:", notifEx);
      }

      const redirectPath = "/checkout/payment";
      const searchParams = { orderId: order.id, listingId: listing.id, price: String(price) };
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
      toast.error(`Unable to start checkout: ${err?.message || "Unknown error"}`);
    } finally {
      setOrdering(false);
    }
  }

  async function handleAddToCart() {
    if (!listing) return;
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
  const price = listingPrice(listing);
  const seller = sellerProfile?.display_name ?? sellerProfile?.username ?? "Verified Seller";
  const rating = listingRating(listing);
  const reviews = listingReviewCount(listing);
  const image = listingImage(listing);
  const isThemeEnabled = sellerProfile?.customizations?.theme_enabled !== false;
  const themeColor = isThemeEnabled ? sellerProfile?.customizations?.theme_color || 'midnight' : 'midnight';
  const accentColor = isThemeEnabled ? sellerProfile?.customizations?.accent_color || '#d4b46a' : '#d4b46a';
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
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Verified Digital Merchant
                  </div>
                </div>
              </div>
            </div>

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
            <h3 className="font-display font-bold text-lg text-white mb-2">Report Listing</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Please specify the reason for reporting <span className="text-gold font-semibold">"{title}"</span>.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmittingReport(true);
              try {
                const supabase = getSupabase();
                if (!supabase || !user) throw new Error("Authentication required");

                const reportPayload = {
                  listing_id: listing.id,
                  listing_title: listing.title,
                  seller_id: listing.seller_id,
                  reason: reportReason,
                  description: reportDescription,
                  reporter_id: user.id,
                  reporter_email: user.email,
                  created_at: new Date().toISOString()
                };

                const { error } = await supabase
                  .from("support_tickets")
                  .insert({
                    user_id: user.id,
                    title: `REPORT_JSON:${JSON.stringify(reportPayload)}`,
                    category: "report",
                    status: "open"
                  });

                if (error) throw error;
                toast.success("Listing reported successfully. Admins will review this shortly.");
                setReportOpen(false);
                setReportDescription("");
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
                  <option value="Misleading Description">Misleading Description</option>
                  <option value="Inappropriate Content">Inappropriate Content</option>
                  <option value="Intellectual Property Violation">Intellectual Property Violation</option>
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
