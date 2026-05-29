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
  const { isAuthenticated, user } = useAuth();
  const [listing, setListing] = useState<DbListing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(wishlistStore.isWishlisted(id));

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

      const { data, error: err } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

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
          if (active) setSellerProfile(prof);
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
    console.log("[BuyNow] Button click triggered", {
      isAuthenticated,
      userId: user?.id,
      listingId: id,
    });

    if (!isAuthenticated || !user) {
      toast.error("Please sign in to purchase.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } });
      return;
    }
    if (!listing?.seller_id) {
      toast.error("This listing is missing seller information.");
      return;
    }
    if (listing.seller_id === user.id) {
      toast.error("You cannot buy your own listing.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Marketplace backend is not configured.");
      return;
    }

    console.log("[BuyNow] Starting order creation:", {
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      listing_title: listing.title,
    });

    setOrdering(true);
    try {
      const price = listingPrice(listing);

      // Create order using correct live DB columns and enum values
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
        console.error("[BuyNow] Supabase order insertion error object:", orderError);
        throw orderError;
      }

      console.log("[BuyNow] Created order successfully. ID:", order.id);

      // Insert transaction charge tracking
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
      console.log("[BuyNow] Redirecting buyer to checkout payment page:", {
        path: redirectPath,
        search: searchParams,
      });

      navigate({
        to: redirectPath,
        search: searchParams,
      });
    } catch (e: any) {
      console.error("[BuyNow] Unhandled checkout exception:", e);
      toast.error("Unable to start checkout. Please try again.");
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
  const categorySlug = listing.categories?.slug ?? "digital-products";
  const categoryName = listing.categories?.name ?? "Digital Products";

  return (
    <div className="min-h-screen flex flex-col">
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

            <div className="mt-4 flex items-center gap-3">
              <div className="size-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-sm font-bold text-gold">
                {seller[0]}
              </div>
              <div>
                <div className="text-sm font-medium">{seller}</div>
                <div className="text-[11px] text-gold inline-flex items-center gap-1">
                  <BadgeCheck className="size-3" /> Verified Seller
                </div>
              </div>
              <div className="ml-auto inline-flex items-center gap-1 text-sm">
                <Star className="size-4 fill-gold text-gold" />
                <span className="font-semibold">{rating ? rating.toFixed(1) : "New"}</span>
                <span className="text-muted-foreground">({reviews})</span>
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
                disabled={ordering}
                className="flex-1 h-12 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {ordering && <Loader2 className="size-4 animate-spin" />}
                {ordering ? "Creating order..." : "Buy Now"}
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
      <Footer />
    </div>
  );
}
