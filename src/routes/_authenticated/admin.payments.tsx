// src/routes/_authenticated/admin.payments.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Eye,
  X,
  Check,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Verifications — HUXZAIN Admin" }] }),
  component: AdminPayments,
});

interface UnifiedProofRow {
  id: string;
  user_id: string;
  listing_id: string | null;
  payment_type: "listing" | "subscription";
  amount: number;
  screenshot_url: string;
  payment_reference: string | null;
  utr_reference: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  order_id?: string | null;
  // Joined
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  listings?: {
    title?: string | null;
    cover_image_url?: string | null;
  } | null;
}

function AdminPayments() {
  const [proofs, setProofs] = useState<UnifiedProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProof, setActiveProof] = useState<UnifiedProofRow | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actioning, setActioning] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "listing" | "subscription">("all");
  const [search, setSearch] = useState("");

  const supabase = getSupabase();

  async function fetchProofs() {
    if (!supabase) return;
    setLoading(true);
    try {
      // Fetch all proofs directly from the single unified table payment_proofs
      const { data: proofsData, error: proofsErr } = await supabase
        .from("payment_proofs")
        .select(`
          *,
          listings:listing_id (
            title,
            cover_image_url
          )
        `)
        .order("created_at", { ascending: false });

      if (proofsErr) throw proofsErr;

      if (proofsData && proofsData.length > 0) {
        // Collect all unique user IDs to fetch buyer profiles in batch
        const userIds = proofsData.map(p => p.user_id).filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: profiles, error: profsErr } = await supabase
            .from("profiles")
            .select("id, display_name, username") // Omit email column as it does not exist
            .in("id", userIds);

          if (profsErr) {
            console.error("[AdminPayments] Error fetching profiles:", profsErr);
          }

          // Map profiles onto the proofs
          const mappedProofs = proofsData.map(proof => {
            const prof = profiles?.find(p => p.id === proof.user_id);
            return {
              ...proof,
              profiles: prof ? {
                display_name: prof.display_name,
                username: prof.username,
                email: null // email column does not exist on profiles in production DB
              } : null
            };
          });
          setProofs(mappedProofs);
        } else {
          setProofs(proofsData as UnifiedProofRow[]);
        }
      } else {
        setProofs([]);
      }
    } catch (err: any) {
      console.error("[AdminPayments] Error fetching payment_proofs:", err);
      toast.error(`Failed to load payment proofs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProofs();

    if (!supabase) return;
    // Realtime subscription for live updates on unified payment_proofs table
    const subscription = supabase
      .channel("payment_proofs_admin_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_proofs" },
        () => {
          fetchProofs();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase]);

  // ── Approve Handler ──
  const executeApprove = async () => {
    if (!supabase || !activeProof) return;

    setActioning(true);
    console.log("[AdminPayments] Initiating approval for payment proof ID:", activeProof.id);
    
    try {
      // 1. Update payment_proofs row directly
      const { data: updateData, error: proofErr } = await supabase
        .from("payment_proofs")
        .update({ 
          status: "approved", 
          rejection_reason: null, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", activeProof.id)
        .select("*");

      console.log("[AdminPayments] Supabase update response for payment_proofs:", updateData);
      if (proofErr) {
        console.error("[AdminPayments] Supabase update error for payment_proofs:", proofErr);
        throw proofErr;
      }

      // Safe non-blocking sync to legacy/active tables
      try {
        if (activeProof.payment_type === "listing") {
          let orderId = activeProof.order_id;
          if (!orderId && activeProof.payment_reference) {
            orderId = activeProof.payment_reference.replace("order:", "");
          }
          if (orderId) {
            const { data: event } = await supabase
              .from("payment_events")
              .select("*")
              .eq("order_id", orderId)
              .eq("provider", "manual")
              .maybeSingle();

            if (event) {
              const newPayload = { ...event.payload, status: "approved", rejection_reason: null };
              await supabase
                .from("payment_events")
                .update({ payload: newPayload, processed: true })
                .eq("id", event.id);
            }
          }
        } else if (activeProof.payment_type === "subscription") {
          await supabase
            .from("subscription_payment_proofs")
            .update({ status: "approved", rejection_reason: null })
            .eq("user_id", activeProof.user_id)
            .eq("status", "pending");
        }
      } catch (syncEx) {
        console.warn("[AdminPayments] Non-blocking legacy sync exception:", syncEx);
      }

      // 2. For listing purchases — process order approval flow
      if (activeProof.payment_type === "listing") {
        let orderId = activeProof.order_id;
        if (!orderId && activeProof.payment_reference) {
          const orderIdMatch = activeProof.payment_reference.match(/^order:(.+)$/);
          if (orderIdMatch) {
            orderId = orderIdMatch[1];
          } else if (activeProof.payment_reference.length === 36) {
            orderId = activeProof.payment_reference;
          }
        }
        if (orderId) {
          await processListingOrderApproval(orderId, Number(activeProof.amount), activeProof.user_id);
        } else {
          console.warn("[AdminPayments] No valid orderId found for listing proof approval!");
        }
      }

      // 3. For subscription purchases — activate plan
      if (activeProof.payment_type === "subscription" && activeProof.payment_reference) {
        const planMatch = activeProof.payment_reference.match(/^subscription:(.+)$/);
        if (planMatch) {
          const planId = planMatch[1];
          await supabase
            .from("profiles")
            .update({ subscription_tier: planId })
            .eq("id", activeProof.user_id);

          // Notify buyer
          await supabase.from("notifications").insert({
            user_id: activeProof.user_id,
            kind: "subscription.activated",
            title: "Subscription Activated",
            body: `Your ${planId.toUpperCase()} plan has been activated. Enjoy the premium features!`,
          });
        }

        // Also update subscription_payment_proofs if exists (backwards compatibility)
        try {
          await supabase
            .from("subscription_payment_proofs")
            .update({ status: "approved", rejection_reason: null })
            .eq("user_id", activeProof.user_id)
            .eq("status", "pending");
        } catch (e) {
          console.warn("[AdminPayments] subscription_payment_proofs sync skipped:", e);
        }
      }

      toast.success(
        `Payment ${activeProof.payment_type === "listing" ? "order" : "subscription"} approved successfully!`,
      );

      // OPTIMISTIC STATE UPDATE
      setProofs(prevProofs => 
        prevProofs.map(p => 
          p.id === activeProof.id 
            ? { ...p, status: "approved", rejection_reason: null } 
            : p
        )
      );

      setShowApproveModal(false);
      setActiveProof(null);

      console.log("[AdminPayments] Reloading payments from DB...");
      await fetchProofs();
      console.log("[AdminPayments] Reload completed successfully!");
    } catch (err: any) {
      console.error("[AdminPayments] Approve error:", err);
      toast.error(`Approval failed: ${err.message}`);
    } finally {
      setActioning(false);
    }
  };

  // ── Listing Order Approval Logic ──
  async function processListingOrderApproval(
    orderId: string,
    amount: number,
    buyerId: string,
  ) {
    if (!supabase) return;

    // Fetch order + listing details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, listings:listing_id(title, seller_id)")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.warn("[AdminPayments] Could not fetch order:", orderError.message);
      return;
    }

    const finalAmount = amount || Number(order.amount_total || 0);
    const sellerId = order.seller_id;
    const listingTitle = order.listings?.title || "Order";

    // Commission split: 96% seller, 4% platform
    const commission = Math.round(finalAmount * 0.04 * 100) / 100;
    const sellerPayout = finalAmount - commission;

    // Update order status → paid
    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
        commission_inr: commission,
        seller_payout_inr: sellerPayout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Update transactions
    try {
      await supabase
        .from("transactions")
        .update({ status: "completed", ref: `manual:${orderId}` })
        .eq("order_id", orderId)
        .eq("user_id", buyerId);
    } catch (e) {
      console.warn("[AdminPayments] Transaction update skipped:", e);
    }

    // Also update legacy payment_verifications
    try {
      await supabase
        .from("payment_verifications")
        .update({ status: "approved" })
        .eq("order_id", orderId)
        .eq("status", "pending");
    } catch (e) {
      console.warn("[AdminPayments] payment_verifications sync skipped:", e);
    }

    // Create seller payout record
    try {
      await supabase.from("seller_payouts").insert({
        seller_id: sellerId,
        amount_inr: sellerPayout,
        status: "pending",
        notes: `Marketplace order ${orderId} — manual payment verified`,
      });
    } catch (e) {
      console.warn("[AdminPayments] seller_payouts insert skipped:", e);
    }

    // Notifications
    await supabase.from("notifications").insert([
      {
        user_id: buyerId,
        kind: "order.paid",
        title: "Payment Confirmed",
        body: `Your payment for "${listingTitle}" has been confirmed. You can now access your order.`,
      },
      {
        user_id: sellerId,
        kind: "order.paid",
        title: "Payment Received — Earnings Unlocked",
        body: `Payment for "${listingTitle}" (₹${finalAmount}) has been verified. ₹${sellerPayout.toFixed(2)} added to your payout queue.`,
      },
    ]);

    // Unlock chat / conversation
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: sellerId,
          subject: `Order: ${listingTitle}`,
          last_message_preview: "Chat unlocked. Order payment verified.",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: sellerId,
          body: `Chat unlocked. "${listingTitle}" payment has been verified. Delivery can now begin.`,
          is_system: true,
        });
      }
    } catch (e) {
      console.warn("[AdminPayments] Conversation creation skipped:", e);
    }
  }

  // ── Reject Handler ──
  const handleRejectSubmit = async () => {
    if (!supabase || !activeProof) return;

    const trimmedReason = rejectionReason.trim() || "No reason specified";
    setActioning(true);
    console.log("[AdminPayments] Initiating rejection for payment proof ID:", activeProof.id, "with reason:", trimmedReason);

    try {
      // 1. Update payment_proofs directly
      const { data: updateData, error } = await supabase
        .from("payment_proofs")
        .update({
          status: "rejected",
          rejection_reason: trimmedReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeProof.id)
        .select("*");

      console.log("[AdminPayments] Supabase update response for rejection:", updateData);
      if (error) {
        console.error("[AdminPayments] Supabase rejection error:", error);
        throw error;
      }

      // Safe non-blocking sync to legacy/active tables
      try {
        if (activeProof.payment_type === "listing") {
          let orderId = activeProof.order_id;
          if (!orderId && activeProof.payment_reference) {
            orderId = activeProof.payment_reference.replace("order:", "");
          }
          if (orderId) {
            const { data: event } = await supabase
              .from("payment_events")
              .select("*")
              .eq("order_id", orderId)
              .eq("provider", "manual")
              .maybeSingle();

            if (event) {
              const newPayload = { ...event.payload, status: "rejected", rejection_reason: trimmedReason };
              await supabase
                .from("payment_events")
                .update({ payload: newPayload, processed: false })
                .eq("id", event.id);
            }
          }
        } else if (activeProof.payment_type === "subscription") {
          await supabase
            .from("subscription_payment_proofs")
            .update({ status: "rejected", rejection_reason: trimmedReason })
            .eq("user_id", activeProof.user_id)
            .eq("status", "pending");
        }
      } catch (syncEx) {
        console.warn("[AdminPayments] Non-blocking legacy reject sync exception:", syncEx);
      }

      // For listing type — update order status
      if (activeProof.payment_type === "listing") {
        let orderId = activeProof.order_id;
        if (!orderId && activeProof.payment_reference) {
          const orderIdMatch = activeProof.payment_reference.match(/^order:(.+)$/);
          if (orderIdMatch) {
            orderId = orderIdMatch[1];
          } else if (activeProof.payment_reference.length === 36) {
            orderId = activeProof.payment_reference;
          }
        }
        if (orderId) {
          await supabase
            .from("orders")
            .update({ status: "cancelled", payment_status: "failed" })
            .eq("id", orderId);

          // Also update legacy payment_verifications
          try {
            await supabase
              .from("payment_verifications")
              .update({ status: "rejected" })
              .eq("order_id", orderId)
              .eq("status", "pending");
          } catch (e) {
            console.warn("[AdminPayments] payment_verifications reject sync skipped:", e);
          }
        }
      }

      // For subscription type — sync old table
      if (activeProof.payment_type === "subscription") {
        try {
          await supabase
            .from("subscription_payment_proofs")
            .update({ status: "rejected", rejection_reason: trimmedReason })
            .eq("user_id", activeProof.user_id)
            .eq("status", "pending");
        } catch (e) {
          console.warn("[AdminPayments] subscription_payment_proofs reject sync skipped:", e);
        }
      }

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: activeProof.user_id,
        kind: "payment.rejected",
        title: "Payment Proof Rejected",
        body: `Your payment proof was rejected. Reason: ${trimmedReason}. Please submit a valid proof.`,
      });

      toast.success("Payment proof rejected.");

      // OPTIMISTIC STATE UPDATE
      setProofs(prevProofs => 
        prevProofs.map(p => 
          p.id === activeProof.id 
            ? { ...p, status: "rejected", rejection_reason: trimmedReason } 
            : p
        )
      );

      setShowRejectModal(false);
      setRejectionReason("");
      setActiveProof(null);

      console.log("[AdminPayments] Reloading payments after rejection...");
      await fetchProofs();
      console.log("[AdminPayments] Reload completed successfully!");
    } catch (err: any) {
      console.error("[AdminPayments] Reject error:", err);
      toast.error(`Rejection failed: ${err.message}`);
    } finally {
      setActioning(false);
    }
  };

  // ── Filtered list ──
  const filtered = proofs.filter((p) => {
    const matchesStatus = filter === "all" || p.status === filter;
    const matchesType = typeFilter === "all" || p.payment_type === typeFilter;
    const name = p.profiles?.display_name || p.profiles?.username || "";
    const email = p.profiles?.email || "";
    const listingName = p.listings?.title || "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      listingName.toLowerCase().includes(search.toLowerCase()) ||
      (p.payment_reference || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.utr_reference || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "rejected":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "pending":
      default:
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "subscription" ? (
      <Sparkles className="size-3.5 text-gold" />
    ) : (
      <ShoppingBag className="size-3.5 text-blue-400" />
    );
  };

  // ── Stats ──
  const pendingCount = proofs.filter((p) => p.status === "pending").length;
  const approvedCount = proofs.filter((p) => p.status === "approved").length;
  const rejectedCount = proofs.filter((p) => p.status === "rejected").length;
  const listingCount = proofs.filter((p) => p.payment_type === "listing").length;
  const subscriptionCount = proofs.filter((p) => p.payment_type === "subscription").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-6 text-gold" /> Payment Verifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified review queue — Marketplace purchases and subscription upgrades.
          </p>
        </div>
        <button
          onClick={fetchProofs}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-border bg-surface/30 hover:bg-surface inline-flex items-center gap-1.5 transition-all text-sm shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: proofs.length, color: "text-foreground" },
          { label: "Pending", value: pendingCount, color: "text-amber-400" },
          { label: "Approved", value: approvedCount, color: "text-emerald-400" },
          { label: "Listings", value: listingCount, color: "text-blue-400" },
          { label: "Subscriptions", value: subscriptionCount, color: "text-gold" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-surface/20 p-4 text-center"
          >
            <div className={`text-2xl font-display font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface/20 border border-border p-4 rounded-2xl">
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                filter === f
                  ? "bg-gold text-black border-gold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="w-px bg-border/60 mx-1 hidden sm:block" />
          {(["all", "listing", "subscription"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                typeFilter === f
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All Types" : f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search buyer, listing, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-surface/60 text-xs focus:outline-none focus:border-gold/50"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-gold" /> Loading payment proofs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border border-dashed p-12 text-center bg-surface/10">
            <Clock className="mx-auto size-12 text-muted-foreground/60 mb-4" />
            <h3 className="font-semibold text-lg">No matching payment proofs</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "pending"
                ? "All payment proofs have been reviewed."
                : "No records match your filter and search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-surface/20">
                  <th className="text-left font-medium py-3 px-4">Buyer</th>
                  <th className="text-left font-medium px-4">Type</th>
                  <th className="text-left font-medium px-4">Item / Plan</th>
                  <th className="text-right font-medium px-4">Amount</th>
                  <th className="text-left font-medium px-4">Status</th>
                  <th className="text-left font-medium px-4">Submitted</th>
                  <th className="text-right font-medium pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 hover:bg-surface/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.profiles?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase">
                        {getTypeIcon(p.payment_type)}
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate">
                      {p.payment_type === "listing"
                        ? p.listings?.title || "Listing"
                        : p.payment_reference?.replace("subscription:", "").toUpperCase() ||
                          "Subscription"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(
                          p.status,
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right pr-4">
                      <button
                        onClick={() => setActiveProof(p)}
                        className="h-8 px-3 rounded-lg bg-surface hover:bg-gold/10 text-muted-foreground hover:text-gold border border-border flex items-center justify-center gap-1.5 text-xs ml-auto transition-colors"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── DETAIL INSPECTION MODAL ─── */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveProof(null)}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  {getTypeIcon(activeProof.payment_type)}
                  Inspect {activeProof.payment_type === "listing" ? "Order" : "Subscription"} Proof
                </h2>
                <button
                  onClick={() => setActiveProof(null)}
                  className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-surface/20 p-4 border border-border rounded-2xl mb-4">
                <div>
                  <div className="text-muted-foreground">Buyer</div>
                  <div className="font-bold text-foreground mt-0.5">
                    {activeProof.profiles?.display_name ?? activeProof.profiles?.username ?? "Unknown"}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{activeProof.profiles?.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Payment Type</div>
                  <div className="font-bold text-foreground mt-0.5 uppercase flex items-center gap-1.5">
                    {getTypeIcon(activeProof.payment_type)}
                    {activeProof.payment_type}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {activeProof.payment_type === "listing" ? "Product" : "Plan"}
                  </div>
                  <div className="font-bold text-gold mt-0.5">
                    {activeProof.payment_type === "listing"
                      ? activeProof.listings?.title || "Listing"
                      : activeProof.payment_reference?.replace("subscription:", "").toUpperCase() ||
                        "Plan"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount Paid</div>
                  <div className="font-bold text-foreground mt-0.5">
                    ₹{Number(activeProof.amount).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border mt-1 ${getStatusColor(
                      activeProof.status,
                    )}`}
                  >
                    {activeProof.status}
                  </span>
                </div>
                <div>
                  <div className="text-muted-foreground">Submitted</div>
                  <div className="text-foreground mt-0.5">
                    {new Date(activeProof.created_at).toLocaleString()}
                  </div>
                </div>
                {activeProof.payment_reference && (
                  <div className="col-span-2 border-t border-border/40 pt-2">
                    <div className="text-muted-foreground">Reference</div>
                    <div className="text-foreground mt-0.5 font-mono text-[11px]">
                      {activeProof.payment_reference}
                    </div>
                  </div>
                )}
                {activeProof.utr_reference && (
                  <div className="col-span-2 border-t border-border/40 pt-2">
                    <div className="text-gold font-bold flex items-center gap-1">
                      UTR / Transaction Reference
                    </div>
                    <div className="text-foreground mt-1 font-mono text-sm tracking-wider font-extrabold select-all">
                      {activeProof.utr_reference}
                    </div>
                  </div>
                )}
                {activeProof.rejection_reason && (
                  <div className="col-span-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 font-mono">
                    <strong>Rejection Reason:</strong> {activeProof.rejection_reason}
                  </div>
                )}
              </div>

              {/* Screenshot */}
              <div className="mb-6">
                <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Uploaded Screenshot</span>
                  <a
                    href={activeProof.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline inline-flex items-center gap-1"
                  >
                    Open in new tab <ExternalLink size={10} />
                  </a>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border/80 bg-black aspect-[9/16] max-h-[360px] flex items-center justify-center">
                  <img
                    src={activeProof.screenshot_url}
                    alt="Payment Screenshot"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Actions */}
              {activeProof.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actioning}
                    className="flex-1 h-11 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <X size={14} /> Reject
                  </button>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={actioning}
                    className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-50 cursor-pointer border-none"
                  >
                    <Check size={14} /> Approve & Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM APPROVAL MODAL ─── */}
      {showApproveModal && activeProof && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-gold">
              <CheckCircle size={18} className="text-gold" /> Confirm Payment Approval
            </h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Are you sure you want to approve this payment? This will confirm the buyer payment and continue order processing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actioning}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeApprove}
                disabled={actioning}
                className="flex-1 h-10 rounded-xl bg-gold text-black hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer border-none"
              >
                {actioning ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Processing...
                  </>
                ) : (
                  "Confirm Approval"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECTION REASON MODAL ─── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <AlertCircle size={18} /> Reject Payment
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Are you sure you want to reject this payment? The buyer will see this rejection reason in their dashboard and notifications.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface/60 text-xs focus:outline-none focus:border-red-500/50 resize-none mb-5 text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={actioning}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actioning}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {actioning ? "Rejecting..." : "Reject Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
