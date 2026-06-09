"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";

/**
 * Fetch paginated admin orders with buyer/seller/listing info.
 */
export const getAdminOrders = createServerFn({ method: "POST" })
  .inputValidator((d: {
    status_filter?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { status_filter, search, page = 1, per_page = 20 } = data;
    const offset = (page - 1) * per_page;

    let query = supabase
      .from("orders")
      .select(`
        *,
        buyer:buyer_id (
          display_name,
          email
        ),
        seller:seller_id (
          display_name,
          email
        ),
        listing:listing_id (
          title
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (status_filter) {
      query = query.eq("status", status_filter);
    }

    if (search) {
      query = query.ilike("id", `%${search}%`);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error("[Orders] Fetch admin orders error:", error.message);
      throw new Error("Failed to fetch orders.");
    }

    return {
      orders: orders || [],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  });

/**
 * Get detailed order information including buyer/seller stats, payment proofs, timeline, and dispute.
 */
export const getAdminOrderDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    // 1. Fetch the order with relations
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        *,
        buyer:buyer_id (
          id,
          display_name,
          email,
          username,
          is_verified,
          created_at
        ),
        seller:seller_id (
          id,
          display_name,
          email,
          username,
          is_verified,
          seller_tier,
          is_seller
        ),
        listing:listing_id (
          title,
          category_id,
          price
        )
      `)
      .eq("id", data.order_id)
      .single();

    if (orderErr || !order) {
      console.error("[Orders] Fetch order details error:", orderErr?.message);
      throw new Error("Order not found.");
    }

    // 2. Get buyer's total orders count
    const { count: buyerOrderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", order.buyer?.id);

    // 3. Get seller's total sales count
    const { count: sellerSalesCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", order.seller?.id)
      .in("status", ["completed", "delivered"]);

    // 4. Fetch payment proofs
    const { data: paymentProofs } = await supabase
      .from("payment_proofs")
      .select("screenshot_url, status, amount")
      .eq("order_id", data.order_id);

    // 5. Fetch dispute if exists
    const { data: dispute } = await supabase
      .from("disputes")
      .select("*")
      .eq("order_id", data.order_id)
      .maybeSingle();

    return {
      order,
      buyer_total_orders: buyerOrderCount || 0,
      seller_total_sales: sellerSalesCount || 0,
      payment_proofs: paymentProofs || [],
      dispute: dispute || null,
    };
  });

/**
 * Append an entry to the order timeline.
 */
export const updateOrderTimeline = createServerFn({ method: "POST" })
  .inputValidator((d: {
    order_id: string;
    entry: { stage: string; timestamp: string; notes: string };
  }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { order_id, entry } = data;

    // Fetch current timeline
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("timeline")
      .eq("id", order_id)
      .single();

    if (fetchErr || !order) {
      console.error("[Orders] Fetch order timeline error:", fetchErr?.message);
      throw new Error("Order not found.");
    }

    const currentTimeline = Array.isArray(order.timeline) ? order.timeline : [];
    const updatedTimeline = [...currentTimeline, entry];

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ timeline: updatedTimeline })
      .eq("id", order_id);

    if (updateErr) {
      console.error("[Orders] Update order timeline error:", updateErr.message);
      throw new Error("Failed to update order timeline.");
    }

    return { success: true };
  });

/**
 * Add investigation notes to an order.
 */
export const addOrderInvestigationNote = createServerFn({ method: "POST" })
  .inputValidator((d: { order_id: string; notes: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getAdminClient();
    if (!supabase) throw new Error("Database service is offline.");

    const { error } = await supabase
      .from("orders")
      .update({ investigation_notes: data.notes })
      .eq("id", data.order_id);

    if (error) {
      console.error("[Orders] Add investigation note error:", error.message);
      throw new Error("Failed to add investigation note.");
    }

    return { success: true };
  });
