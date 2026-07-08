/**
 * HUXZAIN User Communication, Safety Notices & Warning Framework
 * Developer Implementation Guide — All notices per spec document.
 *
 * This file contains every notice, warning, reminder and confirmation popup
 * required across the HUXZAIN platform as described in the official
 * Communication Framework document.
 */

import React, { useState } from "react";
import {
  AlertCircle,
  ShieldCheck,
  X,
  Check,
  Lock,
  FileText,
  Flag,
  Star,
  Info,
  ExternalLink,
  AlertTriangle,
  MessageCircle,
  Eye,
} from "lucide-react";

// ─── Shared base modal wrapper ───────────────────────────────────────────────

interface BaseModalProps {
  onClose?: () => void;
  zIndex?: number;
}

function ModalOverlay({
  children,
  zIndex = 70,
}: {
  children: React.ReactNode;
  zIndex?: number;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto"
      style={{ zIndex }}
    >
      <div className="my-8 w-full max-w-2xl">{children}</div>
    </div>
  );
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0b0c0f] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left max-h-[90vh] overflow-y-auto scrollbar-thin">
      {children}
    </div>
  );
}

function ModalTitle({
  icon,
  iconClass = "text-gold",
  children,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-3 border-b border-white/5 text-center">
      <h3 className={`font-display font-black text-xl lg:text-2xl ${iconClass} flex items-center justify-center gap-2 uppercase tracking-wider`}>
        {icon}
        {children}
      </h3>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-gold shrink-0 mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface CheckboxAck {
  id: string;
  label: string;
}

function AckCheckboxes({
  items,
  checked,
  onChange,
}: {
  items: CheckboxAck[];
  checked: Record<string, boolean>;
  onChange: (id: string, val: boolean) => void;
}) {
  return (
    <div className="space-y-2.5 border-t border-white/5 pt-3">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        Please acknowledge every statement to continue
      </div>
      {items.map((item) => (
        <label key={item.id} className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!checked[item.id]}
            onChange={(e) => onChange(item.id, e.target.checked)}
            className="rounded border-border text-gold focus:ring-gold/30 mt-0.5 cursor-pointer size-3.5 shrink-0"
          />
          <span className="text-[10px] leading-relaxed text-muted-foreground">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function allChecked(items: CheckboxAck[], checked: Record<string, boolean>) {
  return items.every((i) => !!checked[i.id]);
}

function PrimaryBtn({
  disabled,
  onClick,
  children,
  color = "gold",
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "gold" | "emerald" | "red";
}) {
  const colorMap = {
    gold: disabled
      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
      : "bg-gold text-black hover:bg-gold-light shadow-lg shadow-gold/10",
    emerald: disabled
      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
      : "bg-emerald-500 text-white hover:bg-emerald-600",
    red: disabled
      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
      : "bg-rose-500 text-white hover:bg-rose-600",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 h-11 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${colorMap[color]}`}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-11 text-xs font-semibold rounded-xl border border-border hover:bg-white/5 transition-all cursor-pointer bg-transparent text-foreground"
    >
      {children}
    </button>
  );
}

function PolicyLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-white/5">
      {links.map((l, idx) => (
        <a
          key={`${l.href}-${idx}`}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gold/70 hover:text-gold underline-offset-2 hover:underline flex items-center gap-0.5 transition-colors"
        >
          {l.label} <ExternalLink size={9} />
        </a>
      ))}
    </div>
  );
}

// ─── 1. Seller: Gaming Account Listing Published Successfully ─────────────────

export interface GamingListingPublishedNoticeProps extends BaseModalProps {
  onAcknowledge: () => void;
}

export function GamingListingPublishedNotice({ onAcknowledge }: GamingListingPublishedNoticeProps) {
  const acks: CheckboxAck[] = [
    { id: "auth", label: "I confirm that I am authorised to sell this gaming account." },
    { id: "no_stolen", label: "I understand that selling stolen, hacked or fraudulently obtained accounts is strictly prohibited." },
    { id: "no_recovery", label: "I understand that attempting to recover an account after completing a sale is considered a serious platform violation." },
    { id: "consequences", label: "I understand that HUXZAIN may freeze settlements, suspend my account, permanently remove my account or cooperate with banks, payment gateways and law enforcement authorities where fraudulent or criminal activity is reasonably suspected." },
    { id: "cooperate", label: "I understand that I may be requested to cooperate during future dispute investigations if this order is ever reviewed." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<ShieldCheck className="size-6" />} iconClass="text-gold">
          Gaming Account Listing Published Successfully
        </ModalTitle>

        <div className="space-y-3 font-sans text-xs text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed text-[11px]">
              Your gaming account listing has now been published and is available for buyers on HUXZAIN. Gaming accounts are one of the highest-risk categories on the marketplace due to recovery scams, stolen accounts, unauthorised ownership transfers and fraudulent transactions. HUXZAIN maintains a strict zero-tolerance policy against dishonest behaviour.
            </p>
            <p className="leading-relaxed text-[11px] mt-2 font-semibold text-white">Before accepting orders, please read the following responsibilities carefully.</p>
          </div>

          <BulletList items={[
            "Only sell gaming accounts that you legally own or have full authority to transfer.",
            "Never list stolen, hacked, borrowed, shared or fraudulently obtained accounts.",
            "Ensure every detail provided in your listing is accurate, truthful and up to date.",
            "If account credentials, linked email access or ownership information changes before a buyer purchases the listing, immediately update or temporarily disable the listing.",
            "Once a gaming account has been successfully sold, delivered and accepted by the buyer, you must never attempt to recover, reclaim or regain access to that account.",
            "Recovery scams may result in immediate settlement freezes, permanent account suspension, permanent removal from the platform and, where appropriate, legal action.",
            "HUXZAIN maintains detailed platform records including transaction history, order timelines, delivery logs and communication history to assist with dispute investigations.",
            "Honest sellers have nothing to worry about. These measures exist to protect genuine buyers, genuine sellers and the long-term trust of the HUXZAIN marketplace.",
          ]} />

          <p className="text-[10px] text-muted-foreground italic">
            Your reputation is one of your most valuable assets on HUXZAIN. Treat every buyer with professionalism and respect.
          </p>
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={() => window.open("/seller/guidelines", "_blank")}>
            View Seller Guidelines
          </SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onAcknowledge}>
            <Check size={14} /> I Understand & Continue
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[
          { label: "Seller Agreement", href: "/terms" },
          { label: "Community Guidelines", href: "/community-guidelines" },
        ]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 2. Seller: Order Room Entry (Gaming Accounts) ────────────────────────────

export interface SellerOrderRoomEntryGamingProps extends BaseModalProps {
  onEnter: () => void;
}

export function SellerOrderRoomEntryGaming({ onEnter }: SellerOrderRoomEntryGamingProps) {
  const acks: CheckboxAck[] = [
    { id: "professional", label: "I understand that I am expected to communicate professionally and respectfully throughout this order." },
    { id: "deliver", label: "I understand that I must deliver exactly what was advertised in my listing." },
    { id: "no_fraud", label: "I understand that I must not attempt recovery scams, account theft, payment fraud or any other dishonest activity." },
    { id: "keep_inside", label: "I understand that I should keep all important communication inside the HUXZAIN Order Room whenever possible." },
    { id: "refuse_outside", label: "I understand that if the buyer requests payment or communication outside HUXZAIN, I should refuse and report the incident through the platform." },
    { id: "cooperate", label: "I understand that I may be required to cooperate during future dispute investigations by providing truthful information and supporting evidence if requested by HUXZAIN." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<MessageCircle className="size-6" />} iconClass="text-gold">
          A New Customer Is Waiting For You
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Congratulations on receiving a new order. From this point onwards, you are not only representing yourself, but also representing HUXZAIN as a trusted marketplace. Every conversation, response and action you take directly affects your seller reputation and the buyer's confidence in the platform.
            </p>
          </div>

          <BulletList items={[
            "Treat every buyer politely and professionally, even if a disagreement occurs.",
            "Respond within a reasonable time whenever possible. Good communication builds trust.",
            "Deliver exactly what was advertised in your listing. Never substitute a different account without the buyer's clear agreement.",
            "Do not attempt any recovery scam after selling a gaming account.",
            "Never knowingly sell stolen, hacked, borrowed, rented or fraudulently obtained gaming accounts.",
            "Never ask the buyer to cancel the order and deal privately outside HUXZAIN.",
            "Never request payment through UPI, bank transfer, cryptocurrency or any method outside the HUXZAIN platform.",
            "Do not ask for personal contact details (WhatsApp, Telegram, Discord, Instagram, personal email) unless the service category specifically requires it.",
            "If the buyer requests off-platform transactions, politely refuse and immediately report through the Report User option.",
            "Keep all information truthful and transparent. Never make promises you cannot fulfil.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={() => window.open("/marketplace-policies", "_blank")}>
            View Marketplace Policies
          </SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onEnter} color="emerald">
            <ShieldCheck size={14} /> Enter Order Room
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[
          { label: "Marketplace Policies", href: "/terms" },
          { label: "Seller Agreement", href: "/terms" },
        ]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 3. Buyer: Order Room Entry (Gaming Accounts) ─────────────────────────────

export interface BuyerOrderRoomEntryGamingProps extends BaseModalProps {
  onEnter: () => void;
}

export function BuyerOrderRoomEntryGaming({ onEnter }: BuyerOrderRoomEntryGamingProps) {
  const acks: CheckboxAck[] = [
    { id: "inspect", label: "I understand that I should inspect and verify the gaming account before marking the order as completed." },
    { id: "inside", label: "I understand that I should keep important communication inside the HUXZAIN Order Room whenever possible." },
    { id: "evidence", label: "I understand that I should immediately preserve evidence if I experience any issue during this transaction." },
    { id: "no_outside", label: "I understand that requesting payments or completing transactions outside HUXZAIN removes important platform protections and violates HUXZAIN Marketplace Policies." },
    { id: "no_false", label: "I understand that false disputes, fraudulent claims, fabricated evidence or attempts to intentionally misuse HUXZAIN's dispute system may result in account restrictions, permanent suspension and, in serious cases involving fraud or unlawful activity, legal action or cooperation with law enforcement authorities." },
    { id: "review", label: "I understand that submitting an honest review after completing my order helps improve the HUXZAIN community." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Lock className="size-6" />} iconClass="text-blue-400">
          Welcome To Your Secure Order Room
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your order has been successfully created. This Order Room has been provided to help you communicate securely with the seller while keeping an official record of your transaction. Every important message exchanged inside this Order Room may help HUXZAIN investigate disputes fairly if any issue arises later.
            </p>
          </div>

          <BulletList items={[
            "Do not mark this order as completed until you have successfully received, inspected and verified the gaming account.",
            "Carefully verify that the delivered account matches the listing description, including rank, skins, region, linked email status, recovery information and any other advertised details.",
            "If login credentials are delivered instantly, inspect the account first before making any permanent changes.",
            "If the seller is completing ownership transfer manually, allow reasonable time before reporting a problem.",
            "Keep all important communication inside the HUXZAIN Order Room whenever possible.",
            "Do not request the seller's personal contact information unless the purchased category genuinely requires external communication.",
            "If the seller asks you to make payments outside HUXZAIN, politely refuse and immediately report the conversation.",
            "Do not attempt to pressure, threaten or blackmail sellers by demanding refunds, threatening negative reviews or opening false disputes.",
            "If you experience any problem, preserve evidence immediately. Screenshots, screen recordings and conversation history help moderators investigate disputes fairly.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={() => window.open("/buyer-protection", "_blank")}>
            View Buyer Protection Policy
          </SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onEnter} color="emerald">
            <ShieldCheck size={14} /> Enter Order Room
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[
          { label: "Buyer Agreement", href: "/terms" },
          { label: "Dispute Resolution Policy", href: "/terms" },
          { label: "Refund Policy", href: "/refund-policy" },
        ]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 4. Buyer: Before Revealing Credentials / Secure Delivery ────────────────

export interface RevealSecureDeliveryNoticeProps {
  onReveal: () => void;
  onCancel: () => void;
}

export function RevealSecureDeliveryNotice({ onReveal, onCancel }: RevealSecureDeliveryNoticeProps) {
  const acks: CheckboxAck[] = [
    { id: "understand", label: "I understand that I am about to reveal confidential delivery information." },
    { id: "screen_rec", label: "I understand that screen recording is strongly recommended for activation codes, gift cards, software licences and similar products." },
    { id: "preserve", label: "I understand that if I experience any issue, I should preserve evidence before opening a dispute." },
    { id: "refund", label: "I understand that refund eligibility may differ once confidential information has been revealed depending on the purchased product and the HUXZAIN Refund Policy." },
    { id: "records", label: "I understand that HUXZAIN records important delivery events to help investigate disputes fairly." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Eye className="size-6" />} iconClass="text-amber-400">
          Before Revealing Your Secure Delivery
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              You are about to reveal confidential delivery information that has been securely stored by HUXZAIN. Please make sure you are ready before continuing. For many digital products, revealing credentials is considered the point at which confidential information has been delivered.
            </p>
          </div>

          <BulletList items={[
            "If your purchase contains a one-time redeemable code (gift card, activation key, software licence), we strongly recommend recording your screen before revealing and redeeming.",
            "If your purchase contains account credentials, verify the account before making permanent changes such as changing passwords or linked email addresses.",
            "Carefully read all delivery instructions before attempting activation or login.",
            "If you discover any issue, stop immediately and preserve evidence before making repeated activation attempts or modifying the delivered account.",
            "Do not share the revealed information with anyone else.",
            "Keep all important communication regarding this delivery inside the HUXZAIN Order Room.",
            "Once confidential information has been revealed, HUXZAIN cannot hide, replace or make that information confidential again for this order.",
            "Depending on the product purchased, revealing confidential information may affect refund eligibility under the HUXZAIN Refund Policy.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onReveal} color="emerald">
            <Eye size={14} /> Reveal Secure Delivery
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "View Refund Policy", href: "/refund-policy" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 5. Buyer: Before Marking Order Complete (Gaming Accounts) ────────────────

export interface BeforeCompleteOrderNoticeProps {
  onComplete: () => void;
  onReturn: () => void;
  onReportProblem: () => void;
}

export function BeforeCompleteOrderNotice({ onComplete, onReturn, onReportProblem }: BeforeCompleteOrderNoticeProps) {
  const acks: CheckboxAck[] = [
    { id: "inspected", label: "I confirm that I have successfully inspected the gaming account." },
    { id: "matches", label: "I confirm that the delivered account matches the listing description to the best of my knowledge." },
    { id: "received_all", label: "I confirm that I have received every item, access or ownership transfer promised in the listing." },
    { id: "no_unresolved", label: "I understand that if I am experiencing any unresolved issue, I should report the problem before completing this order." },
    { id: "no_false_completion", label: "I understand that intentionally submitting false completion confirmations or attempting to misuse HUXZAIN's dispute process may result in account restrictions, suspension or other actions under HUXZAIN Marketplace Policies." },
    { id: "honest_review", label: "I understand that leaving an honest review helps strengthen the HUXZAIN community." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<ShieldCheck className="size-6" />} iconClass="text-emerald-400">
          Before You Complete This Order
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              You are about to confirm that this order has been successfully completed. Please do not continue unless you have fully inspected the gaming account and are satisfied that it matches the listing description.
            </p>
            <p className="mt-2 text-amber-300 font-semibold">
              Once you confirm successful completion, the seller's settlement process will begin. If you discover a problem after confirming completion, resolving the issue may become significantly more difficult.
            </p>
          </div>

          <p className="text-[10px] font-semibold text-white">Before continuing, please carefully verify the following.</p>
          <BulletList items={[
            "You have successfully logged into the gaming account.",
            "The username and password provided by the seller are correct.",
            "The gaming account matches the listing description, including rank, skins, inventory, region, statistics and any other advertised features.",
            "If email access or ownership transfer was included in the listing, you have successfully received and verified it.",
            "If the seller promised any additional items or services, they have already been delivered.",
            "You have checked that the account is fully accessible without unexpected restrictions.",
            "You have reviewed the Order Room conversation and confirmed that there are no unresolved issues remaining.",
          ]} />

          <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl text-[10px] text-rose-300">
            If you have any doubts about the order, do not mark it as completed.{" "}
            <button onClick={onReportProblem} className="underline font-semibold cursor-pointer bg-transparent border-none text-rose-300 hover:text-rose-100">
              Report a Problem
            </button>{" "}
            instead.
          </div>
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return to Order Room</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onComplete} color="emerald">
            <Check size={14} /> Mark Order as Complete
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 6. Seller: Order Successfully Completed (Gaming Accounts) ────────────────

export interface SellerOrderCompletedGamingProps {
  onClose: () => void;
}

export function SellerOrderCompletedGaming({ onClose }: SellerOrderCompletedGamingProps) {
  const acks: CheckboxAck[] = [
    { id: "no_recovery", label: "I understand that I must never attempt to recover or reclaim a gaming account after successfully selling it." },
    { id: "professional", label: "I understand that I should continue behaving professionally even after the order has been completed." },
    { id: "no_review_manip", label: "I understand that manipulating reviews, threatening buyers or engaging in dishonest post-sale behaviour violates HUXZAIN Marketplace Policies." },
    { id: "cooperate", label: "I understand that I may be required to cooperate during future investigations if questions arise regarding this transaction." },
    { id: "consequences", label: "I understand that serious fraud, recovery scams or deliberate misconduct may result in settlement suspension, permanent account removal and, where appropriate, legal action." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Star className="size-6" />} iconClass="text-gold">
          Congratulations! Your Order Has Been Successfully Completed
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Congratulations on successfully completing another order on HUXZAIN. Every successfully completed order helps strengthen your reputation, increases buyer confidence and improves your chances of receiving future orders. Professional sellers consistently earn more because buyers naturally return to sellers they trust.
            </p>
          </div>

          <p className="text-[10px] font-semibold text-white">Although this order has been completed, there are still a few important responsibilities that continue after the sale.</p>
          <BulletList items={[
            "Never attempt to recover, reclaim or regain access to a gaming account after completing a successful sale.",
            "Never change passwords, linked email addresses or recovery information after the buyer has accepted delivery.",
            "If the buyer contacts you regarding a genuine post-sale issue, cooperate professionally whenever reasonably possible.",
            "Continue treating the buyer respectfully even after the transaction has been completed.",
            "Do not contact buyers for personal reasons after completing the transaction.",
            "Never request that buyers change or remove honest reviews.",
            "Do not offer money, discounts or rewards in exchange for positive reviews.",
            "Never threaten buyers regarding reviews, disputes or future support.",
            "If HUXZAIN contacts you regarding a dispute investigation or compliance review, cooperate honestly.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={() => window.open("/seller/analytics", "_blank")}>
            View Seller Performance
          </SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onClose} color="gold">
            <Check size={14} /> Return to Dashboard
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 7. Buyer: Order Successfully Completed (Gaming Accounts) ─────────────────

export interface BuyerOrderCompletedGamingProps {
  onLeaveReview: () => void;
  onClose: () => void;
}

export function BuyerOrderCompletedGaming({ onLeaveReview, onClose }: BuyerOrderCompletedGamingProps) {
  const acks: CheckboxAck[] = [
    { id: "report", label: "I understand that I should immediately report any suspicious post-sale behaviour through official HUXZAIN support." },
    { id: "outside", label: "I understand that transactions completed outside HUXZAIN are not protected under HUXZAIN Marketplace Policies." },
    { id: "review", label: "I understand that honest reviews help improve the HUXZAIN community." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Star className="size-6" />} iconClass="text-gold">
          Thank You For Shopping With HUXZAIN
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your order has been successfully completed. Thank you for choosing HUXZAIN. We hope you are satisfied with your purchase and had a smooth buying experience. Your feedback plays an important role in helping us build a safe and trustworthy marketplace.
            </p>
          </div>

          <BulletList items={[
            "Keep your Order Room conversations for future reference if you require post-sale assistance.",
            "If the seller offered warranty or post-sale support, communicate through the HUXZAIN Order Room whenever possible.",
            "Never share your HUXZAIN account credentials with anyone claiming to represent HUXZAIN. Our staff will never ask for your password.",
            "Be cautious of anyone contacting you outside HUXZAIN claiming to be the original owner of the gaming account.",
            "If anyone attempts to recover the gaming account or engages in suspicious behaviour, immediately report the incident through HUXZAIN Help Centre.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onClose}>Return to Dashboard</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onLeaveReview} color="gold">
            <Star size={14} /> Leave a Review
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "Visit Help Centre", href: "/support" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 8. Seller: Before Opening a Dispute (All Categories) ────────────────────

export interface BeforeDisputeSellerProps {
  onContinue: () => void;
  onReturn: () => void;
}

export function BeforeDisputeSeller({ onContinue, onReturn }: BeforeDisputeSellerProps) {
  const acks: CheckboxAck[] = [
    { id: "attempted", label: "I confirm that I have genuinely attempted to resolve this issue professionally." },
    { id: "truthful", label: "I confirm that the information and evidence I submit will be truthful and accurate." },
    { id: "no_false_evidence", label: "I understand that deliberately submitting false evidence or fraudulent claims is a serious violation of HUXZAIN Marketplace Policies." },
    { id: "provide_info", label: "I understand that I may be requested to provide additional information during the investigation." },
    { id: "fair", label: "I understand that HUXZAIN will investigate this dispute fairly using platform records and available evidence." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertCircle className="size-6" />} iconClass="text-amber-400">
          Before You Open A Dispute
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed text-[11px]">
            Disputes should always be the final option after reasonable communication has taken place. Many issues can be resolved quickly through polite communication without requiring moderator intervention.
          </p>

          <BulletList items={[
            "Explain the issue clearly and professionally.",
            "Upload every piece of evidence that supports your claim.",
            "Never upload edited screenshots, fabricated conversations, manipulated recordings or false documents.",
            "Never threaten the buyer with legal action, bad reviews or harassment to force a favourable outcome.",
            "Do not repeatedly contact the buyer outside HUXZAIN regarding this dispute.",
            "Continue communicating respectfully even if you disagree with the buyer.",
            "HUXZAIN investigates disputes using platform records, Secure Delivery Logs, Order Timelines, payment records and chat history.",
            "Moderators do not automatically favour buyers or sellers. Every decision is made after reviewing available evidence.",
            "Deliberately submitting false evidence may result in settlement suspension, account restrictions or, where appropriate, legal proceedings.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return To Order Room</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onContinue} color="red">
            <AlertCircle size={14} /> Continue To Dispute
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "View Dispute Resolution Policy", href: "/terms" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 9. Buyer: Before Opening a Dispute (All Categories) ─────────────────────

export interface BeforeDisputeBuyerProps {
  onContinue: () => void;
  onReturn: () => void;
}

export function BeforeDisputeBuyer({ onContinue, onReturn }: BeforeDisputeBuyerProps) {
  const acks: CheckboxAck[] = [
    { id: "truthful", label: "I confirm that the information I submit will be truthful and accurate." },
    { id: "evidence", label: "I understand that evidence helps HUXZAIN investigate disputes fairly." },
    { id: "no_false", label: "I understand that false disputes, fabricated evidence or fraudulent claims are serious violations of HUXZAIN Marketplace Policies." },
    { id: "impartial", label: "I understand that HUXZAIN investigates every dispute impartially using available platform records and evidence." },
    { id: "more_info", label: "I understand that additional information may be requested before a final decision is made." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertCircle className="size-6" />} iconClass="text-rose-400">
          Before You Report A Problem
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed text-[11px]">
            We're sorry to hear that you're experiencing an issue with your order. Our goal is always to resolve disputes fairly for both buyers and sellers.
          </p>

          <BulletList items={[
            "Clearly explain what happened and avoid emotional or abusive language.",
            "Upload screenshots, screen recordings or any other evidence that supports your claim.",
            "If your order involved activation keys, gift cards, software licences or redemption codes, screen recordings of the activation process are highly recommended.",
            "Do not continue using the product if you believe it was delivered incorrectly until the issue has been reviewed.",
            "Continue communicating respectfully with the seller while the dispute is being investigated.",
            "HUXZAIN investigates disputes using available evidence, Secure Delivery Logs, Order Timelines, payment records and communication history.",
            "HUXZAIN does not issue refunds simply because a dispute has been opened. Every case is reviewed individually based on available facts.",
            "Submitting fabricated evidence, intentionally false claims, review blackmail, payment fraud or abusing the dispute process may result in account suspension, permanent removal and, where appropriate, legal action.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return To Order Room</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onContinue} color="red">
            <AlertCircle size={14} /> Continue To Dispute
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "View Dispute Resolution Policy", href: "/terms" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 10. Seller: Before Deleting / Unpublishing a Listing ────────────────────

export interface BeforeDeleteListingNoticeProps {
  hasActiveOrders: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BeforeDeleteListingNotice({ hasActiveOrders, onConfirm, onCancel }: BeforeDeleteListingNoticeProps) {
  const acks: CheckboxAck[] = [
    { id: "no_affect", label: "I understand that removing this listing will not affect existing orders." },
    { id: "still_responsible", label: "I understand that I remain responsible for completing every active order associated with this listing." },
    { id: "prevention", label: "I understand that HUXZAIN may prevent deletion if active transactions or investigations are still in progress." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (hasActiveOrders) {
    return (
      <ModalOverlay>
        <ModalCard>
          <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-rose-400">
            Cannot Remove This Listing
          </ModalTitle>
          <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl text-[11px] text-muted-foreground space-y-2">
            <p className="font-semibold text-rose-300">This listing currently has active or pending orders.</p>
            <p>For the protection of your buyers, HUXZAIN does not allow listings to be removed while orders remain active, disputed or incomplete. Please complete or resolve all existing orders before removing this listing.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <PrimaryBtn onClick={onCancel} color="gold">
              <Check size={14} /> I Understand
            </PrimaryBtn>
          </div>
        </ModalCard>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-amber-400">
          Before You Remove This Listing
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              You are about to remove this listing from HUXZAIN. Once unpublished, new buyers will no longer be able to purchase this listing. Existing orders will continue to remain available inside your dashboard until they are completed or otherwise resolved.
            </p>
          </div>

          <BulletList items={[
            "Removing this listing will not cancel any existing orders.",
            "You remain responsible for completing every order that has already been placed before this listing was unpublished.",
            "If your listing currently has pending deliveries, active disputes or incomplete transactions, you must continue cooperating until those orders are resolved.",
            "If you no longer own this product or it is no longer available, unpublishing is recommended instead of leaving inaccurate information visible to buyers.",
            "If your inventory has become unavailable temporarily, consider marking it as Out of Stock instead of deleting it completely.",
            "Historical transaction records, completed orders and dispute records will continue to remain securely stored by HUXZAIN after this listing has been unpublished.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onConfirm} color="red">
            <AlertTriangle size={14} /> Unpublish Listing
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 11. Seller: Inventory Successfully Uploaded ──────────────────────────────

export interface InventoryUploadedNoticeProps {
  onContinue: () => void;
  onManageListing: () => void;
}

export function InventoryUploadedNotice({ onContinue, onManageListing }: InventoryUploadedNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<ShieldCheck className="size-6" />} iconClass="text-emerald-400">
          Inventory Successfully Updated
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your inventory has been successfully added to this listing. Every inventory item uploaded through HUXZAIN will remain securely stored until it is automatically assigned to a paid customer order.
            </p>
            <p className="mt-2 font-semibold text-amber-300">
              Once an inventory item has been assigned to a completed payment, it becomes permanently linked to that order and cannot be edited or reassigned by the seller.
            </p>
          </div>

          <BulletList items={[
            "Please make sure that every uploaded code, key, account or digital asset is genuine, unused where applicable and ready for delivery.",
            "Providing duplicate, invalid, previously redeemed or intentionally misleading inventory may result in order disputes, settlement delays, account restrictions or permanent removal from the HUXZAIN Marketplace.",
          ]} />
        </div>

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onManageListing}>Manage Listing</SecondaryBtn>
          <PrimaryBtn onClick={onContinue} color="emerald">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 12. Seller: Before Uploading Secure Delivery Information ─────────────────

export interface BeforeUploadSecureDeliveryProps {
  onContinue: () => void;
  onCancel: () => void;
}

export function BeforeUploadSecureDelivery({ onContinue, onCancel }: BeforeUploadSecureDeliveryProps) {
  const acks: CheckboxAck[] = [
    { id: "genuine", label: "I confirm that every delivery item uploaded is genuine and authorised for sale." },
    { id: "no_invalid", label: "I understand that duplicate, invalid or fraudulent inventory is strictly prohibited." },
    { id: "locked", label: "I understand that assigned delivery items cannot be edited after they have been delivered to a customer." },
    { id: "cooperate", label: "I understand that HUXZAIN may request additional information if questions arise regarding my uploaded inventory." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Lock className="size-6" />} iconClass="text-gold">
          Before Uploading Secure Delivery Information
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              The information you are about to upload will become the official delivery information for future customer orders. Please ensure that everything you upload is accurate, genuine and ready for delivery.
            </p>
          </div>

          <BulletList items={[
            "Upload only genuine products that you are authorised to sell.",
            "Never upload duplicate, previously redeemed, invalid or intentionally misleading inventory.",
            "Carefully verify every code, credential or delivery item before saving it.",
            "Once a delivery item has been assigned to a paid customer order, it becomes permanently linked to that order and cannot be edited or replaced by the seller.",
            "If you discover a mistake before any customer purchases the listing, immediately correct or replace the affected inventory.",
            "Never intentionally upload fake inventory for testing purposes on live listings.",
            "If HUXZAIN requests supporting evidence regarding uploaded inventory, cooperate honestly during the investigation.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onContinue} color="gold">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 13. Seller: Listing Out of Stock ────────────────────────────────────────

export interface OutOfStockNoticeProps {
  onManageInventory: () => void;
  onClose: () => void;
}

export function OutOfStockNotice({ onManageInventory, onClose }: OutOfStockNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertCircle className="size-6" />} iconClass="text-amber-400">
          Your Listing Is Currently Out Of Stock
        </ModalTitle>

        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-[11px] text-muted-foreground space-y-2">
          <p>Your listing is currently unavailable because all available inventory has been successfully assigned to customer orders. No further purchases can be made until additional inventory has been uploaded.</p>
          <p className="font-semibold text-white">You do not need to create a new listing.</p>
          <p>Simply upload additional inventory and your listing will automatically become available again. Keeping one well-maintained listing with accurate inventory helps preserve your reviews, sales history and marketplace reputation.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onClose}>Return To Dashboard</SecondaryBtn>
          <PrimaryBtn onClick={onManageInventory} color="gold">
            <ShieldCheck size={14} /> Manage Inventory
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 14. Seller: Low Inventory Reminder ──────────────────────────────────────

export interface LowInventoryReminderProps {
  onUpload: () => void;
  onRemindLater: () => void;
}

export function LowInventoryReminder({ onUpload, onRemindLater }: LowInventoryReminderProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-amber-400">
          Your Inventory Is Running Low
        </ModalTitle>

        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-[11px] text-muted-foreground space-y-2">
          <p>Your listing is running low on available inventory. Uploading additional inventory before your stock reaches zero helps prevent interruptions to your sales and ensures buyers can continue purchasing without delays.</p>
          <p className="text-amber-300 font-semibold">If your listing becomes Out of Stock, HUXZAIN will automatically stop accepting new orders until additional inventory becomes available.</p>
          <p>Keeping your inventory updated provides a better experience for buyers and helps maximise your sales opportunities.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onRemindLater}>Remind Me Later</SecondaryBtn>
          <PrimaryBtn onClick={onUpload} color="gold">
            <ShieldCheck size={14} /> Upload Inventory
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 15. Universal: Before Purchase (Checkout) ───────────────────────────────

export interface BeforePurchaseNoticeProps {
  onProceed: () => void;
  onBack: () => void;
}

export function BeforePurchaseNotice({ onProceed, onBack }: BeforePurchaseNoticeProps) {
  const acks: CheckboxAck[] = [
    { id: "independent", label: "I understand that I am purchasing from an independent seller using the HUXZAIN Marketplace." },
    { id: "not_owner", label: "I understand that HUXZAIN provides marketplace protection but does not become the owner or supplier of products listed by sellers." },
    { id: "refund", label: "I understand that refund eligibility depends on HUXZAIN Marketplace Policies and the circumstances of each order." },
    { id: "evidence", label: "I understand that preserving evidence helps HUXZAIN investigate disputes fairly." },
    { id: "terms", label: "I have read and agree to the Terms & Conditions, Refund Policy and Buyer Agreement." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<ShieldCheck className="size-6" />} iconClass="text-gold">
          Before You Complete Your Purchase
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              HUXZAIN operates as a secure digital marketplace. We provide secure payments, order management, escrow protection, dispute resolution and marketplace security. However, the products and services listed on HUXZAIN are offered directly by independent sellers, who remain responsible for the accuracy, quality, ownership and delivery of their listings.
            </p>
          </div>

          <BulletList items={[
            "Carefully read the complete listing description before purchasing.",
            "Verify that the selected product, service or account matches your requirements.",
            "Review the seller's ratings, reviews and previous order history whenever available.",
            "If any information is unclear, ask the seller through HUXZAIN before placing your order.",
            "Never assume that a product includes additional items or services unless they are specifically mentioned in the listing.",
            "HUXZAIN will always assist in resolving genuine disputes fairly, but refund decisions are based on available evidence, marketplace policies and the circumstances of each individual case.",
            "Purchasing a product does not automatically guarantee eligibility for a refund simply because you changed your mind.",
            "Some digital products become non-returnable after confidential information has been revealed, activated, downloaded or consumed.",
            "If you experience any issue after purchase, preserve evidence immediately and report through HUXZAIN.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onBack}>Continue Shopping</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onProceed} color="gold">
            <ShieldCheck size={14} /> Proceed To Payment
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[
          { label: "Terms & Conditions", href: "/terms" },
          { label: "Refund Policy", href: "/refund-policy" },
          { label: "Buyer Agreement", href: "/terms" },
        ]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 16. Universal: External Contact Warning ──────────────────────────────────

export type CategoryType = "restricted" | "allowed";

export interface ExternalContactWarningProps {
  categoryType: CategoryType;
  onGoBack: () => void;
  onSendAnyway: () => void;
}

export function ExternalContactWarning({ categoryType, onGoBack, onSendAnyway }: ExternalContactWarningProps) {
  if (categoryType === "restricted") {
    return (
      <ModalOverlay zIndex={80}>
        <ModalCard>
          <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-rose-400">
            Keep Your Transaction Protected
          </ModalTitle>

          <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
            <div className="bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-2xl">
              <p className="leading-relaxed">
                The message you are about to send appears to contain personal contact information. For this category, external communication is generally unnecessary and may reduce the protection provided by HUXZAIN. When important conversations take place outside the platform, our moderators cannot verify those discussions during disputes.
              </p>
            </div>

            <BulletList items={[
              "Never send payments outside HUXZAIN.",
              "Never continue the transaction privately.",
              "Never share confidential personal information unless absolutely necessary.",
              "If another user pressures you to move the transaction outside HUXZAIN, please report the conversation immediately.",
            ]} />

            <p className="text-[10px] text-amber-300/80 italic">
              If you continue, HUXZAIN may record that this warning was displayed as part of the order history.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <SecondaryBtn onClick={onSendAnyway}>Send Anyway</SecondaryBtn>
            <PrimaryBtn onClick={onGoBack} color="gold">
              <ShieldCheck size={14} /> Go Back
            </PrimaryBtn>
          </div>

          <PolicyLinks links={[{ label: "Why Is This Important?", href: "/terms" }]} />
        </ModalCard>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay zIndex={80}>
      <ModalCard>
        <ModalTitle icon={<Info className="size-6" />} iconClass="text-blue-400">
          External Communication May Be Required
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            This service may reasonably require communication through voice calls, screen sharing, remote assistance software or other collaboration platforms. You may communicate outside HUXZAIN where genuinely necessary to complete the purchased service.
          </p>
          <p className="font-semibold text-white">However, we strongly recommend keeping all important business decisions recorded inside the HUXZAIN Order Room.</p>
          <BulletList items={[
            "Project requirements.",
            "Price changes or additional work agreements.",
            "Delivery and completion confirmations.",
            "Dispute-related discussions.",
          ]} />
          <p className="text-amber-300/80">Never make payments outside HUXZAIN simply because communication moved elsewhere. Doing so removes important marketplace protections.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onGoBack}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={onSendAnyway} color="emerald">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 17. Universal: Marketplace Communication Standards ──────────────────────

export interface MarketplaceCommunicationStandardsProps {
  onContinue: () => void;
}

export function MarketplaceCommunicationStandards({ onContinue }: MarketplaceCommunicationStandardsProps) {
  const acks: CheckboxAck[] = [
    { id: "respectful", label: "I will communicate respectfully throughout this order." },
    { id: "reviewed", label: "I understand that important Order Room conversations may be reviewed during future dispute investigations." },
    { id: "no_abuse", label: "I understand that abusive behaviour, harassment or threats violate HUXZAIN Community Guidelines." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<MessageCircle className="size-6" />} iconClass="text-gold">
          Professional Communication Starts Here
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Welcome to the HUXZAIN Order Room. This conversation is the official communication channel for your order. Every important message exchanged here becomes part of the order history and may be reviewed by HUXZAIN moderators if a dispute arises in the future.
            </p>
          </div>

          <BulletList items={[
            "Treat the other party with courtesy and respect at all times.",
            "Keep conversations related to the order only.",
            "Avoid abusive language, threats, discrimination, harassment or personal attacks.",
            "Clearly explain your questions, requests or concerns.",
            "If a misunderstanding occurs, try resolving it professionally before escalating the matter.",
            "Never intentionally mislead the other party.",
            "Never impersonate HUXZAIN employees or moderators.",
            "Never share another person's private information without permission.",
            "Do not use the Order Room for spam, advertising or promoting other marketplaces.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={() => window.open("/community-guidelines", "_blank")}>
            Community Guidelines
          </SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onContinue} color="gold">
            <MessageCircle size={14} /> Enter Conversation
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 18. Universal: Before Cancelling An Order ───────────────────────────────

export interface BeforeCancelOrderProps {
  onContinue: () => void;
  onReturn: () => void;
  onReportProblem: () => void;
}

export function BeforeCancelOrder({ onContinue, onReturn, onReportProblem }: BeforeCancelOrderProps) {
  const acks: CheckboxAck[] = [
    { id: "truthful", label: "I confirm that the cancellation reason I provide will be truthful." },
    { id: "abuse", label: "I understand that repeated abuse of cancellations may affect my marketplace standing." },
    { id: "review", label: "I understand that HUXZAIN may review this cancellation if required." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-amber-400">
          Before Cancelling This Order
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            You are requesting to cancel this order. Before continuing, please make sure cancellation is genuinely necessary. Many orders can be completed successfully through professional communication without requiring cancellation.
          </p>

          <BulletList items={[
            "Clearly explain the reason for cancellation.",
            "Be truthful when selecting the cancellation reason.",
            "Do not abuse cancellations to avoid platform fees or marketplace policies.",
            "Do not pressure the other party into cancelling for dishonest reasons.",
            "HUXZAIN may review repeated cancellations as part of overall marketplace behaviour.",
            "Cancelling an order does not automatically remove transaction records from HUXZAIN.",
          ]} />

          <div className="bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-xl text-[10px] text-blue-300">
            If this cancellation relates to fraud or policy violations, consider{" "}
            <button onClick={onReportProblem} className="underline font-semibold cursor-pointer bg-transparent border-none text-blue-300">
              reporting the issue
            </button>{" "}
            instead of simply cancelling the order.
          </div>
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return To Order</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onContinue} color="red">
            <AlertTriangle size={14} /> Continue Cancellation
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 19. Universal: Before Submitting A Review ───────────────────────────────

export interface BeforeSubmitReviewProps {
  onSubmit: () => void;
  onBack: () => void;
}

export function BeforeSubmitReview({ onSubmit, onBack }: BeforeSubmitReviewProps) {
  const acks: CheckboxAck[] = [
    { id: "genuine", label: "I confirm that this review is based on my genuine personal experience." },
    { id: "no_false", label: "I understand that intentionally false, misleading or abusive reviews violate HUXZAIN Marketplace Policies." },
    { id: "no_pressure", label: "I understand that reviews must not be used to threaten, blackmail or pressure another user." },
    { id: "removal", label: "I understand that HUXZAIN may remove reviews that violate Community Guidelines." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Star className="size-6" />} iconClass="text-gold">
          Share Your Honest Experience
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your review helps shape the HUXZAIN community. Thousands of future buyers may rely on your feedback when deciding whether to purchase from this seller. Please ensure your review is based only on your genuine personal experience with this order.
            </p>
          </div>

          <BulletList items={[
            "Write honestly and fairly.",
            "Review the actual product, service and overall buying experience.",
            "Avoid abusive, offensive, threatening or discriminatory language.",
            "Do not leave a negative review simply because the seller refused requests outside the original agreement.",
            "Do not leave a positive review because you were offered money, discounts, gifts or future benefits.",
            "Do not include private information such as phone numbers, email addresses or payment details.",
            "If you experienced a genuine unresolved issue, consider opening a dispute instead of using reviews to pressure the seller.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onBack}>Go Back</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onSubmit} color="gold">
            <Star size={14} /> Submit Review
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "Review Guidelines", href: "/community-guidelines" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 20. Seller: Before Replying To A Review ─────────────────────────────────

export interface BeforeReviewReplyProps {
  onWrite: () => void;
  onCancel: () => void;
}

export function BeforeReviewReply({ onWrite, onCancel }: BeforeReviewReplyProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<MessageCircle className="size-6" />} iconClass="text-gold">
          Respond Professionally
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            Buyer reviews are an important part of building trust within the HUXZAIN Marketplace. If you choose to reply, please remain professional and respectful. A thoughtful response often leaves a better impression than an emotional reaction.
          </p>

          <BulletList items={[
            "Address the review professionally.",
            "Never insult, threaten or harass the buyer.",
            "Never reveal private customer information.",
            "Never accuse the buyer publicly without evidence.",
            "If you disagree with the review, explain your perspective politely.",
            "If you believe the review violates Marketplace Policies, report it instead of arguing publicly.",
          ]} />

          <p className="text-[10px] italic">Professional responses demonstrate confidence and help future buyers trust your business.</p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={onWrite} color="gold">
            <MessageCircle size={14} /> Write Reply
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 21. Universal: Before Contacting Support ────────────────────────────────

export interface BeforeContactSupportProps {
  onContinue: () => void;
  onHelpCentre: () => void;
}

export function BeforeContactSupport({ onContinue, onHelpCentre }: BeforeContactSupportProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Info className="size-6" />} iconClass="text-blue-400">
          Before Contacting Support
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            We're always happy to help. Before contacting our Support Team, please check whether your question can be resolved more quickly through the HUXZAIN Help Centre or by communicating with the other party through your Order Room.
          </p>

          <p className="font-semibold text-white">Helpful information to include with your request:</p>
          <BulletList items={[
            "Order Number",
            "Listing Name",
            "Screenshots or Screen Recordings",
            "Error Messages",
            "Payment Reference",
            "Description of the issue",
          ]} />

          <p className="text-[10px]">Submitting complete information helps reduce delays and unnecessary follow-up questions. Please remember that abusive language, threats or repeated spam tickets do not speed up investigations and may violate HUXZAIN Community Guidelines.</p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={onHelpCentre}>Visit Help Centre</SecondaryBtn>
          <PrimaryBtn onClick={onContinue} color="gold">
            <MessageCircle size={14} /> Continue To Support
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 22. Universal: Before Closing A Support Ticket ──────────────────────────

export interface BeforeCloseTicketProps {
  onClose: () => void;
  onReturn: () => void;
}

export function BeforeCloseTicket({ onClose, onReturn }: BeforeCloseTicketProps) {
  const acks: CheckboxAck[] = [
    { id: "resolved", label: "I confirm that my issue has been resolved." },
    { id: "new_ticket", label: "I understand that I can create a new support request if I require further assistance in the future." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<AlertTriangle className="size-6" />} iconClass="text-amber-400">
          Before Closing This Support Request
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            You are about to close this support request. Please make sure your issue has been fully resolved before continuing. Once this ticket has been closed, further assistance regarding the same issue may require opening a new support request.
          </p>
          <p>If you still have unanswered questions or require additional assistance, we recommend keeping this ticket open until everything has been resolved.</p>
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return To Support</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onClose} color="red">
            <Check size={14} /> Close Ticket
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 23. Universal: Before Withdrawing Earnings ──────────────────────────────

export interface BeforeWithdrawEarningsProps {
  onWithdraw: () => void;
  onReturn: () => void;
}

export function BeforeWithdrawEarnings({ onWithdraw, onReturn }: BeforeWithdrawEarningsProps) {
  const acks: CheckboxAck[] = [
    { id: "bank_correct", label: "I confirm that my registered bank account details are correct." },
    { id: "cleared", label: "I understand that only cleared earnings are eligible for withdrawal." },
    { id: "delay", label: "I understand that HUXZAIN may temporarily delay withdrawals where fraud prevention, dispute investigations or compliance reviews require additional verification." },
    { id: "records", label: "I understand that I am responsible for maintaining my own financial and taxation records where required under applicable laws." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<FileText className="size-6" />} iconClass="text-gold">
          Before You Withdraw Your Earnings
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">You are about to request a withdrawal from your HUXZAIN Seller Wallet. Before continuing, please review the following information.</p>
          </div>

          <BulletList items={[
            "Only cleared earnings are available for withdrawal. Orders still under escrow, pending review, under dispute or awaiting settlement are not eligible until successfully completed.",
            "Please verify your registered bank account before submitting this request. HUXZAIN is not responsible for delays caused by incorrect banking information.",
            "Once your withdrawal request has been submitted, it may not be cancelled if processing has already begun.",
            "Withdrawal processing times may vary depending on weekends, bank holidays, payment providers or additional compliance reviews.",
            "HUXZAIN may temporarily delay or hold withdrawals where fraud prevention, dispute investigations, legal obligations or account verification require additional review.",
            "Keep your Settlement Statements and financial records safely for taxation, accounting and future reference.",
            "If you notice any unexpected issue regarding your balance, contact HUXZAIN Support before submitting multiple withdrawal requests.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onReturn}>Return To Wallet</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onWithdraw} color="gold">
            <Check size={14} /> Request Withdrawal
          </PrimaryBtn>
        </div>

        <PolicyLinks links={[{ label: "Withdrawal Policy", href: "/terms" }]} />
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 24. Universal: Before Updating Bank Account ─────────────────────────────

export interface BeforeUpdateBankProps {
  onSave: () => void;
  onCancel: () => void;
}

export function BeforeUpdateBank({ onSave, onCancel }: BeforeUpdateBankProps) {
  const acks: CheckboxAck[] = [
    { id: "mine", label: "I confirm that the bank account belongs to me or I am authorised to use it." },
    { id: "verification", label: "I understand that HUXZAIN may request additional verification before future withdrawals." },
    { id: "incorrect", label: "I understand that incorrect banking information may delay settlements." },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Lock className="size-6" />} iconClass="text-gold">
          Protect Your Withdrawals
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your registered bank account is used to receive seller settlements from HUXZAIN. Please make sure every detail entered is accurate before saving. Incorrect banking information may result in delayed settlements or failed transfers.
            </p>
            <p className="mt-2 text-amber-300">
              For your security, HUXZAIN may temporarily restrict withdrawals or request additional verification after important financial information has been changed.
            </p>
          </div>

          <BulletList items={[
            "Never add bank accounts that do not belong to you unless specifically permitted under HUXZAIN Marketplace Policies.",
            "Providing false or misleading financial information may result in account restrictions while the information is reviewed.",
          ]} />
        </div>

        <AckCheckboxes items={acks} checked={checked} onChange={(id, val) => setChecked((p) => ({ ...p, [id]: val }))} />

        <div className="flex gap-3 pt-1">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn disabled={!allChecked(acks, checked)} onClick={onSave} color="gold">
            <Check size={14} /> Save Bank Details
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 25. Universal: Security Reminder (Account Info Change) ──────────────────

export interface SecurityReminderProps {
  onContinue: () => void;
  onCancel: () => void;
  fieldName?: string;
}

export function SecurityReminder({ onContinue, onCancel, fieldName = "account information" }: SecurityReminderProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Lock className="size-6" />} iconClass="text-amber-400">
          Security Reminder
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              You are about to change your <span className="font-semibold text-white">{fieldName}</span>. For your protection, HUXZAIN monitors significant account changes to help prevent unauthorised access and account takeover attempts.
            </p>
            <p className="mt-2 font-semibold text-amber-300">Please ensure that only you are making this request.</p>
            <p className="mt-1">If you did not initiate this action, immediately stop and contact HUXZAIN Support.</p>
          </div>

          <p>Depending on the type of information being updated, HUXZAIN may temporarily require additional verification before allowing sensitive account actions such as withdrawals or identity changes.</p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={onContinue} color="gold">
            <ShieldCheck size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 26. Universal: Report Submitted Confirmation ────────────────────────────

export interface ReportSubmittedNoticeProps {
  onContinue: () => void;
  onHelpCentre?: () => void;
}

export function ReportSubmittedNotice({ onContinue, onHelpCentre }: ReportSubmittedNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Flag className="size-6" />} iconClass="text-gold">
          Thank You For Helping Protect HUXZAIN
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Your report has been successfully submitted. Thank you for taking the time to help us maintain a safe marketplace. Every genuine report helps us identify scams, protect honest users and improve the overall quality of the HUXZAIN community.
            </p>
          </div>

          <BulletList items={[
            "Every report is investigated individually.",
            "Reporting a user does not automatically mean they have violated our policies.",
            "We may contact you if additional information is required.",
            "Knowingly submitting false or malicious reports may itself violate HUXZAIN Marketplace Policies.",
          ]} />
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          {onHelpCentre && <SecondaryBtn onClick={onHelpCentre}>Visit Trust & Safety Centre</SecondaryBtn>}
          <PrimaryBtn onClick={onContinue} color="gold">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 27. Universal: Welcome To HUXZAIN (Once per account) ────────────────────

export interface WelcomeToHuxzainProps {
  onStart: () => void;
}

export function WelcomeToHuxzain({ onStart }: WelcomeToHuxzainProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Star className="size-6" />} iconClass="text-gold">
          Welcome To HUXZAIN
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Welcome to HUXZAIN. We're excited to have you as part of our growing marketplace. HUXZAIN was built with one simple goal — creating a secure, professional and trusted marketplace where buyers and sellers can confidently trade digital products and services.
            </p>
          </div>

          <p className="font-semibold text-white text-[11px]">Whether you're here to buy, sell or build your business, we encourage you to treat every member of the community with honesty, professionalism and respect.</p>

          <BulletList items={[
            "Always communicate respectfully.",
            "Keep important communication inside HUXZAIN whenever possible.",
            "Never attempt scams, fraud or dishonest behaviour.",
            "Respect other members of the community.",
            "Report suspicious activity whenever you see it.",
            "Help us build a marketplace where trust comes first.",
          ]} />

          <p className="text-[10px] italic text-center">Every honest action strengthens HUXZAIN. Every dishonest action weakens the community. Thank you for placing your trust in us.</p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={() => window.open("/trust-safety", "_blank")}>
            Visit Trust & Safety Centre
          </SecondaryBtn>
          <PrimaryBtn onClick={onStart} color="gold">
            <Star size={14} /> Start Exploring HUXZAIN
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 28. Universal: Evidence Reminder (Before uploading dispute evidence) ─────

export interface EvidenceReminderProps {
  onContinue: () => void;
}

export function EvidenceReminder({ onContinue }: EvidenceReminderProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<FileText className="size-6" />} iconClass="text-blue-400">
          Evidence Helps Protect Everyone
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            HUXZAIN investigates disputes based on available evidence rather than assumptions. The quality of the evidence you provide directly affects our ability to reach a fair decision.
          </p>

          <BulletList items={[
            "Whenever possible, upload clear screenshots, complete screen recordings, invoices, chat history or any other information that accurately explains the issue.",
            "Do not crop, edit or manipulate evidence in a way that changes its original meaning.",
            "If your order involved software keys, activation codes, gift cards, gaming accounts or digital credentials, screen recordings often provide the strongest evidence because they clearly show the sequence of events.",
            "Providing honest and complete evidence helps us resolve disputes faster while protecting both buyers and sellers.",
            "Knowingly submitting fabricated or manipulated evidence may result in account restrictions, permanent suspension and, where appropriate, legal action.",
          ]} />
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={() => window.open("/terms", "_blank")}>Evidence Guidelines</SecondaryBtn>
          <PrimaryBtn onClick={onContinue} color="gold">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 29. Universal: External Communication Reminder (Service categories) ──────

export interface ExternalCommServiceNoticeProps {
  onContinue: () => void;
}

export function ExternalCommServiceNotice({ onContinue }: ExternalCommServiceNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Info className="size-6" />} iconClass="text-blue-400">
          External Communication & Platform Protection
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <p className="leading-relaxed">
            Some services available on HUXZAIN naturally require communication through voice calls, screen sharing, remote assistance, multiplayer games or professional collaboration platforms. Where reasonably necessary to complete the purchased service, you may cooperate with the other party using appropriate communication methods.
          </p>

          <p className="font-semibold text-white">However, for your own protection, we strongly recommend that every important agreement remains recorded inside the HUXZAIN Order Room. This includes:</p>

          <BulletList items={[
            "Project requirements.",
            "Changes to the original agreement.",
            "Price revisions.",
            "Delivery confirmations.",
            "Completion confirmations.",
            "Dispute-related discussions.",
            "Any important promises made by either party.",
          ]} />

          <p className="text-amber-300/80">
            If external communication becomes abusive, inappropriate or unrelated to completing the purchased service, immediately end the conversation and report the incident through HUXZAIN. Payments should never be completed outside HUXZAIN simply because communication moved to another platform.
          </p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={() => window.open("/terms", "_blank")}>View Safety Guidelines</SecondaryBtn>
          <PrimaryBtn onClick={onContinue} color="gold">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 30. Seller: Settlement Released Notification ────────────────────────────

export interface SettlementReleasedNoticeProps {
  onDownload: () => void;
  onViewDashboard: () => void;
}

export function SettlementReleasedNotice({ onDownload, onViewDashboard }: SettlementReleasedNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<ShieldCheck className="size-6" />} iconClass="text-emerald-400">
          Settlement Successfully Released
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Congratulations. The settlement for this order has now been successfully released to your registered payout account. Thank you for completing this order professionally. Every successful order strengthens your seller profile and helps build long-term trust with buyers.
            </p>
          </div>

          <BulletList items={[
            "Download and securely store your Settlement Statement for your business records.",
            "If applicable, download your Commission Invoice and other financial documents from your Seller Dashboard.",
            "You are responsible for maintaining your own accounting records and complying with applicable tax laws in your country or jurisdiction.",
            "Keep invoices, settlement statements and payment records safely for future accounting, taxation or compliance purposes.",
            "If you believe there is any issue with this settlement, contact HUXZAIN Support before initiating chargebacks or external complaints.",
          ]} />
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          <SecondaryBtn onClick={onViewDashboard}>View Financial Dashboard</SecondaryBtn>
          <PrimaryBtn onClick={onDownload} color="gold">
            <FileText size={14} /> Download Settlement Statement
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

// ─── 31. Buyer: Suspicious Seller Report Submitted ──────────────────────────

export interface SuspiciousSellerReportNoticeProps {
  onContinue: () => void;
  onHelpCentre?: () => void;
}

export function SuspiciousSellerReportNotice({ onContinue, onHelpCentre }: SuspiciousSellerReportNoticeProps) {
  return (
    <ModalOverlay>
      <ModalCard>
        <ModalTitle icon={<Flag className="size-6" />} iconClass="text-gold">
          Thank You For Your Report
        </ModalTitle>

        <div className="space-y-3 font-sans text-[11px] text-muted-foreground">
          <div className="bg-gold/5 border border-gold/20 p-3.5 rounded-2xl">
            <p className="leading-relaxed">
              Thank you for helping us keep HUXZAIN safe. Your report has been successfully received.
            </p>
          </div>

          <BulletList items={[
            "Our Trust & Safety Team will review the information together with platform records, transaction history, communication history and any supporting evidence that has been submitted.",
            "Submitting a report does not automatically mean action will be taken against the reported user. Every report is reviewed individually to ensure that honest buyers and honest sellers are treated fairly.",
            "If additional information is required, HUXZAIN may contact you through your registered account.",
            "Knowingly submitting false reports, repeatedly abusing the reporting system or attempting to damage another user's reputation through fabricated allegations may itself violate HUXZAIN Marketplace Policies.",
          ]} />
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/5">
          {onHelpCentre && <SecondaryBtn onClick={onHelpCentre}>Visit Help Centre</SecondaryBtn>}
          <PrimaryBtn onClick={onContinue} color="gold">
            <Check size={14} /> Continue
          </PrimaryBtn>
        </div>
      </ModalCard>
    </ModalOverlay>
  );
}

