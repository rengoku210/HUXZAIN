import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  Lock,
  Heart,
} from "lucide-react";
import logo from "@/assets/huxzain-logo.png";

const groups = [
  {
    title: "Marketplace",
    links: [
      { l: "Digital Products", to: "/category/$slug", p: { slug: "digital-products" } },
      { l: "Services", to: "/category/$slug", p: { slug: "services" } },
      { l: "All Categories", to: "/categories" },
      { l: "How It Works", to: "/how-it-works" },
      { l: "Become a Seller", to: "/seller-panel" },
    ],
  },
  {
    title: "Support",
    links: [
      { l: "Contact Us", to: "/contact" },
      { l: "How It Works", to: "/how-it-works" },
      { l: "Terms of Service", to: "/terms" },
      { l: "Refund Policy", to: "/refund-policy" },
      { l: "Privacy Policy", to: "/privacy" },
    ],
  },
  {
    title: "Company",
    links: [
      { l: "About Us", to: "/about" },
      { l: "Blog", to: "/blog" },
      { l: "Careers", to: "/careers" },
      { l: "Contact", to: "/contact" },
      { l: "Privacy Policy", to: "/privacy" },
    ],
  },
];

export function Footer() {
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
          <form className="flex gap-2 max-w-lg md:ml-auto w-full">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 h-11 px-4 rounded-lg border border-border bg-background/60 outline-none text-sm focus:border-gold/50"
            />
            <button className="h-11 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="container-page py-14 grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <img 
            src={logo} 
            alt="HUXZAIN" 
            className="h-11 w-auto mb-5 bg-transparent mix-blend-screen select-none pointer-events-none" 
            style={{ 
              mixBlendMode: "screen",
              isolation: "isolate",
              transform: "translate3d(0, 0, 0)",
              WebkitTransform: "translate3d(0, 0, 0)"
            }}
          />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            The most secure marketplace for digital products and services.
          </p>
          <div className="flex gap-2 mt-5">
            {[Facebook, Twitter, Instagram, Youtube, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="size-9 rounded-full border border-border hover:border-gold/50 hover:text-gold flex items-center justify-center text-muted-foreground transition-colors"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
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
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HUXZAIN. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-gold" /> Secure Marketplace
          </div>
          <div className="flex items-center gap-1.5">
            Made with <Heart className="size-3.5 fill-gold text-gold" /> for our community
          </div>
        </div>
      </div>
    </footer>
  );
}
