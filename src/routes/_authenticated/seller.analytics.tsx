import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — HUXZAIN Seller" }] }),
  component: Page,
});

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Activity, MousePointerClick } from "lucide-react";
import { getSearchAnalytics } from "@/lib/traffic-store";

function Page() {
  const [analytics, setAnalytics] = useState<{ logs: any[], keywords: any[] }>({ logs: [], keywords: [] });

  useEffect(() => {
    setAnalytics(getSearchAnalytics());
  }, []);

  const totalViews = analytics.logs.length;
  // Seller specific logic: in a real app, this would filter by seller's listing paths
  const topKeywords = [...analytics.keywords].sort((a, b) => b.searchVolume - a.searchVolume).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your store performance, traffic, and buyer insights.
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
              <div className="text-xs text-muted-foreground">Total page views</div>
            </div>
          </div>
        </PanelCard>
        
        <PanelCard title="Search Impressions">
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-3xl font-bold">{analytics.keywords.reduce((a, b) => a + b.searchVolume, 0)}</div>
              <div className="text-xs text-muted-foreground">Total keyword volume</div>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelCard title="Top Trending Search Keywords">
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
                  {topKeywords.map(k => (
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
      </div>
    </div>
  );
}
