import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

export type DisputeStatus = 'open' | 'investigating' | 'resolved_buyer' | 'resolved_seller' | 'closed';

export interface Dispute {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  evidence_urls?: string[];
}

/** Open a new dispute */
export async function openDispute(params: {
  orderId: string;
  openedBy: string;
  reason: string;
  evidenceFiles?: File[];
}) {
  let evidenceUrls: string[] = [];
  if (params.evidenceFiles && params.evidenceFiles.length > 0) {
    for (const file of params.evidenceFiles) {
      const path = `evidence/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(path, file);
      if (error) throw error;
      // Store the in-bucket path; the bucket is private and is read via signed URLs.
      evidenceUrls.push(path);
    }
  }

  const { data, error } = await supabase.from("disputes").insert({
    order_id: params.orderId,
    opened_by: params.openedBy,
    reason: params.reason,
    evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
    status: "open",
  }).select().single();

  if (error) throw error;

  // Freeze the order's payout the moment a dispute is opened so escrow funds
  // cannot auto-release to the seller while the case is under review.
  const { error: freezeErr } = await supabase
    .from("orders")
    .update({ payout_status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", params.orderId);
  if (freezeErr) {
    console.error("[DisputeService] Failed to freeze order payout on dispute open:", freezeErr);
  }

  return data as Dispute;
}

/** Fetch disputes for a user (as buyer or seller) */
export async function fetchUserDisputes(userId: string) {
  // We need to join with orders to check if the user is the seller
  const { data, error } = await supabase
    .from("disputes")
    .select(`
      *,
      order:orders!order_id(buyer_id, seller_id)
    `)
    .or(`opened_by.eq.${userId},order.buyer_id.eq.${userId},order.seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** Update dispute status (Admin action) */
export async function updateDisputeStatus(params: {
  disputeId: string;
  status: DisputeStatus;
  resolution?: string;
}) {
  const isResolved = ['resolved_buyer', 'resolved_seller', 'closed'].includes(params.status);

  const { data, error } = await supabase
    .from("disputes")
    .update({
      status: params.status,
      resolution: params.resolution,
      resolved_at: isResolved ? new Date().toISOString() : null
    })
    .eq("id", params.disputeId)
    .select()
    .single();

  if (error) throw error;

  // When a dispute is resolved, lift the payout freeze so the normal escrow
  // release flow can resume. Buyer-favored resolutions stay frozen for refund
  // handling; seller-favored / closed cases return the order to cooling.
  if (isResolved && data?.order_id) {
    const newPayoutStatus = params.status === "resolved_buyer" ? "refunded" : "pending_cooling";
    const { error: unfreezeErr } = await supabase
      .from("orders")
      .update({ payout_status: newPayoutStatus, updated_at: new Date().toISOString() })
      .eq("id", data.order_id)
      .eq("payout_status", "disputed");
    if (unfreezeErr) {
      console.error("[DisputeService] Failed to update order payout after dispute resolution:", unfreezeErr);
    }
  }

  return data as Dispute;
}

/** Submit seller response to dispute */
export async function respondToDispute(params: {
  disputeId: string;
  responseNotes: string;
  evidenceFiles?: File[];
}) {
  let newEvidenceUrls: string[] = [];
  if (params.evidenceFiles && params.evidenceFiles.length > 0) {
    for (const file of params.evidenceFiles) {
      const path = `evidence/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(path, file);
      if (error) throw error;
      // Store the in-bucket path; the bucket is private and is read via signed URLs.
      newEvidenceUrls.push(path);
    }
  }

  // Fetch existing dispute to preserve/append evidence urls
  const { data: current, error: getErr } = await supabase
    .from("disputes")
    .select("evidence_urls")
    .eq("id", params.disputeId)
    .single();

  if (getErr) throw getErr;

  const oldUrls = current?.evidence_urls || [];
  const mergedUrls = [...oldUrls, ...newEvidenceUrls];

  const { data, error } = await supabase
    .from("disputes")
    .update({
      status: "investigating",
      resolution: params.responseNotes,
      evidence_urls: mergedUrls.length > 0 ? mergedUrls : null
    })
    .eq("id", params.disputeId)
    .select()
    .single();

  if (error) throw error;
  return data as Dispute;
}
