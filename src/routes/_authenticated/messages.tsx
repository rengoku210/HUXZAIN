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
  ShoppingBag,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  MessageCircle,
  Sparkles,
  X,
  Loader2,
  Star,
  AlertCircle,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace/listing-adapter";
import { calculateInspectionHours } from "@/lib/escrow";
import { completeOrderAndCreditSeller } from "@/lib/wallet.functions";
import { openDispute } from "@/lib/marketplace/disputeService";

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
  otherUser?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  listing?: {
    title: string;
    cover_image_url: string | null;
    category_id: string;
    category_slug?: string;
  } | null;
  order?: {
    id: string;
    order_number: string;
    buyer_id: string;
    seller_id: string;
    listing_id: string;
    status: string;
    amount_inr?: number;
    amount_total?: number;
    delivered_at?: string | null;
    completed_at?: string | null;
  } | null;
  sellerProfile?: {
    subscription_tier?: string | null;
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

// Check contact sharing policy violations
const CONTACT_PATTERNS = [
  /whatsapp/i,
  /telegram/i,
  /discord/i,
  /t\.me/i,
  /discord\.gg/i,
  /call\s+me/i,
  /contact\s+me/i,
  /message\s+me\s+on/i,
  /instagram/i,
  /snapchat/i,
  /direct\s+transfer/i,
  /upi\s+outside/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // phone
  /[a-zA-Z0-9.-]+@[a-zA-Z]{2,4}/ // simple upi check
];

function checkContactViolation(text: string): boolean {
  return CONTACT_PATTERNS.some(pat => pat.test(text));
}

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

  // Review states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Policy warning
  const [showPolicyWarning, setShowPolicyWarning] = useState(false);

  // Order Room forms state
  const [reqRiotId, setReqRiotId] = useState("");
  const [reqRegion, setReqRegion] = useState("");
  const [reqServer, setReqServer] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const [delUsername, setDelUsername] = useState("");
  const [delPassword, setDelPassword] = useState("");
  const [delEmail, setDelEmail] = useState("");
  const [delRecovery, setDelRecovery] = useState("");
  const [delSerial, setDelSerial] = useState("");
  const [delFileUrl, setDelFileUrl] = useState("");
  const [delSubmitting, setDelSubmitting] = useState(false);

  // Dispute form state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Inspection countdown tick
  const [nowTime, setNowTime] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(true);

  // Track timer updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor text input for real-time contact-sharing warning
  useEffect(() => {
    if (newMessage.trim()) {
      setShowPolicyWarning(checkContactViolation(newMessage));
    } else {
      setShowPolicyWarning(false);
    }
  }, [newMessage]);

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

      // 2. Fetch unique user IDs & listing IDs & order IDs in batch
      const allUserIds = Array.from(new Set([...convs.map(c => c.buyer_id), ...convs.map(c => c.seller_id)]));
      const listingIds = Array.from(new Set(convs.map((c) => c.listing_id).filter(Boolean)));
      const orderIds = Array.from(new Set(convs.map((c) => c.order_id).filter(Boolean)));

      const [profilesRes, listingsRes, ordersRes, categoriesRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, username, avatar_url, subscription_tier").in("id", allUserIds),
        supabase.from("listings").select("id, title, cover_image_url, category_id, price_inr").in("id", listingIds),
        supabase.from("orders").select("id, order_number, buyer_id, seller_id, listing_id, status, amount_inr, amount_total, delivered_at, completed_at").in("id", orderIds),
        supabase.from("categories").select("id, name, slug"),
      ]);

      // 3. Map details onto conversations
      const mapped: Conversation[] = convs.map((c) => {
        const otherUserId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        const otherUser = profilesRes.data?.find((p) => p.id === otherUserId) ?? {
          display_name: "User",
          username: "user",
          avatar_url: null,
          subscription_tier: "standard"
        };
        const listingRaw = listingsRes.data?.find((l) => l.id === c.listing_id) ?? null;
        const order = ordersRes.data?.find((o) => o.id === c.order_id) ?? null;
        const sellerProfile = profilesRes.data?.find((p) => p.id === c.seller_id) || null;

        // Resolve category slug
        let categorySlug = "digital-products";
        if (listingRaw && categoriesRes.data) {
          const cat = categoriesRes.data.find(x => x.id === listingRaw.category_id);
          if (cat) categorySlug = cat.slug;
        }

        const listing = listingRaw 
          ? {
              ...listingRaw,
              category_slug: categorySlug
            }
          : null;

        return {
          ...c,
          otherUser,
          listing,
          order,
          sellerProfile
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

  // Scans and scrolls the messages container smoothly without causing page jumps
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 60);
    return () => clearTimeout(timer);
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
      // 1. If policy violation detected, insert system policy warning in DB first
      const hasViolation = checkContactViolation(body);
      if (hasViolation) {
        console.warn("[Chat] Policy violation warning logged.");
        await supabase.from("messages").insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          body: `[SYSTEM_POLICY_WARNING]: Chat sender attempted to share contact information or off-platform payment keyword. Keep trade inside HUXZAIN escrow to prevent fraud. Input preview: "${body.slice(0, 50)}..."`,
          is_system: true,
        });

        // Insert into policy_violations table
        try {
          await supabase.from("policy_violations").insert({
            user_id: user.id,
            violation_type: "contact_sharing",
            message_body: body,
          });
        } catch (err) {
          console.error("Failed to insert policy violation record:", err);
        }

        // Insert supporting audit alert
        try {
          await supabase.from("support_tickets").insert({
            user_id: user.id,
            title: `Policy Violation Alert: User ${user.email} trigger`,
            category: "safety",
            status: "open"
          });
        } catch (err) {
          console.error("Safety alert log failed:", err);
        }
      }

      // 2. Insert message
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

      // 3. Update conversation info and increment unread count for recipient
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

  async function handleRequestReview() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Send a system message that triggers the review card for the buyer
      const { data: systemMsg, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          body: "[SYSTEM_REQUEST_REVIEW]",
          is_system: true
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation preview
      await supabase
        .from("conversations")
        .update({
          last_message_preview: "Review requested by seller.",
          last_message_at: new Date().toISOString()
        })
        .eq("id", activeConv.id);

      setMessages(prev => [...prev, systemMsg]);
      toast.success("Review request sent successfully!");
    } catch (e: any) {
      toast.error("Failed to request review: " + e.message);
    }
  }

  async function handleSubmitReview() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setSubmittingReview(true);
      
      // 1. Insert review record
      const { error: revErr } = await supabase
        .from("reviews")
        .insert({
          order_id: activeConv.order_id,
          buyer_id: activeConv.buyer_id,
          seller_id: activeConv.seller_id,
          listing_id: activeConv.listing_id,
          rating: selectedRating,
          comment: reviewComment || null
        });

      if (revErr) throw revErr;

      // 2. Insert notification message in chat
      const { data: systemMsg, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          body: `[SYSTEM_REVIEW_SUBMITTED]: ${selectedRating}`,
          is_system: true
        })
        .select()
        .single();

      if (msgErr) throw msgErr;

      // 3. Update conversation last message preview
      await supabase
        .from("conversations")
        .update({
          last_message_preview: `Buyer submitted a ${selectedRating}★ review.`,
          last_message_at: new Date().toISOString()
        })
        .eq("id", activeConv.id);

      setMessages(prev => [...prev, systemMsg]);
      toast.success("Thank you for your review!");
      setReviewModalOpen(false);
      setReviewComment("");
    } catch (e: any) {
      toast.error("Failed to submit review: " + e.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  // --- Order Room Operations ---

  const orderData = activeConv?.order;
  const listingData = activeConv?.listing;
  const isBuyer = activeConv ? activeConv.buyer_id === user?.id : false;
  const isSeller = activeConv ? activeConv.seller_id === user?.id : false;

  // Find system messages for data payloads
  const requirementsMsg = messages.find(m => m.is_system && m.body.startsWith("[SYSTEM_REQUIREMENTS_SUBMITTED]:"));
  const deliveryMsg = messages.find(m => m.is_system && m.body.startsWith("[SYSTEM_DELIVERY_SUBMITTED]:"));

  const requirementsPayload = useMemo(() => {
    if (!requirementsMsg) return null;
    try {
      const jsonStr = requirementsMsg.body.replace("[SYSTEM_REQUIREMENTS_SUBMITTED]:", "").trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }, [requirementsMsg]);

  const deliveryPayload = useMemo(() => {
    if (!deliveryMsg) return null;
    try {
      const jsonStr = deliveryMsg.body.replace("[SYSTEM_DELIVERY_SUBMITTED]:", "").trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }, [deliveryMsg]);

  // Submit buyer requirements
  async function handleSubmitRequirements(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setReqSubmitting(true);
      const payload = {
        riotId: reqRiotId,
        region: reqRegion,
        server: reqServer,
        notes: reqNotes
      };

      const systemBody = `[SYSTEM_REQUIREMENTS_SUBMITTED]:${JSON.stringify(payload)}`;

      // Insert system message in chat
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: systemBody,
        is_system: true
      });

      // Update order status to "delivering" (Work in Progress)
      await supabase.from("orders").update({
        status: "delivering",
        updated_at: new Date().toISOString()
      }).eq("id", activeConv.order_id);

      toast.success("Requirements submitted successfully! The seller has been notified.");
      
      // Reset inputs & reload
      setReqRiotId("");
      setReqRegion("");
      setReqServer("");
      setReqNotes("");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to submit requirements: " + e.message);
    } finally {
      setReqSubmitting(false);
    }
  }

  // Submit seller delivery
  async function handleSubmitDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setDelSubmitting(true);
      const payload = {
        username: delUsername,
        password: delPassword,
        email: delEmail,
        recovery: delRecovery,
        serial: delSerial,
        fileUrl: delFileUrl
      };

      const systemBody = `[SYSTEM_DELIVERY_SUBMITTED]:${JSON.stringify(payload)}`;

      // Insert system message in chat
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: systemBody,
        is_system: true
      });

      // Update order status to "delivered" and record delivered_at
      await supabase.from("orders").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", activeConv.order_id);

      toast.success("Delivery credentials submitted! Buyer inspection countdown has started.");
      
      // Reset inputs & reload
      setDelUsername("");
      setDelPassword("");
      setDelEmail("");
      setDelRecovery("");
      setDelSerial("");
      setDelFileUrl("");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to submit delivery: " + e.message);
    } finally {
      setDelSubmitting(false);
    }
  }

  // Complete Order (Buyer action to release funds)
  async function handleCompleteOrder() {
    if (!activeConv) return;
    try {
      const confirmed = window.confirm("Are you sure you want to approve delivery and release escrow funds to the seller? This action cannot be reversed.");
      if (!confirmed) return;

      await completeOrderAndCreditSeller(activeConv.order_id);
      toast.success("Order marked completed. Escrow balance released to seller wallet!");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Fulfillment failed: " + e.message);
    }
  }

  // Open Dispute
  async function handleOpenDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv || !user || !disputeReason) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setDisputeSubmitting(true);

      const fullReason = disputeNotes ? `${disputeReason}: ${disputeNotes}` : disputeReason;

      // Create dispute record using service (handles uploading screenshots automatically)
      await openDispute({
        orderId: activeConv.order_id,
        openedBy: user.id,
        reason: fullReason,
        evidenceFiles: disputeFiles
      });

      // Update order status to "disputed"
      await supabase.from("orders").update({
        status: "disputed",
        updated_at: new Date().toISOString()
      }).eq("id", activeConv.order_id);

      // Insert system message in chat
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: `[SYSTEM_DISPUTE_OPENED]: Dispute initiated by buyer. Reason: "${disputeReason}"${disputeNotes ? '. Details: "' + disputeNotes + '"' : ''}${disputeFiles.length > 0 ? '. Attached ' + disputeFiles.length + ' evidence screenshots.' : ''}`,
        is_system: true
      });

      toast.success("Dispute opened. A HUXZAIN moderator has been assigned to investigate.");
      setDisputeOpen(false);
      setDisputeReason("");
      setDisputeNotes("");
      setDisputeFiles([]);
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to open dispute: " + e.message);
    } finally {
      setDisputeSubmitting(false);
    }
  }

  // Calculated Inspection Period remaining
  const inspectionRemaining = useMemo(() => {
    if (!orderData || !orderData.delivered_at || !listingData) return 0;
    const categorySlug = (listingData as any).category_slug || "digital-products";
    const price = Number(orderData.amount_inr || orderData.amount_total || 0);
    const sellerTier = (activeConv?.sellerProfile?.subscription_tier || "standard") as any;

    const hours = calculateInspectionHours(categorySlug, price, sellerTier);
    const targetTime = new Date(orderData.delivered_at).getTime() + hours * 60 * 60 * 1000;
    return Math.max(0, targetTime - nowTime);
  }, [orderData?.delivered_at, listingData, activeConv?.sellerProfile, nowTime]);

  const activeOtherName = activeConv?.otherUser?.display_name || activeConv?.otherUser?.username || "Participant";
  const activeOtherInitials = activeOtherName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-page py-4 lg:py-8 max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-140px)] animate-fade-in">
        {/* Page title */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="text-gold" /> Escrow Chat Panel
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
              Secure messaging linked directly to platform orders.
            </p>
          </div>
          <button
            onClick={() => void loadConversations(activeConv?.id)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-xs lg:text-sm hover:border-gold/40 hover:bg-gold/5 transition-all text-gold font-medium shrink-0 shadow-sm"
          >
            <RefreshCw className="size-3.5" /> Refresh Inbox
          </button>
        </div>

        {/* Unified Chat Container Layout */}
        <div className="flex-1 grid md:grid-cols-[260px_1fr] rounded-3xl border border-border/80 bg-surface/30 overflow-hidden shadow-2xl backdrop-blur-md">
          {/* LEFT COLUMN: Conversations List */}
          <aside className={`border-r border-border/80 flex-col h-full bg-surface/20 ${activeConv ? "hidden md:flex" : "flex"}`}>
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

          {/* RIGHT COLUMN: Chat Box + Split Order Room Layout */}
          {activeConv ? (
            <div className={`h-full relative grid grid-rows-[1fr_auto] md:grid-rows-none ${activeConv.order ? "md:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
              {/* CHAT WINDOW INTERFACES */}
              <section className="flex flex-col h-full bg-surface/10 border-r border-border/60 relative">
                {/* Chat Header */}
                <div className="p-3 lg:p-4 border-b border-border/60 bg-surface/40 flex items-center justify-between gap-3 lg:gap-4 flex-wrap shadow-sm">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <button
                      onClick={() => setActiveConv(null)}
                      className="md:hidden h-8 w-8 rounded-full border border-gold/20 bg-gold/10 hover:bg-gold/20 flex items-center justify-center text-gold transition-all shrink-0 font-bold active:scale-95"
                      title="Back to Inbox"
                    >
                      ←
                    </button>
                    <div className="size-9 lg:size-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      {activeConv.otherUser?.avatar_url ? (
                        <img src={activeConv.otherUser.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-xs lg:text-sm font-bold text-gold">{activeOtherInitials}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs lg:text-sm text-foreground/95 flex items-center gap-1.5">
                        {activeOtherName}
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-[10px] lg:text-xs text-gold font-medium mt-0.5">{activeConv.subject}</div>
                    </div>
                  </div>

                  {activeConv.order && (
                    <div className="flex items-center gap-2">
                      {activeConv.order.status === "completed" && user?.id === activeConv.seller_id && (
                        <button
                          type="button"
                          onClick={handleRequestReview}
                          disabled={messages.some(m => m.body === "[SYSTEM_REQUEST_REVIEW]")}
                          className="h-7 px-3 rounded-lg bg-gold text-primary-foreground font-bold text-[9px] uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer border-none"
                        >
                          {messages.some(m => m.body === "[SYSTEM_REQUEST_REVIEW]") ? "Review Requested" : "Request Review"}
                        </button>
                      )}
                      
                      <div className="rounded-xl border border-border/80 bg-surface/50 px-2.5 py-1 lg:px-3 lg:py-1.5 text-[9px] lg:text-[10px] flex items-center gap-3 lg:gap-4 shrink-0 shadow-sm">
                        <div>
                          <span className="text-muted-foreground">Order:</span>{" "}
                          <span className="font-bold uppercase tracking-wider text-gold">{activeConv.order.status.toUpperCase()}</span>
                        </div>
                        <div className="h-3 w-px bg-border/60" />
                        <div className="font-mono font-bold text-gold">
                          {formatPrice(activeConv.order.amount_inr || activeConv.order.amount_total || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages List */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scroll-smooth"
                >
                  {/* Protection Warning Alert */}
                  <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 text-xs leading-relaxed text-muted-foreground/90 max-w-lg mx-auto flex items-start gap-2.5">
                    <ShieldCheck className="size-4 text-gold shrink-0 mt-0.5" />
                    <div>
                      For your protection, keep all communication, payments, and deliveries inside HUXZAIN. Exchanging off-platform contact information or coordinates constitutes a safety risk.
                    </div>
                  </div>

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
                        // Policy Violation system message
                        if (m.body.startsWith("[SYSTEM_POLICY_WARNING]:")) {
                          return (
                            <div key={m.id} className="flex justify-center my-4 animate-fade-in w-full px-4">
                              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-[10px] text-center max-w-md text-rose-300 leading-relaxed flex flex-col items-center gap-1.5 shadow-md shadow-rose-500/5">
                                <div className="flex items-center gap-1">
                                  <AlertCircle size={13} className="text-rose-400" />
                                  <span className="font-bold text-rose-400">Security Guard Alert</span>
                                </div>
                                <span>{m.body.replace("[SYSTEM_POLICY_WARNING]:", "")}</span>
                              </div>
                            </div>
                          );
                        }

                        if (m.body === "[SYSTEM_REQUEST_REVIEW]") {
                          const isBuyer = activeConv.buyer_id === user?.id;
                          const hasSubmitted = messages.some(msg => msg.body.startsWith("[SYSTEM_REVIEW_SUBMITTED]:"));

                          if (isBuyer) {
                            return (
                              <div key={m.id} className="flex justify-center my-4 animate-fade-in w-full px-4">
                                <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/5 to-transparent p-5 text-center max-w-md w-full shadow-lg shadow-gold/5 flex flex-col items-center gap-3">
                                  <div className="size-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                                    <Sparkles className="size-5 text-gold" />
                                  </div>
                                  <div>
                                    <h4 className="font-display font-bold text-sm text-foreground">Order Completed — Share Feedback</h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {hasSubmitted 
                                        ? "Thank you! Your verified rating and written feedback have been successfully recorded." 
                                        : "The seller has requested a review. Your feedback shapes their reputation and helps others in the community."}
                                    </p>
                                  </div>
                                  {!hasSubmitted && (
                                    <button
                                      type="button"
                                      onClick={() => setReviewModalOpen(true)}
                                      className="h-9 px-5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs hover:brightness-110 transition-all shadow-md active:scale-95 border-none cursor-pointer"
                                    >
                                      Rate & Review Order
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                                <div className="rounded-xl border border-border/85 bg-surface/40 px-4 py-2 text-[10px] text-center max-w-sm text-muted-foreground leading-relaxed flex items-center gap-2">
                                  <Clock size={12} className="text-gold shrink-0 animate-pulse" />
                                  <span>
                                    {hasSubmitted 
                                      ? "Feedback received! The buyer has rated this order." 
                                      : "You requested a review. Waiting for the buyer's response."}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        }

                        if (m.body.startsWith("[SYSTEM_REVIEW_SUBMITTED]:")) {
                          const ratingStr = m.body.replace("[SYSTEM_REVIEW_SUBMITTED]:", "").trim();
                          const ratingVal = parseInt(ratingStr) || 5;
                          return (
                            <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-[10px] text-center max-w-sm text-muted-foreground leading-relaxed flex flex-col items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  <ShieldCheck size={13} className="text-emerald-400" />
                                  <span className="font-bold text-foreground">Verified Order Review Left!</span>
                                </div>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`size-3 ${s <= ratingVal ? "fill-gold text-gold" : "text-muted-foreground/20"}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Requirements submitted alert
                        if (m.body.startsWith("[SYSTEM_REQUIREMENTS_SUBMITTED]:")) {
                          return (
                            <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                              <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-2 text-[10px] text-center max-w-sm text-muted-foreground leading-relaxed flex items-center gap-2">
                                <ShieldCheck size={12} className="text-gold shrink-0" />
                                <span>Buyer Requirements Submitted. Order status changed to Work in Progress.</span>
                              </div>
                            </div>
                          );
                        }

                        // Delivery submitted alert
                        if (m.body.startsWith("[SYSTEM_DELIVERY_SUBMITTED]:")) {
                          return (
                            <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[10px] text-center max-w-sm text-muted-foreground leading-relaxed flex items-center gap-2">
                                <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                                <span>Seller credentials and order deliverables submitted! Escrow is locked for review.</span>
                              </div>
                            </div>
                          );
                        }

                        // Dispute opened alert
                        if (m.body.startsWith("[SYSTEM_DISPUTE_OPENED]:")) {
                          return (
                            <div key={m.id} className="flex justify-center my-4 animate-fade-in">
                              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-[10px] text-center max-w-sm text-rose-300 leading-relaxed flex items-center gap-2">
                                <AlertCircle size={12} className="text-rose-400 shrink-0" />
                                <span>{m.body.replace("[SYSTEM_DISPUTE_OPENED]:", "")}</span>
                              </div>
                            </div>
                          );
                        }

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

                {/* Input area */}
                <div className="border-t border-border/60 bg-surface/30 flex flex-col pt-2 pb-4 px-4">
                  {showPolicyWarning && (
                    <div className="mb-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2 animate-in slide-in-from-bottom-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="font-bold">Security Warning:</span> Exchanging off-platform contact info (WhatsApp, Telegram, Discord) or requesting payments outside HUXZAIN is strictly prohibited. Sharing contact details will flag your account for moderation review.
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Write a secure message to ${activeOtherName}...`}
                      className="flex-1 h-11 px-4 rounded-xl border border-border bg-surface/50 text-xs focus:outline-none focus:border-gold/50 placeholder:text-muted-foreground text-foreground"
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
                </div>
              </section>

              {/* ELDORADO ORDER ROOM SPLIT DETAIL COLUMN */}
              {activeConv.order && (
                <aside className="border-t md:border-t-0 md:border-l border-border/60 bg-surface/25 flex flex-col h-[480px] md:h-full overflow-y-auto scrollbar-thin p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-border/60">
                    <ShoppingBag className="text-gold size-4 shrink-0" />
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">
                      Order Room
                    </h3>
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      #{activeConv.order.order_number || activeConv.order.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Chronological Timeline */}
                  <div className="space-y-3 pb-3.5 border-b border-border/40 text-[11px]">
                    <div className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Fulfillment Progress</div>
                    
                    {/* Step 1: Paid */}
                    <div className="flex items-start gap-2.5">
                      <div className="size-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-[9px] font-bold text-emerald-400 shrink-0">✓</div>
                      <div>
                        <div className="font-semibold text-foreground/90">Funds Escrowed</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">₹{(activeConv.order.amount_inr || activeConv.order.amount_total || 0)} secured in HUXZAIN vault</div>
                      </div>
                    </div>

                    {/* Step 2: Requirements */}
                    <div className="flex items-start gap-2.5">
                      <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        requirementsPayload 
                          ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400" 
                          : "bg-surface-elevated border border-border text-muted-foreground"
                      }`}>
                        {requirementsPayload ? "✓" : "2"}
                      </div>
                      <div>
                        <div className={`font-semibold ${requirementsPayload ? "text-foreground/90" : "text-muted-foreground"}`}>Buyer Requirements</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {requirementsPayload ? "Instructions submitted by buyer" : "Awaiting account ID & instructions"}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Work in Progress / Seller Delivery */}
                    <div className="flex items-start gap-2.5">
                      <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        deliveryPayload
                          ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                          : requirementsPayload
                            ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                            : "bg-surface-elevated border border-border text-muted-foreground"
                      }`}>
                        {deliveryPayload ? "✓" : "3"}
                      </div>
                      <div>
                        <div className={`font-semibold ${deliveryPayload ? "text-foreground/90" : requirementsPayload ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Seller Delivery</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {deliveryPayload ? "Deliverables submitted" : "Awaiting credential upload"}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Verification Period */}
                    <div className="flex items-start gap-2.5">
                      <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        activeConv.order.status === "completed"
                          ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                          : activeConv.order.status === "delivered"
                            ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                            : "bg-surface-elevated border border-border text-muted-foreground"
                      }`}>
                        {activeConv.order.status === "completed" ? "✓" : "4"}
                      </div>
                      <div>
                        <div className={`font-semibold ${activeConv.order.status === "completed" ? "text-foreground/90" : activeConv.order.status === "delivered" ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Inspection Phase</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {activeConv.order.status === "completed" 
                            ? "Completed successfully" 
                            : activeConv.order.status === "delivered" 
                              ? "Buyer is inspecting deliverables" 
                              : "Pending delivery"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Forms / Context Alerts */}

                  {/* A: Buyer Requirement Form */}
                  {isBuyer && activeConv.order.status === "paid" && !requirementsPayload && (
                    <form onSubmit={handleSubmitRequirements} className="p-3.5 rounded-2xl border border-gold/30 bg-gold/5 space-y-3">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-gold">Submit Buyer Requirements</div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Specify credentials information so the seller can configure and process your order details.
                      </p>

                      {listingData?.category_slug === "game-accounts" || listingData?.category_slug === "gaming-accounts" ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Riot ID / Character ID</span>
                            <input 
                              type="text" 
                              required 
                              value={reqRiotId}
                              onChange={e => setReqRiotId(e.target.value)}
                              placeholder="Name#TAG" 
                              className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50 text-foreground" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Region</span>
                              <input 
                                type="text" 
                                required 
                                value={reqRegion}
                                onChange={e => setReqRegion(e.target.value)}
                                placeholder="Asia / EU / NA" 
                                className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Server</span>
                              <input 
                                type="text" 
                                required 
                                value={reqServer}
                                onChange={e => setReqServer(e.target.value)}
                                placeholder="Mumbai / Mumbai-1" 
                                className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Preferred Email / Details</span>
                          <input 
                            type="text" 
                            required 
                            value={reqRiotId}
                            onChange={e => setReqRiotId(e.target.value)}
                            placeholder="Enter deliverable destination email" 
                            className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-gold/50 text-foreground" 
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Delivery notes / Instructions</span>
                        <textarea 
                          value={reqNotes}
                          onChange={e => setReqNotes(e.target.value)}
                          placeholder="Specific custom requests..." 
                          className="w-full min-h-[50px] p-2 rounded-lg bg-background border border-border text-xs resize-none text-foreground" 
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={reqSubmitting}
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {reqSubmitting ? "Submitting Requirements…" : "Send Requirements"}
                      </button>
                    </form>
                  )}

                  {/* B: Requirements details view (if submitted) */}
                  {requirementsPayload && (
                    <div className="p-3.5 rounded-2xl border border-border bg-surface/30 space-y-2 text-xs">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Buyer requirements submitted</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-background/50 p-2.5 rounded-xl font-mono">
                        {requirementsPayload.riotId && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Target/ID:</span> <span className="font-bold text-foreground">{requirementsPayload.riotId}</span>
                          </div>
                        )}
                        {requirementsPayload.region && (
                          <div>
                            <span className="text-muted-foreground">Region:</span> <span className="font-bold text-foreground">{requirementsPayload.region}</span>
                          </div>
                        )}
                        {requirementsPayload.server && (
                          <div>
                            <span className="text-muted-foreground">Server:</span> <span className="font-bold text-foreground">{requirementsPayload.server}</span>
                          </div>
                        )}
                      </div>
                      {requirementsPayload.notes && (
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic bg-background/20 p-2 rounded-lg">
                          "{requirementsPayload.notes}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* C: Seller Delivery Form */}
                  {isSeller && activeConv.order.status === "delivering" && (
                    <form onSubmit={handleSubmitDelivery} className="p-3.5 rounded-2xl border border-gold/30 bg-gold/5 space-y-3">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-gold">Submit Official Order Delivery</div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Deliver product credentials below. This form functions as official proof of delivery during dispute investigations.
                      </p>

                      {listingData?.category_slug === "game-accounts" || listingData?.category_slug === "gaming-accounts" ? (
                        <>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Account Username</span>
                            <input 
                              type="text" 
                              required 
                              value={delUsername}
                              onChange={e => setDelUsername(e.target.value)}
                              placeholder="valorant_username" 
                              className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Account Password</span>
                            <input 
                              type="password" 
                              required 
                              value={delPassword}
                              onChange={e => setDelPassword(e.target.value)}
                              placeholder="••••••••" 
                              className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Email Access credentials</span>
                            <input 
                              type="text" 
                              value={delEmail}
                              onChange={e => setDelEmail(e.target.value)}
                              placeholder="email:password (optional)" 
                              className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Recovery details</span>
                            <input 
                              type="text" 
                              value={delRecovery}
                              onChange={e => setDelRecovery(e.target.value)}
                              placeholder="Recovery codes / original signup IP" 
                              className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                            />
                          </div>
                        </>
                      ) : listingData?.category_slug === "gift-cards" || listingData?.category_slug === "software-tools" ? (
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Redeem Code / Key Serial</span>
                          <input 
                            type="text" 
                            required 
                            value={delSerial}
                            onChange={e => setDelSerial(e.target.value)}
                            placeholder="XXXX-XXXX-XXXX-XXXX" 
                            className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none font-mono text-foreground" 
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Deliverable URL / Download Link</span>
                          <input 
                            type="url" 
                            required 
                            value={delFileUrl}
                            onChange={e => setDelFileUrl(e.target.value)}
                            placeholder="https://drive.google.com/..." 
                            className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs focus:outline-none text-foreground" 
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={delSubmitting}
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {delSubmitting ? "Submitting Deliverables…" : "Complete Delivery"}
                      </button>
                    </form>
                  )}

                  {/* D: Delivery details view (if submitted) */}
                  {deliveryPayload && (
                    <div className="p-3.5 rounded-2xl border border-border bg-emerald-500/5 space-y-2 text-xs">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <ShieldCheck size={12} /> Deliverables Submitted
                      </div>
                      
                      {deliveryPayload.username && (
                        <div className="bg-background/50 p-2.5 rounded-xl font-mono text-[10px] space-y-1">
                          <div>
                            <span className="text-muted-foreground">Username:</span> <span className="font-bold text-foreground">{deliveryPayload.username}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Password:</span> <span className="font-bold text-foreground">••••••••</span>
                          </div>
                          {deliveryPayload.email && (
                            <div>
                              <span className="text-muted-foreground">Email:</span> <span className="font-bold text-foreground">{deliveryPayload.email}</span>
                            </div>
                          )}
                          {deliveryPayload.recovery && (
                            <div>
                              <span className="text-muted-foreground">Recovery:</span> <span className="font-bold text-foreground">{deliveryPayload.recovery}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {deliveryPayload.serial && (
                        <div className="bg-background/50 p-2.5 rounded-xl font-mono text-[10px] break-all">
                          <span className="text-muted-foreground">Serial Key:</span> <span className="font-bold text-gold">{deliveryPayload.serial}</span>
                        </div>
                      )}

                      {deliveryPayload.fileUrl && (
                        <div className="bg-background/50 p-2.5 rounded-xl text-[10px] break-all">
                          <span className="text-muted-foreground">Link:</span>{" "}
                          <a 
                            href={deliveryPayload.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-gold font-bold underline hover:text-gold/90"
                          >
                            Click to Download Files
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* E: Awaiting Requirements / Seller Processing status text */}
                  {activeConv.order.status === "paid" && requirementsPayload && !deliveryPayload && (
                    <div className="p-3.5 rounded-2xl border border-border bg-surface/30 text-center space-y-1 text-xs">
                      <Clock size={16} className="text-gold mx-auto animate-pulse" />
                      <div className="font-bold">Work in Progress</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        {isSeller 
                          ? "Review the buyer requirements above, generate or configure the credentials, and upload them via the Delivery form." 
                          : "The seller has been notified and is configuring your credentials. Check back soon!"}
                      </div>
                    </div>
                  )}

                  {/* F: Inspection Countdown & Buyer Actions (Autocomplete / Dispute) */}
                  {activeConv.order.status === "delivered" && (
                    <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Clock size={13} className="animate-spin" /> Inspection Period Countdown
                      </div>
                      
                      <div className="text-center py-2 bg-background/50 rounded-xl">
                        <span className="text-lg font-mono font-bold text-amber-400">
                          {inspectionRemaining > 0 ? (
                            (() => {
                              const hrs = Math.floor(inspectionRemaining / (1000 * 60 * 60));
                              const mins = Math.floor((inspectionRemaining % (1000 * 60 * 60)) / (1000 * 60));
                              const secs = Math.floor((inspectionRemaining % (1000 * 60)) / 1000);
                              return `${hrs}h ${mins}m ${secs}s`;
                            })()
                          ) : (
                            "Expired (Pending Release)"
                          )}
                        </span>
                      </div>

                      <p className="text-[9px] text-muted-foreground leading-relaxed">
                        Ensure all credentials are correct, links are operational, and details match the listing description. If no dispute is raised before the timer expires, funds release automatically to the seller.
                      </p>

                      {isBuyer && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCompleteOrder}
                            className="flex-1 h-8 rounded-lg bg-emerald-500 text-primary-foreground text-[10px] font-bold hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
                          >
                            Complete Order
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisputeOpen(true)}
                            className="flex-1 h-8 rounded-lg border border-rose-500/40 text-[10px] text-rose-300 font-bold hover:bg-rose-500/10 active:scale-95 transition-all bg-transparent cursor-pointer"
                          >
                            Open Dispute
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* G: Disputed Order details */}
                  {activeConv.order.status === "disputed" && (
                    <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center space-y-1.5 text-xs">
                      <AlertCircle size={18} className="text-rose-400 mx-auto" />
                      <div className="font-bold text-rose-300">Dispute Under Investigation</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        Escrow funds are temporarily locked. A HUXZAIN mediator is reviewing chat records, delivery details, and evidence logs.
                      </div>
                    </div>
                  )}

                  {/* H: Completed Order details */}
                  {activeConv.order.status === "completed" && (
                    <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-1.5 text-xs">
                      <ShieldCheck size={18} className="text-emerald-400 mx-auto" />
                      <div className="font-bold text-emerald-400">Order Completed</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        Escrow transaction cleared. The funds have been credited to the seller's wallet balance.
                      </div>
                    </div>
                  )}
                </aside>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <MessageCircle size={48} className="text-muted-foreground/40 mb-3 animate-pulse" />
              <h3 className="font-semibold text-base">Select a conversation</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Click a conversation on the left list, or navigate from orders to chat.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Dispute Modal */}
      {disputeOpen && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 w-full max-w-md rounded-3xl p-6 relative shadow-2xl flex flex-col gap-4">
            <button
              onClick={() => {
                setDisputeOpen(false);
                setDisputeReason("");
                setDisputeNotes("");
                setDisputeFiles([]);
              }}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-display font-bold text-base text-foreground flex items-center gap-1.5">
                <AlertCircle className="text-rose-400 size-5" /> Open Dispute Investigation
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Provide a clear reason and evidence details. Escrow funds will remain locked. A moderator will investigate.
              </p>
            </div>

            <form onSubmit={handleOpenDispute} className="space-y-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Dispute Reason</label>
                <select
                  required
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground cursor-pointer"
                >
                  <option value="">Select a reason...</option>
                  <option value="Incorrect Delivery">Incorrect Delivery</option>
                  <option value="Seller Not Responding">Seller Not Responding</option>
                  <option value="Account Recovered">Account Recovered</option>
                  <option value="Invalid Product">Invalid Product</option>
                  <option value="Service Not Delivered">Service Not Delivered</option>
                  <option value="Incomplete Work">Incomplete Work</option>
                  <option value="Fraudulent Activity">Fraudulent Activity</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Details / Notes</label>
                <textarea
                  value={disputeNotes}
                  onChange={e => setDisputeNotes(e.target.value)}
                  placeholder="Describe your issue in detail for the moderator..."
                  className="w-full h-24 p-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Evidence Screenshots</label>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={e => {
                    if (e.target.files) {
                      setDisputeFiles(Array.from(e.target.files));
                    }
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-elevated file:text-gold hover:file:bg-surface-elevated/80 file:cursor-pointer cursor-pointer"
                />
                {disputeFiles.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Selected {disputeFiles.length} file(s): {disputeFiles.map(f => f.name).join(", ")}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDisputeOpen(false);
                    setDisputeReason("");
                    setDisputeNotes("");
                    setDisputeFiles([]);
                  }}
                  className="flex-1 h-9 text-xs font-semibold rounded-xl border border-border hover:bg-surface transition-all cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting || !disputeReason}
                  className="flex-1 h-9 text-xs font-bold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  {disputeSubmitting && <Loader2 className="size-3 animate-spin" />}
                  File Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate & Review Modal Overlay */}
      {reviewModalOpen && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 w-full max-w-md rounded-3xl p-6 relative shadow-2xl flex flex-col gap-5">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="text-center">
              <div className="size-12 rounded-full bg-gold/10 border border-gold/20 text-gold flex items-center justify-center mx-auto mb-3">
                <Star className="size-6 text-gold fill-gold animate-pulse" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">
                Rate your Experience
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                Share your rating and comments to support other merchants and buyers.
              </p>
            </div>

            {/* Interactive Stars Selection */}
            <div className="flex justify-center gap-2.5 py-2">
              {[1, 2, 3, 4, 5].map((s) => {
                const active = hoverRating ? s <= hoverRating : s <= selectedRating;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="border-none bg-transparent cursor-pointer transition-all active:scale-95 p-0.5"
                  >
                    <Star
                      className={`size-8 transition-colors ${
                        active 
                          ? "fill-gold text-gold drop-shadow-[0_0_8px_rgba(212,180,106,0.3)]" 
                          : "text-muted-foreground/30 hover:text-gold/50"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Feedback Written Comments Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Written Comments (Optional)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your experience with order fulfillment, seller delivery, or communication quality..."
                className="w-full min-h-[90px] p-3 text-xs bg-surface-elevated border border-border/80 rounded-xl outline-none focus:border-gold/50 text-foreground placeholder:text-muted-foreground/60 resize-none text-foreground"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="flex-1 h-10 text-xs font-semibold rounded-xl border border-border hover:bg-surface transition-all active:scale-95 cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 h-10 text-xs font-bold rounded-xl bg-gold text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-gold/5 active:scale-95 border-none cursor-pointer"
              >
                {submittingReview && <Loader2 className="size-3.5 animate-spin" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
