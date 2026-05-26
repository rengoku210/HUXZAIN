import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Briefcase, MapPin, Clock, ArrowRight, Zap, Users, TrendingUp, Heart } from "lucide-react";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — HUXZAIN" },
      {
        name: "description",
        content:
          "Join the HUXZAIN team. Explore open positions at the leading secure digital marketplace and help build the future of digital commerce.",
      },
      { property: "og:title", content: "Careers at HUXZAIN" },
    ],
  }),
  component: CareersPage,
});

const perks = [
  {
    icon: Zap,
    title: "Remote-First",
    desc: "Work from anywhere in the world. We're a fully distributed team that trusts you to deliver.",
  },
  {
    icon: TrendingUp,
    title: "Equity & Growth",
    desc: "Competitive salaries plus equity packages. Grow with us as HUXZAIN scales globally.",
  },
  {
    icon: Heart,
    title: "Wellness Budget",
    desc: "$150/month wellness allowance for gym, mental health, or whatever keeps you at your best.",
  },
  {
    icon: Users,
    title: "Tight-Knit Team",
    desc: "Work alongside a passionate, talented team that genuinely cares about what they build.",
  },
];

const jobs = [
  {
    id: "senior-fullstack",
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (Worldwide)",
    type: "Full-Time",
    level: "Senior",
    description:
      "We're looking for an experienced Full-Stack Engineer to join our core product team. You'll architect and build features across the HUXZAIN platform — from payment flows and escrow logic to real-time messaging and seller tooling. You'll work with React, TypeScript, Node.js, and Supabase (PostgreSQL).",
    requirements: [
      "5+ years of full-stack development experience",
      "Deep knowledge of React, TypeScript, and modern CSS",
      "Experience with PostgreSQL and RESTful API design",
      "Familiarity with cloud infrastructure (AWS, GCP, or similar)",
      "Strong written communication skills for a remote team",
    ],
    accent: "from-indigo-900/30 to-transparent",
  },
  {
    id: "product-designer",
    title: "Senior Product Designer",
    department: "Design",
    location: "Remote (Worldwide)",
    type: "Full-Time",
    level: "Senior",
    description:
      "We're seeking a talented Product Designer to shape the visual and interaction design of HUXZAIN. You'll own end-to-end design for key features — from initial research and wireframing through to polished, pixel-perfect UI. You'll also contribute to and evolve our premium black/gold design system.",
    requirements: [
      "4+ years of product design experience (SaaS or marketplace preferred)",
      "Strong portfolio demonstrating end-to-end product design",
      "Proficiency with Figma including component libraries and auto-layout",
      "Experience with design systems and design token architecture",
      "Basic understanding of HTML/CSS to collaborate effectively with engineers",
    ],
    accent: "from-gold/15 to-transparent",
  },
  {
    id: "trust-safety-specialist",
    title: "Trust &amp; Safety Specialist",
    department: "Operations",
    location: "Remote (Worldwide)",
    type: "Full-Time",
    level: "Mid-Level",
    description:
      "Help keep HUXZAIN safe and trustworthy for our community. You'll review flagged listings and accounts, investigate disputes, enforce platform policies, and work closely with engineering to develop automated trust signals. This role is central to HUXZAIN's mission of being the most secure digital marketplace.",
    requirements: [
      "2+ years in trust & safety, policy, or fraud investigation",
      "Sharp analytical and investigative instincts",
      "Experience with digital marketplace environments",
      "Excellent written communication and judgment",
      "Ability to stay calm and decisive under pressure",
    ],
    accent: "from-emerald-900/25 to-transparent",
  },
];

function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        {/* Hero */}
        <div className="mb-14 text-center">
          <div className="size-16 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mx-auto mb-5">
            <Briefcase className="size-7 text-gold" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">
            Join the <span className="text-gold">HUXZAIN</span> Team
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            We're building the world's most trusted digital marketplace — and we need exceptional
            people to do it. If you're passionate about product, design, engineering, or operations,
            we want to hear from you.
          </p>
        </div>

        {/* Perks */}
        <section className="mb-14">
          <h2 className="font-display text-2xl font-bold text-center mb-8">
            Why <span className="text-gold">HUXZAIN?</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-2xl border border-border bg-surface/40 p-6 flex flex-col gap-4"
                >
                  <div className="size-10 rounded-xl border border-gold/25 bg-gold/10 flex items-center justify-center">
                    <Icon className="size-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1.5">{perk.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{perk.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Open Roles */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold">
              Open <span className="text-gold">Positions</span>
            </h2>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              {jobs.length} roles available
            </span>
          </div>

          <div className="space-y-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-surface/40 overflow-hidden"
              >
                {/* Card header gradient */}
                <div className={`h-1.5 bg-gradient-to-r ${job.accent}`} />

                <div className="p-7">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 mb-5">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gold/15 border border-gold/25 text-gold">
                          {job.department}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground">
                          {job.level}
                        </span>
                      </div>
                      <h3
                        className="font-display text-xl font-bold mb-1"
                        dangerouslySetInnerHTML={{ __html: job.title }}
                      />
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" /> {job.type}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`mailto:careers@huxzain.com?subject=Application: ${job.title}`}
                      className="h-10 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2 shrink-0"
                    >
                      Apply Now <ArrowRight className="size-4" />
                    </a>
                  </div>

                  <p
                    className="text-sm text-muted-foreground leading-relaxed mb-5"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                  />

                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wide">
                      Requirements
                    </p>
                    <ul className="space-y-1.5">
                      {job.requirements.map((req, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span className="size-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* General Applications */}
        <div className="mt-12 relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-elevated via-surface to-background p-8 text-center">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(500px 250px at 50% 100%, oklch(0.82 0.13 82 / 0.08), transparent 60%)",
            }}
          />
          <div className="relative">
            <h3 className="font-display text-2xl font-bold mb-2">
              Don't See Your <span className="text-gold">Role?</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We're always on the lookout for exceptional talent. Send us your CV and a brief note
              about how you'd contribute to HUXZAIN.
            </p>
            <a
              href="mailto:careers@huxzain.com?subject=General Application"
              className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2"
            >
              Send General Application <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
