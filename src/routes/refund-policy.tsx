import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RefreshCw, ShieldCheck, ClipboardList, XCircle, CheckCircle2, Clock, MessageSquare, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — HUXZAIN" },
      { name: "description", content: "HUXZAIN's Refund Policy. Learn about our 30-Day Buyer Guarantee, eligible disputes, the refund process, and exclusions." },
      { property: "og:title", content: "Refund Policy — HUXZAIN" },
    ],
  }),
  component: RefundPolicyPage,
});

const eligibilityItems = [
  { ok: true, text: "Product or service not delivered within the agreed timeframe" },
  { ok: true, text: "Delivered item materially differs from the seller's description" },
  { ok: true, text: "Digital product is corrupted, unusable, or contains malware" },
  { ok: true, text: "Service work is clearly incomplete or of unacceptably poor quality" },
  { ok: true, text: "Duplicate charge or accidental payment" },
  { ok: false, text: "Change of mind after a successfully completed order" },
  { ok: false, text: "Buyer failed to provide required information causing delay" },
  { ok: false, text: "Product works as described but buyer expected different results" },
  { ok: false, text: "Order already approved and marked complete by buyer" },
  { ok: false, text: "Dispute opened more than 30 days after order placement" },
];

const processSteps = [
  {
    icon: MessageSquare,
    step: "1",
    title: "Contact the Seller",
    desc: "Use the order messaging system to explain the issue to the seller. Many disputes are resolved at this stage within 24–48 hours.",
  },
  {
    icon: ClipboardList,
    step: "2",
    title: "Open a Dispute",
    desc: "If the seller is unresponsive or unwilling to resolve the issue, open a formal dispute from your order page. Provide evidence such as screenshots or descriptions.",
  },
  {
    icon: ShieldCheck,
    step: "3",
    title: "Resolution Review",
    desc: "HUXZAIN's Resolution Team will review all evidence from both parties. We aim to reach a decision within 5–10 business days.",
  },
  {
    icon: RefreshCw,
    step: "4",
    title: "Refund Issued",
    desc: "If the dispute is ruled in your favour, funds are released back to your original payment method or credited to your HUXZAIN wallet within 3–7 business days.",
  },
];

function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <RefreshCw className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            Refund <span className="text-gold">Policy</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            At HUXZAIN, your peace of mind is our priority. Our buyer protection policy ensures every transaction is safe and every legitimate concern is heard.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: <span className="text-gold">May 2026</span>
          </p>
        </div>

        {/* 30-Day Guarantee Banner */}
        <div className="mb-10 relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-surface-elevated via-surface to-background p-8">
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{ backgroundImage: "radial-gradient(600px 300px at 80% 50%, oklch(0.82 0.13 82 / 0.12), transparent 60%)" }}
          />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="size-16 rounded-2xl border border-gold/40 bg-gold/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-8 text-gold" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-2xl font-bold mb-1">
                30-Day <span className="text-gold">Buyer Guarantee</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Every purchase on HUXZAIN is protected by our 30-Day Buyer Guarantee. Your payment is held securely in escrow and only released to the seller after you confirm satisfaction — or after the 30-day window closes without a dispute.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Clock className="size-4 text-gold" />
              <span className="text-sm font-semibold text-gold">30 Days Protected</span>
            </div>
          </div>
        </div>

        {/* Refund Process */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-6">
            The Refund <span className="text-gold">Process</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {processSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-gold" />
                    </div>
                    <span className="text-3xl font-display font-bold text-gold/20">{step.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Eligibility */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-6">
            Eligible &amp; <span className="text-gold">Ineligible</span> Disputes
          </h2>
          <div className="rounded-2xl border border-border bg-surface/40 p-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eligibilityItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.ok ? "bg-green-950/30 border border-green-800/30" : "bg-red-950/30 border border-red-900/30"}`}>
                  {item.ok ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm text-muted-foreground leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exclusions Note */}
        <section className="mb-10 rounded-2xl border border-border bg-surface/40 p-7">
          <h2 className="font-display text-xl font-bold text-gold mb-4">Exclusions &amp; Special Cases</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <span className="text-foreground font-medium">Platform Commission:</span> HUXZAIN's service fee is non-refundable in cases where the seller has fulfilled the agreed-upon order, regardless of whether a subsequent dispute is opened.
            </p>
            <p>
              <span className="text-foreground font-medium">Custom Orders:</span> Refunds for bespoke or custom-made digital products may be subject to additional review. Sellers who have invested significant time in a custom project may receive partial compensation even in cases where a refund is granted.
            </p>
            <p>
              <span className="text-foreground font-medium">Subscription Services:</span> Ongoing subscription-based services are refunded on a pro-rata basis for the unused period, provided a dispute is raised within the first 7 days of the billing cycle.
            </p>
            <p>
              <span className="text-foreground font-medium">Chargeback Policy:</span> Initiating a chargeback with your bank or card provider while a HUXZAIN dispute is in progress may result in account suspension. Please allow our Resolution Team to handle disputes through the proper channel.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <ShieldCheck className="size-6 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-0.5">Need to open a dispute?</p>
              <p className="text-xs text-muted-foreground">Go to your Orders page and click "Open Dispute" on the relevant order.</p>
            </div>
          </div>
          <Link
            to="/orders"
            className="h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2 shrink-0"
          >
            My Orders <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
