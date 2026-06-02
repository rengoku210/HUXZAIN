import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

const CATEGORY_HOLD_DAYS: Record<string, number> = {
  "gaming": 14,
  "electronics": 7,
  "services": 5,
  "default": 7,
};

export type EscrowStatus = "held" | "released" | "cancelled";

export interface EscrowHold {
  id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
  hold_until: string;
  status: EscrowStatus;
  created_at: string;
  updated_at: string;
}

function computeHoldUntil(category: string): string {
  const days = CATEGORY_HOLD_DAYS[category] ?? CATEGORY_HOLD_DAYS["default"];
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function placeHold(params: {
  orderId: string;
  amountCents: number;
  category: string;
  currency?: string;
}) {
  const holdUntil = computeHoldUntil(params.category);
  const { data, error } = await supabase.from("escrow_holds").insert({
    order_id: params.orderId,
    amount_cents: params.amountCents,
    currency: params.currency || 'USD',
    hold_until: holdUntil,
    status: "held",
  }).select().single();

  if (error) throw error;
  return data as EscrowHold;
}

export async function releasePayout(orderId: string) {
  const { data, error } = await supabase
    .from("escrow_holds")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "held")
    .select()
    .single();

  if (error) throw error;
  return data as EscrowHold;
}

export async function cancelHold(orderId: string) {
  const { data, error } = await supabase
    .from("escrow_holds")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "held")
    .select()
    .single();

  if (error) throw error;
  return data as EscrowHold;
}

export async function getEscrowByOrder(orderId: string) {
  const { data, error } = await supabase
    .from("escrow_holds")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as EscrowHold | null;
}
