import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

export interface Review {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

/** Submit a review */
export async function submitReview(params: {
  orderId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  rating: number;
  comment?: string;
}) {
  const { data, error } = await supabase.from("reviews").insert({
    order_id: params.orderId,
    buyer_id: params.buyerId,
    seller_id: params.sellerId,
    listing_id: params.listingId,
    rating: params.rating,
    comment: params.comment,
  }).select().single();

  if (error) throw error;
  return data as Review;
}

/** Fetch reviews for a seller */
export async function fetchSellerReviews(sellerId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, buyer:profiles!buyer_id(username, avatar_url), listing:listings(title)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

/** Fetch reviews for a listing */
export async function fetchListingReviews(listingId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, buyer:profiles!buyer_id(username, avatar_url)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}
