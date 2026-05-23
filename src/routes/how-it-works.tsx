import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Search, ShoppingCart, ShieldCheck, Package, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — HUXZAIN" },
      { name: "description", content: "Learn how HUXZAIN works — browse listings, purchase securely, verify payment, and receive your digital product." },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    step: 1,
    icon: Search,
    title: "Browse Listings",
    description: "Explore thousands of digital products and services from verified sellers. Use filters, categories, and search to find exactly what you need.",
    color: "border-blue-500/30 bg-blue-500/5",
    iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    step: 2,
    icon: ShoppingCart,
    title: "Purchase Securely",
    description: "Click 'Buy Now' and proceed to our secure checkout. Your payment is held in escrow until you confirm delivery — you're always protected.",
    color: "border-gold/30 bg-gold/5",
    iconColor: "text-gold bg-gold/10 border-gold/20",
  },
  {
    step: 3,
    icon: ShieldCheck,
    title: "Verify Payment",
    description: "Submit your payment proof (screenshot + Transaction ID). Our team verifies it within 24 hours. You'll receive a confirmation notification.",
    color: "border-purple-500/30 bg-purple-500/5",
    iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    step: 4,
    icon: Package,
    title: "Receive Delivery",
    description: "Once payment is verified, the seller delivers your product or service. Review and confirm — funds are released to the seller only after your approval.",
    color: "border-green-500/30 bg-green-500/5",
    iconColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
];

const GUARANTEES = [
  "100% Escrow-protected payments",
  "Payment verified before delivery",
  "30-day money-back guarantee",
  "24/7 dispute resolution team",
  "KYC-verified sellers",
  "Fraud detection on every transaction",
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold mb-5">
              Simple & Secure
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">
              How <span className="text-gold">HUXZAIN</span> Works
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
              A simple, transparent, and secure process that protects both buyers and sellers at every step.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-5 mb-14">
            {STEPS.map((s, i) => (
              <div key={s.step} className={`rounded-2xl border p-6 md:p-8 ${s.color} flex gap-6 items-start`}>
                <div className={`size-14 rounded-2xl border flex items-center justify-center shrink-0 ${s.iconColor}`}>
                  <s.icon className="size-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="size-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {s.step}
                    </span>
                    <h2 className="font-display text-xl font-bold">{s.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex items-center justify-center shrink-0 self-center">
                    <ArrowRight className="size-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Guarantees */}
          <div className="rounded-2xl border border-border bg-surface/40 p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">
              Your Protection Guarantees
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GUARANTEES.map((g) => (
                <div key={g} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-5 text-gold shrink-0" />
                  {g}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="font-display text-2xl font-bold mb-3">Ready to get started?</h3>
            <p className="text-muted-foreground mb-6">Join thousands of buyers and sellers on HUXZAIN today.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="h-12 px-8 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center justify-center gap-2 transition-all">
                Browse Marketplace <ArrowRight className="size-4" />
              </Link>
              <Link to="/seller-panel" className="h-12 px-8 rounded-xl border border-border text-sm font-medium hover:border-gold/40 inline-flex items-center justify-center transition-colors">
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
