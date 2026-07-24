import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  ShieldCheck,
  BadgeCheck,
  Headphones,
  ChevronDown,
  ChevronUp,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  ChevronRight,
} from "lucide-react";

type FooterGroup = {
  title: string;
  links: { label: string; to: string }[];
};

const footerGroups: FooterGroup[] = [
  {
    title: "Company",
    links: [
      { label: "About HUXZAIN", to: "/about" },
      { label: "Contact Us", to: "/contact" },
      { label: "Trust Center", to: "/about" },
      { label: "Security", to: "/about" },
      { label: "Report Abuse", to: "/contact" },
    ],
  },
  {
    title: "Buyers",
    links: [
      { label: "Buyer Protection", to: "/how-it-works" },
      { label: "How Buying Works", to: "/how-it-works" },
      { label: "Protected Transactions", to: "/how-it-works" },
      { label: "Dispute Resolution", to: "/how-it-works" },
      { label: "Refund Policy", to: "/refund-policy" },
      { label: "Help Center", to: "/how-it-works" },
    ],
  },
  {
    title: "Sellers",
    links: [
      { label: "Become a Seller", to: "/signup" },
      { label: "Seller Verification", to: "/how-it-works" },
      { label: "Seller Plans", to: "/how-it-works" },
      { label: "Seller Guidelines", to: "/how-it-works" },
      { label: "Seller Dashboard", to: "/seller/listings" },
      { label: "Seller Protection", to: "/how-it-works" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Cookie Policy", to: "/terms" },
      { label: "Seller Agreement", to: "/terms" },
      { label: "Buyer Agreement", to: "/terms" },
      { label: "KYC Policy", to: "/privacy" },
      { label: "AML & Fraud Prevention Policy", to: "/privacy" },
      { label: "Prohibited Items Policy", to: "/terms" },
      { label: "Intellectual Property Policy (DMCA/IP)", to: "/terms" },
      { label: "Dispute Policy", to: "/terms" },
      { label: "Escrow Policy", to: "/terms" },
    ],
  },
  {
    title: "Company Information",
    links: [
      { label: "Registered Business", to: "/about" },
      { label: "MSME Registration", to: "/about" },
      { label: "Business Address", to: "/about" },
      { label: "Contact Email", to: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", to: "/how-it-works" },
      { label: "Community Guidelines", to: "/how-it-works" },
      { label: "Safety Tips", to: "/how-it-works" },
      { label: "Knowledge Base", to: "/how-it-works" },
      { label: "Trust & Compliance", to: "/how-it-works" },
    ],
  },
];

export function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSection((prev) => (prev === title ? null : title));
  };

  return (
    <footer className="w-full bg-[#060709] border-t border-white/[0.03] pt-12 pb-8 font-sans">
      {/* ─── TRUST FEATURES STRIP (Desktop View) ─── */}
      <div className="container-page hidden md:block mb-12">
        <div className="grid grid-cols-5 gap-4 p-5 rounded-2xl border border-white/5 bg-[#0c0d10]/50 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.45)] w-full items-center">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 shrink-0">
              <Lock className="size-4.5 text-gold" />
            </div>
            <div>
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-gold">SSL Secured</div>
              <div className="text-[10px] text-[#5c6170] mt-0.5 font-medium leading-snug">Your data is always protected</div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/[0.04] pl-4">
            <div className="size-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 shrink-0">
              <ShieldCheck className="size-4.5 text-gold" />
            </div>
            <div>
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-gold">Escrow Protected</div>
              <div className="text-[10px] text-[#5c6170] mt-0.5 font-medium leading-snug">Funds are held safely until delivery</div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/[0.04] pl-4">
            <div className="size-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 shrink-0">
              <BadgeCheck className="size-4.5 text-gold" />
            </div>
            <div>
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-gold">Verified Sellers</div>
              <div className="text-[10px] text-[#5c6170] mt-0.5 font-medium leading-snug">All sellers go through verification</div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/[0.04] pl-4">
            <div className="size-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 shrink-0">
              <Headphones className="size-4.5 text-gold" />
            </div>
            <div>
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-gold">Human Support</div>
              <div className="text-[10px] text-[#5c6170] mt-0.5 font-medium leading-snug">Real people. Real support 24/7</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-l border-white/[0.04] pl-4">
            <div className="font-bold text-[10px] uppercase tracking-wider text-[#5c6170]">Accepted Payments</div>
            <div className="flex items-center gap-2">
              <PaymentLogosMini />
            </div>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP 6-COLUMN NAVIGATION GRID ─── */}
      <div className="container-page hidden md:grid grid-cols-6 gap-6 mb-12">
        {footerGroups.map((g) => (
          <div key={g.title} className="space-y-4">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-gold">{g.title}</h4>
            <ul className="space-y-2.5">
              {g.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to as any}
                    className="text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ─── MOBILE ACCORDION NAVIGATION & TRUST CARDS ─── */}
      <div className="container-page block md:hidden space-y-6 px-4">
        <div className="mb-2">
          <div className="font-display font-black tracking-wide text-lg text-white">HUXZAIN</div>
          <p className="text-xs text-muted-foreground mt-0.5">India's Modern Digital Marketplace</p>
        </div>

        {/* Mobile Accordions */}
        <div className="border border-white/5 rounded-xl bg-surface/20 divide-y divide-white/5 overflow-hidden">
          {footerGroups.map((g) => {
            const isOpen = openSection === g.title;
            return (
              <div key={g.title} className="w-full">
                <button
                  onClick={() => toggleSection(g.title)}
                  className="w-full h-12 px-4 flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.02] transition-colors border-none bg-transparent cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {g.title}
                  </span>
                  {isOpen ? <ChevronUp className="size-4 text-gold" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <ul className="px-4 py-3 bg-[#0d0e11]/60 space-y-2.5">
                    {g.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to as any}
                          className="text-xs text-muted-foreground hover:text-white transition-colors block py-0.5"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Trust Feature Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-[#0c0d10]/40 p-3 flex flex-col gap-1">
            <Lock className="size-4.5 text-gold mb-1" />
            <div className="text-xs font-bold text-white">SSL Secured</div>
            <div className="text-[10px] text-muted-foreground leading-snug">Your data is always protected</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#0c0d10]/40 p-3 flex flex-col gap-1">
            <ShieldCheck className="size-4.5 text-gold mb-1" />
            <div className="text-xs font-bold text-white">Escrow Protected</div>
            <div className="text-[10px] text-muted-foreground leading-snug">Funds are held safely until delivery</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#0c0d10]/40 p-3 flex flex-col gap-1">
            <BadgeCheck className="size-4.5 text-gold mb-1" />
            <div className="text-xs font-bold text-white">Verified Sellers</div>
            <div className="text-[10px] text-muted-foreground leading-snug">All sellers go through verification</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#0c0d10]/40 p-3 flex flex-col gap-1">
            <Headphones className="size-4.5 text-gold mb-1" />
            <div className="text-xs font-bold text-white">Human Support</div>
            <div className="text-[10px] text-muted-foreground leading-snug">Real people. Real support 24/7</div>
          </div>
        </div>

        {/* Mobile Payments Box */}
        <div className="rounded-xl border border-white/5 bg-[#0c0d10]/40 p-4 space-y-3">
          <div className="text-xs font-bold text-white tracking-wide text-center">Accepted Payments</div>
          <div className="flex justify-center">
            <PaymentLogosMini />
          </div>
          <div className="text-[10px] text-muted-foreground text-center">
            UPI • Debit Cards • Credit Cards • Net Banking
          </div>
        </div>

        {/* Mobile Buyer Protection CTA Banner */}
        <Link
          to="/how-it-works"
          className="flex items-center justify-between p-4 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.03] hover:bg-[#d4af37]/[0.06] transition-all cursor-pointer text-white no-underline animate-pulse"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-gold shrink-0" />
            <div>
              <div className="text-xs font-bold">We protect buyers.</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Every transaction. Every time.</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      {/* ─── COMMON FOOTER BOTTOM BAR (Socials, Logos & Copyright) ─── */}
      <div className="border-t border-white/[0.03] mt-8 pt-6">
        <div className="container-page px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base tracking-wider text-white">HUXZAIN</span>
            </div>
            <p className="text-[10px] text-[#4a5060]">India's Modern Digital Marketplace</p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            <a href="#" className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8a8f9d] hover:text-white transition-colors rounded-lg hover:bg-white/5" title="Facebook">
              <Facebook className="size-4.5" />
            </a>
            <a href="#" className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8a8f9d] hover:text-white transition-colors rounded-lg hover:bg-white/5" title="Twitter">
              <Twitter className="size-4.5" />
            </a>
            <a href="#" className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8a8f9d] hover:text-white transition-colors rounded-lg hover:bg-white/5" title="Instagram">
              <Instagram className="size-4.5" />
            </a>
            <a href="#" className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8a8f9d] hover:text-white transition-colors rounded-lg hover:bg-white/5" title="YouTube">
              <Youtube className="size-4.5" />
            </a>
          </div>

          <div className="text-[10.5px] text-[#4a5060] font-medium text-center md:text-right">
            © 2026 HUXZAIN. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

function PaymentLogosMini() {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {/* UPI */}
      <div className="flex items-center font-display italic font-black text-white text-[9px] bg-[#0c0d10] border border-white/5 px-2 py-1 rounded select-none">
        <span className="text-emerald-400">U</span>
        <span className="text-sky-400">P</span>
        <span className="text-amber-400">I</span>
      </div>
      {/* VISA */}
      <div className="font-display italic font-black text-sky-400 text-[9px] bg-[#0c0d10] border border-white/5 px-2 py-1 rounded select-none">
        VISA
      </div>
      {/* Mastercard */}
      <div className="flex items-center gap-0.5 bg-[#0c0d10] border border-white/5 px-2 py-1 rounded select-none">
        <div className="size-2 rounded-full bg-[#eb001b]" />
        <div className="size-2 rounded-full bg-[#f79e1b] -ml-1" />
      </div>
      {/* RuPay */}
      <div className="font-display italic font-black text-[9px] bg-[#0c0d10] border border-white/5 px-2 py-1 rounded select-none">
        <span className="text-orange-400">Ru</span>
        <span className="text-sky-400">Pay</span>
      </div>
      {/* Net Banking */}
      <div className="flex items-center bg-[#0c0d10] border border-white/5 px-2 py-1 rounded select-none">
        <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M3 10L12 3L21 10"/><path d="M12 10V21"/></svg>
      </div>
    </div>
  );
}
