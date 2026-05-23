import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ChevronRight, Star, BadgeCheck, Check, ShieldCheck, ShoppingCart,
  Heart, Share2, Loader2, AlertCircle,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { featuredListings } from "@/lib/marketplace-data";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => {
    const item = featuredListings.find((l) => l.id === params.id);
    return {
      meta: [
        { title: `${item?.title ?? "Listing"} — HUXZAIN` },
        { name: "description", content: `Buy ${item?.title ?? "this listing"} safely on HUXZAIN.` },
      ],
    };
  },
  component: ProductPage,
});

type DbListing = {
  id: string;
  title: string;
  description?: string;
  price: number;
  cover_image_url?: string;
  delivery_time?: string;
  category_id?: string;
  seller_id?: string;
  status?: string;
};

const FEATURES = [
  "Responsive & Modern Design", "Easy to Customize",
  "SEO Optimized", "Regular Updates", "24/7 Support",
];
const TABS = ["Description", "Reviews", "FAQs", "Support"];
const coverGradients: Record<string, string> = {
  wordpress: "from-indigo-900 via-purple-900 to-indigo-950",
  shopify: "from-emerald-900 via-teal-900 to-slate-900",
  seo: "from-sky-900 via-blue-900 to-slate-950",
  logo: "from-slate-800 via-zinc-900 to-black",
  app: "from-violet-900 via-fuchsia-900 to-slate-950",
  icons: "from-amber-900/70 via-orange-900/60 to-slate-950",
  instagram: "from-pink-800 via-rose-900 to-purple-950",
  ai: "from-emerald-800 via-teal-900 to-slate-950",
};

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const staticItem = featuredListings.find((l) => l.id === id);
  const [dbListing, setDbListing] = useState<DbListing | null>(null);
  const [loading, setLoading] = useState(!staticItem);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (staticItem) return;
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError("Listing not found.");
        else setDbListing(data as DbListing);
        setLoading(false);
      });
  }, [id, staticItem]);

  async function handleBuyNow() {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } });
      return;
    }
    setOrdering(true);

    // Generate a client-side checkout session reference.
    // The order is recorded when payment proof is submitted.
    const checkoutRef = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    toast.success("Redirecting to payment verification…");

    // Small delay so the toast is visible before navigation
    setTimeout(() => {
      navigate({
        to: "/checkout/verify-payment" as any,
        search: { orderId: checkoutRef, listingId: id, price: String(price) },
      });
      setOrdering(false);
    }, 400);
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

  if (error || (!staticItem && !dbListing)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container-page py-16 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">{error ?? "Listing not found."}</p>
          <Link to="/" className="h-10 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center">
            Browse Listings
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const title = staticItem?.title ?? dbListing?.title ?? "Listing";
  const price = staticItem?.price ?? dbListing?.price ?? 0;
  const seller = staticItem?.seller ?? "Seller";
  const level = staticItem?.level ?? "Verified Seller";
  const rating = staticItem?.rating ?? 5.0;
  const reviews = staticItem?.reviews ?? 0;
  const cover = staticItem?.cover ?? "app";
  const gradientClass = coverGradients[cover] ?? "from-slate-800 to-slate-950";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link to="/category/$slug" params={{ slug: "digital-products" }} className="hover:text-foreground">
            Digital Products
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          {/* Gallery */}
          <div>
            <div className={`aspect-[16/10] rounded-2xl border border-border bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              <div className="font-display text-3xl font-bold text-white tracking-wider text-center whitespace-pre-line drop-shadow-lg">
                {title.split(" ").slice(0, 3).join("\n")}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <button key={i} className={`aspect-square rounded-lg border ${i === 0 ? "border-gold/50" : "border-border"} bg-surface/60 hover:border-gold/40`}>
                  <div className={`size-full rounded-lg bg-gradient-to-br ${gradientClass} opacity-60`} />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>

            <div className="mt-4 flex items-center gap-3">
              <div className="size-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-sm font-bold text-gold">
                {seller[0]}
              </div>
              <div>
                <div className="text-sm font-medium">{seller}</div>
                <div className="text-[11px] text-gold inline-flex items-center gap-1">
                  <BadgeCheck className="size-3" /> {level}
                </div>
              </div>
              <div className="ml-auto inline-flex items-center gap-1 text-sm">
                <Star className="size-4 fill-gold text-gold" />
                <span className="font-semibold">{rating}</span>
                <span className="text-muted-foreground">({reviews})</span>
              </div>
            </div>

            <div className="mt-6 font-display text-4xl font-bold text-gold">${price.toFixed(2)}</div>

            <ul className="mt-6 space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-gold" /> {f}
                </li>
              ))}
            </ul>

            {/* Purchase actions */}
            <div className="mt-7 flex gap-3">
              <button
                className="flex-1 h-12 rounded-lg border border-gold/40 text-gold text-sm font-semibold hover:bg-gold/10 transition-colors inline-flex items-center justify-center gap-2"
                onClick={() => toast.info("Cart coming soon!")}
              >
                <ShoppingCart className="size-4" /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={ordering}
                className="flex-1 h-12 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {ordering && <Loader2 className="size-4 animate-spin" />}
                {ordering ? "Processing…" : "Buy Now"}
              </button>
              <button
                className="size-12 rounded-lg border border-border hover:border-gold/40 flex items-center justify-center text-muted-foreground hover:text-gold transition-colors"
                aria-label="Save"
                onClick={() => toast.info("Saved!")}
              >
                <Heart className="size-4" />
              </button>
              <button
                className="size-12 rounded-lg border border-border hover:border-gold/40 flex items-center justify-center text-muted-foreground hover:text-gold transition-colors"
                aria-label="Share"
                onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!"); }}
              >
                <Share2 className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-gold" />
              30-Day Money Back Guarantee · Secured by HUXZAIN Escrow
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-14 border-b border-border flex gap-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`pb-3 text-sm font-medium transition-colors ${activeTab === i ? "text-gold border-b-2 border-gold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="py-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
          {activeTab === 0 && (dbListing?.description ?? "A premium digital product built to the highest standards. Performance-optimized, fully responsive, and ready to deliver value to your customers.")}
          {activeTab === 1 && <div className="flex items-center gap-2"><Star className="size-4 fill-gold text-gold" /> {rating} average · {reviews} reviews</div>}
          {activeTab === 2 && <p>Contact the seller directly before purchasing if you have questions.</p>}
          {activeTab === 3 && <p>Post-purchase support is available via your order page in the dashboard.</p>}
        </div>

        {/* Trust */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { t: "Automatic Invoices", d: "Generated on order completion" },
            { t: "Escrow Protection", d: "Funds held until you approve" },
            { t: "24/7 Support", d: "We're here to help anytime" },
            { t: "Buyer Guarantee", d: "Full protection on every order" },
          ].map((p) => (
            <div key={p.t} className="rounded-xl border border-border bg-surface/40 p-5 text-center">
              <div className="size-10 rounded-lg mx-auto mb-3 border border-gold/25 bg-gold/10 flex items-center justify-center">
                <ShieldCheck className="size-5 text-gold" />
              </div>
              <div className="text-sm font-semibold">{p.t}</div>
              <div className="text-xs text-muted-foreground mt-1">{p.d}</div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
