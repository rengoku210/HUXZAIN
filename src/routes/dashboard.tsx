import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { useNotifications } from "@/hooks/useNotifications";
import { completeOrderAndCreditSeller } from "@/lib/wallet.functions";
import { openDispute } from "@/lib/marketplace/disputeService";
import { triggerRoleNotification } from "@/lib/notifications.functions";
import { calculateInspectionHours } from "@/lib/escrow";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Send,
  Star,
  User,
  Settings as SettingsIcon,
  ShieldAlert,
  Users,
  BadgeCheck,
  Wallet,
  ArrowRight,
  ChevronRight,
  Eye,
  Plus,
  Loader2,
  Check,
  X,
  Upload,
  Calendar,
  Sparkles,
  ChevronDown,
  Info,
  Shield,
  Monitor,
  Phone,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { PhoneVerificationModal } from "@/components/site/PhoneVerificationModal";
import { getUserAvatar, DEFAULT_AVATAR_URL } from "@/lib/marketplace-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Buyer Console Dashboard — HUXZAIN" }] }),
  component: DashboardPage,
});

type Order = {
  id: string;
  status: string;
  amount_inr?: number;
  amount_total?: number;
  currency: string;
  created_at: string;
  listing_id: string;
  seller_id: string;
  delivered_at: string | null;
  delivery_notes: string | null;
  delivery_proof_url: string | null;
  listings?: { title?: string | null; cover_image_url?: string | null; categories?: { slug?: string | null } | null } | null;
};

type Dispute = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: "open" | "investigating" | "resolved_buyer" | "resolved_seller" | "closed";
  resolution: string | null;
  created_at: string;
  evidence_urls: string[] | null;
  order?: { listing_title: string; amount_inr: number };
};

type DisputeMessage = {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  evidence_url: string | null;
  created_at: string;
  sender?: { display_name: string; email?: string | null };
};

type PaymentProof = {
  id: string;
  user_id?: string;
  status: string;
  amount: number;
  screenshot_url: string;
  payment_reference: string | null;
  rejection_reason?: string | null;
  listing_id?: string;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_payment: {
    label: "Awaiting Payment",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: Clock,
  },
  payment_under_review: {
    label: "Payment Reviewing",
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
  },
  payment_approved: {
    label: "Payment Verified",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    icon: CheckCircle2,
  },
  order_active: {
    label: "In Progress",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    icon: RefreshCw,
  },
  seller_delivering: {
    label: "Delivering",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    icon: Clock,
  },
  buyer_reviewing: {
    label: "Awaiting Receipt Confirmation",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: Eye,
  },
  completed: {
    label: "Completed",
    color: "text-gold bg-gold/10 border-gold/20",
    icon: CheckCircle2,
  },
  disputed: {
    label: "Disputed / Escrow Hold",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    icon: Wallet,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    color: "text-muted-foreground bg-surface border-border",
    icon: Clock,
  };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="size-3.5" /> {cfg.label}
    </span>
  );
}

