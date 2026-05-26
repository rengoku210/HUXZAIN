import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Mail, MessageSquare, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — HUXZAIN" },
      {
        name: "description",
        content:
          "Get in touch with the HUXZAIN team. We're here to help with any questions or issues.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    // Simulate send (replace with real email service integration)
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true);
    setSending(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
  }

  const INFO = [
    {
      icon: Mail,
      title: "Email Support",
      value: "support@huxzain.com",
      desc: "Response within 24 hours",
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      value: "Available 9am – 6pm UTC",
      desc: "Instant help for urgent issues",
    },
    {
      icon: MapPin,
      title: "Headquarters",
      value: "HUXZAIN Marketplace",
      desc: "Operating globally",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-14">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold mb-4">
              We're here to help
            </div>
            <h1 className="font-display text-4xl font-bold">Contact Us</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Have a question, issue, or feedback? Our team is ready to help you.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_1.4fr] gap-8">
            {/* Info cards */}
            <div className="space-y-4">
              {INFO.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-surface/40 p-5 flex items-start gap-4"
                >
                  <div className="size-11 rounded-xl border border-gold/20 bg-gold/10 flex items-center justify-center shrink-0">
                    <item.icon className="size-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-sm text-gold mt-0.5">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5">
                <p className="text-sm font-semibold text-gold mb-2">Response Times</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>🟢 General enquiries — within 24h</li>
                  <li>🟡 Payment disputes — within 12h</li>
                  <li>🔴 Urgent issues — within 4h</li>
                </ul>
              </div>
            </div>

            {/* Contact form */}
            <div className="rounded-2xl border border-border bg-surface/40 p-6">
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-4">
                  <div className="size-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle2 className="size-8 text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Message Sent!</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've received your message and will respond within 24 hours.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                    className="h-10 px-5 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-semibold text-lg mb-4">Send a Message</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="Describe your issue or question in detail..."
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full h-12 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-all"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {sending ? "Sending…" : "Send Message"}
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
