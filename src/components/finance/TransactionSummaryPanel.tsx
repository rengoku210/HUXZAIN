/**
 * HX-007 — Transaction Summary panel (reusable, client mockup 201700/201600).
 *
 * ONE presentation for BOTH the listing form (seller view — payout focus) and
 * checkout (buyer view — includes Buyer Protection + processing fee). Every
 * number comes from a pre-computed `TransactionSummary` (computeTransactionSummary)
 * — this component performs NO financial math of its own.
 */

import {
  ShieldCheck,
  ShieldAlert,
  Scale,
  TrendingUp,
  BadgeCheck,
  Lock,
  Info,
  CheckCircle2,
  Clock,
  CalendarCheck,
  Wallet,
  Landmark,
} from "lucide-react";
import { formatPrice } from "@/lib/marketplace/listing-adapter";
import type { TransactionSummary } from "@/lib/finance";

type Variant = "listing" | "checkout";

const FEATURES = [
  { icon: ShieldCheck, title: "Secure Escrow", body: "Funds are held securely until the transaction is successfully completed." },
  { icon: ShieldAlert, title: "Fraud Protection", body: "Advanced systems to prevent fraud and protect real orders." },
  { icon: Scale, title: "Human Dispute Resolution", body: "Professional moderation and fair resolution when disputes arise." },
  { icon: TrendingUp, title: "Seller Growth & Visibility", body: "Better exposure, search ranking and growth opportunities." },
  { icon: BadgeCheck, title: "Verified Marketplace", body: "Verified processes, trusted community and continuous monitoring." },
  { icon: Lock, title: "Platform Security", body: "Enterprise-grade security to keep your business and data safe." },
] as const;

function daysLabel(days: number): string {
  if (days <= 0) return "Instant";
  return days === 1 ? "1 Day" : `${days} Days`;
}

function Row({
  label,
  value,
  tone = "default",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "deduct" | "add";
  strong?: boolean;
}) {
  const valueColor =
    tone === "deduct"
      ? "text-red-400"
      : tone === "add"
        ? "text-amber-300"
        : strong
          ? "text-white"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={tone === "muted" ? "text-muted-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`${valueColor} ${strong ? "font-bold" : "font-medium"} tabular-nums`}>{value}</span>
    </div>
  );
}

