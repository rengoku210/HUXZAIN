import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  Lock,
  CreditCard,
} from "lucide-react";
import logo from "@/assets/huxzain-logo.png";
import { useState } from "react";
import { toast } from "sonner";


const groups = [
  {
    title: "Marketplace",
    links: [
      { l: "Browse Listings", to: "/categories" },
      { l: "Digital Products", to: "/category/$slug", p: { slug: "digital-marketplace" } },
      { l: "Gaming Marketplace", to: "/category/$slug", p: { slug: "gaming-accounts" } },
      { l: "Gift Cards", to: "/category/$slug", p: { slug: "gift-cards" } },
      { l: "Software & Tools", to: "/category/$slug", p: { slug: "software-tools" } },
    ],
  },
  {
    title: "Services",
    links: [
      { l: "Game Buddies", to: "/category/$slug", p: { slug: "game-buddies" } },
      { l: "Coaching", to: "/category/$slug", p: { slug: "coaching-services" } },
      { l: "Boosting", to: "/category/$slug", p: { slug: "boosting-services" } },
      { l: "Freelance", to: "/category/$slug", p: { slug: "freelance-services" } },
      { l: "Advertising", to: "/category/$slug", p: { slug: "advertising-services" } },
    ],
  },
  {
    title: "Company",
    links: [
      { l: "About Us", to: "/about" },
      { l: "Careers", to: "/careers" },
      { l: "Blog", to: "/blog" },
      { l: "Press", to: "/about" },
      { l: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Support & Legal",
    links: [
      { l: "Help Center", to: "/how-it-works" },
      { l: "Dispute Policy", to: "/how-it-works" },
      { l: "Privacy Policy", to: "/privacy" },
      { l: "Terms of Service", to: "/terms" },
      { l: "Refund Policy", to: "/refund-policy" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      // Newsletter subscription — stored in Supabase or sent to email service
      await new Promise((r) => setTimeout(r, 600)); // Simulate async
      toast.success("🎉 You're subscribed! Welcome to the HUXZAIN community.");
      setEmail("");
    } catch {
      toast.error("Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="mt-24 border-t border-border/70 bg-surface/30">
      {/* Newsletter strip */}
      <div className="border-b border-border/70">
        <div className="container-page py-10 grid md:grid-cols-[1fr_1.2fr] gap-8 items-center">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center">
              <Mail className="size-5 text-gold" />
            </div>
            <div>
              <div className="font-display text-2xl font-semibold">
                Stay Updated with <span className="text-gold">HUXZAIN</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to get updates, offers and more.
              </p>
            </div>
          </div>
          <form onSubmit={handleNewsletter} className="flex gap-2 max-w-lg md:ml-auto w-full">
            <input
              id="footer-newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 h-11 px-4 rounded-lg border border-border bg-background/60 outline-none text-sm focus:border-gold/50 transition-colors"
              required
            />
            <button
              id="footer-newsletter-submit"
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        </div>
      </div>

      <div className="container-page py-14 grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <img 
            src={logo} 
            alt="HUXZAIN" 
            className="h-10 w-auto mb-5 bg-transparent select-none pointer-events-none object-contain" 
          />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            India's Modern Digital Marketplace
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-sm font-semibold text-foreground mb-4">{g.title}</h4>
            <ul className="space-y-2.5">
              {g.links.map((l) => (
                <li key={l.l}>
                  <Link
                    to={l.to as any}
                    params={(l as any).p}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {l.l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60">
        <div className="container-page py-5 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HUXZAIN. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-3 py-1">
              <Lock className="size-3.5 text-gold" /> SSL Secured
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-3 py-1">
              ★ 99.8% Positive Feedback
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-3 py-1">
              <CreditCard className="size-3.5 text-gold" /> Razorpay
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-3 py-1">
              UPI
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-3 py-1">
              Card
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
