/**
 * Marketplace domain types. Mirrors the Postgres schema in
 * docs/SCHEMA.sql. Keep in sync when schema evolves.
 */

export type Uuid = string;
export type Timestamp = string;

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "rejected"
  | "archived";
export type OrderStatus =
  | "pending"
  | "paid"
  | "delivering"
  | "delivered"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";
export type DeliveryType = "instant" | "manual";
export type DisputeStatus =
  | "open"
  | "investigating"
  | "resolved_buyer"
  | "resolved_seller"
  | "closed";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type PayoutStatus = "requested" | "approved" | "processing" | "paid" | "rejected";

export interface Category {
  id: Uuid;
  slug: string;
  title: string;
  parent_id: Uuid | null;
  icon: string | null;
  sort: number;
}

export interface Listing {
  id: Uuid;
  seller_id: Uuid;
  category_id: Uuid;
  title: string;
  slug: string;
  description: string;
  price_cents: number;
  currency: string;
  delivery_type: DeliveryType;
  delivery_time_hours: number;
  stock: number | null;
  status: ListingStatus;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  views: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Order {
  id: Uuid;
  buyer_id: Uuid;
  seller_id: Uuid;
  listing_id: Uuid;
  qty: number;
  amount_cents: number;
  fee_cents: number;
  currency: string;
  status: OrderStatus;
  protection_until: Timestamp | null;
  created_at: Timestamp;
  delivered_at: Timestamp | null;
  completed_at: Timestamp | null;
}

export interface Transaction {
  id: Uuid;
  user_id: Uuid;
  order_id: Uuid | null;
  type: "charge" | "credit" | "payout" | "refund" | "fee";
  amount_cents: number;
  currency: string;
  ref: string | null;
  created_at: Timestamp;
}

export interface Wallet {
  user_id: Uuid;
  balance_cents: number;
  pending_cents: number;
  currency: string;
  updated_at: Timestamp;
}

export interface Payout {
  id: Uuid;
  user_id: Uuid;
  amount_cents: number;
  currency: string;
  method: string;
  status: PayoutStatus;
  requested_at: Timestamp;
  processed_at: Timestamp | null;
  note: string | null;
}

export interface Review {
  id: Uuid;
  order_id: Uuid;
  buyer_id: Uuid;
  seller_id: Uuid;
  listing_id: Uuid;
  rating: number;
  comment: string | null;
  created_at: Timestamp;
}

export interface Dispute {
  id: Uuid;
  order_id: Uuid;
  opened_by: Uuid;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  created_at: Timestamp;
  resolved_at: Timestamp | null;
}

export interface Message {
  id: Uuid;
  thread_id: Uuid;
  sender_id: Uuid;
  body: string;
  read_at: Timestamp | null;
  created_at: Timestamp;
}

export interface Notification {
  id: Uuid;
  user_id: Uuid;
  kind: string;
  title: string;
  body: string | null;
  read_at: Timestamp | null;
  created_at: Timestamp;
}

export interface Subscription {
  id: Uuid;
  user_id: Uuid;
  plan: "basic" | "pro" | "elite";
  status: "active" | "cancelled" | "past_due";
  current_period_end: Timestamp;
  provider_ref: string | null;
}

export interface Boost {
  id: Uuid;
  listing_id: Uuid;
  user_id: Uuid;
  tier: "feature" | "highlight" | "homepage";
  starts_at: Timestamp;
  ends_at: Timestamp;
  cost_cents: number;
}

export interface Coupon {
  id: Uuid;
  seller_id: Uuid | null;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  expires_at: Timestamp | null;
  max_uses: number | null;
  uses: number;
}

export interface SupportTicket {
  id: Uuid;
  user_id: Uuid;
  subject: string;
  status: TicketStatus;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: Timestamp;
  updated_at: Timestamp;
}
