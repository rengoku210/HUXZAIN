import { useEffect, useRef, useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  MessageSquare,
  Send,
  Inbox,
  User,
  ShoppingBag,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  MessageCircle,
  Sparkles,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace/listing-adapter";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — HUXZAIN" }] }),
  validateSearch: (s: Record<string, unknown>): { orderId?: string } => ({
    orderId: s.orderId ? String(s.orderId) : undefined,
  }),
  component: MessagesPage,
});

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  order_id: string;
  subject: string;
  last_message_at: string;
  last_message_preview: string;
  buyer_unread: number;
  seller_unread: number;
  created_at: string;
  // Mapped profile of the other participant
  otherUser?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  // Mapped listing info
  listing?: {
    title: string;
    cover_image_url: string | null;
  } | null;
  // Mapped order info
  order?: {
    status: string;
    amount_inr?: number;
    amount_total?: number;
  } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_system: boolean;
  created_at: string;
};

function MessagesPage() {
  const { user, isAuthenticated, ready } = useAuth();
  const search = Route.useSearch();
  const orderId = search.orderId;
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(true);

  // Play notification chime (browser-safe synthesized double-tone)
  function playBeep() {
    if (!soundEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(587.33, now, 0.12); // D5
      playTone(783.99, now + 0.08, 0.2); // G5
    } catch (e) {
      console.warn("[Chat] Chime playback failed:", e);
    }
  }

  // Guard routing
  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/messages" } });
    }
  }, [ready, isAuthenticated, navigate]);

  // Load conversation list and map details
  async function loadConversations(autoSelectId?: string) {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Fetch conversations
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      if (!convs || convs.length === 0) {
        setConversations([]);
        setLoadingList(false);
        return;
      }

      // 2. Fetch unique other user IDs & listing IDs & order IDs in batch
      const otherUserIds = Array.from(new Set(convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))));
      const listingIds = Array.from(new Set(convs.map((c) => c.listing_id).filter(Boolean)));
      const orderIds = Array.from(new Set(convs.map((c) => c.order_id).filter(Boolean)));

      const [profilesRes, listingsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", otherUserIds),
        supabase.from("listings").select("id, title, cover_image_url").in("id", listingIds),
        supabase.from("orders").select("id, status, amount_inr, amount_total").in("id", orderIds),
      ]);

      // 3. Map details onto conversations
      const mapped: Conversation[] = convs.map((c) => {
        const otherUserId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        const otherUser = profilesRes.data?.find((p) => p.id === otherUserId) ?? {
          display_name: "User",
          username: "user",
          avatar_url: null,
        };
        const listing = listingsRes.data?.find((l) => l.id === c.listing_id) ?? null;
        const order = ordersRes.data?.find((o) => o.id === c.order_id) ?? null;

        return {
          ...c,
          otherUser,
          listing,
          order,
        };
      });

      setConversations(mapped);

      // Handle auto-selection logic
      if (autoSelectId) {
        const found = mapped.find((c) => c.id === autoSelectId);
        if (found) setActiveConv(found);
      } else if (mapped.length > 0 && !activeConv) {
        // Default to first conversation
        setActiveConv(mapped[0]);
      }
    } catch (err: any) {
      console.error("[Chat] Error loading conversations:", err);
    } finally {
      setLoadingList(false);
    }
  }

  // Handle auto-conversation creation if orderId is in URL query search
  useEffect(() => {
    if (!ready || !isAuthenticated || !user || !orderId) return;

    async function handleIntentOrder() {
      const supabase = getSupabase();
      if (!supabase) return;

      const targetOrderId = orderId as string;
      console.log("[Chat] Processing order chat intent for order ID:", targetOrderId);
      try {
        // 1. Fetch order details
        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .select("*, listings:listing_id(title, seller_id)")
          .eq("id", targetOrderId)
          .single();

        if (orderErr || !orderData) {
          toast.error("Could not load details for order chat intent.");
          return;
        }

        // 2. Check if a conversation already exists
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("order_id", targetOrderId)
          .maybeSingle();

        if (existing) {
          await loadConversations(existing.id);
        } else {
          // 3. Create new conversation
          const { data: newConv, error: createErr } = await supabase
            .from("conversations")
            .insert({
              order_id: targetOrderId,
              buyer_id: orderData.buyer_id,
              seller_id: orderData.seller_id,
              listing_id: orderData.listing_id,
              subject: orderData.listings?.title || `Escrow Order: ${targetOrderId.slice(0, 8)}`,
              last_message_preview: "Escrow chat unlocked.",
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createErr || !newConv) throw createErr || new Error("Failed to create conversation");

          // Insert system message
          await supabase.from("messages").insert({
            conversation_id: newConv.id,
            sender_id: orderData.seller_id,
            body: "Chat unlocked. Safe escrow communication channel opened.",
            is_system: true,
          });

          toast.success("Safe escrow chat unlocked!");
          await loadConversations(newConv.id);
        }
      } catch (err: any) {
        console.error("[Chat] Intent setup error:", err);
      }
    }

    void handleIntentOrder();
  }, [orderId, ready, isAuthenticated, user]);

  // Initial load when ready
  useEffect(() => {
    if (ready && isAuthenticated && user && !orderId) {
      void loadConversations();
    }
  }, [ready, isAuthenticated, user]);

  // Load chat messages when active conversation changes
  async function loadChatMessages(convId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoadingChat(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data ?? []);

      // Reset unread count for the active user
      if (activeConv) {
        const isBuyer = activeConv.buyer_id === user?.id;
        const resetPayload = isBuyer ? { buyer_unread: 0 } : { seller_unread: 0 };
        await supabase
          .from("conversations")
          .update(resetPayload)
          .eq("id", convId);
        
        // Update local list unread badge instantly
        setConversations(prev =>
          prev.map(c => c.id === convId ? { ...c, ...resetPayload } : c)
        );
      }
    } catch (err: any) {
      console.error("[Chat] Error loading messages:", err);
    } finally {
      setLoadingChat(false);
    }
  }

  useEffect(() => {
    if (activeConv) {
      void loadChatMessages(activeConv.id);
    }
  }, [activeConv?.id]);

  // Realtime subscription for messages and conversation updates
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !activeConv || !user) return;

    const channel = supabase
      .channel(`chat_realtime_${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Play double-tone sound for incoming messages only
          if (newMsg.sender_id !== user.id) {
            playBeep();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${activeConv.id}`,
        },
        (payload) => {
          const updated = payload.new as Conversation;
          // Dynamically refresh conversation preview on list
          setConversations(prev =>
            prev.map(c => c.id === updated.id ? { ...c, last_message_preview: updated.last_message_preview, last_message_at: updated.last_message_at } : c)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, user?.id]);

  // Autoscroll chat history to the bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loadingChat]);

  // Send message handler
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !user) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const body = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // 1. Insert message
      const { data: insertedMsg, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          body: body,
          is_system: false,
        })
        .select()
        .single();

      if (msgErr) throw msgErr;

      // 2. Update conversation info and increment unread count for recipient
      const isBuyer = activeConv.buyer_id === user.id;
      const updateData: any = {
        last_message_preview: body,
        last_message_at: new Date().toISOString(),
      };
      if (isBuyer) {
        updateData.seller_unread = (activeConv.seller_unread || 0) + 1;
      } else {
        updateData.buyer_unread = (activeConv.buyer_unread || 0) + 1;
      }

      await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", activeConv.id);

      // Instantly push to local state for responsive preview
      setMessages((prev) => [...prev, insertedMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message_preview: body, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (e: any) {
      toast.error(`Message failed: ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  const activeOtherName = activeConv?.otherUser?.display_name || activeConv?.otherUser?.username || "Participant";
  const activeOtherInitials = activeOtherName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-page py-6 lg:py-8 max-w-6xl mx-auto flex flex-col h-[calc(100vh-140px)]">
        {/* Page title */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="text-gold" /> Escrow Chat Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Secure messaging linked directly to platform orders.
            </p>
          </div>
          <button
            onClick={() => void loadConversations(activeConv?.id)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
          >
            <RefreshCw className="size-3.5" /> Refresh Inbox
          </button>
        </div>

        {/* Unified Chat Container Layout */}
        <div className="flex-1 grid md:grid-cols-[300px_1fr] rounded-3xl border border-border bg-surface/30 overflow-hidden shadow-2xl backdrop-blur-md">
          {/* LEFT COLUMN: Conversations List */}
          <aside className="border-r border-border/80 flex flex-col h-full bg-surface/20">
            <div className="p-4 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  placeholder="Filter conversations..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface/40 border border-border/60 rounded-xl outline-none focus:border-gold/50 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
              {loadingList ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold"></div>
                  <div className="text-xs text-muted-foreground">Loading inbox...</div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-20 text-center px-4">
                  <Inbox className="size-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="font-semibold text-sm">Inbox Empty</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Conversations appear here automatically once escrow payments are created.
                  </p>
                </div>
              ) : (
                conversations.map((c) => {
                  const active = activeConv?.id === c.id;
                  const isBuyer = c.buyer_id === user?.id;
                  const unread = isBuyer ? c.buyer_unread : c.seller_unread;
                  const otherName = c.otherUser?.display_name || c.otherUser?.username || "Participant";
                  const otherInitials = otherName.slice(0, 2).toUpperCase();

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveConv(c)}
                      className={`w-full text-left p-4 hover:bg-surface/40 transition-all flex items-start gap-3 relative ${
                        active ? "bg-gold/10 border-l-4 border-l-gold" : ""
                      }`}
                    >
                      <div className="size-9 rounded-full bg-gold/10 border border-gold/20 overflow-hidden flex items-center justify-center shrink-0">
                        {c.otherUser?.avatar_url ? (
                          <img src={c.otherUser.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-gold">{otherInitials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-xs truncate text-foreground/90">{otherName}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                            {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[10px] text-gold font-medium truncate mb-1">{c.subject}</div>
                        <div className="text-[10px] text-muted-foreground truncate leading-relaxed">
                          {c.last_message_preview || "No messages yet"}
                        </div>
                      </div>
                      {unread > 0 && (
                        <span className="absolute right-4 bottom-4 size-4 rounded-full bg-gold text-primary-foreground text-[9px] font-extrabold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: Active Chat Box */}
          <section className="flex flex-col h-full bg-surface/10 relative">
            {activeConv ? (
              <>
                {/* Chat Top Header Info Box */}
                <div className="p-4 border-b border-border/60 bg-surface/30 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      {activeConv.otherUser?.avatar_url ? (
                        <img src={activeConv.otherUser.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-gold">{activeOtherInitials}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground/95 flex items-center gap-1.5">
                        {activeOtherName}
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-xs text-gold font-medium mt-0.5">{activeConv.subject}</div>
                    </div>
                  </div>

                  {activeConv.order && (
                    <div className="rounded-xl border border-border/80 bg-surface/50 px-3 py-1.5 text-[10px] flex items-center gap-4 shrink-0 shadow-sm">
                      <div>
                        <span className="text-muted-foreground">Order status:</span>{" "}
                        <span className="font-bold uppercase tracking-wider text-gold">{activeConv.order.status}</span>
                      </div>
                      <div className="h-3 w-px bg-border/60" />
                      <div className="font-mono font-bold text-gold">
                        {formatPrice(activeConv.order.amount_inr ?? activeConv.order.amount_total ?? 0)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                  {loadingChat ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
                      <div className="text-xs text-muted-foreground">Loading message history...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground/60 text-xs">
                      No messages yet. Send a message to open conversation.
                    </div>
                  ) : (
                    messages.map((m) => {
                      if (m.is_system) {
                        return (
                          <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                            <div className="rounded-xl border border-gold/10 bg-gold/5 px-4 py-2 text-[10px] text-center max-w-sm text-muted-foreground leading-relaxed flex items-center gap-2">
                              <ShieldCheck size={12} className="text-gold shrink-0" />
                              <span>{m.body}</span>
                            </div>
                          </div>
                        );
                      }

                      const isMe = m.sender_id === user?.id;

                      return (
                        <div
                          key={m.id}
                          className={`flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isMe && (
                            <div className="size-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                              {activeConv.otherUser?.avatar_url ? (
                                <img src={activeConv.otherUser.avatar_url} alt="" className="size-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-gold">{activeOtherInitials}</span>
                              )}
                            </div>
                          )}

                          <div className="max-w-[70%]">
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                                isMe
                                  ? "bg-gold text-primary-foreground font-medium rounded-tr-none shadow-lg shadow-gold/5"
                                  : "bg-surface/60 border border-border/80 text-foreground rounded-tl-none"
                              }`}
                            >
                              {m.body}
                            </div>
                            <div
                              className={`text-[9px] text-muted-foreground mt-1 font-mono ${
                                isMe ? "text-right" : "text-left"
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSend} className="p-4 border-t border-border/60 bg-surface/30 flex gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Write a secure message to ${activeOtherName}...`}
                    className="flex-1 h-11 px-4 rounded-xl border border-border bg-surface/50 text-xs focus:outline-none focus:border-gold/50 placeholder:text-muted-foreground"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="size-11 rounded-xl bg-gold text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center border-none cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageCircle size={48} className="text-muted-foreground/40 mb-3 animate-pulse" />
                <h3 className="font-semibold text-base">Select a conversation</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click a conversation on the left list, or navigate from orders to chat.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
