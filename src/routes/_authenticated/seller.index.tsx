import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Star, ArrowUpRight, Plus, Package, Loader2 } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { TierBadge } from "@/components/seller/TierBadge";
import { useSellerTier } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({ meta: [{ title: "Seller Dashboard — HUXZAIN" }] }),
  component: Overview,
});

type RecentOrder = {
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

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Overview() {
  const { profile, user } = useAuth();
  const { tier, meta } = useSellerTier();
  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "Seller";

  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [ordersRes, earningsRes, listingsRes, recentRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", user.id),
          supabase
            .from("orders")
            .select("amount_total")
            .eq("seller_id", user.id)
            .in("status", ["paid", "delivering", "delivered", "completed"]),
          supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", user.id),
          supabase
            .from("orders")
            .select("*, listings:listing_id(title)")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setTotalOrders(ordersRes.count ?? 0);
        setActiveListings(listingsRes.count ?? 0);

        const earnings = (earningsRes.data ?? []).reduce(
          (sum, row) => sum + Number(row.amount_total),
          0,
        );
        setTotalEarnings(earnings);

        const fetchedOrders = (recentRes.data ?? []) as any[];

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

          setRecentOrders(mappedOrders);
        } else {
          setRecentOrders([]);
        }
      } catch (err) {
        console.error("[SellerOverview] Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Title Bar with + Add Listing button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your business overview, listings, sales, and analytics.
          </p>
        </div>
        <Link
          to="/seller/listings"
          search={{ intent: "new" }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-gold/10"
        >
          <Plus size={16} /> Add Listing
        </Link>
      </div>

      {/* Hero / welcome */}
      <div
        className="relative rounded-3xl border border-border p-6 lg:p-8 overflow-hidden"
        style={{ background: meta.surfaceGradient, boxShadow: meta.glow }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(800px 300px at 90% 0%, oklch(0.82 0.13 82 / 0.18), transparent)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Welcome back
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold mt-1">
              {name} <span className="text-gold-gradient">·</span>{" "}
              <span className="text-gold-gradient">{meta.label}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              You're on the {meta.label} plan.{" "}
              Upgrade to unlock premium analytics & featured placement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TierBadge tier={tier} size="lg" />
            <Link
              to="/seller/listings"
              search={{ intent: "new" }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90"
            >
              <Plus size={14} /> Add Listing
            </Link>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Earnings"
          value={formatINR(totalEarnings)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Orders"
          value={String(totalOrders)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Active Listings"
          value={String(activeListings)}
          icon={Package}
        />
        <StatCard
          label="Avg. Rating"
          value="No reviews yet"
          icon={Star}
        />
      </div>

      {/* Analytics placeholder */}
      <PanelCard title="Revenue · Analytics">
        <div className="h-[180px] flex flex-col items-center justify-center text-center px-4">
          <div className="size-10 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-2">
            <TrendingUp size={16} />
          </div>
          <div className="text-sm font-medium">Analytics coming soon</div>
          <div className="text-xs text-muted-foreground mt-1">
            Your analytics will appear once you start receiving orders
          </div>
        </div>
      </PanelCard>

      {/* Recent orders */}
      <PanelCard
        title="Recent Orders"
        action={
          <Link
            to="/seller/orders"
            className="text-xs text-gold hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowUpRight size={12} />
          </Link>
        }
      >
        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No orders yet. Your first order will appear here.
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
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/50 hover:bg-surface/40 transition-colors"
                  >
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
                      {formatINR(Number(o.amount_total))}
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
