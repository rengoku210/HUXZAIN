import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShieldCheck, Zap, Users, Globe, ArrowRight, Target, Star, Lock } from "lucide-react";
import { heroStats } from "@/lib/marketplace-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — HUXZAIN" },
      { name: "description", content: "Learn about HUXZAIN — our mission to build the world's most trusted digital marketplace, our values, and the team behind the platform." },
      { property: "og:title", content: "About HUXZAIN — Secure Digital Marketplace" },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Lock,
    title: "Security First",
    desc: "Every design decision begins with the question: does this keep our users safe? From escrow payments to KYC verification, security is woven into every layer of HUXZAIN.",
  },
  {
    icon: Users,
    title: "Community Driven",
    desc: "HUXZAIN exists to serve buyers and sellers — not the other way around. We listen, iterate, and build features that genuinely move the needle for our community.",
  },
  {
    icon: Star,
    title: "Uncompromising Quality",
    desc: "We hold every seller, every listing, and every feature to a premium standard. Quality isn't a tier — it's the baseline expectation on HUXZAIN.",
  },
  {
    icon: Globe,
    title: "Radical Transparency",
    desc: "No hidden fees. No opaque decisions. We tell you exactly how our platform works, how funds are held, and how disputes are resolved — because trust is built on honesty.",
  },
];

const milestones = [
  { year: "2022", event: "HUXZAIN founded with a vision for the most secure digital marketplace" },
  { year: "2023", event: "Launched buyer escrow protection and verified seller programme" },
  { year: "2024", event: "Crossed 10,000 active sellers and 50,000 completed orders" },
  { year: "2025", event: "Expanded to 40+ countries with multilingual support and local payment methods" },
  { year: "2026", event: "Surpassed 150K listed products and 120K satisfied customers worldwide" },
];

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Mission Statement */}
        <section className="mb-16 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <Target className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-5">
            Built to Be the World's Most{" "}
            <span className="text-gold">Trusted</span> Digital Marketplace
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            HUXZAIN was born from a simple conviction: the digital economy deserves a marketplace where every transaction is safe, every seller is accountable, and every buyer is protected. We built the platform we always wished existed.
          </p>
        </section>

        {/* Stats Strip */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-surface/40 px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {heroStats.map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl font-bold text-gold mb-1">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="mb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold mb-5">
              Our <span className="text-gold">Story</span>
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                HUXZAIN started in 2022 when our founders — frustrated by the rampant fraud and zero buyer protection on existing digital marketplaces — decided to build something better. Something that put trust at the absolute centre.
              </p>
              <p>
                We pioneered a full-escrow payment model where funds are never released until the buyer confirms satisfaction. We built a Verified Seller Programme with real identity checks. We created a transparent dispute resolution system with independent review teams.
              </p>
              <p>
                Today, HUXZAIN hosts over 150,000 digital products and services across categories spanning programming, design, SEO, marketing, gaming, and more — all protected by our industry-leading buyer guarantee.
              </p>
              <p>
                We're not just a marketplace. We're a community commitment: to keep digital commerce honest, secure, and empowering for everyone involved.
              </p>
            </div>
            <div className="mt-7 flex gap-3">
              <Link
                to="/how-it-works"
                className="h-10 px-5 rounded-xl border border-border bg-surface/60 text-sm font-medium hover:border-gold/50 hover:text-gold transition-colors inline-flex items-center gap-2"
              >
                How It Works
              </Link>
              <Link
                to="/categories"
                className="h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2"
              >
                Browse Marketplace <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-surface/40 p-7">
            <h3 className="font-semibold text-sm text-gold uppercase tracking-widest mb-6">Our Journey</h3>
            <div className="space-y-0">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="size-8 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center text-gold text-xs font-bold shrink-0">
                      {m.year.slice(2)}
                    </div>
                    {i < milestones.length - 1 && <div className="w-px flex-1 bg-border/60 my-1" />}
                  </div>
                  <div className={`pb-${i < milestones.length - 1 ? "5" : "0"}`}>
                    <p className="text-xs font-semibold text-gold mb-0.5">{m.year}</p>
                    <p className="text-sm text-muted-foreground leading-snug">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Our <span className="text-gold">Values</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col gap-4">
                  <div className="size-12 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-2">{value.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{value.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-center mb-4">
            The <span className="text-gold">Team</span>
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto mb-10">
            We're a remote-first team of designers, engineers, and marketplace veterans — united by the mission to make digital commerce safer for everyone.
          </p>
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="size-10 rounded-full border-2 border-surface bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center text-xs font-bold text-gold"
                    style={{ zIndex: 5 - i }}
                  >
                    {["JK", "AL", "MR", "SB", "TW"][i]}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">+ many more</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              Detailed team profiles coming soon. In the meantime, we'd love for you to join us.
            </p>
            <Link
              to="/careers"
              className="h-10 px-5 rounded-xl border border-gold/40 bg-gold/10 text-gold text-sm font-semibold hover:bg-gold/20 transition-colors inline-flex items-center gap-2"
            >
              View Open Roles <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-elevated via-surface to-background p-8 md:p-10 text-center">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(600px 300px at 50% 120%, oklch(0.82 0.13 82 / 0.1), transparent 60%)" }}
          />
          <div className="relative">
            <ShieldCheck className="size-10 text-gold mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold mb-2">
              Ready to Experience <span className="text-gold">HUXZAIN?</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Join over 50,000 buyers and sellers who trust HUXZAIN for safe, reliable digital commerce.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/signup"
                className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center"
              >
                Create Free Account
              </Link>
              <Link
                to="/how-it-works"
                className="h-11 px-6 rounded-xl border border-border bg-surface/60 text-sm font-medium hover:border-gold/50 transition-colors inline-flex items-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
