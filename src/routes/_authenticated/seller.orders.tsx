import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Download, RefreshCw, ShoppingBag, Clock, CheckCircle2, AlertTriangle, FileText, Printer, X } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { useNotifications } from "@/hooks/useNotifications";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  head: () => ({ meta: [{ title: "Orders - HUXZAIN Seller" }] }),
  component: Page,
});

type SellerOrder = {
  id: string;
  buyer_id: string;
  amount_total?: number;
  amount_inr?: number;
  commission_inr?: number;
  seller_payout_inr?: number;
  status: string;
  created_at: string;
  listings?: { title?: string | null } | null;
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_payment: "Pending Payment",
    pending: "Pending Review",
    payment_under_review: "Payment Reviewing",
    payment_approved: "Payment Verified",
    order_active: "In Progress",
    seller_delivering: "Delivering",
    buyer_reviewing: "Awaiting Confirmation",
    completed: "Completed",
    disputed: "Disputed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function InvoiceModal({ order, onClose }: { order: SellerOrder; onClose: () => void }) {
  const basePrice = Number(order.amount_inr || order.amount_total || 0);
  const platformFee = Number(order.commission_inr || 0);
  const gst = 0;
  const netEarnings = Number(order.seller_payout_inr || (basePrice - platformFee));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:z-auto print:static">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm print:hidden" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-background shadow-2xl overflow-y-auto max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-full print:h-auto print:rounded-none">
        {/* Controls - Hidden in print */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-border bg-background/80 backdrop-blur-md print:hidden">
          <h3 className="font-display font-bold">Tax Invoice</h3>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="h-8 px-3 rounded-lg bg-gold text-black font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-110"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              className="size-8 rounded-lg border border-border flex items-center justify-center hover:border-gold/40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 md:p-12 space-y-8 bg-white text-black print:bg-white print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-black tracking-tighter uppercase">HUXZAIN</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Trusted Digital Escrow</div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
              <div className="text-sm text-gray-500 mt-1">#{order.id.split("-")[0].toUpperCase()}</div>
              <div className="text-sm text-gray-500">Date: {new Date(order.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To (Buyer)</div>
              <div className="font-semibold text-gray-800">{order.profiles?.display_name || 'Valued Customer'}</div>
              <div className="text-sm text-gray-600">ID: {order.buyer_id}</div>
              {order.profiles?.email && <div className="text-sm text-gray-600">{order.profiles.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Seller Details</div>
              <div className="font-semibold text-gray-800">You (HUXZAIN Seller)</div>
              <div className="text-sm text-gray-600">Payment via Escrow</div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="py-3 font-bold text-gray-800">Description</th>
                  <th className="py-3 font-bold text-gray-800 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4">
                    <div className="font-semibold text-gray-800">{order.listings?.title || 'Digital Item'}</div>
                    <div className="text-sm text-gray-500 mt-1">Order ID: {order.id}</div>
                  </td>
                  <td className="py-4 text-right font-medium text-gray-800">₹{basePrice.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₹{basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Platform Fee</span>
                <span>-₹{platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>GST</span>
                <span>₹0.00</span>
              </div>
              <p className="text-[10px] text-gray-400 italic text-right">
                GST included within platform fee. No additional GST charged.
              </p>
              <div className="border-t-2 border-gray-800 pt-3 flex justify-between font-bold text-lg text-gray-900">
                <span>Net Earnings</span>
                <span>₹{netEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-800">Thank you for trading on HUXZAIN!</p>
            <p className="mt-1">This is a computer-generated invoice and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SellerOrder | null>(null);
  // Snapshot of unread "new order" notifications when the page opened, so the
  // Orders card can show how many new orders arrived (before we mark them read).
  const [newOrderBadge, setNewOrderBadge] = useState(0);
  const [badgeSnapped, setBadgeSnapped] = useState(false);
  const markedIdsRef = useRef<Set<string>>(new Set());

  async function loadOrders() {
    const supabase = getSupabase();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings:listing_id(title)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const fetchedOrders = (data ?? []) as any[];

      if (fetchedOrders.length > 0) {
        const buyerIds = Array.from(new Set(fetchedOrders.map((o) => o.buyer_id)));
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", buyerIds);

        const profilesMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

        const mappedOrders = fetchedOrders.map((o) => ({
          ...o,
          profiles: profilesMap.get(o.buyer_id) || null,
        }));

        setOrders(mappedOrders as SellerOrder[]);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("[SellerOrders] Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();

    // Realtime: refresh the seller's order list the moment a buyer places /
    // updates an order, so the dashboard never "stays empty" after checkout.
    const supabase = getSupabase();
    if (!supabase || !user) return;
    const channelId = `seller-orders-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${user.id}` },
        () => {
          void loadOrders();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Viewing the Orders page clears the "new order" badge (menu / card / bell).
  // We snapshot the unread order count once (for the card) before marking read.
  useEffect(() => {
    const unreadOrders = notifications.filter(
      (n) => !n.read_at && (n.kind?.toLowerCase().startsWith("order") ?? false),
    );
    if (!badgeSnapped && unreadOrders.length > 0) {
      setNewOrderBadge(unreadOrders.length);
      setBadgeSnapped(true);
    }
    for (const n of unreadOrders) {
      if (!markedIdsRef.current.has(n.id)) {
        markedIdsRef.current.add(n.id);
        void markAsRead(n.id);
      }
    }
  }, [notifications]);

  const pending = orders.filter((o) =>
    ["pending_payment", "pending", "paid", "payment_under_review", "payment_approved", "order_active", "seller_delivering"].includes(o.status),
  ).length;
  const delivered = orders.filter((o) => ["delivered", "buyer_reviewing", "completed"].includes(o.status)).length;
  const disputed = orders.filter((o) => o.status === "disputed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buyer orders connected to your listings.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="h-9 px-3 text-xs rounded-lg border border-border hover:bg-surface inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="All orders" value={String(orders.length)} icon={ShoppingBag} badge={newOrderBadge} />
        <StatCard
          label="Pending fulfillment"
          value={String(pending)}
          positive={false}
          icon={Clock}
        />
        <StatCard label="Delivered" value={String(delivered)} icon={CheckCircle2} />
        <StatCard
          label="Open disputes"
          value={String(disputed)}
          positive={false}
          icon={AlertTriangle}
        />
      </div>

      <PanelCard
        title="Order queue"
        action={
          <button className="h-9 px-3 text-xs rounded-lg border border-border hover:bg-surface inline-flex items-center gap-1.5">
            <Download size={12} /> Export CSV
          </button>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No seller orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2.5">Order</th>
                  <th className="text-left font-medium">Buyer</th>
                  <th className="text-left font-medium">Item</th>
                  <th className="text-right font-medium">Amount</th>
                  <th className="text-left font-medium pl-4">Status</th>
                  <th className="text-right font-medium">When</th>
                  <th className="text-right font-medium pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-surface/40">
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {o.id.slice(0, 12)}
                    </td>
                    <td className="py-3">
                      {o.profiles?.display_name ??
                        o.profiles?.username ??
                        o.profiles?.email ??
                        o.buyer_id.slice(0, 8)}
                    </td>
                    <td className="py-3 max-w-[220px] truncate">
                      {o.listings?.title ?? "Listing"}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      ₹{Number(o.amount_inr || o.amount_total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4">
                      <StatusPill status={statusLabel(o.status)} />
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => setSelectedInvoice(o)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs hover:border-gold/50 transition-colors text-foreground"
                      >
                        <FileText size={12} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
      
      {selectedInvoice && (
        <InvoiceModal order={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
