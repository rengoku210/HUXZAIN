import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Activity, MousePointerClick, Loader2, Sparkles, Megaphone } from "lucide-react";
import { getSellerAnalytics } from "@/lib/analytics.functions";
import { useAuth } from "@/lib/auth/auth-context";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { PremiumLockScreen } from "@/components/seller/PremiumLockScreen";

export const Route = createFileRoute("/_authenticated/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { tier } = useSellerTier();
  
  // Analytics requires Pro or above (rank >= 2)
  const isLocked = !tierAtLeast(tier, "pro");

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLocked || !user?.id) {
      setLoading(false);
      return;
    }
    
    async function loadStats() {
      try {
        setLoading(true);
        const data = await getSellerAnalytics({ data: { sellerId: user!.id } });
        setStats(data);
      } catch (err: any) {
        console.error("Failed to load seller analytics:", err);
        setError(err.message || "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, [user?.id, isLocked]);

  if (isLocked) {
    return <PremiumLockScreen featureName="Advanced Store Analytics" requiredTier="pro" />;
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 text-gold animate-spin" />
        <span className="text-xs text-muted-foreground">Compiling seller metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-400">
        Error loading analytics: {error}
      </div>
    );
  }

  const totalViews = stats?.totalViews || 0;
  const clicks = stats?.clicks || 0;
  const ordersCount = stats?.ordersCount || 0;
  const revenue = stats?.revenue || 0;
  const conversionRate = stats?.conversionRate || 0;
  const topKeywords = stats?.keywords || [];
  const boost = stats?.boostPerformance || { boostedViews: 0, nonBoostedViews: 0, boostsActiveCount: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your store performance, traffic, and buyer insights using real database metrics.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PanelCard title="Store Views">
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-gold/10 rounded-xl text-gold">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold">{totalViews}</div>
              <div className="text-xs text-muted-foreground">{stats?.profileViews || 0} profile, {stats?.listingViews || 0} listing</div>
            </div>
          </div>
        </PanelCard>
        
        <PanelCard title="Completed Sales">
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold">{ordersCount}</div>
              <div className="text-xs text-muted-foreground">Total successful orders</div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Total Earnings">
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold">₹{revenue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Net payouts cleared</div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Avg. Conversion Rate">
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
              <MousePointerClick size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold">{conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Orders per listing view</div>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelCard title="Top Search Keywords (Referrer Volume)">
          {topKeywords.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No search data available.</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-muted-foreground border-b border-border pb-2 text-xs uppercase tracking-wider">
                    <th className="py-2 font-medium">Keyword</th>
                    <th className="font-medium text-right">Volume</th>
                    <th className="font-medium text-right text-emerald-400">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topKeywords.map((k: any) => (
                    <tr key={k.query} className="border-b border-border/30 hover:bg-surface/40">
                      <td className="py-3 font-medium">{k.query}</td>
                      <td className="py-3 text-right text-muted-foreground">{k.searchVolume}</td>
                      <td className="py-3 text-right text-emerald-400">{k.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>

        <PanelCard title="Listing Boost Performance">
          <div className="space-y-5 mt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Active Boost Campaigns:</span>
              <span className="font-bold text-gold">{boost.boostsActiveCount} running</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Boosted Spotlight Views:</span>
                <span className="font-bold text-foreground">{boost.boostedViews}</span>
              </div>
              <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gold h-full" 
                  style={{ width: `${(boost.boostedViews / Math.max(1, totalViews)) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Standard Views:</span>
                <span className="font-bold text-foreground">{boost.nonBoostedViews}</span>
              </div>
              <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-zinc-500 h-full" 
                  style={{ width: `${(boost.nonBoostedViews / Math.max(1, totalViews)) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed flex gap-1.5 items-start mt-2">
              <Megaphone size={12} className="text-gold shrink-0 mt-0.5" />
              <span>Boosted listings receive up to 2.5x higher search positioning and impressions than organic slots.</span>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