export function TransactionSummaryPanel({
  summary,
  variant = "listing",
  className = "",
}: {
  summary: TransactionSummary;
  variant?: Variant;
  className?: string;
}) {
  const isCheckout = variant === "checkout";
  const orderTotal = isCheckout ? summary.buyerPaysInr : summary.priceInr;
  const totalLabel = isCheckout ? "Total amount charged for this order." : "Total value of this order.";

  return (
    <div
      className={`rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.06] to-transparent p-5 sm:p-6 space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold text-white">Transaction Summary</h3>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full font-bold">
              <ShieldCheck className="size-3" /> Protected by HUXZAIN
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Every order is secured with escrow protection, fraud prevention and dispute assistance to
            ensure a safe experience for both buyers and sellers.
          </p>
        </div>
      </div>

      {/* Hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <Wallet className="size-3.5" /> Estimated Seller Payout
          </div>
          <div className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
            {formatPrice(summary.sellerReceivesInr)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Estimated amount you&apos;ll receive after applicable marketplace services.
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.07] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <Landmark className="size-3.5" /> Order Total
          </div>
          <div className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-sky-400 tabular-nums">
            {formatPrice(orderTotal)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{totalLabel}</p>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="rounded-xl border border-border bg-surface/30 p-4 space-y-2">
        <Row label="Item Price" value={formatPrice(summary.priceInr)} />
        <Row
          label={`Platform Commission (${summary.commissionPercent}%)`}
          value={`− ${formatPrice(summary.commissionInr)}`}
          tone="deduct"
        />
        {isCheckout && summary.protectionSelected && (
          <Row
            label="Buyer Protection"
            value={`+ ${formatPrice(summary.protectionFeeInr)}`}
            tone="add"
          />
        )}
        {isCheckout && summary.processingFeeInr > 0 && summary.processingFeePayer === "buyer" && (
          <Row label="Processing Fee" value={`+ ${formatPrice(summary.processingFeeInr)}`} tone="add" />
        )}
        {summary.processingFeeInr > 0 && summary.processingFeePayer === "seller" && (
          <Row label="Processing Fee" value={`− ${formatPrice(summary.processingFeeInr)}`} tone="deduct" />
        )}
        <div className="h-px bg-border my-1" />
        <Row label="Estimated Seller Payout" value={formatPrice(summary.sellerReceivesInr)} strong />
        <Row label={isCheckout ? "Order Total" : "Buyer Pays"} value={formatPrice(orderTotal)} strong />
      </div>

      {/* What you get */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">What You Get With Every Order</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface/20 p-3">
              <f.icon className="size-4 text-gold mb-1.5" />
              <div className="text-xs font-semibold text-white leading-tight">{f.title}</div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* No hidden charges */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 flex items-start gap-2.5">
        <CheckCircle2 className="size-4 text-gold shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-white">No Hidden Charges</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            The amount shown above is exactly what you will receive after a successful transaction.
          </p>
        </div>
      </div>

      {/* Settlement timeline */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">Settlement Timeline</h4>
        <p className="text-[11px] text-muted-foreground mb-3">
          Funds follow a structured process to ensure safety for both buyers and sellers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TimelineStep
            index={1}
            icon={ShieldCheck}
            title="Escrow Hold Period"
            value={daysLabel(summary.escrowHoldDays)}
            body="Funds remain securely held during this period to allow delivery verification, buyer inspection and dispute resolution if required."
            tone="text-violet-300"
          />
          <TimelineStep
            index={2}
            icon={CalendarCheck}
            title="Settlement Eligibility"
            value="Immediately"
            body="Once the escrow hold period ends, your earnings become eligible for settlement."
            tone="text-sky-300"
          />
          <TimelineStep
            index={3}
            icon={Clock}
            title="Settlement Processing"
            value={daysLabel(summary.settlementProcessingDays)}
            body="After you request a withdrawal, our finance team processes the payout to your account."
            tone="text-emerald-300"
          />
          <TimelineStep
            index={4}
            icon={Landmark}
            title="Payout Sent"
            value="To Your Account"
            body="The amount will be credited to your selected withdrawal method once processing is completed."
            tone="text-gold"
          />
        </div>
        <div className="mt-3 rounded-lg border border-border bg-surface/20 p-2.5 flex items-start gap-2">
          <Info className="size-3.5 text-gold shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-snug">
            <span className="text-foreground font-medium">Note:</span> Timings vary based on your Seller
            Plan and the category of this listing
            {summary.categoryKey ? ` (${summary.categoryLabel}, ${planLabel(summary.plan)} plan)` : ""}. You can
            view detailed timings in your plan benefits.
          </p>
        </div>
      </div>

      {/* Flags — surfaced honestly, never invented values */}
      {summary.flags.unmappedCategory && (
        <FlagNote text="This category has no documented commission rate yet, so a legacy platform fee is applied. Final fees will be confirmed by the HUXZAIN team." />
      )}
      {summary.flags.protectionUnavailableForAmount && (
        <FlagNote text="Buyer Protection is not available for this order amount. Your order is still fully covered by escrow." />
      )}
    </div>
  );
}

function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function TimelineStep({
  index,
  icon: Icon,
  title,
  value,
  body,
  tone,
}: {
  index: number;
  icon: typeof ShieldCheck;
  title: string;
  value: string;
  body: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-7 rounded-full border border-border bg-surface/40 flex items-center justify-center ${tone}`}>
          <Icon className="size-3.5" />
        </div>
        <span className="text-[10px] text-muted-foreground font-semibold">Step {index}</span>
      </div>
      <div className="text-xs font-semibold text-white leading-tight">{title}</div>
      <div className={`text-sm font-bold mt-0.5 ${tone}`}>{value}</div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{body}</p>
    </div>
  );
}

function FlagNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5 flex items-start gap-2">
      <ShieldAlert className="size-3.5 text-amber-300 shrink-0 mt-0.5" />
      <p className="text-[10px] text-amber-200/90 leading-snug">{text}</p>
    </div>
  );
}
