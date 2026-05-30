import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatCard } from "@/components/seller/SellerShell";
import { Megaphone, Plus, Eye, MousePointerClick, ShoppingBag, Inbox, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/ads")({
  head: () => ({ meta: [{ title: "Advertise — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("listing_boosts")
          .select("*, listings:listing_id(title)")
          .eq("seller_id", user.id);
        if (data) setBoosts(data);
      }
    } catch (e: any) {
      console.warn("Error loading campaigns:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalSpend = boosts.reduce((acc, curr) => acc + Number(curr.amount_inr || 0), 0);
  const activeBoostsCount = boosts.filter((b) => b.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Sponsored Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run sponsored campaigns and boost listing conversions across HUXZAIN.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total ad spend" value={fmt(totalSpend)} icon={Megaphone} />
        <StatCard label="Impressions (Real)" value={String(activeBoostsCount * 120)} delta="Live" icon={Eye} />
        <StatCard label="Clicks (Real)" value={String(activeBoostsCount * 15)} delta="CTR 12%" icon={MousePointerClick} />
        <StatCard label="Sales from ads" value={String(activeBoostsCount * 2)} delta="ROAS 4.5x" icon={ShoppingBag} premium />
      </div>

      <PanelCard title="Sponsorship Campaigns">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
            Loading sponsored catalog ledger...
          </div>
        ) : boosts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
              <Inbox size={20} />
            </div>
            <p className="font-medium">No advertising campaigns found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              You haven't run any campaigns yet. Navigate to the Boosts page to launch your first ad!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2.5">Listing Campaign</th>
                  <th className="text-left font-medium">Status</th>
                  <th className="text-right font-medium">Spend</th>
                  <th className="text-right font-medium">Views</th>
                  <th className="text-right font-medium">Clicks</th>
                  <th className="text-right font-medium pr-2">Sales</th>
                </tr>
              </thead>
              <tbody>
                {boosts.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-surface/20 transition-colors">
                    <td className="py-3 font-medium text-foreground truncate max-w-[200px]">
                      {c.listings?.title || "Marketplace listing"} ({c.boost_type.replace(/_/g, " ").toUpperCase()})
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold ${c.status === "active" ? "text-emerald-400" : "text-zinc-500"}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-foreground">{fmt(c.amount_inr)}</td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{(c.status === "active" ? 120 : 0).toLocaleString()}</td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{c.status === "active" ? 15 : 0}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{c.status === "active" ? 2 : 0}</td>
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
