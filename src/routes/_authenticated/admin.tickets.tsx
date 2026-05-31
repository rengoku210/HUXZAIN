import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import {
  LifeBuoy,
  Inbox,
  Send,
  RefreshCw,
  ArrowLeft,
  Check,
  X,
  BadgeDollarSign,
  UserCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { addWalletBalance } from "@/lib/wallet.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Desk — HUXZAIN Admin" }] }),
  component: Page,
});

type Ticket = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  status: "open" | "resolved" | "closed";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  user: { display_name: string; email: string } | null;
  assigned: { display_name: string } | null;
};

type Message = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  system_event: boolean;
  created_at: string;
  sender: { display_name: string; avatar_url: string | null } | null;
};

function Page() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [processingTopUp, setProcessingTopUp] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Stats
  const openCount = tickets.filter((t) => t.status === "open").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const topUpCount = tickets.filter((t) => t.category === "top_up").length;

  async function loadTickets() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const [ticketsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("*, user:user_id(display_name, email), assigned:assigned_to(display_name)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("withdrawals")
          .select("*")
      ]);

      if (ticketsRes.error) throw ticketsRes.error;

      const mapped = (ticketsRes.data ?? []).map((t: any) => {
        const match = t.title.match(/Payout Withdrawal Request — ₹(\d+(?:\.\d+)?)/);
        if (match) {
          const amt = parseFloat(match[1]);
          const w = withdrawalsRes.data?.find((x: any) => 
            x.user_id === t.user_id &&
            x.amount === amt &&
            Math.abs(new Date(t.created_at).getTime() - new Date(x.created_at).getTime()) < 30000
          );
          if (w) {
            const syncedStatus = w.status === "pending" ? "open" : w.status === "completed" ? "resolved" : "closed";
            return { ...t, status: syncedStatus, withdrawalStatus: w.status };
          }
        }
        return t;
      });

      // Filter tickets if filterStatus is active
      let filtered = mapped;
      if (filterStatus !== "all") {
        filtered = mapped.filter((t: any) => t.status === filterStatus);
      }

      setTickets(filtered as Ticket[]);
    } catch (e: any) {
      toast.error("Failed to load tickets: " + e.message);
    } finally {
      setLoading(false);
    }
  }


  async function loadMessages(ticketId: string) {
    try {
      setLoadingMessages(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*, sender:sender_id(display_name, avatar_url)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) setMessages(data as Message[]);
    } catch (e: any) {
      console.warn("Failed to load messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  useEffect(() => {
    if (activeTicket) loadMessages(activeTicket.id);
  }, [activeTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendReply() {
    if (!user || !activeTicket || !reply.trim()) return;
    try {
      setSending(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client unavailable");

      await supabase.from("support_ticket_messages").insert({
        ticket_id: activeTicket.id,
        sender_id: user.id,
        message: reply.trim(),
      });

      // Touch updated_at
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeTicket.id);

      setReply("");
      await loadMessages(activeTicket.id);
    } catch (err: any) {
      toast.error("Failed to send reply: " + err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(
    ticketId: string,
    newStatus: "open" | "resolved" | "closed"
  ) {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client unavailable");

      await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      // System event message
      if (user) {
        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message:
            newStatus === "resolved"
              ? "✓ This ticket has been marked as resolved by support staff."
              : newStatus === "closed"
                ? "✗ This ticket has been closed."
                : "↺ This ticket has been reopened.",
          system_event: true,
        });
      }

      toast.success(`Ticket marked as ${newStatus}.`);
      if (activeTicket && activeTicket.id === ticketId) {
        setActiveTicket({ ...activeTicket, status: newStatus });
        await loadMessages(ticketId);
      }
      await loadTickets();
    } catch (err: any) {
      toast.error("Status change failed: " + err.message);
    }
  }

  async function handleApproveTopUp(ticket: Ticket) {
    // Extract amount from title like "Wallet Top Up Request — ₹500"
    const match = ticket.title.match(/₹(\d+(?:\.\d+)?)/);
    if (!match) {
      toast.error("Could not extract top-up amount from ticket title.");
      return;
    }
    const amount = parseFloat(match[1]);

    try {
      setProcessingTopUp(true);

      // 1. Credit wallet
      await addWalletBalance(ticket.user_id, amount, "topup", ticket.id);

      // 2. Mark any linked payment proof as approved
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from("payment_proofs")
          .update({ status: "approved" })
          .eq("payment_reference", `top_up:${ticket.id}`);

        // 3. Post system event
        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticket.id,
          sender_id: user?.id,
          message: `✓ Top-up of ₹${amount} approved and credited to seller wallet.`,
          system_event: true,
        });
      }

      // 4. Resolve ticket
      await handleStatusChange(ticket.id, "resolved");

      toast.success(`₹${amount} credited to seller wallet successfully!`);
    } catch (err: any) {
      toast.error("Top-up approval failed: " + err.message);
    } finally {
      setProcessingTopUp(false);
    }
  }

  const categoryLabel: Record<string, string> = {
    bug: "Bug Report",
    technical_issue: "Technical Issue",
    billing: "Billing",
    top_up: "Wallet Top-Up",
  };

  const statusColor: Record<string, string> = {
    open: "text-amber-400",
    resolved: "text-emerald-400",
    closed: "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {!activeTicket ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">Support Desk</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage seller support tickets and wallet top-up requests.
              </p>
            </div>
            <button
              onClick={loadTickets}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Open",
                value: openCount,
                icon: Clock,
                color: "text-amber-400",
                bg: "bg-amber-400/10",
              },
              {
                label: "Resolved",
                value: resolvedCount,
                icon: CheckCircle2,
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              },
              {
                label: "Top-Up Requests",
                value: topUpCount,
                icon: BadgeDollarSign,
                color: "text-gold",
                bg: "bg-gold/10",
              },
              {
                label: "Total",
                value: tickets.length,
                icon: LifeBuoy,
                color: "text-foreground",
                bg: "bg-surface",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-surface/40 p-4 flex items-center gap-3"
              >
                <div
                  className={`size-9 rounded-xl ${s.bg} flex items-center justify-center`}
                >
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold font-mono ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {["open", "resolved", "closed", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`h-8 px-4 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === f
                    ? "bg-gold text-black"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
              Loading support queue...
            </div>
          ) : (
            <PanelCard
              title="Ticket Queue"
              action={<LifeBuoy size={14} className="text-gold" />}
            >
              {tickets.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <Inbox size={20} />
                  </div>
                  <p className="font-medium">No tickets in this queue</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All {filterStatus !== "all" ? filterStatus : ""} tickets
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2.5">Date</th>
                        <th className="text-left font-medium">Seller</th>
                        <th className="text-left font-medium">Category</th>
                        <th className="text-left font-medium">Subject</th>
                        <th className="text-left font-medium">Status</th>
                        <th className="text-right font-medium pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => setActiveTicket(t)}
                          className="border-b border-border/40 hover:bg-surface/20 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="font-medium text-foreground">
                              {(t.user as any)?.display_name || "Unknown"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {(t.user as any)?.email}
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-xs uppercase font-bold ${t.category === "top_up" ? "text-gold" : "text-muted-foreground"}`}
                            >
                              {categoryLabel[t.category] || t.category}
                            </span>
                          </td>
                          <td className="py-3 max-w-[200px] truncate font-medium">
                            {t.title}
                          </td>
                          <td className="py-3">
                            {(t as any).withdrawalStatus ? (
                              <span
                                className={`text-xs font-bold uppercase ${
                                  (t as any).withdrawalStatus === "pending" ? "text-amber-400" :
                                  (t as any).withdrawalStatus === "completed" ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {(t as any).withdrawalStatus === "pending" ? "PENDING" :
                                 (t as any).withdrawalStatus === "completed" ? "COMPLETED" : "REJECTED"}
                              </span>
                            ) : (
                              <span
                                className={`text-xs font-bold uppercase ${statusColor[t.status]}`}
                              >
                                {t.status}
                              </span>
                            )}
                          </td>

                          <td
                            className="py-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-1 justify-end">
                              {t.category === "top_up" &&
                                t.status === "open" && (
                                  <button
                                    onClick={() => handleApproveTopUp(t)}
                                    disabled={processingTopUp}
                                    className="h-7 px-2 rounded-lg text-[10px] font-bold bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                    title="Approve Top-Up"
                                  >
                                    <BadgeDollarSign
                                      size={12}
                                      className="inline mr-1"
                                    />
                                    Approve
                                  </button>
                                )}
                              {t.status === "open" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(t.id, "resolved")
                                  }
                                  className="size-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-all active:scale-95"
                                  title="Mark Resolved"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              {t.status !== "closed" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(t.id, "closed")
                                  }
                                  className="size-7 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 flex items-center justify-center hover:bg-destructive/30 transition-all active:scale-95"
                                  title="Close Ticket"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelCard>
          )}
        </>
      ) : (
        /* ── Thread View ── */
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTicket(null);
                loadTickets();
              }}
              className="size-9 rounded-lg border border-border flex items-center justify-center hover:border-gold/30 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate max-w-[500px]">
                {activeTicket.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                #{activeTicket.id.slice(0, 12)} ·{" "}
                <span className="uppercase font-bold text-gold">
                  {categoryLabel[activeTicket.category] ||
                    activeTicket.category}
                </span>{" "}
                ·{" "}
                <span className={statusColor[activeTicket.status]}>
                  {activeTicket.status}
                </span>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            {/* Chat */}
            <div className="rounded-2xl border border-border bg-surface/30 p-4 h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingMessages ? (
                  <div className="text-center text-xs text-muted-foreground py-12 animate-pulse">
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-12">
                    No messages yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_id === user?.id;
                    return (
                      <div key={m.id}>
                        {m.system_event ? (
                          <div className="text-center py-2">
                            <span className="text-[10px] bg-gold/10 border border-gold/20 text-gold px-2.5 py-0.5 rounded-full font-bold">
                              {m.message}
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} max-w-[80%] ${isAdmin ? "ml-auto" : ""}`}
                          >
                            <span className="text-[10px] text-muted-foreground mb-0.5 font-semibold">
                              {isAdmin
                                ? "Support Team (You)"
                                : m.sender?.display_name || "Seller"}
                            </span>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${isAdmin ? "bg-gold text-black rounded-tr-none font-semibold" : "bg-surface border border-border/80 text-foreground rounded-tl-none"}`}
                            >
                              {m.message}
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 mt-0.5">
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Reply input */}
              {activeTicket.status === "open" ? (
                <div className="flex gap-2 border-t border-border/40 pt-3 mt-3">
                  <input
                    type="text"
                    placeholder="Type a reply to the seller..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-xs"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !reply.trim()}
                    className="size-10 bg-gold text-black flex items-center justify-center rounded-lg hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sending ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-muted-foreground border-t border-border/40 mt-3 font-semibold uppercase">
                  Ticket is {activeTicket.status}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <PanelCard title="Ticket Info">
                <div className="space-y-2.5 text-xs leading-relaxed">
                  {[
                    [
                      "Status",
                      <span
                        className={`font-bold uppercase ${
                          (activeTicket as any).withdrawalStatus ? (
                            (activeTicket as any).withdrawalStatus === "pending" ? "text-amber-400" :
                            (activeTicket as any).withdrawalStatus === "completed" ? "text-emerald-400" : "text-red-400"
                          ) : (
                            statusColor[activeTicket.status]
                          )
                        }`}
                      >
                        {(activeTicket as any).withdrawalStatus ? (
                          (activeTicket as any).withdrawalStatus === "pending" ? "PENDING" :
                          (activeTicket as any).withdrawalStatus === "completed" ? "COMPLETED" : "REJECTED"
                        ) : (
                          activeTicket.status
                        )}
                      </span>,

                    ],
                    [
                      "Category",
                      <span className="font-bold text-gold uppercase">
                        {categoryLabel[activeTicket.category] ||
                          activeTicket.category}
                      </span>,
                    ],
                    [
                      "Seller",
                      <span className="font-bold text-foreground">
                        {(activeTicket.user as any)?.display_name || "Unknown"}
                      </span>,
                    ],
                    [
                      "Email",
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {(activeTicket.user as any)?.email || "—"}
                      </span>,
                    ],
                    [
                      "Opened",
                      new Date(activeTicket.created_at).toLocaleDateString(),
                    ],
                    [
                      "Updated",
                      new Date(activeTicket.updated_at).toLocaleDateString(),
                    ],
                  ].map(([label, val], i) => (
                    <div
                      key={i}
                      className="flex justify-between py-1.5 border-b border-border/30 last:border-0"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </PanelCard>

              {/* Actions */}
              <PanelCard title="Actions">
                <div className="space-y-2">
                  {activeTicket.category === "top_up" &&
                    activeTicket.status === "open" && (
                      <button
                        onClick={() => handleApproveTopUp(activeTicket)}
                        disabled={processingTopUp}
                        className="w-full h-9 rounded-lg bg-gold text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <BadgeDollarSign size={14} />
                        {processingTopUp ? "Processing..." : "Approve Top-Up"}
                      </button>
                    )}
                  {activeTicket.status === "open" && (
                    <button
                      onClick={() =>
                        handleStatusChange(activeTicket.id, "resolved")
                      }
                      className="w-full h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/30 transition-all active:scale-95"
                    >
                      <CheckCircle2 size={14} /> Mark Resolved
                    </button>
                  )}
                  {activeTicket.status === "resolved" && (
                    <button
                      onClick={() =>
                        handleStatusChange(activeTicket.id, "open")
                      }
                      className="w-full h-9 rounded-lg border border-border text-muted-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface transition-all active:scale-95"
                    >
                      <RefreshCw size={14} /> Reopen Ticket
                    </button>
                  )}
                  {activeTicket.status !== "closed" && (
                    <button
                      onClick={() =>
                        handleStatusChange(activeTicket.id, "closed")
                      }
                      className="w-full h-9 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-destructive/30 transition-all active:scale-95"
                    >
                      <X size={14} /> Close Ticket
                    </button>
                  )}
                  {activeTicket.status === "closed" && (
                    <button
                      onClick={() =>
                        handleStatusChange(activeTicket.id, "open")
                      }
                      className="w-full h-9 rounded-lg border border-border text-muted-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface transition-all active:scale-95"
                    >
                      <UserCheck size={14} /> Reopen Ticket
                    </button>
                  )}
                </div>
              </PanelCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
