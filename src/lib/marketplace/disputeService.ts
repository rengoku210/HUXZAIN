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
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("dispute-evidence")
        .upload(`evidence/${fileName}`, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from("dispute-evidence")
        .getPublicUrl(`evidence/${fileName}`);
      evidenceUrls.push(publicUrl);
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
  const { data, error } = await supabase
    .from("disputes")
    .update({ 
      status: params.status, 
      resolution: params.resolution,
      resolved_at: ['resolved_buyer', 'resolved_seller', 'closed'].includes(params.status) ? new Date().toISOString() : null
    })
    .eq("id", params.disputeId)
    .select()
    .single();

  if (error) throw error;
  return data as Dispute;
}
