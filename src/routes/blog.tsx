import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BookOpen, ArrowRight, Clock, Tag, User } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — HUXZAIN" },
      {
        name: "description",
        content:
          "Insights, tips, and news from the HUXZAIN digital marketplace. Stay informed about digital commerce, security, and growth strategies.",
      },
      { property: "og:title", content: "Blog — HUXZAIN" },
    ],
  }),
  component: BlogPage,
});

const posts = [
  {
    id: "escrow-protection-guide",
    category: "Buyer Guide",
    title: "How HUXZAIN Escrow Protection Keeps Your Money Safe",
    excerpt:
      "Discover how our multi-layer escrow system works behind the scenes to guarantee every buyer's funds are held securely until the order is fulfilled to their satisfaction. A complete walkthrough of the buyer protection lifecycle.",
    author: "HUXZAIN Editorial",
    date: "May 18, 2026",
    readTime: "6 min read",
    gradient: "from-gold/20 via-amber-900/10 to-transparent",
    tag: "Security",
  },
  {
    id: "top-digital-product-niches",
    category: "Seller Tips",
    title: "Top 5 High-Demand Digital Product Niches in 2026",
    excerpt:
      "The digital marketplace is evolving fast. We analysed over 100,000 orders on HUXZAIN to identify the highest-growth product categories — from AI prompt packs to UI kits. Here's where the opportunity is right now.",
    author: "HUXZAIN Research",
    date: "May 10, 2026",
    readTime: "8 min read",
    gradient: "from-indigo-900/30 via-purple-900/10 to-transparent",
    tag: "Growth",
  },
  {
    id: "verified-seller-program",
    category: "Platform News",
    title: "Introducing the HUXZAIN Verified Seller Programme",
    excerpt:
      "We're raising the bar for marketplace trust. Our new Verified Seller Programme introduces rigorous identity verification, quality checks, and performance benchmarks — giving buyers added confidence in every transaction.",
    author: "HUXZAIN Team",
    date: "April 28, 2026",
    readTime: "4 min read",
    gradient: "from-emerald-900/25 via-teal-900/10 to-transparent",
    tag: "Platform",
  },
];

const categories = [
  "All Posts",
  "Buyer Guide",
  "Seller Tips",
  "Platform News",
  "Security",
  "Growth",
];

function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <BookOpen className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            HUXZAIN <span className="text-gold">Blog</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Insights, guides, and platform updates to help you buy, sell, and grow confidently in
            the digital marketplace.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-10 flex flex-wrap gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`text-sm px-4 py-2 rounded-xl border transition-colors ${
                i === 0
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border bg-surface/40 text-muted-foreground hover:border-gold/40 hover:text-gold"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group rounded-2xl border border-border bg-surface/40 hover:border-gold/30 hover:bg-surface/60 transition-all overflow-hidden flex flex-col"
            >
              {/* Cover gradient */}
              <div
                className={`h-44 bg-gradient-to-br ${post.gradient} border-b border-border relative overflow-hidden`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="size-12 text-gold/20" />
                </div>
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gold/20 border border-gold/30 text-gold">
                    {post.tag}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Tag className="size-3" />
                  <span>{post.category}</span>
                  <span className="mx-1 opacity-40">·</span>
                  <Clock className="size-3" />
                  <span>{post.readTime}</span>
                </div>
                <h2 className="font-display text-base font-bold leading-snug mb-3 group-hover:text-gold transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center">
                      <User className="size-3 text-gold" />
                    </div>
                    <span className="text-xs text-muted-foreground">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {post.date}
                  </div>
                </div>
              </div>

              {/* Read More */}
              <div className="px-6 pb-5">
                <button className="w-full h-9 rounded-xl border border-border bg-surface hover:border-gold/50 hover:text-gold text-sm transition-colors inline-flex items-center justify-center gap-2">
                  Read Article <ArrowRight className="size-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-elevated via-surface to-background p-8 text-center">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(500px 250px at 50% 100%, oklch(0.82 0.13 82 / 0.1), transparent 60%)",
            }}
          />
          <div className="relative">
            <h3 className="font-display text-2xl font-bold mb-2">
              Never Miss an <span className="text-gold">Update</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Subscribe to the HUXZAIN newsletter for exclusive insights, seller tips, and platform
              announcements delivered to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 h-11 px-4 rounded-xl border border-border bg-background/60 text-sm outline-none focus:border-gold/50"
              />
              <button className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all shrink-0">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
