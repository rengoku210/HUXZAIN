import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShoppingBag,
  Search,
  User,
  Image,
  Clock,
  Clipboard,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderTimeline,
  addOrderInvestigationNote,
} from "@/lib/admin/orders.functions";
import { SignedImage, useSignedUrl } from "@/components/SignedImage";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Order Management — HUXZAIN Admin" }] }),
  component: AdminOrdersCenter,
});

// Payment proofs live in the private payment-proofs bucket; resolve a signed URL
// for both the thumbnail and the "open raw" link. Legacy absolute URLs from the
// old public-bucket fallback are passed through by resolveSignedUrl unchanged.
function ProofThumb({ stored }: { stored: string }) {
  const href = useSignedUrl(stored, "payment-proofs");
  return (
    <>
      <SignedImage
        path={stored}
        bucket="payment-proofs"
        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
        alt="Screenshot slip"
      />
      <a
        href={href || undefined}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold uppercase gap-1.5 transition-all duration-200"
      >
        <ExternalLink size={12} /> Open Raw
      </a>
    </>
  );
}

function AdminOrdersCenter() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);

  // Pagination & Search States
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Private Investigation Notes States
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Timeline Action States
  const [timelineStage, setTimelineStage] = useState("Work Started");
  const [timelineNotes, setTimelineNotes] = useState("");
  const [timelineSaving, setTimelineSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getAdminOrders({
        data: {
          status_filter: statusFilter === "all" ? undefined : statusFilter,
          search: searchQuery || undefined,
          page,
          per_page: 15,
        },
      });

      setOrders(res.orders || []);
      setTotalPages(res.total_pages || 1);
      setTotalOrders(res.total || 0);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleOpenDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const res = await getAdminOrderDetails({ data: { order_id: orderId } });
      setDetails(res);
      setNotes(res.order?.investigation_notes || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to load order details");
      setSelectedOrderId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrderId) return;
    setNotesSaving(true);
    try {
      await addOrderInvestigationNote({
        data: {
          order_id: selectedOrderId,
          notes,
        },
      });
      toast.success("Investigation notes updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleAppendTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setTimelineSaving(true);
    try {
      const entry = {
        stage: timelineStage,
        timestamp: new Date().toISOString(),
        notes: timelineNotes || `Stage updated to ${timelineStage}`,
      };
      await updateOrderTimeline({
        data: {
          order_id: selectedOrderId,
          entry,
        },
      });
      toast.success("Timeline entry added");
      setTimelineNotes("");
      // Refresh details
      const freshDetails = await getAdminOrderDetails({ data: { order_id: selectedOrderId } });
      setDetails(freshDetails);
    } catch (err: any) {
      toast.error(err.message || "Failed to append timeline");
    } finally {
      setTimelineSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="text-gold" size={24} /> Orders Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inspect digital handshakes, review payment proof uploads, update order milestones, and record investigation logs.
        </p>
      </div>

      {/* Filter Header */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface/10 p-4 rounded-xl border border-border"
      >
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Search Order ID</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter order ID..."
              className="w-full bg-[#101114] border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-gold text-foreground font-mono"
            />
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={12} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Filter Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="delivering">Delivering</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1 flex items-end">
          <button
            type="submit"
            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl bg-gold text-primary-foreground font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
          >
            Search Logs
          </button>
        </div>
      </form>

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Loading orders database...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Buyer</th>
                  <th className="p-4 font-bold">Seller</th>
                  <th className="p-4 font-bold">Listing Title</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      No order logs match parameters.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                    if (o.status === "completed" || o.status === "delivered") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    if (o.status === "disputed") statusColor = "bg-red-500/15 text-red-400 border-red-500/25";
                    if (o.status === "refunded" || o.status === "cancelled") statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                    return (
                      <tr
                        key={o.id}
                        onClick={() => handleOpenDetails(o.id)}
                        className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs cursor-pointer"
                      >
                        <td className="p-4 font-mono font-semibold text-gold text-[11px] truncate max-w-[120px]">
                          {o.id}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">{o.buyer?.display_name || "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{o.buyer?.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">{o.seller?.display_name || "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{o.seller?.email}</div>
                        </td>
                        <td className="p-4 font-medium max-w-[180px] truncate">{o.listing?.title || "Listing Item"}</td>
                        <td className="p-4 font-bold font-mono text-emerald-400">{formatCurrency(o.amount_inr)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground font-mono text-[10px]">
                          {new Date(o.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface/10 p-3 rounded-xl border border-border text-xs">
              <span className="text-muted-foreground">
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalOrders} total logs)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded bg-surface border border-border text-gold hover:text-gold/80 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded bg-surface border border-border text-gold hover:text-gold/80 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL OVERLAY */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#0A0A0A] border border-border/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-border/60 flex justify-between items-center bg-surface/20 shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-gold" />
                <h3 className="font-display font-semibold text-sm">
                  Order Details Inspector: <span className="font-mono text-gold text-xs">{selectedOrderId}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer bg-surface/10"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="size-8 text-gold animate-spin" />
                  <span className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
                    Querying order details...
                  </span>
                </div>
              ) : details ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Buyer & Seller & Product Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Parties Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Buyer Card */}
                      <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-3">
                        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                          <User size={16} className="text-gold" />
                          <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                            Buyer Info
                          </h4>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-foreground text-sm">{details.order.buyer?.display_name || "Unknown"}</div>
                          <div className="text-muted-foreground font-mono">{details.order.buyer?.email}</div>
                          <div className="text-muted-foreground font-mono">@{details.order.buyer?.username}</div>
                          <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Total Platform Orders:</span>
                            <span className="font-mono font-bold text-foreground">{details.buyer_total_orders}</span>
                          </div>
                        </div>
                      </div>

                      {/* Seller Card */}
                      <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-3">
                        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                          <User size={16} className="text-gold" />
                          <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                            Seller Info
                          </h4>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            {details.order.seller?.display_name || "Unknown"}
                            <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-[8px] font-bold border border-gold/20 uppercase font-mono">
                              {details.order.seller?.seller_tier || "Bronze"}
                            </span>
                          </div>
                          <div className="text-muted-foreground font-mono">{details.order.seller?.email}</div>
                          <div className="text-muted-foreground font-mono">@{details.order.seller?.username}</div>
                          <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Total Completed Sales:</span>
                            <span className="font-mono font-bold text-foreground">{details.seller_total_sales}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Listing & Payment Info */}
                    <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                          Transaction Item & Payout Summary
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase">Product Title</div>
                          <div className="font-bold text-foreground mt-0.5">{details.order.listing?.title || "Marketplace Listing"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase">Escrow Release Status</div>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-surface/80 text-gold border border-border font-mono font-bold text-[10px] uppercase">
                            {details.order.payout_status || "cooling"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 border-t border-border/30 pt-3 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Buyer Paid</span>
                          <div className="font-bold text-emerald-400 text-sm mt-0.5">{formatCurrency(details.order.amount_inr)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">System Cut</span>
                          <div className="font-bold text-gold text-sm mt-0.5">{formatCurrency(details.order.commission_inr)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Seller Earnings</span>
                          <div className="font-bold text-foreground text-sm mt-0.5">{formatCurrency(details.order.seller_payout_inr)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Proofs Grid */}
                    <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Image size={16} className="text-gold" />
                        <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                          Payment Proof Screenshots ({details.payment_proofs?.length || 0})
                        </h4>
                      </div>
                      {details.payment_proofs?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No manual transaction slips uploaded yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {details.payment_proofs.map((proof: any, idx: number) => (
                            <div key={idx} className="rounded-xl border border-border bg-surface/30 p-2.5 space-y-2 relative overflow-hidden group">
                              <div className="aspect-square bg-background rounded-lg overflow-hidden relative border border-border flex items-center justify-center">
                                {proof.screenshot_url ? (
                                  <ProofThumb stored={proof.screenshot_url} />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Broken Link</span>
                                )}
                              </div>
                              <div className="text-[10px] space-y-0.5 font-mono">
                                <div className="text-muted-foreground">Status: <strong className="text-gold uppercase">{proof.status}</strong></div>
                                <div className="text-muted-foreground">Declared: <strong className="text-foreground">{formatCurrency(proof.amount)}</strong></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Timeline & Private Staff Notes */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Private Staff Notes */}
                    <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Clipboard size={16} className="text-gold" />
                        <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                          Internal Investigation Notes
                        </h4>
                      </div>
                      <textarea
                        rows={6}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Private workspace notes for dispute analysis or escrow reviews. Only visible to staff..."
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                      />
                      <button
                        onClick={handleSaveNotes}
                        disabled={notesSaving}
                        className="w-full py-2 flex items-center justify-center gap-1.5 rounded-xl bg-gold text-primary-foreground font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                      >
                        {notesSaving ? "Saving..." : "Save Notes"}
                      </button>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="rounded-2xl border border-border bg-surface/20 p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <Clock size={16} className="text-gold" />
                        <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                          Order State Milestones
                        </h4>
                      </div>

                      {/* Display Current Timeline */}
                      <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                        {Array.isArray(details.order.timeline) && details.order.timeline.length > 0 ? (
                          details.order.timeline.map((entry: any, index: number) => (
                            <div key={index} className="flex gap-3 text-xs relative">
                              {index !== details.order.timeline.length - 1 && (
                                <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-border/40" />
                              )}
                              <div className="size-3 rounded-full bg-gold shrink-0 mt-1" />
                              <div className="space-y-0.5">
                                <div className="font-bold text-foreground">{entry.stage}</div>
                                <p className="text-[10px] text-muted-foreground">{entry.notes}</p>
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic">No state milestones recorded yet.</div>
                        )}
                      </div>

                      {/* Append Entry Form */}
                      <form onSubmit={handleAppendTimeline} className="space-y-2 pt-3 border-t border-border/30">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-muted-foreground tracking-wider">Append Milestone</label>
                          <select
                            value={timelineStage}
                            onChange={(e) => setTimelineStage(e.target.value)}
                            className="w-full bg-[#101114] border border-border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-gold text-foreground"
                          >
                            <option value="Work Started">Work Started</option>
                            <option value="Requirements Uploaded">Requirements Uploaded</option>
                            <option value="Deliverables Received">Deliverables Received</option>
                            <option value="Disputed Escalation">Disputed Escalation</option>
                            <option value="Refund Settled">Refund Settled</option>
                            <option value="Order Forced Completed">Order Forced Completed</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Brief milestone notes..."
                            value={timelineNotes}
                            onChange={(e) => setTimelineNotes(e.target.value)}
                            className="w-full bg-[#101114] border border-border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-gold text-foreground"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={timelineSaving}
                          className="w-full py-1.5 rounded-lg bg-surface hover:bg-surface/60 border border-border text-gold text-[10px] uppercase font-bold tracking-wider active:scale-95 transition-all cursor-pointer"
                        >
                          {timelineSaving ? "Appending..." : "Append Milestone"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-xs text-muted-foreground">Order details failed to load.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
