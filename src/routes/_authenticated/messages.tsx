import { useEffect, useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
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
  Shield,
  Copy,
  Rocket,
  Activity,
  FileText,
  Check,
  Gavel,
  Flag,
  Scale,
  HelpCircle,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace/listing-adapter";
import { calculateInspectionHours } from "@/lib/escrow";
import { completeOrderAndCreditSeller } from "@/lib/wallet.functions";
import { openDispute } from "@/lib/marketplace/disputeService";
import { analyzeFraudRisk, buildFraudSystemMessage } from "@/lib/chat/fraud-detection";
import { submitChatReport } from "@/lib/admin/moderation.functions";
import { getCategoryTypeFromSlug } from "@/lib/marketplace/listing-attributes";
import { getUserAvatar, DEFAULT_AVATAR_URL } from "@/lib/marketplace-data";
import { CategoryVaultEngine, detectCurrencyDeliveryType, getVaultDeliveryStatusLabel } from "@/components/order-room/CategoryVaultEngine";

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
  chat_number?: string;
  risk_score?: number;
  risk_level?: string;
  is_flagged?: boolean;
  is_reported?: boolean;
  is_archived?: boolean;
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
    delivery_type?: string | null;
    delivery_time?: string | null;
    delivery_time_hours?: number | null;
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
    created_at?: string | null;
    activated_at?: string | null;
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



function MessagesPage() {
  const { user, isAuthenticated, ready, profile } = useAuth();
  const search = Route.useSearch();
  const orderId = search.orderId;
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inboxTab, setInboxTab] = useState<'active' | 'archived'>('active');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  const displayedConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchesTab = inboxTab === 'archived' ? !!c.is_archived : !c.is_archived;
      return matchesTab;
    });
  }, [conversations, inboxTab]);

  const [securedCreds, setSecuredCreds] = useState<any | null>(null);
  const [loadingSecuredCreds, setLoadingSecuredCreds] = useState(false);

  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningModalChecked, setWarningModalChecked] = useState(false);

  const activeOtherName = activeConv?.otherUser?.display_name || activeConv?.otherUser?.username || "Participant";
  const activeOtherInitials = activeOtherName.slice(0, 2).toUpperCase();

  // Secure delivery manual reveal states
  const [revealWarningModalOpen, setRevealWarningModalOpen] = useState(false);
  const [recScreenTicked, setRecScreenTicked] = useState(false);
  const [verifyDetailsTicked, setVerifyDetailsTicked] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deliveryAck, setDeliveryAck] = useState(false);

  // Clear credentials when active conversation changes to prevent leakage
  useEffect(() => {
    setSecuredCreds(null);
    setRevealWarningModalOpen(false);
    setRecScreenTicked(false);
    setVerifyDetailsTicked(false);
    setCopiedField(null);
    setDeliveryAck(false);
    if (activeConv?.order) {
      setWarningModalOpen(true);
      setWarningModalChecked(false);
    } else {
      setWarningModalOpen(false);
    }
  }, [activeConv?.id]);

  // Copy helper with visual feedback
  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success(`${fieldKey} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  async function handleRevealInventory() {
    if (!activeConv || !activeConv.order) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setLoadingSecuredCreds(true);
    try {
      const ua = navigator.userAgent;
      const os = navigator.platform || "Unknown OS";
      const device = /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
      const browser = ua.split(" ").pop() || "Unknown Browser";

      // Call reveal_order_inventory RPC
      const { data, error } = await supabase.rpc("reveal_order_inventory", {
        p_order_id: activeConv.order_id,
        p_ip: "Client Request",
        p_browser: browser,
        p_os: os,
        p_device: device,
        p_country: "IN"
      });

      if (error) {
        toast.error(error.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setSecuredCreds(row);
          toast.success("Secure delivery details decrypted successfully!");

          // Save audit log to timeline in order table
          const currentTimeline = (activeConv.order as any).timeline || [];
          const newEvent = {
            date: new Date().toISOString(),
            title: "Secure Delivery Revealed",
            description: `Credentials decrypted by buyer. OS: ${os}, Device: ${device}.`
          };
          await supabase
            .from("orders")
            .update({
              timeline: [...currentTimeline, newEvent]
            })
            .eq("id", activeConv.order_id);

          // Refresh inbox list to sync status
          void loadConversations(activeConv.id);
        } else {
          toast.error("No secure credentials available for this order yet.");
        }
      }
    } catch (err: any) {
      toast.error("Failed to decrypt secure details: " + err.message);
    } finally {
      setLoadingSecuredCreds(false);
      setRevealWarningModalOpen(false);
    }
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);

  // Mobile/tablet panel navigation (WhatsApp-style): which single panel is
  // visible below the lg breakpoint. Desktop (lg+) always shows all panels.
  const [mobileView, setMobileView] = useState<"list" | "chat" | "order">("list");

  // Review states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Policy warning
  const [policyWarningText, setPolicyWarningText] = useState<string | null>(null);

  // Report Conversation modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reporting, setReporting] = useState(false);

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

  // Complete Order confirmation modal state
  const [completeOrderModalOpen, setCompleteOrderModalOpen] = useState(false);

  // Inspection countdown tick
  const [nowTime, setNowTime] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const convListRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(true);

  // Virtualize the inbox so it stays responsive with 500+ conversations.
  // Each row is a fixed compact height; only on-screen rows are rendered.
  const CONV_ROW_HEIGHT = 64;
  const convVirtualizer = useVirtualizer({
    count: displayedConversations.length,
    getScrollElement: () => convListRef.current,
    estimateSize: () => CONV_ROW_HEIGHT,
    overscan: 8,
  });

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
      const result = analyzeFraudRisk(newMessage);
      setPolicyWarningText(result.isFraud ? result.warningMessage : null);
    } else {
      setPolicyWarningText(null);
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
        supabase.from("listings").select("id, title, cover_image_url, category_id, price_inr, delivery_type").in("id", listingIds),

        supabase.from("orders").select("id, order_number, buyer_id, seller_id, listing_id, status, amount_inr, delivered_at, completed_at").in("id", orderIds),
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
        // Idempotently get-or-create the conversation for this order. Runs
        // server-side (SECURITY DEFINER) so it works for the buyer or the seller,
        // regardless of email-verification, and is race-safe against the
        // approval-path / StrictMode double-fire.
        const { data: conv, error } = await supabase
          .rpc("get_or_create_order_conversation", { p_order_id: targetOrderId })
          .single();

        if (error || !conv) throw error ?? new Error("Failed to open order conversation");

        await loadConversations((conv as { id: string }).id);
        setMobileView("chat");
      } catch (err: any) {
        console.error("[Chat] Intent setup error:", err);
        toast.error("Couldn't open this order's chat.");
        // Always resolve the inbox so the spinner never hangs.
        await loadConversations();
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
      // 1. Analyze fraud risk
      const fraudResult = analyzeFraudRisk(body);
      if (fraudResult.isFraud && fraudResult.shouldBlock) {
        toast.error(fraudResult.warningMessage || "Message blocked by safety filters.");
        setSending(false);
        return;
      }

      if (fraudResult.isFraud) {
        console.warn("[Chat] Policy violation warning logged.");
        const systemMsgBody = buildFraudSystemMessage(fraudResult);
        await supabase.from("messages").insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          body: systemMsgBody,
          is_system: true,
        });

        // Insert into policy_violations table
        try {
          await supabase.from("policy_violations").insert({
            user_id: user.id,
            violation_type: fraudResult.detectionType || "contact_sharing",
            message_body: body,
          });
        } catch (err) {
          console.error("Failed to insert policy violation record:", err);
        }

        // Insert into fraud_events table
        try {
          await supabase.from("fraud_events").insert({
            conversation_id: activeConv.id,
            chat_number: activeConv.chat_number || null,
            user_id: user.id,
            detection_type: fraudResult.detectionType || "unknown",
            matched_pattern: fraudResult.matchedPattern || "unknown",
            message_preview: body.slice(0, 200),
            confidence_score: fraudResult.confidenceScore,
            risk_tier: fraudResult.tier,
            action_taken: fraudResult.shouldFlagConversation ? "flagged" : "logged",
          });
        } catch (err) {
          console.error("Failed to insert fraud event:", err);
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

      if (fraudResult.isFraud) {
        const newRiskScore = (activeConv.risk_score || 0) + fraudResult.riskScoreDelta;
        let newRiskLevel = activeConv.risk_level || "safe";
        if (newRiskScore >= 30) newRiskLevel = "critical";
        else if (newRiskScore >= 15) newRiskLevel = "high_risk";
        else if (newRiskScore > 0) newRiskLevel = "warning";

        updateData.risk_score = newRiskScore;
        updateData.risk_level = newRiskLevel;
        if (fraudResult.shouldFlagConversation) {
          updateData.is_flagged = true;
        }
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

    // REV-01: reviews only allowed by the buyer after the order is completed.
    if (activeConv.buyer_id !== user.id) {
      toast.error("Only the buyer can review this order.");
      return;
    }
    if (activeConv.order?.status !== "completed") {
      toast.error("You can review only after the order is completed.");
      return;
    }

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
  const categoryType = activeConv?.listing?.category_slug ? getCategoryTypeFromSlug(activeConv.listing.category_slug) : "generic";
  const isVaultCategory = ["game-accounts", "gift-cards", "currency", "subscriptions", "software-tools", "digital-marketplace"].includes(categoryType);
  const isGameAccount = isVaultCategory;

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

      // Update buyer requirements payload on the order
      await supabase.from("orders").update({
        buyer_requirements_payload: payload,
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

  // Seller accepts the order
  async function handleAcceptOrder() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Update order status to "order_active"
      const { error } = await supabase
        .from("orders")
        .update({
          status: "order_active",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeConv.order_id);

      if (error) throw error;

      // Insert system message in chat
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: `[SYSTEM_ORDER_ACCEPTED]: Seller accepted the order. Fulfillment in progress.`,
        is_system: true
      });

      toast.success("Order accepted successfully! You can now start delivery.");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to accept order: " + e.message);
    }
  }

  // Seller starts delivery
  async function handleStartDelivery() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Update order status to "seller_delivering"
      const { error } = await supabase
        .from("orders")
        .update({
          status: "seller_delivering",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeConv.order_id);

      if (error) throw error;

      // Insert system message in chat
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: `[SYSTEM_DELIVERY_STARTED]: Seller started the delivery process.`,
        is_system: true
      });

      toast.success("Fulfillment status set to delivering.");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to start delivery: " + e.message);
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

      // Update order status to "buyer_reviewing", set delivered_at and set delivery_payload
      await supabase.from("orders").update({
        status: "buyer_reviewing",
        delivered_at: new Date().toISOString(),
        delivery_payload: payload,
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

  // Buyer confirms delivery, which updates status to 'delivered'
  async function handleConfirmDelivery() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeConv.order_id);

      if (error) throw error;

      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: `[SYSTEM_DELIVERY_CONFIRMED]: Buyer accepted the delivery. Escrow awaiting seller to Close Order.`,
        is_system: true
      });

      toast.success("Delivery confirmed successfully! Awaiting seller to close order.");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to confirm delivery: " + e.message);
    }
  }

  // Seller closes order, which transfers funds (completed) and archives chat
  async function handleCloseOrder() {
    if (!activeConv || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await completeOrderAndCreditSeller(activeConv.order_id);

      // Archive the conversation
      const { error: convErr } = await supabase
        .from("conversations")
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", activeConv.id);
      
      if (convErr) throw convErr;

      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        body: `[SYSTEM_ORDER_CLOSED]: Seller closed the order. Escrow balance released and conversation archived.`,
        is_system: true
      });

      toast.success("Order completed successfully and escrow credited! Chat is archived.");
      void loadConversations(activeConv.id);
    } catch (e: any) {
      toast.error("Failed to close order: " + e.message);
    }
  }

  // Submit report handler
  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv || !user) return;
    if (!reportReason) {
      toast.error("Please select a reason for reporting.");
      return;
    }

    setReporting(true);
    try {
      const result = await submitChatReport({
        data: {
          conversation_id: activeConv.id,
          chat_number: activeConv.chat_number || "HX-CHAT-UNKNOWN",
          order_id: activeConv.order_id || undefined,
          reporter_id: user.id,
          buyer_id: activeConv.buyer_id,
          seller_id: activeConv.seller_id,
          reason: reportReason,
          additional_notes: reportNotes,
        }
      });

      if (result.success) {
        toast.success("Conversation reported successfully. A moderator will review this chat.");
        setReportModalOpen(false);
        setReportReason("");
        setReportNotes("");
        // Reload conversations to update flags
        await loadConversations(activeConv.id);
      } else {
        toast.error("Failed to submit report.");
      }
    } catch (err: any) {
      console.error("[Report] Error submitting report:", err);
      toast.error(err.message || "Failed to submit report.");
    } finally {
      setReporting(false);
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


  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      <Header />
      <main className="flex-1 min-h-0 w-full px-2 sm:px-4 lg:px-6 py-3 flex flex-col animate-fade-in">
        {/* Page title */}
        <div className="mb-3 shrink-0 flex items-center justify-between px-1">
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

        {/* Unified Chat Container Layout — single responsive 3-panel grid.
            Mobile: one panel at a time (mobileView). Tablet (md): list + messages.
            Desktop (lg): chat list | messages | order info, all independent scroll. */}
        <div className={`flex-1 min-h-0 grid grid-cols-1 ${activeConv?.order ? "md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_340px]" : "md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]"} rounded-3xl border border-border/80 bg-surface/30 overflow-hidden shadow-2xl backdrop-blur-md`}>
          {/* PANEL 1: Conversations List */}
          <aside className={`border-r border-border/80 flex-col h-full min-h-0 overflow-hidden bg-surface/20 ${mobileView === "list" ? "flex" : "hidden"} md:flex`}>
            <div className="p-4 border-b border-border/60 space-y-3">
              {/* Inbox Tabs (Active / Archived) */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0d0e11]/80 border border-white/5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setInboxTab('active')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all border-none cursor-pointer ${
                    inboxTab === 'active' 
                      ? 'bg-gold text-black shadow-lg font-extrabold' 
                      : 'bg-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  Active Chats
                </button>
                <button
                  type="button"
                  onClick={() => setInboxTab('archived')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all border-none cursor-pointer ${
                    inboxTab === 'archived' 
                      ? 'bg-gold text-black shadow-lg font-extrabold' 
                      : 'bg-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  Archived Chats
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  placeholder="Filter conversations..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface/40 border border-border/60 rounded-xl outline-none focus:border-gold/50 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div ref={convListRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {loadingList ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold"></div>
                  <div className="text-xs text-muted-foreground">Loading inbox...</div>
                </div>
              ) : displayedConversations.length === 0 ? (
                <div className="py-20 text-center px-4">
                  <Inbox className="size-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="font-semibold text-sm">Inbox Empty</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    No {inboxTab} conversations found.
                  </p>
                </div>
              ) : (
                <div className="relative w-full" style={{ height: `${convVirtualizer.getTotalSize()}px` }}>
                  {convVirtualizer.getVirtualItems().map((vi) => {
                    const c = displayedConversations[vi.index];
                    const active = activeConv?.id === c.id;
                    const isBuyer = c.buyer_id === user?.id;
                    const unread = isBuyer ? c.buyer_unread : c.seller_unread;
                    const otherName = c.otherUser?.display_name || c.otherUser?.username || "Participant";
                    const otherInitials = otherName.slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={c.id}
                        onClick={() => { setActiveConv(c); setMobileView("chat"); }}
                        className={`absolute left-0 top-0 w-full text-left px-3 flex items-center gap-3 border-b border-border/40 hover:bg-surface/40 transition-colors ${
                          active ? "bg-gold/10 border-l-4 border-l-gold" : ""
                        }`}
                        style={{ height: `${vi.size}px`, transform: `translateY(${vi.start}px)` }}
                      >
                        <div className="size-10 rounded-full bg-gold/10 border border-gold/20 overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={getUserAvatar(c.otherUser?.avatar_url)}
                            alt=""
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_AVATAR_URL;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs truncate text-foreground/90">{otherName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                              {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground truncate">
                              {c.last_message_preview || "No messages yet"}
                            </span>
                            {unread > 0 && (
                              <span className="shrink-0 size-4 rounded-full bg-gold text-primary-foreground text-[9px] font-extrabold flex items-center justify-center">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* PANEL 2: Messages */}
          <section className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex flex-col h-full min-h-0 overflow-hidden bg-surface/10 relative`}>
            {!activeConv && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageCircle size={48} className="text-muted-foreground/40 mb-3 animate-pulse" />
                <h3 className="font-semibold text-base">Select a conversation</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click a conversation on the left list, or navigate from orders to chat.
                </p>
              </div>
            )}
            {activeConv && (
              <>
                {/* Chat Header */}
                <div className="p-3 lg:p-4 border-b border-border/60 bg-surface/40 flex items-center justify-between gap-3 lg:gap-4 flex-wrap shadow-sm">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <button
                      onClick={() => setMobileView("list")}
                      className="md:hidden h-8 w-8 rounded-full border border-gold/20 bg-gold/10 hover:bg-gold/20 flex items-center justify-center text-gold transition-all shrink-0 font-bold active:scale-95"
                      title="Back to Inbox"
                    >
                      ←
                    </button>
                    <div className="size-9 lg:size-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <img
                        src={getUserAvatar(activeConv.otherUser?.avatar_url)}
                        alt=""
                        className="size-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR_URL;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-xs lg:text-sm text-foreground/95 flex items-center gap-1.5">
                        {activeOtherName}
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-[10px] lg:text-xs text-gold font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{activeConv.subject}</span>
                        {activeConv.chat_number && (
                          <>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="font-mono bg-gold/15 text-gold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{activeConv.chat_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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

                    {activeConv.order && (
                      <button
                        type="button"
                        onClick={() => setMobileView("order")}
                        className="lg:hidden h-7 px-3 rounded-lg border border-gold/30 bg-gold/10 text-gold font-bold text-[9px] uppercase tracking-wider hover:bg-gold/20 transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
                      >
                        Order Info
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="h-7 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 font-bold text-[9px] uppercase tracking-wider hover:bg-rose-500/20 hover:border-rose-500/50 transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
                    >
                      Report Chat
                    </button>
                  </div>
                </div>

                {/* Seller Chat Rules Warning Banner */}
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between gap-3 text-left">
                  <span className="flex items-center gap-1.5 leading-normal">
                    <AlertCircle size={14} className="shrink-0 text-amber-400" />
                    <strong>Safety Rules:</strong> Do not share personal email/phone numbers or accept offsite payment methods. Always use secure escrow delivery.
                  </span>
                </div>

                {/* Messages List */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scroll-smooth"
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
                              <img
                                src={getUserAvatar(activeConv.otherUser?.avatar_url)}
                                alt=""
                                className="size-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_AVATAR_URL;
                                }}
                              />
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

                {/* Input area — pinned to the bottom of the message panel */}
                <div className="shrink-0 border-t border-border/60 bg-surface/30 flex flex-col pt-2 pb-4 px-4">


                  {/* 3-Column Completion Bar */}
                  {activeConv.order && ["paid", "payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "delivered"].includes(activeConv.order.status) && (
                    <div className="mb-3.5 p-3 rounded-2xl border border-white/8 bg-[#0a0c0f] grid grid-cols-3 gap-3.5 text-[11px] text-left">
                      {/* Column 1: Buyer Actions */}
                      <div className="flex flex-col justify-between p-2.5 rounded-xl bg-surface/30 border border-white/5 space-y-1.5 min-h-[84px]">
                        <div className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <div className={`size-1.5 rounded-full ${activeConv.order.status === "buyer_reviewing" ? "bg-amber-400 animate-pulse" : ["delivered", "completed"].includes(activeConv.order.status) ? "bg-emerald-400" : "bg-white/20"}`} />
                          Buyer Confirmation
                        </div>
                        {["delivered", "completed"].includes(activeConv.order.status) ? (
                          <div className="text-[10px] text-emerald-400 font-semibold py-1 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Delivery Confirmed ✓
                          </div>
                        ) : activeConv.order.status === "buyer_reviewing" ? (
                          isBuyer ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              <label className="flex items-start gap-1.5 text-[9px] text-muted-foreground cursor-pointer select-none leading-tight">
                                <input
                                  type="checkbox"
                                  checked={deliveryAck}
                                  onChange={(e) => setDeliveryAck(e.target.checked)}
                                  className="mt-0.5 rounded border-border text-gold focus:ring-gold/30 cursor-pointer"
                                />
                                <span>I verify the deliverables in the vault.</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setCompleteOrderModalOpen(true)}
                                disabled={!deliveryAck}
                                className="h-7 w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-[10px] font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1 active:scale-95 disabled:pointer-events-none"
                              >
                                <ShieldCheck size={11} /> Confirm Delivery
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-400 font-semibold py-1">
                              Awaiting buyer confirmation
                            </div>
                          )
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic font-medium py-1">
                            Awaiting delivery release
                          </div>
                        )}
                        <p className="text-[8px] text-muted-foreground leading-snug">
                          Buyer verifies deliverables and releases escrow.
                        </p>
                      </div>

                      {/* Column 2: Seller Actions */}
                      <div className="flex flex-col justify-between p-2.5 rounded-xl bg-surface/30 border border-white/5 space-y-1.5 min-h-[84px]">
                        <div className="font-bold text-[9px] uppercase tracking-wider text-gold flex items-center gap-1.5">
                          <div className={`size-1.5 rounded-full ${activeConv.order.status === "completed" ? "bg-emerald-400" : activeConv.order.status === "delivered" ? "bg-amber-400 animate-pulse" : "bg-white/20"}`} />
                          Seller Fulfillment
                        </div>
                        {activeConv.order.status === "completed" ? (
                          <div className="text-[10px] text-emerald-400 font-semibold py-1 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Order Closed ✓
                          </div>
                        ) : activeConv.order.status === "delivered" ? (
                          isSeller ? (
                            <button
                              type="button"
                              onClick={handleCloseOrder}
                              className="h-7 w-full rounded-lg bg-gold text-black text-[10px] font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                            >
                              <ShieldCheck size={11} /> Close Order
                            </button>
                          ) : (
                            <div className="text-[10px] text-amber-400 font-semibold py-1">
                              Awaiting seller Close Order
                            </div>
                          )
                        ) : ["buyer_reviewing"].includes(activeConv.order.status) ? (
                          <div className="text-[10px] text-emerald-400 font-semibold py-1 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Delivered ✓
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic font-medium py-1">
                            Fulfillment in progress
                          </div>
                        )}
                        <p className="text-[8px] text-muted-foreground leading-snug">
                          Seller uploads credentials and closes order when accepted.
                        </p>
                      </div>

                      {/* Column 3: Escrow / Inspection Period */}
                      <div className="flex flex-col justify-between p-2.5 rounded-xl bg-surface/30 border border-white/5 space-y-1.5 min-h-[84px]">
                        <div className="font-bold text-[9px] uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <Clock size={11} /> Inspection Countdown
                        </div>
                        {activeConv.order.status === "buyer_reviewing" ? (
                          <div className="text-[11px] font-mono font-bold text-amber-400 py-1 bg-[#14161d] border border-white/5 rounded px-2 text-center">
                            {inspectionRemaining > 0 ? (
                              (() => {
                                const hrs = Math.floor(inspectionRemaining / (1000 * 60 * 60));
                                const mins = Math.floor((inspectionRemaining % (1000 * 60 * 60)) / (1000 * 60));
                                const secs = Math.floor((inspectionRemaining % (1000 * 60)) / 1000);
                                return `${hrs}h ${mins}m ${secs}s`;
                              })()
                            ) : (
                              "Auto-releasing..."
                            )}
                          </div>
                        ) : ["delivered", "completed"].includes(activeConv.order.status) ? (
                          <div className="text-[10px] text-emerald-400 font-semibold py-1 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Escrow Released ✓
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic py-1">
                            Not started
                          </div>
                        )}
                        {isBuyer && activeConv.order.status === "buyer_reviewing" ? (
                          <button
                            type="button"
                            onClick={() => setDisputeOpen(true)}
                            className="h-6 w-full rounded-md border border-rose-500/30 text-[9px] text-rose-300 font-bold hover:bg-rose-500/10 active:scale-95 transition-all bg-transparent cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            Open Dispute
                          </button>
                        ) : (
                          <p className="text-[8px] text-muted-foreground leading-snug">
                            Funds protected by secure platform escrow.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {profile?.is_muted ? (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 flex items-start gap-2.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block text-foreground">You are currently muted by platform moderation.</span>
                        <p className="text-[10px] text-muted-foreground">
                          Reason: {profile.moderation_reason || "Policy Violation"}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {policyWarningText && (
                        <div className="mb-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2 animate-in slide-in-from-bottom-2">
                          <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                          <div>
                            <span className="font-bold">Security Warning:</span> {policyWarningText}
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
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* PANEL 3: Order Info — third column on desktop, full-screen overlay on mobile/tablet */}
          {activeConv?.order && (
            <aside className={`${mobileView === "order" ? "flex" : "hidden"} lg:flex flex-col min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4 fixed inset-0 z-40 bg-background lg:static lg:inset-auto lg:z-auto lg:h-full lg:bg-surface/25 lg:border-l border-border/60`}>
              <button
                type="button"
                onClick={() => setMobileView("chat")}
                className="lg:hidden self-start mb-1 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gold/20 bg-gold/10 text-gold text-xs font-semibold cursor-pointer active:scale-95"
              >
                ← Back to chat
              </button>
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
                    
                    {/* Step 1: Payment Approved */}
                    {(() => {
                      const isDone = ["payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(activeConv.order.status);
                      return (
                        <div className="flex items-start gap-2.5">
                          <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isDone ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400" : "bg-surface-elevated border border-border text-muted-foreground"}`}>
                            {isDone ? "✓" : "1"}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDone ? "text-foreground/90" : "text-muted-foreground"}`}>Payment Approved</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">₹{(activeConv.order.amount_inr || activeConv.order.amount_total || 0)} secured in HUXZAIN vault</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 2: Seller Accepted Order */}
                    {(() => {
                      const isDone = ["order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(activeConv.order.status);
                      const isActive = activeConv.order.status === "payment_approved";
                      return (
                        <div className="flex items-start gap-2.5">
                          <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isDone 
                              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400" 
                              : isActive 
                              ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                              : "bg-surface-elevated border border-border text-muted-foreground"
                          }`}>
                            {isDone ? "✓" : "2"}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDone ? "text-foreground/90" : isActive ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Seller Accepted Order</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {isDone ? "Seller accepted order" : isActive ? "Awaiting seller acceptance" : "Pending payment"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 3: Delivery Started */}
                    {(() => {
                      const isDone = ["seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(activeConv.order.status);
                      const isActive = activeConv.order.status === "order_active";
                      return (
                        <div className="flex items-start gap-2.5">
                          <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isDone
                              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                              : isActive
                                ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                                : "bg-surface-elevated border border-border text-muted-foreground"
                          }`}>
                            {isDone ? "✓" : "3"}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDone ? "text-foreground/90" : isActive ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Delivery Started</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {isDone ? "Fulfillment work started" : isActive ? "Seller processing deliverables" : "Pending acceptance"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 4: Buyer Reviewing */}
                    {(() => {
                      const isDone = ["buyer_reviewing", "completed"].includes(activeConv.order.status);
                      const isActive = activeConv.order.status === "seller_delivering";
                      return (
                        <div className="flex items-start gap-2.5">
                          <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isDone
                              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                              : isActive
                                ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                                : "bg-surface-elevated border border-border text-muted-foreground"
                          }`}>
                            {isDone ? "✓" : "4"}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDone ? "text-foreground/90" : isActive ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Buyer Reviewing</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {activeConv.order.status === "completed" 
                                ? "Inspected & confirmed" 
                                : activeConv.order.status === "buyer_reviewing" 
                                  ? "Awaiting buyer confirmation" 
                                  : "Pending delivery submission"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 5: Completed */}
                    {(() => {
                      const isDone = activeConv.order.status === "completed";
                      const isActive = activeConv.order.status === "buyer_reviewing";
                      return (
                        <div className="flex items-start gap-2.5">
                          <div className={`size-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isDone
                              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                              : isActive
                                ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse"
                                : "bg-surface-elevated border border-border text-muted-foreground"
                          }`}>
                            {isDone ? "✓" : "5"}
                          </div>
                          <div>
                            <div className={`font-semibold ${isDone ? "text-foreground/90" : isActive ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>Completed</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {isDone ? "Order escrow completed successfully" : "Pending buyer confirmation"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Forms / Context Alerts */}

                  {/* A: Buyer Requirement Form */}
                  {isBuyer && (activeConv.order.status === "payment_approved" || activeConv.order.status === "order_active") && !requirementsPayload && (
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
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none"
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

                  {/* Seller Action Required: Accept Order */}
                  {isSeller && activeConv.order.status === "payment_approved" && (
                    <div className="p-3.5 rounded-2xl border border-gold/30 bg-gold/5 space-y-2 text-xs">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-gold">Action Required: Accept Order</div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Please accept the order to confirm you can fulfill the requested digital item/service.
                      </p>
                      <button
                        onClick={handleAcceptOrder}
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                      >
                        Accept Order
                      </button>
                    </div>
                  )}

                  {/* Seller Action Required: Start Fulfillment */}
                  {isSeller && activeConv.order.status === "order_active" && (
                    <div className="p-3.5 rounded-2xl border border-gold/30 bg-gold/5 space-y-2 text-xs">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-gold">Action Required: Start Fulfillment</div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Set the status to delivering when you begin working on configuring the account or compiling deliverables.
                      </p>
                      <button
                        onClick={handleStartDelivery}
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                      >
                        Start Delivery / Fulfill Order
                      </button>
                    </div>
                  )}

                  {/* C: Seller Delivery Form */}
                  {isSeller && activeConv.order.status === "seller_delivering" && !isGameAccount && (
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
                        className="w-full h-8 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none"
                      >
                        {delSubmitting ? "Submitting Deliverables…" : "Complete Delivery"}
                      </button>
                    </form>
                  )}

                  {/* D: Delivery details view (if submitted) */}
                  {deliveryPayload && !isGameAccount && (
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
                  {activeConv.order.status === "payment_approved" && requirementsPayload && !deliveryPayload && !isGameAccount && (
                    <div className="p-3.5 rounded-2xl border border-border bg-surface/30 text-center space-y-1 text-xs">
                      <Clock size={16} className="text-gold mx-auto animate-pulse" />
                      <div className="font-bold">Awaiting Seller Acceptance</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        {isSeller 
                          ? "Review the buyer requirements above and accept the order to proceed with fulfillment." 
                          : "You have submitted requirements. Awaiting seller order acceptance."}
                      </div>
                    </div>
                  )}

                  {activeConv.order.status === "order_active" && requirementsPayload && !deliveryPayload && !isGameAccount && (
                    <div className="p-3.5 rounded-2xl border border-border bg-surface/30 text-center space-y-1 text-xs">
                      <Clock size={16} className="text-gold mx-auto animate-pulse" />
                      <div className="font-bold">Work in Progress</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        {isSeller 
                          ? "Fulfillment begun. Configure credentials and click Start Delivery when ready." 
                          : "The seller has accepted and is configuring your credentials. Check back soon!"}
                      </div>
                    </div>
                  )}

                  {activeConv.order.status === "seller_delivering" && !isGameAccount && (
                    <div className="p-3.5 rounded-2xl border border-border bg-surface/30 text-center space-y-1 text-xs">
                      <Clock size={16} className="text-gold mx-auto animate-pulse" />
                      <div className="font-bold">Fulfillment Delivery Started</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">
                        {isSeller 
                          ? "Please upload the credentials/serial key/file link using the Delivery form above." 
                          : "The seller is uploading your deliverables. Please stand by."}
                      </div>
                    </div>
                  )}

                  {/* Category-Specific Secure Delivery Vault */}
                  {isVaultCategory && ["paid", "payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(activeConv.order.status) && (
                    <div className="space-y-4">
                      <CategoryVaultEngine
                        categoryType={categoryType}
                        listingId={activeConv.listing_id}
                        orderId={activeConv.order_id}
                        orderStatus={activeConv.order.status}
                        isBuyer={isBuyer}
                        isSeller={isSeller}
                        preloadedCreds={securedCreds}
                        onRevealSuccess={(newCreds) => setSecuredCreds(newCreds)}
                        currencyDeliveryType={detectCurrencyDeliveryType(activeConv.listing)}
                        deliveryTime={activeConv.listing?.delivery_time ?? (activeConv.listing?.delivery_time_hours ? `${activeConv.listing.delivery_time_hours} Hours` : "24 Hours")}
                        activatedAt={activeConv.order?.created_at}
                      />

                      {/* Seller Action Button to release credentials */}
                      {isSeller && ["order_active", "seller_delivering", "payment_approved"].includes(activeConv.order.status) && !securedCreds && (
                        <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 space-y-2 text-xs">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Once you have configured the secure credentials in the Listing Vault, click below to release them to the buyer and trigger the inspection window.
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                const supabase = getSupabase();
                                if (!supabase || !user) return;
                                
                                // Pull credentials first to verify they exist
                                const { data: credsExist } = await supabase
                                  .from("listing_credentials")
                                  .select("listing_id")
                                  .eq("listing_id", activeConv.listing_id)
                                  .maybeSingle();

                                if (!credsExist) {
                                  toast.error("You have not configured secure credentials for this listing. Please add them in the listings panel.");
                                  return;
                                }

                                const { error } = await supabase
                                  .from("orders")
                                  .update({
                                    status: "buyer_reviewing",
                                    delivered_at: new Date().toISOString(),
                                    delivery_payload: { vault_released: true }
                                  })
                                  .eq("id", activeConv.order_id);

                                if (error) throw error;
                                
                                // Send system message
                                await supabase.from("messages").insert({
                                  conversation_id: activeConv.id,
                                  body: `[SYSTEM_DELIVERY_SUBMITTED]: Seller released vault credentials. Secure delivery details have been revealed to the buyer.`,
                                  is_system: true,
                                  sender_id: user.id
                                });

                                toast.success("Vault credentials released successfully! Buyer inspection countdown has started.");
                                void loadConversations(activeConv.id);
                              } catch (err: any) {
                                toast.error("Failed to release credentials: " + err.message);
                              }
                            }}
                            className="w-full h-9 rounded-xl bg-gold text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
                          >
                            Release Vault Credentials & Deliver
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
      </main>

      {/* ─── Confirm Order Completion Modal ─── */}
      {completeOrderModalOpen && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b0c0f] border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl flex flex-col gap-5">
            <button
              onClick={() => setCompleteOrderModalOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">Confirm Order Completion</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please confirm that you have successfully inspected your purchase.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
              <p className="leading-relaxed">
                By marking this order as completed, you confirm that the delivered product matches the listing and that you are satisfied with the delivery.
              </p>
              <p className="leading-relaxed text-amber-400/80">
                ⚠ If you have not yet verified your purchase, we strongly recommend doing so before completing this order.
              </p>
              <p className="leading-relaxed">
                Once completed, the seller's settlement process will begin according to HUXZAIN's Escrow Policy.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCompleteOrderModalOpen(false)}
                className="flex-1 h-10 text-xs font-semibold rounded-xl border border-border hover:bg-surface transition-all cursor-pointer bg-transparent text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setCompleteOrderModalOpen(false);
                  await handleConfirmDelivery();
                }}
                className="flex-1 h-10 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                <ShieldCheck className="size-3.5" /> Mark Order Complete
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="activation_code_not_working">The activation code does not work</option>
                  <option value="invalid_credentials">The credentials are incorrect / login details wrong</option>
                  <option value="product_not_as_described">The delivered product does not match the listing</option>
                  <option value="missing_delivery">Part of the delivery is missing</option>
                  <option value="seller_not_responding">The seller has stopped responding</option>
                  <option value="manual_delivery_incomplete">The seller has not completed the manual part of the delivery</option>
                  <option value="product_key_used">Product Key / Code already redeemed or used</option>
                  <option value="account_recovered">Account reclaimed / recovered by seller after purchase</option>
                  <option value="service_not_as_described">Service not as described / tier mismatch / boost not completed</option>
                  <option value="other">Other issues</option>
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

              <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-[10px] text-rose-300 leading-normal text-left">
                ⚠️ <strong>Critical Evidence Requirement:</strong> You are strongly advised to attach a continuous video recording of the reveal and activation attempt. Disputes without video evidence are significantly harder to resolve in your favor.
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

      {/* Report Conversation Modal */}
      {reportModalOpen && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 w-full max-w-md rounded-3xl p-6 relative shadow-2xl flex flex-col gap-4">
            <button
              onClick={() => {
                setReportModalOpen(false);
                setReportReason("");
                setReportNotes("");
              }}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-display font-bold text-base text-foreground flex items-center gap-1.5">
                <Shield className="text-rose-400 size-5" /> Report Conversation
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                If you detect suspicious behavior, threats, or off-platform payment solicitations, report it to HUXZAIN Trust & Safety.
              </p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Reason for Report</label>
                <select
                  required
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground cursor-pointer"
                >
                  <option value="">Select a reason...</option>
                  <option value="Suspicious behavior">Suspicious behavior</option>
                  <option value="Off-platform payment attempt">Off-platform payment attempt</option>
                  <option value="UPI sharing">UPI sharing</option>
                  <option value="Phone number sharing">Phone number sharing</option>
                  <option value="Threats">Threats</option>
                  <option value="Scam attempt">Scam attempt</option>
                  <option value="Abuse">Abuse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Additional Details</label>
                <textarea
                  value={reportNotes}
                  onChange={e => setReportNotes(e.target.value)}
                  placeholder="Provide any messages or context that will help the moderation team..."
                  className="w-full h-24 p-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportReason("");
                    setReportNotes("");
                  }}
                  className="flex-1 h-9 text-xs font-semibold rounded-xl border border-border hover:bg-surface transition-all cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="flex-1 h-9 text-xs font-bold rounded-xl bg-gold text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  {reporting && <Loader2 className="size-3.5 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal Secure Delivery Warning Modal Overlay */}
      {revealWarningModalOpen && activeConv && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 w-full max-w-md rounded-3xl p-6 relative shadow-2xl flex flex-col gap-4 text-left">
            <button
              onClick={() => {
                setRevealWarningModalOpen(false);
                setRecScreenTicked(false);
                setVerifyDetailsTicked(false);
              }}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-display font-bold text-base text-gold flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="text-emerald-400 size-5 animate-pulse" /> Decryption & Screen Recording Warning
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Before you reveal the secure delivery details (accounts/keys), please ensure you review these critical guidelines.
              </p>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-xl text-xs space-y-2 text-rose-300">
              <span className="font-bold flex items-center gap-1"><AlertCircle size={12} /> Recommending Continuous Video Recording</span>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                We strongly advise that you start a continuous screen recording capturing the exact moment you click "Reveal" until your activation/login attempt. This serves as irrefutable evidence in the event of a dispute.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recScreenTicked}
                  onChange={(e) => setRecScreenTicked(e.target.checked)}
                  className="rounded border-border text-emerald-500 focus:ring-emerald-500/30 mt-0.5"
                />
                <span>I understand HUXZAIN recommends recording my screen during reveal and product activation.</span>
              </label>

              <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifyDetailsTicked}
                  onChange={(e) => setVerifyDetailsTicked(e.target.checked)}
                  className="rounded border-border text-emerald-500 focus:ring-emerald-500/30 mt-0.5"
                />
                <span>I agree that HUXZAIN will capture my OS, Browser, and audit location when decrypting.</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setRevealWarningModalOpen(false);
                  setRecScreenTicked(false);
                  setVerifyDetailsTicked(false);
                }}
                className="flex-1 h-9 text-xs font-semibold rounded-xl border border-border hover:bg-surface transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevealInventory}
                disabled={loadingSecuredCreds || !(recScreenTicked && verifyDetailsTicked)}
                className="flex-1 h-9 text-xs font-bold rounded-xl bg-emerald-500 text-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
              >
                {loadingSecuredCreds && <Loader2 className="size-3.5 animate-spin" />}
                Decrypt & Reveal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation/Fulfillment Order Notice Modal for Buyer/Seller */}
      {warningModalOpen && activeConv && activeConv.order && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0b0c0f] border border-white/10 w-full max-w-2xl rounded-3xl p-6 relative shadow-2xl flex flex-col gap-5 text-left my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            {/* Header */}
            <div className="text-center pb-3 border-b border-white/5 relative">
              <button
                onClick={() => setWarningModalOpen(false)}
                className="absolute top-0 right-0 size-8 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="size-4" />
              </button>
              
              {isSeller ? (
                <>
                  <h3 className="font-display font-black text-xl lg:text-2xl text-gold flex items-center justify-center gap-2 uppercase tracking-wider">
                    <AlertCircle className="text-gold size-6 animate-pulse" /> IMPORTANT NOTICE FOR SELLERS
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Please read the following carefully before continuing this conversation.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display font-black text-xl lg:text-2xl text-blue-400 flex items-center justify-center gap-2 uppercase tracking-wider">
                    <Lock className="text-blue-400 size-6" /> IMPORTANT NOTICE FOR BUYERS
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Please read the following carefully before continuing this conversation.
                  </p>
                </>
              )}
            </div>

            {/* Content Body */}
            {isSeller ? (
              <div className="space-y-4 font-sans text-xs text-muted-foreground">
                {/* REPRESENTING HUXZAIN CARD */}
                <div className="bg-gold/5 border border-gold/20 p-4 rounded-2xl flex gap-3 items-start">
                  <ShieldCheck className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">You are representing HUXZAIN as a seller.</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Your every action, message and delivery affects your reputation, reviews and future sales. Maintain professionalism and integrity at all times.
                    </p>
                  </div>
                </div>

                {/* 1. KEEP ALL COMMUNICATION INSIDE HUXZAIN */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <MessageCircle className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">1. KEEP ALL COMMUNICATION INSIDE HUXZAIN</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      All communication, payments, file transfers and delivery must remain within the HUXZAIN Order Room. Do not share or ask for personal information such as phone numbers, WhatsApp, Telegram, Discord, Facebook, Instagram, email addresses or any other contact details. Attempting to move a transaction outside the platform may result in warnings, seller strikes, listing restrictions, suspension or permanent termination of your account.
                    </p>
                  </div>
                </div>

                {/* 2. DELIVER ONLY WHAT WAS PROMISED */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <ShieldCheck className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">2. DELIVER ONLY WHAT WAS PROMISED</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      The product or service you deliver must exactly match your listing description, screenshots, specifications and any representations made before purchase. Providing incorrect, incomplete or misleading products is a violation of HUXZAIN Marketplace Policies.
                    </p>
                  </div>
                </div>

                {/* 3. RECOVERY FRAUD IS STRICTLY PROHIBITED */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <AlertCircle className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">3. RECOVERY FRAUD IS STRICTLY PROHIBITED</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      Once ownership or access has been transferred, any attempt to recover, reclaim, disable or interfere with the buyer's access through any method is a serious violation. Recovery attempts will lead to immediate suspension and legal action.
                    </p>
                  </div>
                </div>

                {/* 4. LEGAL ACTION & KYC DISCLOSURE */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Gavel className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">4. LEGAL ACTION & KYC DISCLOSURE</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      Fraudulent activity, recovery scams, false promises or any form of cheating may result in legal action. Where fraud is reasonably established, HUXZAIN reserves the right to preserve and disclose your KYC documents, transaction records, chat logs and other evidence to law enforcement agencies, competent authorities and, where permitted by applicable law, to the affected buyer for pursuing legal action. You will be fully responsible for any losses, damages or legal consequences.
                    </p>
                  </div>
                </div>

                {/* 5. EVIDENCE IS MANDATORY IN DISPUTES */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <FileText className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">5. EVIDENCE IS MANDATORY IN DISPUTES</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      If a dispute is opened, you must provide relevant evidence such as screenshots, delivery proof, chat history or any other supporting documents. Without proper evidence, we may not be able to review or resolve the dispute fairly.
                    </p>
                  </div>
                </div>

                {/* 6. YOUR REPUTATION MATTERS */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Star className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">6. YOUR REPUTATION MATTERS</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      Good behaviour, accurate listings, timely delivery and respectful communication build trust, more positive reviews and higher sales growth on HUXZAIN.
                    </p>
                  </div>
                </div>

                {/* 7. REPORT SUSPICIOUS BUYERS */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Flag className="text-gold size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">7. REPORT SUSPICIOUS BUYERS</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      If a buyer asks for off-platform communication, external payment or behaves suspiciously, report them immediately using the Report User option.
                    </p>
                  </div>
                </div>

                {/* Alert warning footer block */}
                <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl flex gap-2.5 items-center text-amber-300">
                  <AlertCircle size={16} className="shrink-0" />
                  <p className="text-[10px] leading-relaxed">
                    Violating these policies may result in account restrictions, suspension, permanent ban and legal action as per HUXZAIN Marketplace Policies.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 font-sans text-xs text-muted-foreground">
                {/* 1. KEEP ALL COMMUNICATION INSIDE HUXZAIN */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <MessageCircle className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">1. KEEP ALL COMMUNICATION INSIDE HUXZAIN</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      For your protection, keep all communication, payments, file transfers and ownership transfers inside the HUXZAIN Order Room. Do not share personal contact information such as phone numbers, WhatsApp, Telegram, Discord, Facebook, Instagram, email addresses or any other external contact details. Do not agree to make payments or continue the transaction outside HUXZAIN. Off-platform transactions are not covered by our protection and may limit our ability to assist you.
                    </p>
                  </div>
                </div>

                {/* 2. INSPECT YOUR PURCHASE CAREFULLY */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Search className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">2. INSPECT YOUR PURCHASE CAREFULLY</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      Verify that the delivered product or service matches the listing description and that you have received everything promised. <strong className="text-white">Only click "Mark Order Complete" after you are 100% satisfied with the delivery.</strong> Once completed, the seller's settlement process will begin.
                    </p>
                  </div>
                </div>

                {/* 3. REPORT ISSUES IMMEDIATELY */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <AlertCircle className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">3. REPORT ISSUES IMMEDIATELY</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      If you receive incorrect credentials, incomplete delivery, misleading information, face recovery attempts or observe any suspicious behaviour, immediately open a dispute or report the seller. Report as early as possible and preserve all relevant evidence.
                    </p>
                  </div>
                </div>

                {/* 4. DISPUTE EVIDENCE IS MANDATORY */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <FileText className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">4. DISPUTE EVIDENCE IS MANDATORY</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      To ensure fair resolution for both buyers and sellers, evidence is mandatory for any dispute. Provide clear and relevant evidence such as screenshots, screen recordings, chat history, delivery proof, order details or any other supporting documents. Without sufficient evidence, we may not be able to take action or provide a fair resolution.
                    </p>
                  </div>
                </div>

                {/* 5. FAIRNESS FOR BOTH SIDES */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Scale className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">5. FAIRNESS FOR BOTH SIDES</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      HUXZAIN takes care of both buyers and sellers. We make decisions based on facts and evidence, not opinions. Providing truthful information helps us protect genuine buyers and maintain a trustworthy marketplace.
                    </p>
                  </div>
                </div>

                {/* 6. FALSE CLAIMS & DISPUTE ABUSE */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <Lock className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">6. FALSE CLAIMS & DISPUTE ABUSE</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      Submitting false claims, fake evidence or abusing the dispute system is a serious violation of our policies. Such behaviour may result in warnings, restrictions, suspension or permanent termination of your account.
                    </p>
                  </div>
                </div>

                {/* 7. NEED HELP? */}
                <div className="flex gap-3 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <HelpCircle className="text-blue-400 size-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">7. NEED HELP?</h4>
                    <p className="text-[10px] mt-1 leading-relaxed">
                      If you are unsure about something, contact our support team. We are here to help. Use the "Report Seller" or "Open Dispute" options if you face any problem.
                    </p>
                  </div>
                </div>

                {/* Alert warning footer block */}
                <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl flex gap-2.5 items-center text-blue-300">
                  <ShieldCheck size={16} className="shrink-0" />
                  <p className="text-[10px] leading-relaxed">
                    Your safety is our priority. Keep everything inside HUXZAIN and follow all marketplace policies for a secure and smooth experience.
                  </p>
                </div>
              </div>
            )}

            {/* Checkbox and Agreement */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={warningModalChecked}
                  onChange={(e) => setWarningModalChecked(e.target.checked)}
                  className="rounded border-border text-gold focus:ring-gold/30 mt-0.5 cursor-pointer size-4"
                />
                <span className="text-[10px] leading-relaxed text-muted-foreground">
                  I have read, understood and agree to follow all HUXZAIN Marketplace Policies.
                </span>
              </label>

              <button
                type="button"
                disabled={!warningModalChecked}
                onClick={() => setWarningModalOpen(false)}
                className={`w-full h-11 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${
                  warningModalChecked
                    ? "bg-gold text-black hover:bg-gold-light shadow-lg shadow-gold/10"
                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                }`}
              >
                I AGREE & PROCEED TO ORDER ROOM <span className="text-sm">➔</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
