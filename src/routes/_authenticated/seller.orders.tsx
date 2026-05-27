import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, RefreshCw, ShoppingBag, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  head: () => ({ meta: [{ title: "Orders - HUXZAIN Seller" }] }),
  component: Page,
});

type SellerOrder = {
  id: string;
  buyer_id: string;
  amount_total: number;
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
    pending_payment: "Pending",
    pending: "Pending",
    paid: "Processing",
    delivering: "Processing",
    delivered: "Delivered",
    completed: "Completed",
    disputed: "Disputed",
  };
  return map[status] ?? status;
}

function Page() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
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
  }, [user]);

  const pending = orders.filter((o) =>
    ["pending_payment", "pending", "paid", "delivering"].includes(o.status),
  ).length;
  const delivered = orders.filter((o) => ["delivered", "completed"].includes(o.status)).length;
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
        <StatCard label="All orders" value={String(orders.length)} icon={ShoppingBag} />
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
                      ₹{Number(o.amount_total).toFixed(2)}
                    </td>
                    <td className="py-3 pl-4">
                      <StatusPill status={statusLabel(o.status)} />
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
