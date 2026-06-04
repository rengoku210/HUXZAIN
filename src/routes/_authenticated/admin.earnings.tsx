// src/routes/_authenticated/admin.earnings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState, StatCard } from "@/components/seller/SellerShell";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ShieldAlert, 
  RefreshCw, 
  Calendar, 
  Search, 
  ChevronRight,
  TrendingDown,
  Percent
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/earnings")({
  head: () => ({ meta: [{ title: "Earnings Ledger — HUXZAIN Admin" }] }),
  component: AdminEarnings,
});

interface OrderFinanceRow {
  id: string;
  listing_title: string;
  buyer_id: string;
  seller_id: string;
  amount_inr: number;
  commission_inr: number;
  seller_payout_inr: number;
  payout_status: string;
  created_at: string;
  completed_at: string | null;
  withdrawal_eligible_at: string | null;
  withdrawal_expired_at: string | null;
  reactivated_at: string | null;
  reactivation_fee_inr: number;
  buyer_name?: string;
  seller_name?: string;
}

function AdminEarnings() {
  const [orders, setOrders] = useState<OrderFinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Ledger summary aggregates
  const [summary, setSummary] = useState({
    grossVolume: 0,
    platformRevenue: 0,
    sellerPayouts: 0,
    dormantEarnings: 0,
    reactivationCharges: 0,
    payoutCount: 0,
  });

  const supabase = getSupabase();

  const fetchFinanceData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Query completed, paid, or delivered orders
      const { data: oData, error: oError } = await supabase
        .from("orders")
        .select(`
          id,
          listing_title,
          buyer_id,
          seller_id,
          amount_inr,
          commission_inr,
          seller_payout_inr,
          payout_status,
          created_at,
          completed_at,
          withdrawal_eligible_at,
          withdrawal_expired_at,
          reactivated_at,
          reactivation_fee_inr
        `)
        .order("created_at", { ascending: false });

      if (oError) throw oError;

      if (oData && oData.length > 0) {
        // Collect user profiles
        const uids = new Set<string>();
        oData.forEach(o => {
          if (o.buyer_id) uids.add(o.buyer_id);
          if (o.seller_id) uids.add(o.seller_id);
        });

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", Array.from(uids));

        const mapped: OrderFinanceRow[] = oData.map((o: any) => {
          const buyer = profiles?.find(p => p.id === o.buyer_id);
          const seller = profiles?.find(p => p.id === o.seller_id);
          return {
            ...o,
            buyer_name: buyer?.display_name || buyer?.username || "Buyer",
            seller_name: seller?.display_name || seller?.username || "Seller",
          };
        });

        // Compute aggregates
        let grossVolume = 0;
        let platformRevenue = 0;
        let sellerPayouts = 0;
        let dormantEarnings = 0;
        let reactivationCharges = 0;

        mapped.forEach(m => {
          grossVolume += Number(m.amount_inr || 0);
          platformRevenue += Number(m.commission_inr || 0);
          sellerPayouts += Number(m.seller_payout_inr || 0);
          
          if (m.payout_status === "dormant") {
            dormantEarnings += Number(m.seller_payout_inr || 0);
          }
          reactivationCharges += Number(m.reactivation_fee_inr || 0);
        });

        setSummary({
          grossVolume,
          platformRevenue,
          sellerPayouts,
          dormantEarnings,
          reactivationCharges,
          payoutCount: mapped.length,
        });
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to sync earnings ledger: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.payout_status === statusFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.listing_title.toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.seller_name || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="size-6 text-gold" /> Financial Ledger & Earnings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze gross sales volume, take rate commissions, settlements cooling status, and dormant funds.
          </p>
        </div>
        <button
          onClick={fetchFinanceData}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          label="Gross GMV Volume" 
          value={`₹${summary.grossVolume.toLocaleString()}`} 
          icon={DollarSign}
          premium 
        />
        <StatCard 
          label="Commissions Earned" 
          value={`₹${summary.platformRevenue.toLocaleString()}`} 
          icon={TrendingUp}
        />
        <StatCard 
          label="Total Seller Net" 
          value={`₹${summary.sellerPayouts.toLocaleString()}`} 
          icon={Wallet}
        />
        <StatCard 
          label="Dormant Balance" 
          value={`₹${summary.dormantEarnings.toLocaleString()}`} 
          icon={ShieldAlert}
        />
        <StatCard 
          label="Reactivation Fees" 
          value={`₹${summary.reactivationCharges.toLocaleString()}`} 
          icon={Percent}
        />
      </div>

      {/* Filters Bar */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID, Listing Title, Buyer, Seller..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="all">All Payout Statuses</option>
            <option value="pending_cooling">In Cooling hold</option>
            <option value="eligible">Eligible for Payout</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="dormant">Dormant</option>
            <option value="reactivated">Reactivated</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium font-mono">
          Orders Ledger: {filtered.length} entries
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No transactions logged" desc="No order payouts record match the selected filter." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Order Details</th>
                  <th className="px-6 py-4">Buyer ➔ Seller</th>
                  <th className="px-6 py-4">Gross Amount</th>
                  <th className="px-6 py-4">Commission</th>
                  <th className="px-6 py-4">Seller Net</th>
                  <th className="px-6 py-4">Settlement Info</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground truncate max-w-[200px]">{o.listing_title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{o.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-medium">{o.buyer_name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        to <ChevronRight size={10} className="text-gold" /> {o.seller_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-foreground">
                      ₹{Number(o.amount_inr || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-red-400">
                      -₹{Number(o.commission_inr || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">
                      ₹{Number(o.seller_payout_inr || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-[10px] text-muted-foreground">
                      <div><strong>Release:</strong> {o.withdrawal_eligible_at ? new Date(o.withdrawal_eligible_at).toLocaleDateString() : 'N/A'}</div>
                      <div><strong>Expires:</strong> {o.withdrawal_expired_at ? new Date(o.withdrawal_expired_at).toLocaleDateString() : 'N/A'}</div>
                      {o.reactivation_fee_inr > 0 && (
                        <div className="text-yellow-400 font-semibold">Reactivation Fee: ₹{o.reactivation_fee_inr}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        o.payout_status === 'eligible' 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                          : o.payout_status === 'pending_cooling' 
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/20" 
                          : o.payout_status === 'withdrawn' 
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                          : "bg-red-500/15 text-red-400 border-red-500/20"
                      }`}>
                        {o.payout_status === 'pending_cooling' ? 'Cooling Hold' : o.payout_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCardInner(props: any) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5">
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="font-display text-2xl font-bold mt-2">{props.value}</div>
    </div>
  );
}
