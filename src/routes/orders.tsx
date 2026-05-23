// src/routes/orders.tsx — Buyer order history & tracking
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Package, Clock, CheckCircle2, XCircle, AlertCircle,
  ExternalLink, RefreshCw, ShoppingBag, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — HUXZAIN" }] }),
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  amount_total: number;
  created_at: string;
  listing_id?: string;
  transaction_id?: string;
};

type Verification = {
  id: string;
  order_id: string;
  status: string;
  transaction_id?: string;
  submitted_at?: string;
  amount?: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending Review", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Clock },
  pending_payment: { label: "Awaiting Payment", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Clock },
  approved: { label: "Payment Approved", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  active: { label: "Active", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
  completed: { label: "Completed", color: "text-gold bg-gold/10 border-gold/20", icon: CheckCircle2 },
  disputed: { label: "Disputed", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="size-3.5" /> {cfg.label}
    </span>
  );
}

export function OrdersPage() {
  const { isAuthenticated, ready, user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "completed">("all");

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/orders" } });
    }
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    // Fetch from payment_verifications (most reliable for tracking)
    supabase
      .from("payment_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => {
        setVerifications((data ?? []) as Verification[]);
        setLoading(false);
      });
  }, [isAuthenticated, user]);

  const filtered = verifications.filter((v) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return v.status === "pending";
    if (activeTab === "approved") return v.status === "approved";
    if (activeTab === "completed") return v.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold">My Orders</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track your purchases and payment verifications</p>
            </div>
            <button
              onClick={() => { setLoading(true); }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface/40 rounded-xl border border-border mb-6 w-fit">
            {(["all", "pending", "approved", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-8 px-4 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Orders list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-surface/30 p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="size-12 rounded-xl bg-surface" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded bg-surface w-1/2" />
                      <div className="h-3 rounded bg-surface w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface/30 py-20 flex flex-col items-center gap-5">
              <div className="size-20 rounded-2xl border border-border bg-surface flex items-center justify-center">
                <ShoppingBag className="size-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-lg">No orders yet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "all" ? "Start shopping to see your orders here." : `No ${activeTab} orders found.`}
                </p>
              </div>
              <Link
                to="/"
                className="h-10 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center gap-2 transition-all"
              >
                Browse Marketplace <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v) => (
                <div key={v.id} className="rounded-2xl border border-border bg-surface/40 hover:border-gold/20 transition-colors p-5">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl border border-border bg-surface flex items-center justify-center shrink-0">
                      <Package className="size-6 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">Order #{v.order_id.slice(0, 12)}…</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Submitted {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </p>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>

                      {v.transaction_id && (
                        <p className="text-xs text-muted-foreground mt-2">
                          TXN: <code className="text-gold">{v.transaction_id}</code>
                        </p>
                      )}

                      {v.amount && (
                        <p className="text-sm font-semibold text-gold mt-1">${Number(v.amount).toFixed(2)}</p>
                      )}

                      {/* Status-specific message */}
                      {v.status === "pending" && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400/80">
                          <Clock className="size-3.5" />
                          <span>Your payment is being reviewed. Usually within 24 hours.</span>
                        </div>
                      )}
                      {v.status === "approved" && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle2 className="size-3.5" />
                          <span>Payment verified. Your order is active.</span>
                        </div>
                      )}
                      {v.status === "rejected" && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                          <XCircle className="size-3.5" />
                          <span>Payment could not be verified. Please contact support.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
