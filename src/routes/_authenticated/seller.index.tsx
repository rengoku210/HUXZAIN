import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Star, ArrowUpRight, Plus, Package, Loader2 } from "lucide-react";
import { PanelCard, StatCard, StatusPill } from "@/components/seller/SellerShell";
import { TierBadge } from "@/components/seller/TierBadge";
import { useSellerTier } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { getOrCreateWallet } from "@/lib/wallet.functions";


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

function formatINRShort(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toFixed(0)}`;
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

  // Analytics states
  const [liveData, setLiveData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [demoData] = useState<number[]>([2400, 1800, 4200, 3100, 5800, 4900, 7500]);
  const [chartLabels, setChartLabels] = useState<string[]>(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [isDemoData, setIsDemoData] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Store Customizations States
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerText, setBannerText] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [ordersRes, walletRes, listingsRes, recentRes, txnsRes, customizationsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", user.id),
          getOrCreateWallet(user.id),
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
          supabase
            .from("wallet_transactions")
            .select("*")
            .eq("wallet_id", user.id)
            .eq("type", "sale")
            .eq("status", "completed")
            .order("created_at", { ascending: true }),
          supabase
            .from("seller_customizations")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()
        ]);

        setTotalOrders(ordersRes.count ?? 0);
        setActiveListings(listingsRes.count ?? 0);

        setTotalEarnings(walletRes?.total_earnings || 0);

        if (customizationsRes?.data) {
          setLogoUrl(customizationsRes.data.logo_url || null);
          setBannerUrl(customizationsRes.data.banner_url || null);
          setBannerText(customizationsRes.data.storefront_banner_customization || "");
        }

        // Process last 7 days sales
        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            dateStr: d.toDateString(),
            label: d.toLocaleDateString("en-US", { weekday: "short" }),
            amount: 0,
          };
        });

        const txns = (txnsRes.data ?? []) as any[];
        txns.forEach((txn) => {
          const txnDate = new Date(txn.created_at).toDateString();
          const match = dates.find((d) => d.dateStr === txnDate);
          if (match) {
            match.amount += Number(txn.amount);
          }
        });

        const liveAmounts = dates.map((d) => d.amount);
        const liveLabels = dates.map((d) => d.label);

        setLiveData(liveAmounts);
        setChartLabels(liveLabels);

        const hasLiveSales = liveAmounts.some((amt) => amt > 0);
        if (hasLiveSales) {
          setIsDemoData(false);
        } else {
          setIsDemoData(true);
        }

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

  const activeData = isDemoData ? demoData : liveData;
  const maxAmount = Math.max(...activeData, 1000); // minimum scale is 1000 INR

  const points = activeData.map((val, idx) => {
    const x = 60 + idx * (610 / 6);
    const y = 160 - (val / maxAmount) * 130;
    return { x, y };
  });

  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpX1 = points[i - 1].x + 40;
      const cpY1 = points[i - 1].y;
      const cpX2 = points[i].x - 40;
      const cpY2 = points[i].y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
  }

  let areaPath = "";
  if (points.length > 0) {
    areaPath = linePath + ` L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;
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
        className="relative rounded-3xl border border-border p-6 lg:p-8 overflow-hidden min-h-[160px]"
        style={{ 
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : "none", 
          background: bannerUrl ? undefined : meta.surfaceGradient,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: meta.glow 
        }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none bg-black/60"
          style={{
            background: bannerUrl 
              ? "linear-gradient(to right, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.5) 100%)"
              : "radial-gradient(800px 300px at 90% 0%, oklch(0.82 0.13 82 / 0.18), transparent)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-center text-center sm:text-left">
            {logoUrl ? (
              <div className="size-16 rounded-2xl border border-gold/30 overflow-hidden bg-background shadow-xl shrink-0 z-10">
                <img src={logoUrl} className="w-full h-full object-cover" alt="Store logo" />
              </div>
            ) : (
              <div className="size-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl font-bold text-gold shadow-xl shrink-0 z-10">
                {name[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-gold font-bold">
                {bannerText ? `“${bannerText}”` : "Welcome back"}
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold mt-1 text-white">
                {name} <span className="text-gold-gradient">·</span>{" "}
                <span className="text-gold-gradient">{meta.label}</span>
              </h1>
              <p className="text-xs text-zinc-300 mt-1 max-w-xl">
                You're on the {meta.label} plan. Upgrade to unlock premium analytics & featured placement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <TierBadge tier={tier} size="lg" />
            <Link
              to="/seller/listings"
              search={{ intent: "new" }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-all active:scale-95"
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
          value={profile?.rating_count && profile.rating_count > 0 
            ? `${(profile.rating_avg ?? 0).toFixed(1)} ★ (${profile.rating_count} reviews)` 
            : "No reviews yet"}
          icon={Star}
        />
      </div>

      {/* Revenue & Sales Analytics Chart */}
      <PanelCard 
        title="Revenue & Sales Analytics"
        action={
          <div className="flex items-center gap-3">
            {/* Toggle capsules */}
            <div className="inline-flex rounded-xl bg-surface/50 p-0.5 border border-border/80 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsDemoData(false);
                  setHoveredIdx(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !isDemoData
                    ? "bg-gold text-black shadow-md font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Live Sales
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDemoData(true);
                  setHoveredIdx(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  isDemoData
                    ? "bg-gold text-black shadow-md font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Demo Mode</span>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Header numbers panel */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {hoveredIdx !== null ? `${chartLabels[hoveredIdx]} Revenue` : "7-Day Sales Revenue"}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight transition-all duration-150">
                  {formatINR(hoveredIdx !== null ? activeData[hoveredIdx] : activeData.reduce((a, b) => a + b, 0))}
                </span>
                {hoveredIdx !== null && hoveredIdx > 0 && (
                  (() => {
                    const prev = activeData[hoveredIdx - 1];
                    const curr = activeData[hoveredIdx];
                    let pct = 0;
                    if (prev > 0) {
                      pct = ((curr - prev) / prev) * 100;
                    } else if (curr > 0) {
                      pct = 100;
                    }
                    const isUp = pct >= 0;
                    return (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-400" : "text-destructive"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
                      </span>
                    );
                  })()
                )}
                {hoveredIdx === null && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <TrendingUp size={12} /> Live tracking
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Daily Average</div>
              <div className="font-mono text-sm font-semibold text-gold mt-1">
                {formatINR(activeData.reduce((a, b) => a + b, 0) / 7)}
              </div>
            </div>
          </div>

          {/* SVG Chart Container */}
          <div className="relative w-full h-[200px] select-none mt-2">
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox="0 0 700 200" 
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                {/* Area vertical gradient */}
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.13 82)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="oklch(0.82 0.13 82)" stopOpacity={0.0} />
                </linearGradient>
                {/* Line horizontal glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1="60" y1="30" x2="670" y2="30" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
              <line x1="60" y1="73.3" x2="670" y2="73.3" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
              <line x1="60" y1="116.7" x2="670" y2="116.7" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
              <line x1="60" y1="160" x2="670" y2="160" stroke="rgba(255, 255, 255, 0.08)" />

              {/* Y-Axis Value Labels */}
              <text x="45" y="34" fill="rgba(255, 255, 255, 0.4)" fontSize="10" textAnchor="end" className="font-mono">
                {formatINRShort(maxAmount)}
              </text>
              <text x="45" y="77" fill="rgba(255, 255, 255, 0.4)" fontSize="10" textAnchor="end" className="font-mono">
                {formatINRShort(maxAmount * 0.66)}
              </text>
              <text x="45" y="120" fill="rgba(255, 255, 255, 0.4)" fontSize="10" textAnchor="end" className="font-mono">
                {formatINRShort(maxAmount * 0.33)}
              </text>
              <text x="45" y="164" fill="rgba(255, 255, 255, 0.4)" fontSize="10" textAnchor="end" className="font-mono">
                ₹0
              </text>

              {/* X-Axis Labels */}
              {points.map((pt, i) => (
                <text 
                  key={i} 
                  x={pt.x} 
                  y="185" 
                  fill={hoveredIdx === i ? "oklch(0.82 0.13 82)" : "rgba(255, 255, 255, 0.4)"} 
                  fontSize="11" 
                  fontWeight={hoveredIdx === i ? "bold" : "normal"}
                  textAnchor="middle" 
                  className="transition-colors duration-150"
                >
                  {chartLabels[i]}
                </text>
              ))}

              {/* Hover Reference Line */}
              {hoveredIdx !== null && (
                <line 
                  x1={points[hoveredIdx].x} 
                  y1="30" 
                  x2={points[hoveredIdx].x} 
                  y2="160" 
                  stroke="rgba(212, 175, 55, 0.35)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
              )}

              {/* Fill Area Under Trend Line */}
              {areaPath && (
                <path 
                  key={`area-${isDemoData}`}
                  d={areaPath} 
                  fill="url(#chartAreaGradient)" 
                  className="chart-area"
                />
              )}

              {/* Glow Behind Main Line */}
              {linePath && (
                <path 
                  key={`glow-${isDemoData}`}
                  d={linePath} 
                  fill="none" 
                  stroke="rgba(212, 175, 55, 0.4)" 
                  strokeWidth="6" 
                  filter="url(#glow)"
                  className="chart-line"
                />
              )}

              {/* Foreground Trend Line */}
              {linePath && (
                <path 
                  key={`line-${isDemoData}`}
                  d={linePath} 
                  fill="none" 
                  stroke="oklch(0.82 0.13 82)" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  className="chart-line"
                />
              )}

              {/* Data Nodes (Circles) */}
              {points.map((pt, i) => (
                <g key={i}>
                  {/* Ping Animation for active/hovered dot */}
                  {hoveredIdx === i && (
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="12" 
                      fill="rgba(212, 175, 55, 0.25)" 
                      className="animate-ping"
                    />
                  )}
                  {/* Pulsing ring */}
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredIdx === i ? 6 : 3.5} 
                    fill={hoveredIdx === i ? "#fff" : "oklch(0.82 0.13 82)"} 
                    stroke={hoveredIdx === i ? "oklch(0.82 0.13 82)" : "#0c0d0e"} 
                    strokeWidth={hoveredIdx === i ? 2 : 1.5} 
                    className="chart-dot cursor-pointer"
                  />
                </g>
              ))}

              {/* Interactive Hover Zone Rects */}
              {points.map((pt, i) => (
                <rect
                  key={i}
                  x={pt.x - 50.83}
                  y="10"
                  width="101.67"
                  height="160"
                  fill="transparent"
                  className="cursor-pointer animate-none"
                  style={{ pointerEvents: "all" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              ))}
            </svg>

            {/* Custom Embedded CSS Styles for keyframes & transitions */}
            <style>{`
              @keyframes drawLine {
                from { stroke-dashoffset: 1200; }
                to { stroke-dashoffset: 0; }
              }
              .chart-line {
                stroke-dasharray: 1200;
                stroke-dashoffset: 1200;
                animation: drawLine 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .chart-area {
                animation: fadeInArea 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              @keyframes fadeInArea {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .chart-dot {
                transition: all 0.2s ease-out;
              }
            `}</style>
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
