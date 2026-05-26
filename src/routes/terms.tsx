import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ScrollText,
  ShieldCheck,
  UserCheck,
  Store,
  ShoppingBag,
  AlertTriangle,
  Scale,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — HUXZAIN" },
      {
        name: "description",
        content:
          "Read the HUXZAIN Terms of Service. Understand your rights and obligations as a buyer or seller on our secure digital marketplace.",
      },
      { property: "og:title", content: "Terms of Service — HUXZAIN" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    id: "acceptance",
    icon: ScrollText,
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using the HUXZAIN platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.",
      "HUXZAIN reserves the right to update or modify these Terms at any time without prior notice. Your continued use of the platform following any changes constitutes acceptance of the revised Terms. We encourage you to review this document periodically.",
      "These Terms apply to all users of the platform, including buyers, sellers, and visitors. By registering an account, you confirm that you are at least 18 years of age and legally capable of entering into binding contracts.",
    ],
  },
  {
    id: "accounts",
    icon: UserCheck,
    title: "2. User Accounts",
    content: [
      "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify HUXZAIN immediately of any unauthorized use of your account.",
      "Account information must be accurate, current, and complete. Using false information, impersonating others, or creating accounts for fraudulent purposes is strictly prohibited and will result in immediate account termination.",
      "Each user may maintain only one active account. HUXZAIN reserves the right to merge, suspend, or permanently ban accounts found to be duplicates or in violation of our community standards.",
    ],
  },
  {
    id: "seller",
    icon: Store,
    title: "3. Seller Obligations",
    content: [
      "Sellers must provide accurate descriptions of all products and services listed on HUXZAIN. Misleading titles, descriptions, images, or pricing are violations of our platform policies and may result in listing removal and account suspension.",
      "All sellers are required to fulfill orders within the stated delivery timeframes. Failure to deliver as promised without adequate communication may result in automatic order cancellations, refund issuance to buyers, and negative impact on your seller rating.",
      "Sellers are solely responsible for the quality, legality, and authenticity of their offerings. HUXZAIN acts as a marketplace intermediary and does not produce or endorse any listed products or services. Sellers must own or have the legal right to sell all listed items.",
      "Revenue from sales is held in escrow and released to sellers upon buyer confirmation or after the dispute window has closed. HUXZAIN charges a platform commission on each successful transaction, as outlined in the Seller Fee Schedule.",
    ],
  },
  {
    id: "buyer",
    icon: ShoppingBag,
    title: "4. Buyer Protections",
    content: [
      "HUXZAIN provides a secure escrow system that holds payment funds until the buyer confirms satisfactory receipt of the purchased product or service. Payment is only released to the seller after this confirmation or after the designated dispute window expires.",
      "Buyers are entitled to open a dispute within 30 days of order placement if the delivered product or service does not match the seller's description, is materially defective, or is not delivered at all.",
      "All disputes are reviewed impartially by HUXZAIN's Resolution Team. During an active dispute, funds remain in escrow and neither party can access them until a resolution is reached.",
      "Buyers must not attempt to initiate chargebacks directly with their payment provider while a dispute is active on HUXZAIN. Doing so may result in account suspension. HUXZAIN's dispute resolution process is the appropriate channel for resolving transaction-related issues.",
    ],
  },
  {
    id: "prohibited",
    icon: AlertTriangle,
    title: "5. Prohibited Content",
    content: [
      "The following categories of content are strictly prohibited on HUXZAIN: illegal goods or services, stolen or fraudulently obtained digital assets, account credentials or personal data obtained without consent, malware, viruses, or any harmful software, sexually explicit material, content that violates third-party intellectual property rights.",
      "Users may not use HUXZAIN to facilitate money laundering, tax evasion, or any other financial crimes. We actively cooperate with law enforcement agencies and will share user data when required by law.",
      "Attempts to manipulate reviews, ratings, or feedback — including purchasing fake reviews or coercing buyers into positive feedback — are prohibited and may result in permanent account termination.",
    ],
  },
  {
    id: "dispute",
    icon: Scale,
    title: "6. Dispute Resolution",
    content: [
      "HUXZAIN encourages buyers and sellers to resolve disputes amicably through direct communication first. The messaging system on each order provides a venue for this communication.",
      "If direct resolution is not possible, either party may escalate the dispute to HUXZAIN's Resolution Team. Both parties will be asked to provide evidence supporting their position. Our team aims to resolve all escalated disputes within 5–10 business days.",
      "HUXZAIN's decision in all disputes is final and binding. Outcomes may include full or partial refunds to buyers, full or partial release of funds to sellers, or order cancellation. HUXZAIN's platform commission is non-refundable in cases where the seller has fulfilled the order.",
    ],
  },
  {
    id: "liability",
    icon: AlertCircle,
    title: "7. Limitation of Liability",
    content: [
      'HUXZAIN provides its platform on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the platform\'s reliability, accuracy, or fitness for a particular purpose.',
      "To the maximum extent permitted by applicable law, HUXZAIN shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use the platform.",
      "HUXZAIN's total aggregate liability to any user for any claims related to the platform shall not exceed the total fees paid by that user to HUXZAIN in the six (6) months preceding the event giving rise to the claim.",
      "These Terms constitute the entire agreement between you and HUXZAIN and supersede all prior agreements. If any provision is found unenforceable, the remaining provisions shall continue in full force and effect.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Page Hero */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <ScrollText className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            Terms of <span className="text-gold">Service</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Please read these terms carefully before using HUXZAIN. They govern your rights and
            responsibilities as a member of our marketplace community.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: <span className="text-gold">May 2026</span>
          </p>
        </div>

        {/* Quick Nav */}
        <div className="mb-10 rounded-2xl border border-border bg-surface/40 p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">
            Jump to Section
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
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-gold">{section.title}</h2>
                </div>
                <div className="space-y-3">
                  {section.content.map((para, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 rounded-2xl border border-gold/20 bg-gold/5 p-6 flex items-start gap-4">
          <ShieldCheck className="size-6 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">Questions about these Terms?</p>
            <p className="text-sm text-muted-foreground">
              If you have any questions or concerns about our Terms of Service, please{" "}
              <Link to="/contact" className="text-gold hover:underline">
                contact our support team
              </Link>
              . We're happy to help clarify anything.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
