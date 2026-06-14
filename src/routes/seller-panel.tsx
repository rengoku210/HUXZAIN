import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneVerificationModal } from "@/components/site/PhoneVerificationModal";
import { TrendingUp, DollarSign, Users, Shield, ArrowRight, Check } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/seller-panel")({
  head: () => ({
    meta: [
      { title: "Become a Seller — HUXZAIN" },
      {
        name: "description",
        content:
          "Join verified sellers on HUXZAIN. Reach buyers with escrow protection and fast payouts.",
      },
    ],
  }),
  component: SellerPanel,
});

function SellerPanel() {
  const nav = useNavigate();
  const { isAuthenticated, roles, profile, refreshUserMeta } = useAuth();
  const isSeller = roles.includes("seller");
  const isPhoneVerified = !!profile?.phone_verified;

  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [stats, setStats] = useState({
    activeSellers: 0,
    totalPaidOut: 0,
    activeListings: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchSellerPanelStats() {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const [sellersRes, listingsRes, ordersRes] = await Promise.all([
          sb.from("profiles").select("id", { count: "exact" }).eq("is_seller", true),
          sb.from("listings").select("id", { count: "exact" }).eq("status", "active"),
          sb.from("orders").select("amount_inr").in("status", ["paid", "delivering", "delivered", "completed"]),
        ]);

        const sellerCount = sellersRes.count ?? 0;
        const listingCount = listingsRes.count ?? 0;
        const totalAmount = (ordersRes.data ?? []).reduce(
          (acc: number, curr: any) => acc + Number(curr.amount_inr || 0),
          0
        );

        setStats({
          activeSellers: sellerCount,
          totalPaidOut: totalAmount,
          activeListings: listingCount,
          loading: false,
        });
      } catch (e) {
        console.error("Error loading seller panel stats:", e);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    void fetchSellerPanelStats();
  }, []);

  const perks = [
    { icon: TrendingUp, t: "Scalable Growth", d: "Reach active buyers looking for digital goods" },
    { icon: DollarSign, t: "Fast Payouts", d: "Withdraw earnings in INR (₹) quickly" },
    { icon: Users, t: "Trusted Community", d: "Verified buyers & secure escrows" },
    { icon: Shield, t: "Full Protection", d: "Built-in professional dispute resolution" },
  ];

  const steps = [
    "Create your seller profile in minutes",
    "Get verified through our KYC process",
    "List your digital products or services",
    "Receive orders and get paid securely",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container-page py-16 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold mb-5">
              For Sellers
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Turn your skills into a <span className="text-gold">trusted business</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-lg">
              Join professional digital creators selling on HUXZAIN — the moderated marketplace
              built for serious sellers.
            </p>
            <div className="mt-7 flex gap-3">
              {isAuthenticated ? (
                isPhoneVerified ? (
                  <Link
                    to={isSeller ? "/seller" : "/account"}
                    search={isSeller ? undefined : { intent: "seller" }}
                    className="h-12 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
                  >
                    Start Selling <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowPhoneVerification(true)}
                    className="h-12 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
                  >
                    Start Selling <ArrowRight className="size-4" />
                  </button>
                )
              ) : (
                <Link
                  to="/signup"
                  search={{ intent: "seller" }}
                  className="h-12 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
                >
                  Start Selling <ArrowRight className="size-4" />
                </Link>
              )}
              <Link
                to="/how-it-works"
                className="h-12 px-6 rounded-lg border border-border text-sm font-medium inline-flex items-center hover:border-gold/40 transition-colors"
              >
                Learn More
              </Link>
            </div>
            
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { 
                  v: stats.loading ? "..." : String(stats.activeSellers), 
                  l: "Active Sellers" 
                },
                { 
                  v: stats.loading ? "..." : `₹${Math.ceil(stats.totalPaidOut).toLocaleString()}`, 
                  l: "Paid Out Volume" 
                },
                { 
                  v: stats.loading ? "..." : String(stats.activeListings), 
                  l: "Active Listings" 
                },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-bold text-gold">{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {perks.map((p) => (
              <div key={p.t} className="rounded-2xl border border-border bg-surface/40 p-6">
                <div className="size-10 rounded-lg border border-gold/25 bg-gold/10 flex items-center justify-center mb-4">
                  <p.icon className="size-5 text-gold" />
                </div>
                <div className="font-semibold">{p.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="container-page py-12">
          <h2 className="font-display text-3xl font-bold text-center">How to get started</h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div key={s} className="rounded-2xl border border-border bg-surface/40 p-6">
                <div className="size-9 rounded-full bg-gold text-primary-foreground font-bold text-sm flex items-center justify-center mb-4">
                  {i + 1}
                </div>
                <div className="text-sm leading-relaxed">{s}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="container-page py-14">
          <div className="rounded-2xl border border-border bg-surface/40 p-10 grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-display text-2xl font-bold mb-4">
                Seller benefits at every level
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  "Lower fees starting at 4%",
                  "Priority placement boosts",
                  "Detailed analytics & insights",
                  "Direct buyer messaging",
                  "Multiple withdrawal methods",
                  "Dedicated seller support",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                      <Check className="size-3 text-gold" />
                    </span>
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gold/25 bg-gradient-to-br from-surface-elevated to-background p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                Ready when you are
              </div>
              <h4 className="font-display text-2xl font-bold mb-3">Start earning today</h4>
              <p className="text-sm text-muted-foreground mb-6">
                No upfront fees. Get verified, list, and start earning.
              </p>
              <Link
                to={isAuthenticated ? (isSeller ? "/seller" : "/account") : "/signup"}
                search={!isAuthenticated || !isSeller ? { intent: "seller" } : undefined}
                className="h-11 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110"
              >
                Create seller account <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