function DashboardPage() {
  const { isAuthenticated, ready, user, profile, roles, refreshUserMeta, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "disputes" | "notifications" | "profile" | "settings">("overview");

  // State arrays
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<any[]>([]);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Expanded layout for orders (visual timeline toggle)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeOrderToReview, setActiveOrderToReview] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reupload Modal state
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [activeProofToReupload, setActiveProofToReupload] = useState<PaymentProof | null>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadRef, setReuploadRef] = useState("");
  const [reuploading, setReuploading] = useState(false);

  // Dispute Modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [activeOrderToDispute, setActiveOrderToDispute] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState("Not as described");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Dispute escalation thread state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [loadingDisputeMessages, setLoadingDisputeMessages] = useState(false);
  const [newDisputeMsgText, setNewDisputeMsgText] = useState("");
  const [sendingDisputeMsg, setSendingDisputeMsg] = useState(false);

  // Profile Form state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      void navigate({ to: "/login", search: { redirect: "/dashboard" } });
    }
  }, [ready, isAuthenticated, navigate]);

  // Load dashboard data
  async function loadDashboardData() {
    if (!isAuthenticated || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setLoadingData(true);

    try {
      // 1. Fetch Orders
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, listings:listing_id(title, cover_image_url, categories:category_id(slug))")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((orderData ?? []) as Order[]);

      // 2. Fetch Disputes
      const { data: disputeData } = await supabase
        .from("disputes")
        .select("*, order:orders(listing_title, amount_inr)")
        .eq("opened_by", user.id)
        .order("created_at", { ascending: false });
      setDisputes((disputeData ?? []) as any[]);

      // 3. Fetch Payment Proofs
      const { data: proofData } = await supabase
        .from("payment_proofs")
        .select("*")
        .or(`user_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      setProofs((proofData ?? []) as PaymentProof[]);

      // 4. Fetch User Reviews (to hide completed orders already reviewed)
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("order_id")
        .eq("buyer_id", user.id);
      const reviewedIds = new Set((reviewData ?? []).map((r) => r.order_id));
      setReviewedOrderIds(reviewedIds);

      // 5. Fetch Active Sessions
      const { data: sessionData } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_active", { ascending: false });
      setSessions(sessionData || []);
    } catch (e: any) {
      console.error("[Dashboard] Error fetching buyer details:", e);
      toast.error("Failed to load dashboard data: " + e.message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      void loadDashboardData();
    }
  }, [isAuthenticated, user]);

  // Synchronize local profile state with useAuth context
  useEffect(() => {
    if (profile) {
      setProfileName(profile.display_name || "");
      setProfilePhone(profile.phone || "");
      setProfileBio(profile.bio || "");
      setProfileAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Upload helpers
  async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
    const supabase = getSupabase()!;
    const fileExt = file.name.split(".").pop();
    const cleanFileName = `${user!.id}_${Date.now()}.${fileExt}`;
    
    const objectPath = `${path}/${cleanFileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file);

    if (uploadError) throw uploadError;

    // payment-proofs is a private bucket: store the in-bucket path (resolved to a
    // signed URL where displayed). Public buckets keep returning a public URL.
    if (bucket === "payment-proofs") {
      return objectPath;
    }
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    return publicUrl;
  }

  // Action: Re-upload proof
  async function handleReuploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProofToReupload || !reuploadFile) return;
    const supabase = getSupabase()!;
    setReuploading(true);

    try {
      // 1. Upload proof screenshot
      const url = await uploadFile(reuploadFile, "payment-proofs", "proofs");

      // 2. Fetch current version count for archiving history
      const { count } = await supabase
        .from("payment_proof_history")
        .select("id", { count: "exact", head: true })
        .eq("payment_proof_id", activeProofToReupload.id);

      const nextVersion = (count ?? 0) + 1;

      // 3. Insert into payment_proof_history to archive old screenshot
      await supabase
        .from("payment_proof_history")
        .insert({
          payment_proof_id: activeProofToReupload.id,
          version: nextVersion,
          screenshot_url: activeProofToReupload.screenshot_url,
          reason: activeProofToReupload.rejection_reason || "Re-upload required",
          uploader_id: activeProofToReupload.user_id,
        });

      // 4. Update payment proof row to 'pending'
      const { error: proofErr } = await supabase
        .from("payment_proofs")
        .update({
          screenshot_url: url,
          payment_reference: reuploadRef || null,
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeProofToReupload.id);

      if (proofErr) throw proofErr;

      // 5. Update order payment status back to under review
      const orderId = orders.find(o => o.listing_id === activeProofToReupload.listing_id)?.id;
      if (orderId) {
        await supabase
          .from("orders")
          .update({ status: "payment_under_review", updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }

      // 6. Notify admin/staff of new screenshot re-uploaded
      try {
        await triggerRoleNotification({
          data: {
            roles: ["admin", "staff"],
            kind: "staff.payment_verification",
            title: "New payment screenshot uploaded",
            body: `User ${user?.email || "Buyer"} uploaded a new screenshot for Order #${orderId?.slice(0, 8) || "N/A"}.`
          }
        });
      } catch (notifErr) {
        console.warn("[Dashboard] Failed to notify staff:", notifErr);
      }

      toast.success("Payment proof re-submitted successfully!");
      setReuploadModalOpen(false);
      setReuploadFile(null);
      setReuploadRef("");
      void loadDashboardData();
    } catch (err: any) {
      toast.error("Re-upload failed: " + err.message);
    } finally {
      setReuploading(false);
    }
  }

  // Action: Confirm & Complete escrow
  async function handleConfirmComplete(orderId: string) {
    if (!confirm("Are you sure you want to confirm delivery? This releases the escrowed funds to the seller.")) return;
    try {
      await completeOrderAndCreditSeller(orderId);
      toast.success("Order marked as completed and funds released from escrow!");
      void loadDashboardData();
    } catch (e: any) {
      toast.error("Failed to complete order: " + e.message);
    }
  }

  // Action: File review
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrderToReview) return;
    const supabase = getSupabase()!;
    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from("reviews")
        .insert({
          order_id: activeOrderToReview.id,
          buyer_id: user!.id,
          seller_id: activeOrderToReview.seller_id,
          rating: reviewRating,
          review_text: reviewText || null
        });

      if (error) throw error;

      // Log notification message inside the chat conversation for transparency
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("order_id", activeOrderToReview.id)
        .maybeSingle();

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          body: `[SYSTEM_REVIEW_SUBMITTED]: Buyer left a ${reviewRating}★ rating with feedback: "${reviewText || 'No comments'}"`,
          is_system: true
        });
      }

      toast.success("Thank you for your review!");
      setReviewModalOpen(false);
      setReviewText("");
      void loadDashboardData();
    } catch (e: any) {
      toast.error("Failed to submit review: " + e.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  // Action: Open dispute
  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrderToDispute || !disputeReason) return;
    setSubmittingDispute(true);

    try {
      const supabase = getSupabase()!;
      // 1. Open dispute through service
      await openDispute({
        orderId: activeOrderToDispute.id,
        openedBy: user!.id,
        reason: disputeNotes ? `${disputeReason}: ${disputeNotes}` : disputeReason,
        evidenceFiles: disputeFiles
      });

      // 2. Set order status to disputed
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: "disputed", updated_at: new Date().toISOString() })
        .eq("id", activeOrderToDispute.id);

      if (orderErr) throw orderErr;

      // 3. Log notification inside chat
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("order_id", activeOrderToDispute.id)
        .maybeSingle();

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          body: `[SYSTEM_DISPUTE_OPENED]: Buyer opened an escrow dispute. Reason: ${disputeReason}. Details: ${disputeNotes || "None"}`,
          is_system: true
        });
      }

      toast.success("Dispute opened. A HUXZAIN mediator has been assigned to mediate.");
      setDisputeModalOpen(false);
      setDisputeNotes("");
      setDisputeFiles([]);
      void loadDashboardData();
    } catch (e: any) {
      toast.error("Failed to open dispute: " + e.message);
    } finally {
      setSubmittingDispute(false);
    }
  }

  // Load dispute messaging thread
  async function loadDisputeChat(dispute: Dispute) {
    const supabase = getSupabase()!;
    setSelectedDispute(dispute);
    setLoadingDisputeMessages(true);
    setDisputeMessages([]);
    setNewDisputeMsgText("");

    try {
      const { data, error } = await supabase
        .from("dispute_messages")
        .select("*, sender:profiles!sender_id(display_name, email)")
        .eq("dispute_id", dispute.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDisputeMessages((data ?? []) as DisputeMessage[]);
    } catch (err: any) {
      toast.error("Failed to load dispute logs: " + err.message);
    } finally {
      setLoadingDisputeMessages(false);
    }
  }

  // Send message in dispute thread
  async function handleSendDisputeMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute || !newDisputeMsgText.trim()) return;
    const supabase = getSupabase()!;
    setSendingDisputeMsg(true);

    try {
      const { data, error } = await supabase
        .from("dispute_messages")
        .insert({
          dispute_id: selectedDispute.id,
          sender_id: user!.id,
          message: newDisputeMsgText.trim()
        })
        .select("*, sender:profiles!sender_id(display_name, email)")
        .single();

      if (error) throw error;

      setDisputeMessages(prev => [...prev, data as DisputeMessage]);
      setNewDisputeMsgText("");
    } catch (err: any) {
      toast.error("Failed to send message: " + err.message);
    } finally {
      setSendingDisputeMsg(false);
    }
  }

  // Profile Edit
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      await updateProfile({
        display_name: profileName.trim() || null,
        bio: profileBio.trim() || null,
        avatar_url: profileAvatarUrl.trim() || null,
      });

      toast.success("Profile saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  // Settings / Password update
  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    const supabase = getSupabase()!;
    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Failed to update password: " + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  }

  // UI Derived stats
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => !["completed", "cancelled", "refunded"].includes(o.status)).length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === "completed").length;
  }, [orders]);

  const pendingReviewsCount = useMemo(() => {
    return orders.filter(o => o.status === "completed" && !reviewedOrderIds.has(o.id)).length;
  }, [orders, reviewedOrderIds]);

  // Warning payments (reupload requested)
  const reuploadRequestedProofs = useMemo(() => {
    return proofs.filter(p => p.status === "reupload_requested" || p.status === "REUPLOAD_REQUIRED");
  }, [proofs]);

  // Combined notifications & active sessions recent activity
  const recentActivity = useMemo(() => {
    const activityItems: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: Date;
      type: "notification" | "session";
    }> = [];

    // Add notifications
    notifications.forEach((n) => {
      activityItems.push({
        id: `notif-${n.id}`,
        title: n.title,
        description: n.body,
        timestamp: new Date(n.created_at),
        type: "notification",
      });
    });

    // Add active sessions
    sessions.forEach((s) => {
      activityItems.push({
        id: `sess-${s.id}`,
        title: `Login Session: ${s.browser} on ${s.device}`,
        description: `IP Address: ${s.ip_address || "Unknown IP"}`,
        timestamp: new Date(s.last_active),
        type: "session",
      });
    });

    // Sort descending by timestamp
    return activityItems
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [notifications, sessions]);

  // Inspection Hours Calculator
  const getInspectionPeriodText = (o: Order) => {
    if (!o.delivered_at || !o.listings) return null;
    const cat = o.listings.categories?.slug || "digital-products";
    const price = Number(o.amount_inr || o.amount_total || 0);
    // Standard standard tier check
    const inspectionHours = calculateInspectionHours(cat, price, "standard");
    return `${inspectionHours} hours`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container-page py-6 lg:py-10 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* LEFT NAV PANEL - Luxury Gold Styling */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-surface/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center font-display text-gold font-bold overflow-hidden shrink-0">
                <img
                  src={getUserAvatar(profileAvatarUrl)}
                  alt="Avatar"
                  className="size-full rounded-xl object-cover"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR_URL;
                  }}
                />
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-foreground truncate">{profileName || "Huxzain User"}</div>
                <div className="text-[10px] text-gold uppercase tracking-wider font-semibold font-display">
                  {roles && roles.includes("admin")
                    ? "Administrator"
                    : roles && (roles.includes("staff") || roles.includes("moderator"))
                      ? "Staff / Moderator"
                      : profile?.is_seller
                        ? "Verified Seller"
                        : "Verified Buyer"}
                </div>
              </div>
            </div>
            {profile?.is_seller && (
              <Link
                to="/seller"
                className="flex items-center justify-center gap-1.5 h-10 w-full rounded-xl border border-gold/30 hover:border-gold/60 bg-gold/5 text-gold text-xs font-bold transition-all mt-2"
              >
                Switch to Seller Console
              </Link>
            )}
          </div>

          <nav className="flex flex-row md:flex-col p-1 bg-surface/30 rounded-2xl border border-border md:space-y-1 overflow-x-auto w-full md:w-auto">
            {[
              { id: "overview", label: "Overview", icon: ShoppingBag },
              { id: "orders", label: `My Orders (${orders.length})`, icon: ShoppingBag },
              { id: "disputes", label: `Disputes (${disputes.length})`, icon: ShieldAlert },
              { id: "notifications", label: `Alerts (${unreadCount})`, icon: AlertCircle },
              { id: "profile", label: "Edit Profile", icon: User },
              { id: "settings", label: "Security & settings", icon: SettingsIcon },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer flex-shrink-0 ${
                    activeTab === t.id
                      ? "bg-gold text-black font-bold shadow-lg shadow-gold/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/40"
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Warning Re-upload banner notifications */}
          {reuploadRequestedProofs.map((p) => {
            const relatedOrder = orders.find(o => o.listing_id === p.listing_id);
            return (
              <div key={p.id} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-400 size-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">Re-upload Payment Proof Requested</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The reviewer requested a new proof of payment for Order <strong>#{relatedOrder?.id.slice(0, 8) || "deposit"}</strong>.
                    </p>
                    <p className="text-xs text-amber-400 font-serif italic mt-1">
                      Reason: "{p.rejection_reason || "Blurred text or incorrect references."}"
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveProofToReupload(p);
                    setReuploadModalOpen(true);
                  }}
                  className="h-9 px-4 rounded-xl bg-amber-500 text-black hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer flex-shrink-0"
                >
                  <Upload size={13} /> Re-upload screenshot
                </button>
              </div>
            );
          })}

          {/* TAB CONTENT: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Buyer Console Overview</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Summary of your purchases, active escrow protection, and pending tasks.</p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-surface/30 space-y-1 relative overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Active Orders</div>
                  <div className="font-display text-2xl font-bold text-foreground">{activeOrdersCount}</div>
                  <div className="text-[10px] text-muted-foreground">Awaiting delivery / review</div>
                </div>
                <div className="p-5 rounded-2xl border border-border bg-surface/30 space-y-1 relative overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Completed Trades</div>
                  <div className="font-display text-2xl font-bold text-gold">{completedOrdersCount}</div>
                  <div className="text-[10px] text-muted-foreground">Successfully finalized</div>
                </div>
                <div className="p-5 rounded-2xl border border-border bg-surface/30 space-y-1 relative overflow-hidden col-span-2 lg:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Pending Reviews</div>
                  <div className="font-display text-2xl font-bold text-teal-400">{pendingReviewsCount}</div>
                  <div className="text-[10px] text-muted-foreground">Awaiting your feedback</div>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Recent Transactions</span>
                  <button onClick={() => setActiveTab("orders")} className="text-xs text-gold hover:underline font-semibold inline-flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </button>
                </h3>

                {loadingData ? (
                  <div className="p-8 border border-border rounded-2xl bg-surface/30 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-gold animate-duration-1000" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-10 border border-border rounded-2xl bg-surface/20 text-center text-xs text-muted-foreground">
                    No orders found. Check the marketplace store to start trading!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((o) => (
                      <div key={o.id} className="p-4 rounded-2xl border border-border bg-surface/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="size-12 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground overflow-hidden flex-shrink-0">
                            {o.listings?.cover_image_url ? (
                              <img src={o.listings.cover_image_url} alt="Cover" className="size-full object-cover" />
                            ) : (
                              <ShoppingBag size={18} />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs text-foreground truncate max-w-[240px]">
                              {o.listings?.title || "Marketplace Order"}
                            </h4>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              ID: #{o.id.slice(0, 8)} • Price: <strong className="text-foreground">₹{o.amount_inr || o.amount_total}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <StatusBadge status={o.status} />
                          <button
                            onClick={() => {
                              setActiveTab("orders");
                              setExpandedOrderId(o.id);
                            }}
                            className="h-8 px-3 rounded-lg border border-border text-[11px] font-bold hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Account Activity */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Recent Account Activity</span>
                  <button onClick={() => setActiveTab("notifications")} className="text-xs text-gold hover:underline font-semibold inline-flex items-center gap-1">
                    View Alerts <ChevronRight size={12} />
                  </button>
                </h3>

                {recentActivity.length === 0 ? (
                  <div className="p-10 border border-border rounded-2xl bg-surface/20 text-center text-xs text-muted-foreground">
                    No recent activity logs.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => {
                      const ActIcon = activity.type === "session" ? Monitor : AlertCircle;
                      return (
                        <div key={activity.id} className="p-4 rounded-2xl border border-border bg-surface/20 flex items-start gap-3">
                          <div className={`p-2 rounded-xl bg-surface border border-border ${activity.type === 'session' ? 'text-blue-400' : 'text-gold'} shrink-0`}>
                            <ActIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs text-foreground truncate">
                              {activity.title}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-[9px] text-muted-foreground whitespace-nowrap self-center">
                            {activity.timestamp.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold">My Orders Ledger</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage details, inspect deliverables, file disputes, or leave ratings.</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs font-semibold hover:border-gold/30 transition-all cursor-pointer bg-surface/30"
                >
                  <RefreshCw className={`size-3 ${loadingData ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl border border-border bg-surface/30 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-20 border border-border bg-surface/20 rounded-2xl text-center space-y-4">
                  <div className="size-16 rounded-full bg-surface border border-border flex items-center justify-center mx-auto">
                    <ShoppingBag size={24} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">No orders recorded</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">You have not completed any order purchases yet.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => {
                    const isExpanded = expandedOrderId === o.id;
                    const isReviewed = reviewedOrderIds.has(o.id);
                    return (
                      <div key={o.id} className="rounded-2xl border border-border bg-surface/10 overflow-hidden">
                        
                        {/* Order Header Summary */}
                        <div 
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-elevated/20 transition-all"
                        >
                          <div className="flex gap-4">
                            <div className="size-14 rounded-xl bg-surface border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                              {o.listings?.cover_image_url ? (
                                <img src={o.listings.cover_image_url} alt="Cover" className="size-full object-cover" />
                              ) : (
                                <ShoppingBag size={20} className="text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-foreground hover:text-gold transition-colors">{o.listings?.title || "Marketplace Transaction"}</h3>
                              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                                <div>ID: <span className="font-mono text-[11px] font-semibold">{o.id}</span></div>
                                <div>Amount: <strong className="text-foreground">₹{o.amount_inr || o.amount_total}</strong> • Placed: {new Date(o.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-border/40 pt-3 sm:pt-0 sm:border-0">
                            <StatusBadge status={o.status} />
                            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180 text-gold" : ""}`} />
                          </div>
                        </div>

                        {/* Order Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-border bg-surface/30 p-5 space-y-6 animate-in slide-in-from-top-3 duration-200">
                            
                            {/* ESCROW VISUAL TIMELINE */}
                            <div className="space-y-3">
                              <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Transaction Timeline</h4>
                              
                              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2 pt-2 pb-4">
                                <div className="absolute top-2 left-2.5 md:left-0 md:top-2.5 md:w-full h-full md:h-[2px] bg-border z-0 pointer-events-none" />
                                
                                {[
                                  { label: "Payment Submitted", checked: true },
                                  { label: "Payment Approved", checked: ["payment_approved", "order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(o.status) },
                                  { label: "Seller Accepted Order", checked: ["order_active", "seller_delivering", "buyer_reviewing", "completed", "disputed"].includes(o.status) },
                                  { label: "Delivery Submitted", checked: ["buyer_reviewing", "completed"].includes(o.status) },
                                  { label: "Completed", checked: o.status === "completed" },
                                ].map((step, idx) => (
                                  <div key={idx} className="flex md:flex-col items-center gap-3 md:gap-1.5 z-10 relative bg-background/5 p-1 rounded-lg">
                                    <div className={`size-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                                      step.checked 
                                        ? "bg-gold border-gold text-black" 
                                        : "bg-surface border-border text-muted-foreground"
                                    }`}>
                                      {step.checked ? "✓" : idx + 1}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider md:text-center ${step.checked ? "text-gold" : "text-muted-foreground"}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Seller Deliverables Info */}
                            {o.delivery_notes && (
                              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-2">
                                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                                  <BadgeCheck className="size-4" /> Seller Deliverables Received
                                </h4>
                                <div className="text-xs text-foreground bg-surface-elevated/40 p-3 rounded-lg font-mono whitespace-pre-wrap leading-relaxed border border-border/40">
                                  {o.delivery_notes}
                                </div>
                                {o.delivery_proof_url && (
                                  <a 
                                    href={o.delivery_proof_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-semibold"
                                  >
                                    <Eye size={12} /> View uploaded evidence screenshot
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Buyer Actions */}
                            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
                              {o.status === "buyer_reviewing" && (
                                <>
                                  <button
                                    onClick={() => handleConfirmComplete(o.id)}
                                    className="h-10 px-5 rounded-xl bg-gold text-black hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer"
                                  >
                                    <CheckCircle2 size={14} /> Confirm & Release Funds
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveOrderToDispute(o);
                                      setDisputeModalOpen(true);
                                    }}
                                    className="h-10 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <AlertCircle size={14} /> File Dispute
                                  </button>
                                </>
                              )}

                              {o.status === "completed" && !isReviewed && (
                                <button
                                  onClick={() => {
                                    setActiveOrderToReview(o);
                                    setReviewModalOpen(true);
                                  }}
                                  className="h-10 px-5 rounded-xl bg-teal-500 text-black hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer"
                                >
                                  <Star size={14} /> Write Seller Review
                                </button>
                              )}

                              <Link
                                to="/messages"
                                search={{ orderId: o.id }}
                                className="h-10 px-4 rounded-xl border border-border text-xs font-semibold flex items-center gap-1.5 hover:text-gold hover:border-gold/30 transition-all text-foreground no-underline"
                              >
                                <MessageSquare size={14} /> Contact Seller / Chat
                              </Link>
                              
                              {getInspectionPeriodText(o) && o.status === "buyer_reviewing" && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-2.5 w-full">
                                  <Info size={12} className="text-gold" /> Escrow inspection countdown active. Auto-release after: <strong className="text-foreground">{getInspectionPeriodText(o)}</strong>
                                </div>
                              )}
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: DISPUTES */}
          {activeTab === "disputes" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Dispute Operations Console</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Escalate escrow locks, discuss disputes with sellers, and view mediator resolutions.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
                {/* Left side: disputes lists */}
                <div className="w-full md:w-80 border border-border bg-surface/30 rounded-2xl flex flex-col divide-y divide-border overflow-hidden flex-shrink-0">
                  <div className="p-3 bg-surface-elevated/40 text-[10px] uppercase font-bold text-muted-foreground">Disputes List ({disputes.length})</div>
                  {disputes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">No active disputes opened.</div>
                  ) : (
                    disputes.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => void loadDisputeChat(d)}
                        className={`w-full p-4 text-left flex flex-col gap-1 transition-all border-none cursor-pointer ${
                          selectedDispute?.id === d.id ? "bg-gold/5" : "bg-transparent hover:bg-surface/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-foreground truncate max-w-[140px]">{d.order?.listing_title || "Order Dispute"}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                            d.status === "open" ? "text-red-400 border-red-500/30 bg-red-500/10" : 
                            d.status === "investigating" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : 
                            "text-green-400 border-green-500/30 bg-green-500/10"
                          }`}>{d.status.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Dispute ID: #{d.id.slice(0, 8)}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Right side: dispute messages thread */}
                <div className="flex-1 border border-border bg-surface/30 rounded-2xl flex flex-col overflow-hidden">
                  {selectedDispute ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Dispute Header */}
                      <div className="p-4 border-b border-border bg-surface-elevated/30 flex flex-col gap-1">
                        <div className="font-bold text-sm text-foreground">Dispute for Order #{selectedDispute.order_id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground font-serif italic">Complaint: "{selectedDispute.reason}"</div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[350px] flex flex-col">
                        {loadingDisputeMessages ? (
                          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-gold size-6" /></div>
                        ) : disputeMessages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No escalations logged yet. Post a message to update the mediator.</div>
                        ) : (
                          disputeMessages.map((m) => {
                            const isMe = m.sender_id === user?.id;
                            return (
                              <div key={m.id} className={`max-w-[80%] flex flex-col ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                                <span className="text-[9px] text-muted-foreground mb-0.5">{m.sender?.display_name || "User"} • {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                                <div className={`p-2.5 rounded-xl text-xs ${isMe ? "bg-gold text-black font-semibold" : "bg-surface-elevated border border-border text-foreground"}`}>
                                  {m.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Send Message Form */}
                      {selectedDispute.status !== "resolved_buyer" && selectedDispute.status !== "resolved_seller" && selectedDispute.status !== "closed" ? (
                        <form onSubmit={handleSendDisputeMessage} className="p-3 border-t border-border bg-surface/50 flex gap-2">
                          <input
                            type="text"
                            value={newDisputeMsgText}
                            onChange={(e) => setNewDisputeMsgText(e.target.value)}
                            placeholder="Message the moderator and seller..."
                            className="flex-1 h-9 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground"
                          />
                          <button
                            type="submit"
                            disabled={sendingDisputeMsg || !newDisputeMsgText.trim()}
                            className="size-9 rounded-xl bg-gold text-black hover:brightness-110 flex items-center justify-center flex-shrink-0 cursor-pointer border-none"
                          >
                            {sendingDisputeMsg ? <Loader2 className="animate-spin size-4" /> : <Send size={14} />}
                          </button>
                        </form>
                      ) : (
                        <div className="p-3.5 bg-emerald-500/5 border-t border-border text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> This dispute has been closed. Final verdict: <strong>"{selectedDispute.resolution}"</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground p-8 text-center space-y-2">
                      <ShieldAlert size={28} className="text-muted-foreground/30 animate-pulse" />
                      <div>Select a dispute from the left panel to display the private discussion history and resolution log.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h1 className="font-display text-2xl font-bold">In-App Notification Hub</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Stay updated with transaction state changes and escrow locks.</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => void markAllAsRead()}
                    className="h-8 px-3 rounded-lg border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/5 transition-all cursor-pointer bg-transparent"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-10 border border-border bg-surface/20 rounded-2xl text-center text-xs text-muted-foreground">
                  No alerts recorded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read_at && void markAsRead(n.id)}
                      className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                        !n.read_at ? "bg-gold/5 border-gold/20" : "bg-surface/10 border-border"
                      }`}
                    >
                      <div className={`size-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read_at ? "bg-gold animate-pulse" : "bg-transparent"}`} />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-foreground">{n.title}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Edit Profile details</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Configure your buyer avatar, description, and contact info.</p>
              </div>

              <form onSubmit={handleProfileSave} className="p-6 rounded-2xl border border-border bg-surface/30 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Display Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Display Name"
                      className="h-10 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                      <span>Phone number</span>
                      {profile?.phone_verified ? (
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">Verified ✓</span>
                      ) : profile?.phone ? (
                        <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Unverified</span>
                      ) : null}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. +919876543210"
                        disabled={!!profile?.phone_verified}
                        className="flex-1 h-10 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                      {!profile?.phone_verified && profilePhone.trim() && (
                        <button
                          type="button"
                          onClick={() => setShowPhoneVerification(true)}
                          className="h-10 px-4 rounded-xl bg-gold hover:brightness-110 text-black text-xs font-bold transition-all border-none cursor-pointer flex-shrink-0"
                        >
                          Verify OTP
                        </button>
                      )}
                      {profile?.phone_verified && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Are you sure you want to change your verified phone number? This will require re-verification.")) {
                              const supabase = getSupabase()!;
                              const { error } = await supabase.from("profiles").update({ phone_verified: false, phone_verified_at: null }).eq("id", user!.id);
                              if (error) {
                                toast.error("Failed to unlock phone: " + error.message);
                              } else {
                                await refreshUserMeta();
                                setProfilePhone("");
                                toast.info("Phone number unlocked. You can now type a new number and verify it.");
                              }
                            }
                          }}
                          className="h-10 px-3 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer flex-shrink-0 bg-transparent"
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Avatar Image URL</label>
                  <input
                    type="text"
                    value={profileAvatarUrl}
                    onChange={(e) => setProfileAvatarUrl(e.target.value)}
                    placeholder="Link to avatar screenshot..."
                    className="h-10 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Bio / description</label>
                  <textarea
                    rows={4}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Describe yourself or include gaming details..."
                    className="p-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-10 px-6 rounded-xl bg-gold text-black font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="animate-spin size-4" /> : "Save Profile Details"}
                </button>
              </form>
            </div>
          )}

          {/* TAB CONTENT: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Security Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your credentials, change passwords, and configure session security.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="p-6 rounded-2xl border border-border bg-surface/30 space-y-4">
                <h3 className="font-display text-sm font-bold text-gold">Update Password</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 px-3 text-xs bg-background border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword || !newPassword}
                  className="h-10 px-6 rounded-xl bg-gold text-black font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  {updatingPassword ? <Loader2 className="animate-spin size-4" /> : "Change password"}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
      
      <Footer />

      {/* ─── SCREENSHOT RE-UPLOAD MODAL ─── */}
      {reuploadModalOpen && activeProofToReupload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <button
              onClick={() => setReuploadModalOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-surface hover:text-gold flex items-center justify-center cursor-pointer border-none"
            >
              <X size={15} />
            </button>
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-gold">
              <Upload size={18} /> Re-upload Payment Proof
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a clear receipt screenshot and fill in references for escrow validation.
            </p>

            <form onSubmit={handleReuploadSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Receipt Image</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-black hover:file:brightness-110 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Transaction ID / Reference (Optional)</label>
                <input
                  type="text"
                  value={reuploadRef}
                  onChange={(e) => setReuploadRef(e.target.value)}
                  placeholder="UPI Ref or IMPS number..."
                  className="w-full h-10 px-3 text-xs bg-surface border border-border rounded-xl focus:border-gold/50 outline-none text-foreground"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReuploadModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reuploading || !reuploadFile}
                  className="flex-1 h-10 rounded-xl bg-gold text-black hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-1"
                >
                  {reuploading ? <Loader2 className="animate-spin size-4" /> : "Submit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REVIEW MODAL ─── */}
      {reviewModalOpen && activeOrderToReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-surface hover:text-gold flex items-center justify-center cursor-pointer border-none"
            >
              <X size={15} />
            </button>
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-gold">
              <Star size={18} /> Review Seller Service
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Rate your experience for order <strong>#{activeOrderToReview.id.slice(0, 8)}</strong>. Sellers cannot edit or delete reviews.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 items-center pb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Select Rating</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReviewRating(val)}
                      className="border-none bg-transparent cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star
                        size={26}
                        className={val <= reviewRating ? "fill-gold text-gold" : "text-muted-foreground/30"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Review comments</label>
                <textarea
                  rows={4}
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about the delivery, speed, and communication quality..."
                  className="p-3 text-xs bg-surface border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || !reviewText.trim()}
                  className="flex-1 h-10 rounded-xl bg-gold text-black hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-1"
                >
                  {submittingReview ? <Loader2 className="animate-spin size-4" /> : "Post Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DISPUTE SUBMIT MODAL ─── */}
      {disputeModalOpen && activeOrderToDispute && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <button
              onClick={() => setDisputeModalOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-surface hover:text-gold flex items-center justify-center cursor-pointer border-none"
            >
              <X size={15} />
            </button>
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <ShieldAlert size={18} /> File Escrow Dispute
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Submit description notes and file uploads as evidence to lock the escrow and alert mediators.
            </p>

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface border border-border rounded-xl focus:border-gold/50 outline-none text-foreground"
                >
                  <option value="Not as described">Product not as described</option>
                  <option value="Non delivery">Seller has not delivered</option>
                  <option value="Faulty product">Faulty credentials/keys</option>
                  <option value="Unreachable seller">Seller is unresponsive</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Complaint Details</label>
                <textarea
                  rows={4}
                  required
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  placeholder="Detail precisely why the delivery doesn't match specifications..."
                  className="p-3 text-xs bg-surface border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Attach Screenshot Proof</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setDisputeFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-foreground hover:file:bg-surface-elevated cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute || !disputeNotes.trim()}
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-1"
                >
                  {submittingDispute ? <Loader2 className="animate-spin size-4" /> : "File Escalation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPhoneVerification && (
        <PhoneVerificationModal
          isOpen={showPhoneVerification}
          onClose={() => setShowPhoneVerification(false)}
          onSuccess={() => {
            setShowPhoneVerification(false);
          }}
          initialPhone={profilePhone}
        />
      )}
    </div>
  );
}
