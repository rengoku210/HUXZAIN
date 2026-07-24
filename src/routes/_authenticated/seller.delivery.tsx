import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { Truck, Clock, CheckCircle2, XCircle, DollarSign, RefreshCw, ShoppingBag } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { completeOrderAndCreditSeller } from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/seller/delivery")({
  head: () => ({ meta: [{ title: "Delivery Management — HUXZAIN Seller" }] }),
  component: Page,
});

interface DeliveryOrder {
  id: string;
  buyer_id: string;
  amount_inr: number;
  status: string;
  created_at: string;
  listings?: { title?: string | null } | null;
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_payment: "Pending Payment",
    pending: "Pending",
    paid: "Paid / Processing",
    delivering: "Delivering",
    delivered: "Delivered",
    completed: "Completed",
    disputed: "Disputed",
    refunded: "Refunded",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function Page() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

        setOrders(mappedOrders as DeliveryOrder[]);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("[SellerDelivery] Error loading delivery orders:", err);
      toast.error("Failed to load delivery data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [user?.id]);

  const deliverOrder = async (orderId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      // 1. Update status to delivered and set delivered_at timestamp
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // 2. Complete the order, calculate fees, credit the wallet, and create the transaction record
      await completeOrderAndCreditSeller(orderId);

      toast.success("Order delivered and earnings credited successfully!");
      void loadOrders();
    } catch (e: any) {
      console.error("[SellerDelivery] Fulfillment failed:", e);
      toast.error("Fulfillment failed: " + e.message);
    }
  };

  // Metrics calculations
  const totalOrders = orders.length;
  const delivered = orders.filter((o) => ["delivered", "completed"].includes(o.status)).length;
  const pending = orders.filter((o) => ["pending", "delivering", "paid"].includes(o.status)).length;
  const cancelled = orders.filter((o) => ["cancelled", "refunded"].includes(o.status)).length;
  const paymentReceived = orders.filter((o) => ["paid", "delivering", "delivered", "completed"].includes(o.status)).length;
  const paymentPending = orders.filter((o) => o.status === "pending_payment").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Delivery Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fulfill buyer orders manually and track live delivery metrics.
          </p>
        </div>
        <button
          onClick={() => void loadOrders()}
          className="h-9 px-3 text-xs rounded-lg border border-border hover:bg-surface inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Orders" value={String(totalOrders)} icon={ShoppingBag} />
        <StatCard label="Delivered" value={String(delivered)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(pending)} icon={Clock} positive={false} />
        <StatCard label="Cancelled" value={String(cancelled)} icon={XCircle} positive={false} />
        <StatCard label="Payment Received" value={String(paymentReceived)} icon={DollarSign} />
        <StatCard label="Payment Pending" value={String(paymentPending)} icon={Clock} positive={false} />
      </div>

      <PanelCard title="Delivery Queue">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold"></div>
            <span>Loading delivery orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No delivery records found for your listings.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2.5">Order ID</th>
                  <th className="text-left font-medium">Buyer</th>
                  <th className="text-left font-medium">Item</th>
                  <th className="text-right font-medium">Amount</th>
                  <th className="text-left font-medium pl-4">Status</th>
                  <th className="text-right font-medium pr-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const canDeliver = ["paid", "delivering", "pending"].includes(o.status);

                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-surface/40 transition-colors">
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">
                        {o.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5">
                        {o.profiles?.display_name ??
                          o.profiles?.username ??
                          o.profiles?.email ??
                          o.buyer_id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 max-w-[200px] truncate">
                        {o.listings?.title ?? "Digital Item"}
                      </td>
                      <td className="py-3.5 text-right font-semibold">
                        ₹{Number(o.amount_inr || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 pl-4">
                        <StatusPill status={statusLabel(o.status)} />
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {canDeliver ? (
                          <button
                            onClick={() => void deliverOrder(o.id)}
                            className="bg-gold text-black font-semibold rounded-lg text-xs px-3 py-1.5 min-h-[44px] hover:brightness-110 active:brightness-95 transition-all inline-flex items-center gap-1"
                          >
                            <Truck size={12} /> Deliver
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
