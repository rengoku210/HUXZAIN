import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { LifeBuoy, Plus, Inbox, Send, RefreshCw, QrCode, Upload, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { triggerNotification, triggerRoleNotification } from "@/lib/notifications.functions";
import { onTicketCreated } from "@/lib/notifications/hooks";
import { toast } from "sonner";
import { BeforeContactSupport } from "@/components/ui/HuxzainNotices";


export const Route = createFileRoute("/_authenticated/seller/support")({
  head: () => ({ meta: [{ title: "Support — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active views
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New ticket form
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"bug" | "technical_issue" | "billing" | "top_up">("bug");
  const [amount, setAmount] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSupportNotice, setShowSupportNotice] = useState(false);
  const [supportNoticeConfirmed, setSupportNoticeConfirmed] = useState(false);


  async function loadTickets() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const [ticketsRes, withdrawalsRes] = await Promise.all([
          supabase
            .from("support_tickets")
            .select("*, assigned:assigned_to(display_name)")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false }),
          supabase
            .from("withdrawals")
            .select("*")
            .eq("user_id", user.id)
        ]);

        if (ticketsRes.error) throw ticketsRes.error;

        const mappedTickets = (ticketsRes.data ?? []).map((t: any) => {
          const match = t.title.match(/Payout Withdrawal Request — ₹(\d+(?:\.\d+)?)/);
          if (match) {
            const amt = parseFloat(match[1]);
            const w = withdrawalsRes.data?.find((x: any) => 
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

        setTickets(mappedTickets);
      }
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
      if (supabase) {
        const { data, error } = await supabase
          .from("support_ticket_messages")
          .select("*, sender:sender_id(display_name, avatar_url)")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data) setMessages(data);
      }
    } catch (e: any) {
      console.warn("Failed to load messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [user?.id]);

  useEffect(() => {
    if (activeTicket) {
      loadMessages(activeTicket.id);
    }
  }, [activeTicket]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotUrl(reader.result as string);
        toast.success("Deposit receipt proof loaded successfully!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("File loading failed: " + err.message);
      setUploading(false);
    }
  }

  async function handleCreateTicket(bypassNotice = false) {
    if (!user) { setLoading(false); return; }
    if (!title.trim()) {
      toast.error("Please provide a subject title for the support ticket");
      return;
    }
    if (category === "top_up" && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
      toast.error("Please provide a valid top-up amount");
      return;
    }
    if (category === "top_up" && !screenshotUrl) {
      toast.error("Please upload the transaction receipt screenshot proof");
      return;
    }

    if (!bypassNotice && !supportNoticeConfirmed) {
      setShowSupportNotice(true);
      return;
    }


    try {
      setCreating(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      const finalTitle = category === "top_up" ? `Wallet Top Up Request — ₹${amount}` : title;

      // 1. Insert support ticket
      const { data: ticket, error: tErr } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          title: finalTitle,
          category,
          status: "open"
        })
        .select("*")
        .single();

      if (tErr) throw tErr;

      // 2. Insert first system / descriptive message
      await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: category === "top_up"
          ? `Sellers initiated a wallet top-up request of ₹${amount}. Screenshot proof attached.`
          : `Hello support desk. I have opened this ticket regarding: ${category.toUpperCase().replace(/_/g, " ")}. Details: ${title}`
      });

      // 3. If category is top_up, create a payment_proofs record linked via reference
      if (category === "top_up") {
        const { error: proofErr } = await supabase
          .from("payment_proofs")
          .insert({
            user_id: user.id,
            buyer_id: user.id,
            amount: Number(amount),
            screenshot_url: screenshotUrl,
            status: "pending",
            payment_type: "listing", // Use listing to hook into admin payments inspecting views
            payment_reference: `top_up:${ticket.id}`
          });

        if (proofErr) console.warn("Creating top_up proof failed:", proofErr);
      }

      toast.success(category === "top_up" ? "Top up ticket created! Balance will increase upon admin approval." : "Ticket opened successfully!");

      // 4. Notify seller + operations team (owner/admin/staff)
      try {
        await triggerNotification({
          data: {
            userId: user.id,
            kind: "ticket.created",
            title: "Support ticket created",
            body: `Your ticket "${finalTitle}" was created successfully.`,
          },
        });

        // Trigger staff + owner notifications using central notify hook
        await onTicketCreated(ticket.id, user.email || user.id, finalTitle);
      } catch (e) {
        // Don't block UX on notifications
        console.warn("Ticket notifications failed:", e);
      }

      setTitle("");
      setAmount("");
      setScreenshotUrl("");
      setShowNewModal(false);
      await loadTickets();
    } catch (err: any) {
      toast.error("Ticket creation failed: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSendMessage() {
    if (!user || !activeTicket || !newMessage.trim()) return;

    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from("support_ticket_messages")
          .insert({
            ticket_id: activeTicket.id,
            sender_id: user.id,
            message: newMessage
          });

        if (error) throw error;
        setNewMessage("");
        await loadMessages(activeTicket.id);

        // Update ticket updated_at
        await supabase
          .from("support_tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeTicket.id);
      }
    } catch (err: any) {
      toast.error("Message send failed: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {!activeTicket ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">Support Center</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Open a ticket — we generally respond within 6 hours.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadTickets}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-all active:scale-95"
              >
                <Plus size={14} /> New ticket
              </button>
            </div>
          </div>

          <PanelCard title="Your tickets" action={<LifeBuoy size={14} className="text-gold" />}>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                Syncing ticket registry logs...
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox size={40} className="text-muted-foreground mb-3 opacity-60" />
                <h2 className="text-sm font-semibold">No tickets yet</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  You haven't opened any support requests. Click "New ticket" to contact us!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left font-medium py-2.5">Category</th>
                      <th className="text-left font-medium">Subject</th>
                      <th className="text-left font-medium pl-4">Status</th>
                      <th className="text-left font-medium">Handler</th>
                      <th className="text-right font-medium pr-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setActiveTicket(t)}
                        className="border-b border-border/40 hover:bg-surface/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-semibold text-gold text-xs uppercase">
                          {t.category.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 font-medium text-foreground max-w-[250px] truncate">{t.title}</td>
                        <td className="py-3 pl-4">
                          {t.withdrawalStatus ? (
                            <StatusPill 
                              status={
                                t.withdrawalStatus === "pending" ? "Pending" : 
                                t.withdrawalStatus === "completed" ? "Completed" : "Rejected"
                              } 
                            />
                          ) : (
                            <StatusPill status={t.status === "open" ? "Pending" : "Completed"} />
                          )}
                        </td>

                        <td className="py-3 text-xs text-muted-foreground">
                          {t.assigned?.display_name || "Unassigned"}
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground">
                          {new Date(t.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>
        </>
      ) : (
        /* Conversation Thread View */
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
            <div>
              <h2 className="text-lg font-bold text-foreground truncate max-w-[400px]">{activeTicket.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ticket ID: #{activeTicket.id.slice(0, 12)} · Category:{" "}
                <span className="font-bold text-gold uppercase">{activeTicket.category}</span>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_260px] gap-6">
            {/* Messages Chat Room */}
            <div className="rounded-2xl border border-border bg-surface/30 p-4 h-[55vh] min-h-[320px] max-h-[500px] flex flex-col justify-between">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingMessages ? (
                  <div className="text-center text-xs text-muted-foreground py-12 animate-pulse">
                    Retrieving ticket correspondence...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-12">
                    No correspondence logged yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUserSender = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isUserSender ? "items-end" : "items-start"} max-w-[80%] ${isUserSender ? "ml-auto" : ""}`}
                      >
                        {m.system_event ? (
                          <div className="w-full text-center py-2">
                            <span className="text-[10px] bg-gold/10 border border-gold/20 text-gold px-2.5 py-0.5 rounded-full font-bold">
                              {m.message}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] text-muted-foreground mb-0.5 font-semibold">
                              {isUserSender ? "You" : m.sender?.display_name || "Support Team"}
                            </span>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${isUserSender ? "bg-gold text-black rounded-tr-none font-semibold" : "bg-surface border border-border/80 text-foreground rounded-tl-none"}`}
                            >
                              {m.message}
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 mt-0.5">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {activeTicket.status === "open" ? (
                <div className="flex gap-2 border-t border-border/40 pt-3 mt-3">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-xs"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="size-10 bg-gold text-black flex items-center justify-center rounded-lg hover:bg-gold/90 transition-all active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-muted-foreground border-t border-border/40 mt-3 font-semibold uppercase">
                  This ticket has been marked resolved.
                </div>
              )}
            </div>

            {/* Sidebar Meta */}
            <div className="space-y-4">
              <PanelCard title="Ticket Details">
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Status</span>
                    <span className="font-bold text-gold uppercase">
                      {activeTicket.withdrawalStatus ? (
                        activeTicket.withdrawalStatus === "pending" ? "PENDING" :
                        activeTicket.withdrawalStatus === "completed" ? "COMPLETED" : "REJECTED"
                      ) : (
                        activeTicket.status === "open" ? "PENDING" : "COMPLETED"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Handler</span>
                    <span className="font-bold text-foreground">
                      {activeTicket.assigned?.display_name || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Opened</span>
                    <span className="font-mono">{new Date(activeTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </PanelCard>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">Open Support Ticket</h3>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Select Issue Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                >
                  <option value="bug">Report a Bug / Error</option>
                  <option value="technical_issue">Technical Platform Issue</option>
                  <option value="billing">Billing / Payouts</option>
                  <option value="top_up">Wallet Payout Top-up</option>
                </select>
              </div>

              {category === "top_up" ? (
                /* Top Up Payment slide */
                <div className="space-y-3 p-3.5 border border-border/80 bg-surface/30 rounded-xl animate-in fade-in duration-200">
                  <div className="flex gap-4 items-center">
                    <div className="size-20 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center">
                      <QrCode className="size-16 text-black" />
                    </div>
                    <div className="text-[11px] space-y-1">
                      <p className="font-bold text-foreground">Scan UPI QR to Deposit</p>
                      <p className="text-muted-foreground leading-relaxed">
                        Scan and pay the exact amount. Then upload the screenshot proof.
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Enter Top Up Amount (INR)</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Upload Deposit Screenshot Receipt</span>
                    <label className="mt-1.5 flex flex-col items-center justify-center w-full h-20 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="size-4 text-gold mb-1" />
                        <p className="text-[10px] text-muted-foreground">Click to upload transfer screenshot</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {screenshotUrl && (
                      <div className="mt-1 text-[10px] text-emerald-400 font-bold text-center">
                        ✓ Transfer Receipt Proof Loaded!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-muted-foreground">Describe Issue / Subject</span>
                  <input
                    type="text"
                    placeholder="Briefly describe the issue..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="h-10 px-4 rounded-lg border border-border text-xs hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateTicket()}
                  disabled={creating || uploading}
                  className="h-10 px-5 rounded-lg bg-gold text-black font-bold text-xs hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {creating ? "Opening ticket..." : "Open Ticket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSupportNotice && (
        <BeforeContactSupport
          onContinue={() => {
            setShowSupportNotice(false);
            setSupportNoticeConfirmed(true);
            void handleCreateTicket(true);
            setShowNewModal(false);
          }}
          onHelpCentre={() => setShowSupportNotice(false)}
        />
      )}
    </div>
  );
}
