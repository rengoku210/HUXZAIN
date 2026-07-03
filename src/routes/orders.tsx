import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoice/invoice-pdf";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders - HUXZAIN" }] }),
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  amount_inr?: number;
  amount_total?: number;
  currency: string;
  created_at: string;
  listing_id: string;
  listings?: { title?: string | null; cover_image_url?: string | null } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_payment: {
    label: "Awaiting Payment",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: Clock,
  },
  pending: {
    label: "Pending Review",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
  },
  payment_under_review: {
    label: "Payment Reviewing",
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
  },
  payment_approved: {
    label: "Payment Verified",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    icon: CheckCircle2,
  },
  order_active: {
    label: "In Progress",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    icon: RefreshCw,
  },
  seller_delivering: {
    label: "Delivering",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    icon: Clock,
  },
  buyer_reviewing: {
    label: "Awaiting Confirmation",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: Clock,
  },
  paid: {
    label: "Payment Completed",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  delivering: {
    label: "Delivering",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: Package,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-400 bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "text-gold bg-gold/10 border-gold/20",
    icon: CheckCircle2,
  },
  disputed: {
    label: "Disputed",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      <Icon className="size-3.5" /> {cfg.label}
    </span>
  );
}

function OrdersPage() {
  const { isAuthenticated, ready, user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid" | "completed">("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoice = async (orderId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setDownloadingId(orderId);
    try {
      const { data: inv, error: invErr } = await supabase.rpc("create_seller_invoice", {
        p_order_id: orderId,
      });

      if (invErr) throw invErr;
      if (!inv) throw new Error("Invoice record not found");

      const { data: temp } = await supabase
        .from("invoice_templates")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();

      const blob = await generateInvoicePDF(inv, temp || undefined, true);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HUXZAIN-${inv.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Invoice ${inv.invoice_number} downloaded successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to download invoice: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/login", search: { redirect: "/orders" } });
  }, [ready, isAuthenticated, navigate]);

  async function loadOrders() {
    if (!isAuthenticated || !user) return;
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, listings:listing_id(title, cover_image_url)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadOrders();
  }, [isAuthenticated, user]);

  const filtered = orders.filter((o) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return ["pending_payment", "pending", "admin_review"].includes(o.status);
    if (activeTab === "paid") return ["paid", "payment_under_review", "payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "delivering", "delivered", "approved", "disputed"].includes(o.status);
    if (activeTab === "completed") return o.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold">My Orders</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track your purchases, payment verification, and delivery
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/40"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-surface/40 rounded-xl border border-border mb-6 w-fit overflow-x-auto">
            {(["all", "pending", "paid", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-8 px-4 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface/30 p-5 h-24 animate-pulse"
                />
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
                  Start shopping to see your orders here.
                </p>
              </div>
              <Link
                to="/"
                className="h-10 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center gap-2"
              >
                Browse Marketplace <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-border bg-surface/40 hover:border-gold/20 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl border border-border bg-surface flex items-center justify-center shrink-0 overflow-hidden">
                      {o.listings?.cover_image_url ? (
                        <img
                          src={o.listings.cover_image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-6 text-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">
                            {o.listings?.title ?? "Marketplace order"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Order #{o.id.slice(0, 12)} -{" "}
                            {new Date(o.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-sm font-semibold text-gold mt-2">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(o.amount_inr ?? o.amount_total ?? 0))}
                      </p>
                      <div className="flex gap-4 mt-3">
                        {["pending_payment", "pending", "admin_review"].includes(o.status) && (
                          <Link
                            to="/checkout/verify-payment"
                            search={{
                              orderId: o.id,
                              listingId: o.listing_id,
                              price: String(o.amount_inr ?? o.amount_total ?? 0),
                            }}
                            className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            Complete payment
                          </Link>
                        )}
                        {["paid", "payment_under_review", "payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(o.status) && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Payment Completed
                            </span>
                            <span className="text-muted-foreground/30 text-xs">|</span>
                            <Link
                              to="/messages"
                              search={{
                                orderId: o.id,
                              }}
                              className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <MessageSquare className="size-3" /> Contact Seller / Chat With Seller
                            </Link>
                            
                            {o.status === "completed" && (
                              <>
                                <span className="text-muted-foreground/30 text-xs">|</span>
                                <button
                                  onClick={() => handleDownloadInvoice(o.id)}
                                  disabled={downloadingId === o.id}
                                  className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-semibold bg-transparent border-none cursor-pointer p-0"
                                >
                                  {downloadingId === o.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <FileText className="size-3" />
                                  )}
                                  Download Invoice
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
