import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

/**
 * Compute and store trust score based on user activity.
 * Score is between 1-100.
 */
export async function computeTrustScore(userId: string) {
  // 1. Fetch completed orders count
  const { data: orders, error: orderErr } = await supabase
    .from("orders")
    .select("id")
    .eq("buyer_id", userId)
    .eq("status", "completed");
  
  if (orderErr) throw orderErr;

  // 2. Fetch reviews and average rating
  const { data: reviews, error: revErr } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", userId);
  
  if (revErr) throw revErr;

  const completedOrders = orders?.length ?? 0;
  const reviewCount = reviews?.length ?? 0;
  const avgRating = reviewCount
    ? (reviews as any[]).reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
    : 0;

  // Formula: 
  // - 2 points per completed order (up to 60 points)
  // - Average rating * 8 (up to 40 points)
  const orderPoints = Math.min(60, completedOrders * 2);
  const ratingPoints = Math.min(40, avgRating * 8);
  
  const score = Math.max(1, Math.round(orderPoints + ratingPoints));

  // Update profile with new trust score
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ 
        // We assume trust_score exists in profiles or we use user_metadata
        // For now, we'll try to update profiles. If it fails, we might need a migration.
        trust_score: score 
    } as any)
    .eq("id", userId);

  if (updErr) {
    console.warn("[TrustService] Could not update trust_score in profiles. Ensure column exists.", updErr.message);
  }

  return score;
}

/** Assign a trust badge to a user */
export async function assignBadge(userId: string, badge: string) {
  const { error } = await supabase
    .from("profile_badges")
    .insert({ user_id: userId, badge });
  
  if (error) throw error;
  return true;
}
