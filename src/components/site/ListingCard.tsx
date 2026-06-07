import { Link } from "@tanstack/react-router";
import { Star, Heart, BadgeCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
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

const coverLabels: Record<string, string> = {
  wordpress: "WORDPRESS\nTHEME",
  shopify: "SHOPIFY\nSTORE",
  seo: "SEO\nOPTIMIZATION",
  logo: "LOGO\nDESIGN",
  app: "APP\nDEVELOPMENT",
  icons: "ICONS\nPACK",
  instagram: "INSTAGRAM\nTEMPLATES",
  ai: "AI PROMPT\nPACK",
};

export function ListingCard({ l }: { l: ListingLike }) {
  const price = listingPrice(l);
  const rating = listingRating(l);
  const reviews = listingReviewCount(l);
  const image = listingImage(l);
  const seller = listingSellerName(l);
  const coverKey = l.cover ?? "app";
  const gradient = coverGradients[coverKey] ?? "from-slate-800 to-slate-950";

  const [isWishlisted, setIsWishlisted] = useState(wishlistStore.isWishlisted(l.id));

  useEffect(() => {
    const handleWishlistUpdate = () => {
      setIsWishlisted(wishlistStore.isWishlisted(l.id));
    };
    window.addEventListener("wishlist-updated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlist-updated", handleWishlistUpdate);
  }, [l.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = wishlistStore.toggle(l.id);
    if (res === "added") {
      toast.success("Added to wishlist");
    } else {
      toast.success("Removed from wishlist");
    }
  };

  const subscriptionTier = l.profiles?.subscription_tier;
  const isVerified = l.profiles?.is_verified;

  let tierBadge = null;
  if (subscriptionTier === "pro") {
    tierBadge = <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 ml-1.5">PRO</span>;
  } else if (subscriptionTier === "elite") {
    tierBadge = <span className="text-[9px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20 ml-1.5">ELITE</span>;
  } else if (subscriptionTier === "enterprise") {
    tierBadge = <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 ml-1.5">ENTERPRISE</span>;
  } else if (isVerified) {
    tierBadge = <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 ml-1.5">VERIFIED</span>;
  }

  return (
    <Link
      to="/product/$id"
      params={{ id: l.id }}
      className={`group relative rounded-2xl border bg-surface/60 overflow-hidden hover:-translate-y-0.5 transition-all ${
        l.has_glow 
          ? "border-gold/60 ring-2 ring-gold/40 shadow-[0_0_20px_rgba(212,180,106,0.35)]" 
          : "border-border hover:border-gold/40"
      }`}
    >
      <div className={`aspect-[5/3] relative bg-gradient-to-br ${gradient}`}>
        {image ? (
          <img src={image} alt={l.title} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-display font-bold text-white text-xl md:text-2xl tracking-wider text-center whitespace-pre-line drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
              {coverLabels[coverKey] ?? l.title}
            </div>
          </div>
        )}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-3 right-3 size-8 rounded-full border border-border flex items-center justify-center transition-all ${isWishlisted ? 'bg-gold text-primary-foreground border-gold' : 'bg-background/70 backdrop-blur text-muted-foreground hover:text-gold'}`}
          aria-label="Save"
        >
          <Heart className={`size-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
        {l.is_urgent && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-md bg-rose-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-md animate-bounce z-10">
            Urgent
          </span>
        )}
        {l.badge && (
          <span className="absolute bottom-3 left-3 inline-flex items-center rounded-md bg-gold text-primary-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {l.badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium leading-snug line-clamp-2 min-h-[2.6em] group-hover:text-gold transition-colors">
          {l.title}
        </h3>
        {l.attributes && Object.keys(l.attributes).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {l.attributes.rank && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">{l.attributes.rank}</span>}
            {l.attributes.region && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">{l.attributes.region}</span>}
            {l.attributes.level && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Lvl {l.attributes.level}</span>}
            {l.attributes.platform && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface text-muted-foreground border border-border">{l.attributes.platform}</span>}
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground flex items-center flex-wrap">
          by {seller} {tierBadge}
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gold">
          <BadgeCheck className="size-3" /> {subscriptionTier ? `${subscriptionTier.toUpperCase()} Seller` : isVerified ? "Verified Seller" : "Verified Seller"}
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <Star className="size-3.5 fill-gold text-gold" />
          <span className="font-medium text-foreground">{rating ? rating.toFixed(1) : "New"}</span>
          <span className="text-muted-foreground">({reviews})</span>
        </div>
        <div className="mt-2 font-display text-xl font-bold text-foreground">
          {formatPrice(price)}
        </div>
      </div>
    </Link>
  );
}
