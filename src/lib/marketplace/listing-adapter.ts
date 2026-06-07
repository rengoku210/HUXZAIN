export type ListingLike = {
  id: string;
  title: string;
  seller?: string | null;
  seller_id?: string | null;
  profiles?: { 
    display_name?: string | null; 
    username?: string | null;
    subscription_tier?: string | null;
    is_verified?: boolean | null;
  } | null;
  level?: string | null;
  rating?: number | null;
  rating_avg?: number | null;
  reviews?: number | null;
  rating_count?: number | null;
  price?: number | string | null;
  price_cents?: number | null;
  price_inr?: number | null;
  currency?: string | null;
  category?: string | null;
  badge?: string | null;
  cover?: string | null;
  cover_image_url?: string | null;
  cover_url?: string | null;
  delivery?: string | null;
  delivery_time?: string | null;
  delivery_details?: string | null;
  description?: string | null;
  status?: string | null;
  attributes?: Record<string, any> | null;
  is_featured?: boolean;
  is_homepage_featured?: boolean;
  is_urgent?: boolean;
  has_glow?: boolean;
  boost_score?: number;
};

export function listingPrice(listing: ListingLike): number {
  if (listing.price_inr !== undefined && listing.price_inr !== null) {
    return Number(listing.price_inr);
  }
  if (listing.price !== undefined && listing.price !== null && listing.price !== "") {
    return Number(listing.price);
  }
  if (typeof listing.price_cents === "number") return listing.price_cents / 100;
  return 0;
}

export function formatPrice(value?: number | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function listingImage(listing: ListingLike): string | null {
  return listing.cover_image_url ?? listing.cover_url ?? null;
}

export function listingSellerName(listing: ListingLike): string {
  return (
    listing.seller ??
    listing.profiles?.display_name ??
    listing.profiles?.username ??
    "Verified Seller"
  );
}

export function listingRating(listing: ListingLike): number {
  return Number(listing.rating ?? listing.rating_avg ?? 0) || 0;
}

export function listingReviewCount(listing: ListingLike): number {
  return Number(listing.reviews ?? listing.rating_count ?? 0) || 0;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
