/**
 * Marketplace service layer. Thin wrappers around Supabase queries
 * so the rest of the app never talks to the client directly.
 * Each function returns `{ data, error }` like Supabase does.
 *
 * When VITE_SUPABASE_* is missing, every call returns
 * `{ data: null, error: "Backend not configured" }` so dashboards
 * can render their empty states gracefully.
 */
import { getSupabase } from "@/lib/supabase-client";
import type {
  Listing,
  Order,
  Wallet,
  Payout,
  Review,
  Dispute,
  Notification,
  SupportTicket,
  Coupon,
  Boost,
} from "./types";

type Result<T> = { data: T | null; error: string | null };

function notConfigured<T>(): Result<T> {
  return { data: null, error: "Backend not configured. Add VITE_SUPABASE_* in your .env." };
}

async function run<T>(
  fn: () => Promise<{ data: T | null; error: { message: string } | null }>,
): Promise<Result<T>> {
  const sb = getSupabase();
  if (!sb) return notConfigured<T>();
  const { data, error } = await fn();
  return { data, error: error?.message ?? null };
}

// ---------- Listings ----------
export const listingsService = {
  listForSeller: (sellerId: string) =>
    run<Listing[]>(async () => {
      const sb = getSupabase()!;
      return sb
        .from("listings")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
    }),
  listPublic: (opts: { categorySlug?: string; q?: string; limit?: number } = {}) =>
    run<Listing[]>(async () => {
      const sb = getSupabase()!;
      let q = sb.from("listings").select("*").eq("status", "active");
      if (opts.q) q = q.ilike("title", `%${opts.q}%`);
      return q.limit(opts.limit ?? 40);
    }),
  getById: (id: string) =>
    run<Listing>(async () =>
      getSupabase()!.from("listings").select("*").eq("id", id).maybeSingle(),
    ),
};

// ---------- Orders ----------
export const ordersService = {
  forBuyer: (uid: string) =>
    run<Order[]>(async () =>
      getSupabase()!
        .from("orders")
        .select("*")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false }),
    ),
  forSeller: (uid: string) =>
    run<Order[]>(async () =>
      getSupabase()!
        .from("orders")
        .select("*")
        .eq("seller_id", uid)
        .order("created_at", { ascending: false }),
    ),
};

// ---------- Wallet & Payouts ----------
export const walletService = {
  get: (uid: string) =>
    run<Wallet>(async () =>
      getSupabase()!.from("wallets").select("*").eq("user_id", uid).maybeSingle(),
    ),
  payoutHistory: (uid: string) =>
    run<Payout[]>(async () =>
      getSupabase()!
        .from("payouts")
        .select("*")
        .eq("user_id", uid)
        .order("requested_at", { ascending: false }),
    ),
  requestPayout: (uid: string, amount_cents: number, method: string) =>
    run<Payout>(async () =>
      getSupabase()!
        .from("payouts")
        .insert({ user_id: uid, amount_cents, method, status: "requested" })
        .select()
        .single(),
    ),
};

// ---------- Reviews ----------
export const reviewsService = {
  forSeller: (uid: string) =>
    run<Review[]>(async () =>
      getSupabase()!
        .from("reviews")
        .select("*")
        .eq("seller_id", uid)
        .order("created_at", { ascending: false }),
    ),
};

// ---------- Disputes ----------
export const disputesService = {
  forUser: (uid: string) =>
    run<Dispute[]>(async () =>
      getSupabase()!
        .from("disputes")
        .select("*")
        .or(`opened_by.eq.${uid}`)
        .order("created_at", { ascending: false }),
    ),
};

// ---------- Notifications ----------
export const notificationsService = {
  forUser: (uid: string) =>
    run<Notification[]>(async () =>
      getSupabase()!
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ),
};

// ---------- Tickets ----------
export const ticketsService = {
  forUser: (uid: string) =>
    run<SupportTicket[]>(async () =>
      getSupabase()!
        .from("support_tickets")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ),
};

// ---------- Coupons ----------
export const couponsService = {
  forSeller: (uid: string) =>
    run<Coupon[]>(async () => getSupabase()!.from("coupons").select("*").eq("seller_id", uid)),
};

// ---------- Boosts ----------
export const boostsService = {
  forUser: (uid: string) =>
    run<Boost[]>(async () => getSupabase()!.from("boosts").select("*").eq("user_id", uid)),
};
