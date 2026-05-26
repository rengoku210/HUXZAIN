import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Lock, Database, BarChart3, Users, ShieldCheck, UserCog } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — HUXZAIN" },
      {
        name: "description",
        content:
          "HUXZAIN Privacy Policy. Learn how we collect, use, and protect your personal data on our secure digital marketplace.",
      },
      { property: "og:title", content: "Privacy Policy — HUXZAIN" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    id: "collected",
    icon: Database,
    title: "1. Data We Collect",
    subsections: [
      {
        heading: "Account Information",
        body: "When you register on HUXZAIN, we collect your name, email address, username, and password (stored in hashed form). Sellers additionally provide payment details, business name, and verification documents as required by our KYC process.",
      },
      {
        heading: "Transaction Data",
        body: "We collect information about purchases, sales, order history, payment amounts, and associated metadata. This data is essential for order management, dispute resolution, and financial record-keeping.",
      },
      {
        heading: "Usage &amp; Technical Data",
        body: "We automatically collect IP addresses, browser type, operating system, pages visited, time spent on pages, referral URLs, and device identifiers. This data helps us improve platform performance, detect fraud, and personalise your experience.",
      },
      {
        heading: "Communications",
        body: "Messages sent through HUXZAIN's internal messaging system, support tickets, and emails to our team may be stored and reviewed for quality assurance, fraud prevention, and dispute resolution purposes.",
      },
    ],
  },
  {
    id: "use",
    icon: BarChart3,
    title: "2. How We Use Your Data",
    subsections: [
      {
        heading: "Platform Operations",
        body: "Your data is primarily used to provide and improve HUXZAIN's services, including processing transactions, facilitating communication between buyers and sellers, and managing your account.",
      },
      {
        heading: "Security &amp; Fraud Prevention",
        body: "We analyse usage patterns and transaction data to detect and prevent fraud, money laundering, account takeovers, and other malicious activities. This is a core obligation to keep all users safe.",
      },
      {
        heading: "Communications",
        body: "We may send you transactional emails (order confirmations, dispute updates), account notifications (security alerts, policy changes), and optional marketing communications. You can unsubscribe from marketing emails at any time.",
      },
      {
        heading: "Analytics &amp; Improvement",
        body: "Aggregated, anonymised usage data helps us understand which features are most valued, identify areas for improvement, and make data-driven product decisions. This data does not identify you personally.",
      },
    ],
  },
  {
    id: "third-parties",
    icon: Users,
    title: "3. Third Parties",
    subsections: [
      {
        heading: "Payment Processors",
        body: "We use trusted third-party payment processors (such as Stripe) to handle financial transactions. These providers are PCI-DSS compliant and operate under their own stringent privacy and security standards. HUXZAIN does not store full card numbers.",
      },
      {
        heading: "Infrastructure Providers",
        body: "Our platform is hosted on cloud infrastructure with high security standards. Database, file storage, and authentication services are provided by Supabase. These providers process data on our behalf and are bound by data processing agreements.",
      },
      {
        heading: "Analytics &amp; Monitoring",
        body: "We may use analytics tools to track platform performance and user behaviour in aggregate. We select providers that offer data anonymisation and do not allow them to use your data for their own advertising purposes.",
      },
      {
        heading: "Legal Disclosure",
        body: "We may disclose your personal data to law enforcement, regulators, or other third parties if required by applicable law, court order, or when we believe in good faith that disclosure is necessary to protect our rights or prevent harm.",
      },
    ],
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "4. Security",
    subsections: [
      {
        heading: "Technical Measures",
        body: "All data transmitted between your browser and HUXZAIN is encrypted using TLS 1.3. Passwords are hashed using industry-standard bcrypt. Sensitive data at rest is encrypted using AES-256.",
      },
      {
        heading: "Access Controls",
        body: "Access to production systems and user data is restricted to authorised personnel on a strict need-to-know basis. All internal access is logged and audited regularly.",
      },
      {
        heading: "Incident Response",
        body: "In the event of a data breach that poses a risk to your rights and freedoms, HUXZAIN will notify affected users and relevant authorities within 72 hours of becoming aware, in accordance with applicable data protection regulations.",
      },
    ],
  },
  {
    id: "rights",
    icon: UserCog,
    title: "5. Your Rights",
    subsections: [
      {
        heading: "Access &amp; Portability",
        body: "You have the right to request a copy of the personal data we hold about you in a commonly used, machine-readable format. Submit a data access request via our contact page.",
      },
      {
        heading: "Correction",
        body: "If any of your personal data is inaccurate or incomplete, you have the right to request correction. Most account information can be updated directly in your Account Settings.",
      },
      {
        heading: "Erasure",
        body: "You may request deletion of your personal data. We will fulfil erasure requests subject to any legal obligations that require us to retain certain data (e.g., financial records for tax purposes).",
      },
      {
        heading: "Objection &amp; Restriction",
        body: "You have the right to object to certain types of processing, including direct marketing. You can opt out of marketing emails using the unsubscribe link in any email or by contacting support.",
      },
    ],
  },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <Lock className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            Privacy <span className="text-gold">Policy</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Your privacy matters. This policy explains exactly what data HUXZAIN collects, why we
            collect it, and how we keep it safe and under your control.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: <span className="text-gold">May 2026</span>
          </p>
        </div>

        {/* Quick Nav */}
        <div className="mb-10 rounded-2xl border border-border bg-surface/40 p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">
            Quick Navigation
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-gold/50 hover:text-gold transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-border bg-surface/40 p-7 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-gold">{section.title}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {section.subsections.map((sub, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/60 bg-background/40 p-5"
                    >
                      <h3
                        className="text-sm font-semibold mb-2"
                        dangerouslySetInnerHTML={{ __html: sub.heading }}
                      />
                      <p
                        className="text-xs text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sub.body }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cookies Note */}
        <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-7">
          <h2 className="font-display text-xl font-bold text-gold mb-4">Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            HUXZAIN uses essential cookies to maintain your session and remember your preferences.
            We do not use third-party advertising cookies or tracking pixels for behavioural
            advertising.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can control cookie settings in your browser. Disabling essential cookies may affect
            platform functionality, including the ability to stay logged in.
          </p>
        </div>

        {/* Contact for Privacy */}
        <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/5 p-6 flex items-start gap-4">
          <ShieldCheck className="size-6 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">Privacy Concerns or Data Requests?</p>
            <p className="text-sm text-muted-foreground">
              Contact our Data Protection team at{" "}
              <a href="mailto:privacy@huxzain.com" className="text-gold hover:underline">
                privacy@huxzain.com
              </a>{" "}
              or use our{" "}
              <Link to="/contact" className="text-gold hover:underline">
                contact form
              </Link>
              . We respond to all privacy requests within 30 days.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
