import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { 
  Mail, 
  MessageSquare, 
  MapPin, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { createTicket, getKBArticles } from "@/lib/admin/tickets.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Help Center & Contact Us — HUXZAIN" },
      {
        name: "description",
        content: "Search HUXZAIN's Knowledge Base, browse FAQs, or open a secure support ticket with our specialized operations team.",
      },
    ],
  }),
  component: ContactPage,
});

interface KBArticle {
  id: string;
  category: string;
  title: string;
  content: string;
}

function ContactPage() {
  const { isAuthenticated, user } = useAuth();
  
  // KB Search states
  const [kbQuery, setKbQuery] = useState("");
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loadingKB, setLoadingKB] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Ticket states
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Load FAQs on mount / search
  async function searchKB(queryStr: string) {
    try {
      setLoadingKB(true);
      const res = await getKBArticles({ data: { search: queryStr } });
      setArticles(res as KBArticle[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingKB(false);
    }
  }

  useEffect(() => {
    searchKB("");
  }, []);

  const handleKBSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKbQuery(val);
    // Debounce search
    const timer = setTimeout(() => {
      searchKB(val);
    }, 300);
    return () => clearTimeout(timer);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error("You must be logged in to create a support ticket.");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setSending(true);
    try {
      await createTicket({
        data: {
          user_id: user.id,
          title: subject,
          description: message,
          category,
        }
      });
      setSent(true);
      toast.success("Support ticket opened! Our team will respond shortly.");
    } catch (err: any) {
      toast.error("Failed to submit support ticket: " + err.message);
    } finally {
      setSending(false);
    }
  }

  const INFO = [
    {
      icon: Mail,
      title: "Email support",
      value: "support@huxzain.com",
      desc: "General responses within 24h",
    },
    {
      icon: MessageSquare,
      title: "Specialized Queues",
      value: "Auto-routed Department Support",
      desc: "Fast delivery verification & dispute handling",
    },
    {
      icon: MapPin,
      title: "HUXZAIN Operations Center",
      value: "Secure Escrow & Trust Platform",
      desc: "Monitoring transactions 24/7/365",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container-page py-14">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold mb-4 font-mono font-bold uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" /> Support & Help Desk Center
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">How Can We Help You Today?</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
              Search our self-service Knowledge Base or file a secure support ticket to receive quick resolution from our specialists.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
            {/* Left Column: Knowledge Base Search */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-surface/30 p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <HelpCircle className="text-gold" size={20} /> Knowledge Base FAQ Search
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={kbQuery}
                    onChange={handleKBSearchChange}
                    placeholder="Search for articles, refunds, withdrawals, disputes..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-black text-xs text-foreground focus:border-gold outline-none"
                  />
                </div>

                {loadingKB ? (
                  <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                    Searching database...
                  </div>
                ) : articles.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No matching knowledge base articles found.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                    {articles.map((art) => {
                      const isExpanded = expandedArticleId === art.id;
                      return (
                        <div key={art.id} className="rounded-xl border border-border bg-surface/20 overflow-hidden">
                          <button
                            onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                            className="w-full text-left p-4 flex items-center justify-between hover:bg-surface/30 transition-colors"
                          >
                            <span className="text-xs font-semibold text-foreground">{art.title}</span>
                            {isExpanded ? <ChevronUp size={14} className="text-gold" /> : <ChevronDown size={14} />}
                          </button>
                          {isExpanded && (
                            <div className="p-4 border-t border-border/40 bg-black/40 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {art.content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar Quick Info */}
              <div className="grid sm:grid-cols-3 gap-4">
                {INFO.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-surface/30 p-4 space-y-2">
                    <div className="size-8 rounded-lg border border-gold/20 bg-gold/10 flex items-center justify-center">
                      <item.icon className="size-4 text-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">{item.title}</p>
                      <p className="text-[11px] text-gold font-mono mt-0.5 truncate">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Support Ticket Creation */}
            <div className="rounded-2xl border border-border bg-surface/30 p-6">
              {!isAuthenticated ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5">
                  <div className="size-16 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                    <Lock className="size-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Authentication Required</h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                      Please log in to open a support ticket. This helps us sync correspondence history and protect your transaction records.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    search={{ redirect: "/contact" }}
                    className="h-10 px-6 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    Log In to HUXZAIN <ArrowRight size={12} />
                  </Link>
                </div>
              ) : sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5">
                  <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="size-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Support Ticket Created!</h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                      Your request has been successfully submitted and routed to the corresponding department.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSent(false);
                        setSubject("");
                        setMessage("");
                      }}
                      className="h-10 px-4 rounded-xl border border-border text-xs hover:bg-surface"
                    >
                      File Another
                    </button>
                    <Link
                      to="/account"
                      className="h-10 px-4 rounded-xl bg-gold text-black font-semibold text-xs flex items-center justify-center"
                    >
                      Go to Ticket History
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    <Mail className="text-gold" size={20} /> Open Support Ticket
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Please provide clear details. Tickets are automatically routed based on issue category.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Issue Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold cursor-pointer"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="billing">Billing & Payments (Finance)</option>
                      <option value="verification">Verification & KYC Requests</option>
                      <option value="dispute_issues">Order Dispute Issues (Escrow)</option>
                      <option value="fraud_reports">Fraud & Scam Attempts</option>
                      <option value="technical_issue">Technical Problems / Bug Report</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Subject Title</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your inquiry..."
                      className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Description Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="Describe your issue or question in detail..."
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full h-11 rounded-lg bg-gold text-primary-foreground font-bold text-xs uppercase hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-all"
                  >
                    {sending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {sending ? "Opening ticket..." : "Open Support Ticket"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
