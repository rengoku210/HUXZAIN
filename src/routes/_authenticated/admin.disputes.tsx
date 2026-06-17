import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { 
  Loader2, AlertCircle, CheckCircle2, XCircle, MessageSquare, 
  Clock, Shield, Eye, Download, Scale, ArrowRight, User, 
  Calendar, Check, DollarSign, RefreshCw, ShoppingBag, ShieldCheck, X,
  Send, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { completeOrderAndCreditSeller, addWalletBalance } from "@/lib/wallet.functions";
import { SignedImage } from "@/components/SignedImage";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  head: () => ({ meta: [{ title: "Mediation Disputes Center — HUXZAIN Admin" }] }),
  component: Page,
});

function EvidenceThumb({ path, index, onZoom }: { path: string; index: number; onZoom: (url: string) => void }) {
  const [resolved, setResolved] = useState("");
  return (
    <div
      className="relative group rounded-xl overflow-hidden border border-border bg-surface-elevated/40 aspect-video cursor-zoom-in"
      onClick={() => resolved && onZoom(resolved)}
    >
      <SignedImage
        path={path}
        bucket="dispute-evidence"
        onResolved={setResolved}
        alt={`Evidence #${index + 1}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
        <Eye className="text-white size-5" />
      </div>
    </div>
  );
}

type Dispute = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: "open" | "investigating" | "resolved_buyer" | "resolved_seller" | "closed";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  evidence_urls: string[] | null;
  profiles?: { display_name: string; email?: string | null };
};

type OrderDetail = {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  listing_title: string;
  amount_inr: number;
  status: string;
  created_at: string;
  buyer_requirements_payload: any;
  delivery_payload: any;
  buyer?: { display_name: string; email: string };
  seller?: { display_name: string; email: string };
};

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  is_system: boolean;
  created_at: string;
  sender?: { display_name: string; email: string };
};

type DisputeMessage = {
  id: string;
  dispute_id: string;
  sender_id: string;
  body: string;
  is_system: boolean;
  created_at: string;
  sender?: { display_name: string; email: string | null };
};

function Page() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  // Details data
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Resolution inputs
  const [buyerPercent, setBuyerPercent] = useState<number>(50);
  const [sellerPercent, setSellerPercent] = useState<number>(50);
  const [resolutionNotes, setResolutionNotes] = useState("");
  
  // Lightbox for evidence images
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Dispute messages (moderator thread)
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [newDisputeMsg, setNewDisputeMsg] = useState("");
  const [sendingDisputeMsg, setSendingDisputeMsg] = useState(false);
  const disputeThreadRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch disputes list
  async function fetchDisputes() {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoadingList(true);
    
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("*, profiles:opened_by(display_name, email)")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setDisputes((data ?? []) as Dispute[]);
    } catch (e: any) {
      toast.error("Failed to load disputes: " + e.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchDisputes();
  }, []);

  // Fetch detailed data for selected dispute
  async function loadDisputeDetails(dispute: Dispute) {
    const supabase = getSupabase();
    if (!supabase) return;
    
    setSelectedDispute(dispute);
    setLoadingDetail(true);
    setOrderDetail(null);
    setChatMessages([]);
    setDisputeMessages([]);
    setNewDisputeMsg("");
    setResolutionNotes("");
    
    try {
      // 1. Fetch order details with buyer/seller profiles
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:buyer_id(display_name, email),
          seller:seller_id(display_name, email)
        `)
        .eq("id", dispute.order_id)
        .single();
        
      if (orderErr) throw orderErr;
      setOrderDetail(orderData as OrderDetail);

      // 2. Fetch conversation associated with order
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .eq("order_id", dispute.order_id)
        .maybeSingle();
        
      if (convData) {
        // 3. Fetch chat messages
        const { data: msgData, error: msgErr } = await supabase
          .from("messages")
          .select(`
            id,
            sender_id,
            body,
            is_system,
            created_at,
            sender:profiles!sender_id(display_name, email)
          `)
          .eq("conversation_id", convData.id)
          .order("created_at", { ascending: true });
          
        if (msgErr) throw msgErr;
        const formattedMessages = (msgData ?? []).map((msg: any) => {
          let senderObj = undefined;
          if (msg.sender) {
            senderObj = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
          }
          return {
            id: msg.id,
            sender_id: msg.sender_id,
            body: msg.body,
            is_system: msg.is_system,
            created_at: msg.created_at,
            sender: senderObj ? {
              display_name: senderObj.display_name,
              email: senderObj.email || "",
            } : undefined
          };
        });
        setChatMessages(formattedMessages);
      }
      
      // Seed default share based on current status or status presets
      if (dispute.status === "resolved_buyer") {
        setBuyerPercent(100);
        setSellerPercent(0);
      } else if (dispute.status === "resolved_seller") {
        setBuyerPercent(0);
        setSellerPercent(100);
      } else {
        setBuyerPercent(50);
        setSellerPercent(50);
      }
      
      if (dispute.resolution) {
        setResolutionNotes(dispute.resolution);
      }

      // 4. Fetch dispute messages (moderator thread)
      const { data: dmData, error: dmErr } = await (supabase as any)
        .from("dispute_messages")
        .select(`
          id,
          dispute_id,
          sender_id,
          body,
          is_system,
          created_at,
          sender:profiles!sender_id(display_name, email)
        `)
        .eq("dispute_id", dispute.id)
        .order("created_at", { ascending: true });

      if (!dmErr && dmData) {
        const formatted = dmData.map((m: any) => {
          const senderObj = Array.isArray(m.sender) ? m.sender[0] : m.sender;
          return {
            id: m.id,
            dispute_id: m.dispute_id,
            sender_id: m.sender_id,
            body: m.body,
            is_system: m.is_system,
            created_at: m.created_at,
            sender: senderObj ? { display_name: senderObj.display_name, email: senderObj.email } : undefined,
          } as DisputeMessage;
        });
        setDisputeMessages(formatted);
      }

    } catch (e: any) {
      console.error("Failed to load dispute details:", e);
      toast.error("Failed to load details: " + e.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Update dispute status (e.g. to Investigating)
  async function markAsInvestigating(disputeId: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from("disputes")
        .update({ status: "investigating" })
        .eq("id", disputeId);
        
      if (error) throw error;
      toast.success("Dispute status updated to Investigating");
      
      // Update local state
      setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: "investigating" } : d));
      if (selectedDispute && selectedDispute.id === disputeId) {
        setSelectedDispute(prev => prev ? { ...prev, status: "investigating" } : null);
      }
      
      // Log staff action
      if (user) {
        await supabase.from("staff_action_logs").insert({
          staff_id: user.id,
          action: "DISPUTE_INVESTIGATE",
          target_type: "dispute",
          target_id: disputeId,
          previous_value: "open",
          new_value: "investigating"
        });
      }
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  }

  // Real-time subscription to dispute_messages for selected dispute
  useEffect(() => {
    if (!selectedDispute) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = (supabase as any)
      .channel(`dispute_messages_${selectedDispute.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispute_messages",
          filter: `dispute_id=eq.${selectedDispute.id}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as any;
          // Fetch sender profile for the new message
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", newMsg.sender_id)
            .maybeSingle();
          const msgWithSender: DisputeMessage = {
            ...newMsg,
            sender: profileData ? { display_name: profileData.display_name, email: profileData.email } : undefined,
          };
          setDisputeMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, msgWithSender];
          });
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [selectedDispute?.id]);

  // Scroll dispute thread to bottom when messages load
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [disputeMessages.length]);

  // Send a message in the dispute_messages thread
  async function sendDisputeMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute || !user || !newDisputeMsg.trim()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setSendingDisputeMsg(true);
    try {
      const { error } = await (supabase as any)
        .from("dispute_messages")
        .insert({
          dispute_id: selectedDispute.id,
          sender_id: user.id,
          body: newDisputeMsg.trim(),
          is_system: false,
        });
      if (error) throw error;
      setNewDisputeMsg("");
    } catch (e: any) {
      toast.error("Failed to send message: " + e.message);
    } finally {
      setSendingDisputeMsg(false);
    }
  }

  // Mediate dispute payout split
  async function handleMediateResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute || !orderDetail || !user) return;
    if (buyerPercent + sellerPercent !== 100) {
      toast.error("Payout percentages must add up to exactly 100%");
      return;
    }
    if (!resolutionNotes.trim()) {
      toast.error("Please enter a resolution note detailing the staff verdict");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;
    setResolving(true);

    try {
      const orderAmount = Number(orderDetail.amount_inr);
      const buyerRefund = Math.round((orderAmount * buyerPercent) / 100);
      const sellerPayout = Math.round((orderAmount * sellerPercent) / 100);
      
      // Determine final dispute status
      let finalStatus: Dispute["status"] = "closed";
      if (buyerPercent === 100) finalStatus = "resolved_buyer";
      else if (sellerPercent === 100) finalStatus = "resolved_seller";
      else finalStatus = "closed"; // Partial settlement is closed

      console.log(`[Mediation] Dispute #${selectedDispute.id.slice(0,8)}. Order amount: ₹${orderAmount}. Buyer Share: ₹${buyerRefund} (${buyerPercent}%), Seller Share: ₹${sellerPayout} (${sellerPercent}%)`);

      // 1. If buyer gets a refund, credit buyer wallet
      if (buyerRefund > 0) {
        await addWalletBalance(orderDetail.buyer_id, buyerRefund, "refund", orderDetail.id);
      }

      // 2. If seller gets a share:
      if (sellerPayout > 0) {
        // If it's a 100% payout to the seller, we can use the default completeOrderAndCreditSeller function to calculate plan fees
        if (sellerPercent === 100) {
          await completeOrderAndCreditSeller(orderDetail.id, { bypassDisputeCheck: true });
        } else {
          // If it's a split payout, credit the seller's wallet directly as a refund/adjustment
          await addWalletBalance(orderDetail.seller_id, sellerPayout, "refund", orderDetail.id);
        }
      }

      // 3. Update order status to 'refunded' (if 100% buyer) or 'completed' (for splits/seller favor)
      // Also clear the 'disputed' payout freeze so the order no longer shows as locked.
      const finalOrderStatus = buyerPercent === 100 ? "refunded" : "completed";
      const finalPayoutStatus = buyerPercent === 100 ? "refunded" : "pending_cooling";
      await supabase
        .from("orders")
        .update({
          status: finalOrderStatus,
          payout_status: finalPayoutStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", orderDetail.id);

      // 4. Update the dispute record
      await supabase
        .from("disputes")
        .update({
          status: finalStatus,
          resolution: resolutionNotes,
          resolved_at: new Date().toISOString()
        })
        .eq("id", selectedDispute.id);

      // 5. Insert system resolution message in chat
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .eq("order_id", orderDetail.id)
        .maybeSingle();

      if (convData) {
        await supabase.from("messages").insert({
          conversation_id: convData.id,
          sender_id: user.id,
          body: `[SYSTEM_DISPUTE_RESOLVED]: Dispute mediated by HUXZAIN Administration. Payout Split: Buyer: ₹${buyerRefund} (${buyerPercent}%), Seller: ₹${sellerPayout} (${sellerPercent}%). Verdict details: "${resolutionNotes}"`,
          is_system: true
        });
      }

      // 5b. Notify buyer and seller about the mediation result
      try {
        const notificationsToInsert = [];
        if (orderDetail.buyer_id) {
          notificationsToInsert.push({
            user_id: orderDetail.buyer_id,
            kind: "dispute.resolved",
            title: "Dispute Resolved by Admin",
            body: `Your dispute for Order #${orderDetail.id.slice(0, 8)} has been mediated. Split: Buyer ₹${buyerRefund} (${buyerPercent}%), Seller ₹${sellerPayout} (${sellerPercent}%). Verdict: "${resolutionNotes}"`,
          });
        }
        if (orderDetail.seller_id) {
          notificationsToInsert.push({
            user_id: orderDetail.seller_id,
            kind: "dispute.resolved",
            title: "Dispute Resolved by Admin",
            body: `The dispute for Order #${orderDetail.id.slice(0, 8)} has been mediated. Split: Buyer ₹${buyerRefund} (${buyerPercent}%), Seller ₹${sellerPayout} (${sellerPercent}%). Verdict: "${resolutionNotes}"`,
          });
        }
        if (notificationsToInsert.length > 0) {
          await supabase.from("notifications").insert(notificationsToInsert);
        }
      } catch (err) {
        console.warn("[AdminDisputes] Non-blocking notifications trigger failed:", err);
      }

      // 6. Log staff action
      await supabase.from("staff_action_logs").insert({
        staff_id: user.id,
        action: "DISPUTE_MEDIATE_RESOLVE",
        target_type: "dispute",
        target_id: selectedDispute.id,
        previous_value: selectedDispute.status,
        new_value: finalStatus,
        note: `Buyer Split: ${buyerPercent}%, Seller Split: ${sellerPercent}%. Note: ${resolutionNotes}`
      });

      toast.success("Dispute successfully mediated and resolved!");
      
      // Reload lists and details
      await fetchDisputes();
      
      // Update selected dispute locally
      setSelectedDispute(prev => prev ? { 
        ...prev, 
        status: finalStatus, 
        resolution: resolutionNotes,
        resolved_at: new Date().toISOString()
      } : null);
      
      // Update order status locally
      setOrderDetail(prev => prev ? { ...prev, status: finalOrderStatus } : null);

    } catch (e: any) {
      console.error(e);
      toast.error("Mediation failed: " + e.message);
    } finally {
      setResolving(false);
    }
  }

  // Filter disputes list based on search and status
  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      const matchSearch = 
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.profiles?.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchStatus = 
        statusFilter === "all" ||
        d.status === statusFilter;
        
      return matchSearch && matchStatus;
    });
  }, [disputes, searchTerm, statusFilter]);

  const statusBadges = {
    open: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    investigating: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    resolved_buyer: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    resolved_seller: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    closed: "text-muted-foreground bg-surface border-border",
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Scale className="text-gold size-6" /> Disputes Mediation Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Mediate escrow disputes, inspect chat transcripts, and divide payout splits.</p>
        </div>
        <button 
          onClick={fetchDisputes} 
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-xs font-semibold hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
        >
          <RefreshCw className="size-3" /> Refresh List
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Left Side: Disputes List */}
        <div className="w-full md:w-[380px] border border-border/80 bg-surface/30 rounded-2xl flex flex-col min-h-[300px] md:min-h-0 flex-shrink-0">
          <div className="p-4 border-b border-border/60 flex flex-col gap-3">
            <input 
              type="text"
              placeholder="Search disputes, orders, users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground"
            />
            {/* Filters */}
            <div className="flex flex-wrap gap-1">
              {["all", "open", "investigating", "resolved_buyer", "resolved_seller", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                    statusFilter === st 
                      ? "bg-gold text-black border-gold" 
                      : "bg-surface-elevated border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="size-6 text-gold animate-spin" />
                <span className="text-xs text-muted-foreground">Loading disputes...</span>
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="size-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No matching disputes found.</p>
              </div>
            ) : (
              filteredDisputes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => loadDisputeDetails(d)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2.5 cursor-pointer ${
                    selectedDispute?.id === d.id
                      ? "bg-surface border-gold/40 shadow-md shadow-gold/5"
                      : "bg-surface/50 border-border hover:bg-surface hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadges[d.status]}`}>
                      {d.status.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      #{d.id.slice(0, 8)}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-xs text-foreground line-clamp-1">{d.reason}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Opened by: <span className="text-foreground/80">{d.profiles?.display_name || d.opened_by.slice(0, 8)}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/40 pt-2 w-full">
                    <span>Order: {d.order_id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-2.5" />
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Selected Dispute Details Pane */}
        <div className="flex-1 border border-border/80 bg-surface/30 rounded-2xl flex flex-col min-h-0 relative">
          {!selectedDispute ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="size-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground mb-3">
                <Scale className="size-6" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">Select a Dispute</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                Click on any dispute from the list on the left to view screenshots, review chat transcripts, inspect credentials and execute payout resolutions.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2">
              <Loader2 className="size-8 text-gold animate-spin" />
              <span className="text-xs text-muted-foreground">Loading details and transcripts...</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
              
              {/* Header Details */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/60 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadges[selectedDispute.status]}`}>
                      {selectedDispute.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Dispute ID: {selectedDispute.id}</span>
                  </div>
                  <h2 className="font-display font-bold text-lg text-foreground mt-2">{selectedDispute.reason}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    Filed on {new Date(selectedDispute.created_at).toLocaleString()}
                    {selectedDispute.resolved_at && (
                      <span className="text-emerald-400 font-semibold">• Resolved on {new Date(selectedDispute.resolved_at).toLocaleString()}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDispute.status === "open" && (
                    <button
                      onClick={() => markAsInvestigating(selectedDispute.id)}
                      className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all flex items-center gap-1.5 border-none cursor-pointer"
                    >
                      <Shield className="size-3.5" /> Mark Investigating
                    </button>
                  )}
                </div>
              </div>

              {/* Grid: Order & Profiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buyer / Seller Details */}
                <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <User className="size-3.5" /> Participants Info
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Buyer:</span>
                      <span className="font-semibold text-foreground">
                        {orderDetail?.buyer?.display_name || "Unknown"} ({orderDetail?.buyer?.email})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Seller:</span>
                      <span className="font-semibold text-foreground">
                        {orderDetail?.seller?.display_name || "Unknown"} ({orderDetail?.seller?.email})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <ShoppingBag className="size-3.5" /> Order details
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Listing Title:</span>
                      <span className="font-semibold text-foreground truncate max-w-[200px]">{orderDetail?.listing_title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount Escrowed:</span>
                      <span className="font-bold text-foreground font-mono">₹{orderDetail?.amount_inr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Order Status:</span>
                      <span className="font-semibold text-foreground uppercase text-[10px]">{orderDetail?.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Screenshots section */}
              {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Eye className="size-3.5" /> Uploaded Evidence Screenshots ({selectedDispute.evidence_urls.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedDispute.evidence_urls.map((url, idx) => (
                      <EvidenceThumb key={idx} path={url} index={idx} onZoom={setActiveLightboxImg} />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Order Payloads (Deliveries/Requirements) */}
              {(orderDetail?.buyer_requirements_payload || orderDetail?.delivery_payload) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyer Requirements */}
                  {orderDetail?.buyer_requirements_payload && (
                    <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Buyer Requirements Submitted
                      </h3>
                      <div className="bg-surface-elevated/60 p-3 rounded-lg text-xs font-mono space-y-1.5 max-h-48 overflow-y-auto">
                        {Object.entries(orderDetail.buyer_requirements_payload).map(([k, v]) => (
                          <div key={k} className="flex flex-col border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-[10px] text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</span>
                            <span className="text-foreground">{String(v || "None")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Delivery details */}
                  {orderDetail?.delivery_payload && (
                    <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" /> Seller Delivery Submitted
                      </h3>
                      <div className="bg-surface-elevated/60 p-3 rounded-lg text-xs font-mono space-y-1.5 max-h-48 overflow-y-auto">
                        {Object.entries(orderDetail.delivery_payload).map(([k, v]) => (
                          <div key={k} className="flex flex-col border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-[10px] text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</span>
                            <span className="text-foreground">{String(v || "None")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Transcript log */}
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" /> Order Chat Transcript ({chatMessages.length} Messages)
                </h3>
                <div className="bg-surface-elevated/25 border border-border/80 rounded-2xl h-80 overflow-y-auto p-4 space-y-3 flex flex-col">
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                      No chat messages in this order.
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      if (m.is_system) {
                        return (
                          <div key={m.id} className="w-full flex justify-center">
                            <div className="bg-surface-elevated border border-border/50 text-[10px] px-3 py-1 rounded-full text-muted-foreground text-center max-w-md">
                              {m.body}
                            </div>
                          </div>
                        );
                      }
                      
                      const isBuyer = m.sender_id === orderDetail?.buyer_id;
                      return (
                        <div 
                          key={m.id} 
                          className={`max-w-[80%] flex flex-col ${isBuyer ? "self-start" : "self-end items-end"}`}
                        >
                          <span className="text-[9px] text-muted-foreground mb-0.5">
                            {m.sender?.display_name || "User"} ({isBuyer ? "Buyer" : "Seller"}) • {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className={`p-3 rounded-2xl text-xs ${
                            isBuyer 
                              ? "bg-surface-elevated border border-border text-foreground rounded-tl-xs" 
                              : "bg-gold text-black font-semibold rounded-tr-xs"
                          }`}>
                            {m.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Moderator Dispute Thread — dispute_messages */}
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <MessageCircle className="size-3.5" /> Moderator Dispute Thread
                  <span className="ml-auto text-[10px] text-muted-foreground normal-case font-normal">Staff-only communication channel — {disputeMessages.length} messages</span>
                </h3>
                <div
                  ref={disputeThreadRef}
                  className="bg-blue-950/20 border border-blue-500/20 rounded-2xl h-72 overflow-y-auto p-4 space-y-3 flex flex-col"
                >
                  {disputeMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1.5">
                      <MessageCircle className="size-5 opacity-40" />
                      <span>No messages yet. Start the moderator thread below.</span>
                    </div>
                  ) : (
                    disputeMessages.map((m) => {
                      if (m.is_system) {
                        return (
                          <div key={m.id} className="w-full flex justify-center">
                            <div className="bg-surface-elevated border border-blue-500/20 text-[10px] px-3 py-1 rounded-full text-blue-300/70 text-center max-w-md">
                              {m.body}
                            </div>
                          </div>
                        );
                      }
                      const isMe = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] flex flex-col ${isMe ? "self-end items-end" : "self-start"}`}
                        >
                          <span className="text-[9px] text-muted-foreground mb-0.5">
                            {m.sender?.display_name || "Staff"} • {new Date(m.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                          </span>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-blue-600 text-white rounded-tr-xs"
                                : "bg-surface-elevated border border-blue-500/20 text-foreground rounded-tl-xs"
                            }`}
                          >
                            {m.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                {(selectedDispute.status !== "resolved_buyer" && selectedDispute.status !== "resolved_seller" && selectedDispute.status !== "closed") && (
                  <form onSubmit={sendDisputeMessage} className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newDisputeMsg}
                      onChange={(e) => setNewDisputeMsg(e.target.value)}
                      placeholder="Type a message to the thread..."
                      className="flex-1 h-9 px-3 text-xs bg-surface-elevated border border-blue-500/20 rounded-xl focus:border-blue-400/50 outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      disabled={sendingDisputeMsg || !newDisputeMsg.trim()}
                      className="h-9 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                    >
                      {sendingDisputeMsg ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Send
                    </button>
                  </form>
                )}
              </div>

              {/* Split Payout mediating area */}
              {selectedDispute.status !== "resolved_buyer" && selectedDispute.status !== "resolved_seller" && selectedDispute.status !== "closed" ? (
                <div className="rounded-2xl border border-border-hover bg-surface/50 p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Scale className="text-gold size-4.5" /> Resolve Dispute & Split Payout
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure who receives what percentage of the escrowed ₹{orderDetail?.amount_inr} funds.</p>
                  </div>

                  <form onSubmit={handleMediateResolution} className="space-y-4">
                    {/* Share Split Presets */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { setBuyerPercent(100); setSellerPercent(0); }}
                        className="h-8 px-3 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                      >
                        100% Buyer (Full Refund)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBuyerPercent(0); setSellerPercent(100); }}
                        className="h-8 px-3 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 text-xs font-semibold cursor-pointer"
                      >
                        100% Seller (Full Release)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBuyerPercent(50); setSellerPercent(50); }}
                        className="h-8 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                      >
                        50/50 Split
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBuyerPercent(70); setSellerPercent(30); }}
                        className="h-8 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                      >
                        70/30 Split
                      </button>
                    </div>

                    {/* Inputs Split percentage */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Buyer refund share (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={buyerPercent}
                            onChange={e => {
                              const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setBuyerPercent(v);
                              setSellerPercent(100 - v);
                            }}
                            className="w-full h-10 pl-3 pr-8 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-mono font-bold"
                          />
                          <span className="absolute top-2.5 right-3 text-xs text-muted-foreground">%</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Calculated: <strong className="text-foreground">₹{Math.round((Number(orderDetail?.amount_inr || 0) * buyerPercent) / 100)}</strong>
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Seller release share (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={sellerPercent}
                            onChange={e => {
                              const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setSellerPercent(v);
                              setBuyerPercent(100 - v);
                            }}
                            className="w-full h-10 pl-3 pr-8 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground font-mono font-bold"
                          />
                          <span className="absolute top-2.5 right-3 text-xs text-muted-foreground">%</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Calculated: <strong className="text-foreground">₹{Math.round((Number(orderDetail?.amount_inr || 0) * sellerPercent) / 100)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Verdict notes */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Resolution Notes / Staff Verdict (Required)</label>
                      <textarea
                        required
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="Detail the reasoning behind this split outcome (sent to users)..."
                        className="w-full h-20 p-3 text-xs bg-surface-elevated border border-border rounded-xl focus:border-gold/50 outline-none text-foreground resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resolving || !resolutionNotes.trim()}
                      className="w-full h-10 rounded-xl bg-gold text-black font-bold text-xs hover:bg-gold-hover transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                    >
                      {resolving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Processing Mediate Settlement...
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          Resolve Dispute & Disburse Funds
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-400 size-5" />
                    <h4 className="font-display font-bold text-sm text-foreground">Dispute Resolved Successfully</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This dispute was mediated and resolved.
                  </p>
                  <div className="mt-3 p-3.5 bg-surface-elevated/50 border border-border/40 rounded-xl text-xs">
                    <div className="font-bold text-gold mb-1">Moderator Verdict:</div>
                    <p className="text-foreground/80 leading-relaxed font-serif italic">"{selectedDispute.resolution}"</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Overlay for evidence screenshots */}
      {activeLightboxImg && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setActiveLightboxImg(null)}
        >
          <button 
            onClick={() => setActiveLightboxImg(null)}
            className="absolute top-5 right-5 size-10 rounded-full bg-surface-elevated hover:bg-surface text-foreground hover:text-gold transition-all flex items-center justify-center border-none cursor-pointer"
          >
            <X className="size-5" />
          </button>
          <img 
            src={activeLightboxImg} 
            alt="Evidence Detail Fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
}
