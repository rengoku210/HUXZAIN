import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import {
  MessageSquareWarning,
  Shield,
  HeartPulse,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  ToggleLeft,
  ToggleRight,
  ClipboardCheck,
  X,
  Copy,
  ExternalLink,
  ShieldAlert,
  Scale,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  getConversationsMonitor,
  getReviewQueue,
  getFraudEvents,
  getLiveConversation,
  issueStrike,
  getStrikeHistory,
  resolveReport,
  reviewAppeal,
  getPlatformHealthFull,
  getFlaggedChats,
  reviewFlaggedChat,
  updateFlaggedChatStatus,
  getSecurityIncidents,
  resolveSecurityIncident,
  issueWarning,
  removeStrike,
  muteUser,
  suspendUser,
  banUser,
  unbanUser,
} from "@/lib/admin/moderation.functions";
import {
  getMaintenanceMode,
  updateMaintenanceMode,
} from "@/lib/admin/warnings.functions";

export const Route = createFileRoute("/_authenticated/admin/chats")({
  head: () => ({ meta: [{ title: "Anti-Fraud & Chat Monitor — HUXZAIN Admin" }] }),
  component: AntiFraudAndChatMonitor,
});

type Tab = "monitor" | "flagged" | "queue" | "events" | "health";

function AntiFraudAndChatMonitor() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("monitor");
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [conversationsMonitor, setConversationsMonitor] = useState<any[]>([]);
  const [flaggedChats, setFlaggedChats] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<{ reports: any[]; flagged: any[] }>({ reports: [], flagged: [] });
  const [fraudEvents, setFraudEvents] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);

  // Search Filter
  const [searchFilter, setSearchFilter] = useState("");

  // Live Conversation Viewer Panel states
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [liveConvData, setLiveConvData] = useState<{
    conversation: any;
    messages: any[];
    fraud_events: any[];
    strikes: any[];
    reports: any[];
  } | null>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const viewerMessagesEndRef = useRef<HTMLDivElement>(null);

  // Issue Strike modal states
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [strikeUserId, setStrikeUserId] = useState("");
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeEvidence, setStrikeEvidence] = useState("");
  const [strikeActionType, setStrikeActionType] = useState<"warning" | "strike" | "mute" | "suspend" | "ban" | "unban" | "strike_removal">("warning");
  const [muteDuration, setMuteDuration] = useState("15");
  const [suspendDuration, setSuspendDuration] = useState("7");
  const [strikeSubmitBusy, setStrikeSubmitBusy] = useState(false);

  // Maintenance form states
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [maintenanceBackAt, setMaintenanceBackAt] = useState("");
  const [maintenanceRoles, setMaintenanceRoles] = useState<string[]>([]);
  const [maintenanceSubmitBusy, setMaintenanceSubmitBusy] = useState(false);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  };

  // Scroll to bottom helper for live viewer
  const scrollToBottom = () => {
    setTimeout(() => {
      viewerMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // Load monitor data (separate function to avoid reloading whole page)
  const loadMonitorData = async () => {
    try {
      const monitor = await getConversationsMonitor();
      setConversationsMonitor(monitor || []);
    } catch (e) {
      console.error("Failed to load monitor data:", e);
    }
  };

  // Load all dashboard data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [monitor, flagged, queue, events, healthRes, maint] = await Promise.all([
        getConversationsMonitor(),
        getFlaggedChats(),
        getReviewQueue(),
        getFraudEvents({ data: { page: 0, limit: 50 } }),
        getPlatformHealthFull(),
        getMaintenanceMode(),
      ]);

      setConversationsMonitor(monitor || []);
      setFlaggedChats(flagged || []);
      setReviewQueue(queue || { reports: [], flagged: [] });
      setFraudEvents(events || []);
      setHealth(healthRes);
      setMaintenance(maint);

      if (maint) {
        setMaintenanceEnabled(maint.is_enabled);
        setMaintenanceMsg(maint.message || "");
        setMaintenanceBackAt(
          maint.expected_back_at
            ? new Date(maint.expected_back_at).toISOString().slice(0, 16)
            : ""
        );
        setMaintenanceRoles(maint.allowed_roles || ["admin", "super_admin", "owner"]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load platform security metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Real-time table updates for Live Monitoring
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb.channel("admin_monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          loadMonitorData();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Live Conversation Viewer data load & subscription
  useEffect(() => {
    if (!selectedChatId) {
      setLiveConvData(null);
      setLiveMessages([]);
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    const fetchLiveConv = async () => {
      setViewerLoading(true);
      try {
        const res = await getLiveConversation({ data: { conversation_id: selectedChatId } });
        setLiveConvData(res);
        setLiveMessages(res.messages || []);
        scrollToBottom();
      } catch (err: any) {
        toast.error("Failed to load conversation history.");
        setSelectedChatId(null);
      } finally {
        setViewerLoading(false);
      }
    };

    fetchLiveConv();

    // Subscribe to new messages for selected chat
    const channel = sb.channel(`live_viewer_${selectedChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedChatId}`,
        },
        (payload) => {
          setLiveMessages((prev) => {
            const next = [...prev, payload.new as any];
            scrollToBottom();
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [selectedChatId]);

  // Issue formal strike / moderation action
  const handleIssueStrike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strikeUserId || !strikeReason) {
      toast.error("User ID and Reason are required.");
      return;
    }

    setStrikeSubmitBusy(true);
    try {
      const moderatorId = auth.user?.id || "";

      if (strikeActionType === "warning") {
        await issueWarning({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            reason: strikeReason,
            notes: strikeEvidence || undefined,
          },
        });
        toast.success("Warning successfully recorded.");
      } else if (strikeActionType === "strike") {
        const res = await issueStrike({
          data: {
            user_id: strikeUserId,
            reason: strikeReason,
            evidence: strikeEvidence || undefined,
            moderator_id: moderatorId,
            conversation_id: selectedChatId || undefined,
            chat_number: liveConvData?.conversation?.chat_number || undefined,
          },
        });
        toast.success(
          `Strike ${res.strike_number} issued! permanent_ban=${res.is_permanent_ban}`
        );
      } else if (strikeActionType === "mute") {
        const res = await muteUser({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            duration_minutes: parseInt(muteDuration) || 15,
            reason: strikeReason,
          },
        });
        toast.success(`User muted until: ${new Date(res.expires_at).toLocaleString()}`);
      } else if (strikeActionType === "suspend") {
        const res = await suspendUser({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            duration_days: parseInt(suspendDuration) || 7,
            reason: strikeReason,
          },
        });
        toast.success(`User suspended until: ${new Date(res.expires_at).toLocaleString()}`);
      } else if (strikeActionType === "ban") {
        await banUser({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            reason: strikeReason,
          },
        });
        toast.success("User permanently banned.");
      } else if (strikeActionType === "unban") {
        await unbanUser({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            reason: strikeReason,
          },
        });
        toast.success("All restrictions lifted for user.");
      } else if (strikeActionType === "strike_removal") {
        const res = await removeStrike({
          data: {
            user_id: strikeUserId,
            moderator_id: moderatorId,
            reason: strikeReason,
          },
        });
        toast.success(`Strike removed! New strike count: ${res.strike_count}`);
      }

      setShowStrikeModal(false);
      setStrikeUserId("");
      setStrikeReason("");
      setStrikeEvidence("");
      loadAllData();
      
      // Reload live conversation details if open
      if (selectedChatId) {
        const res = await getLiveConversation({ data: { conversation_id: selectedChatId } });
        setLiveConvData(res);
        setLiveMessages(res.messages || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record moderation action.");
    } finally {
      setStrikeSubmitBusy(false);
    }
  };

  // Resolve / Dismiss chat reports
  const handleResolveReport = async (reportId: string, status: "resolved" | "dismissed", notes?: string) => {
    try {
      await resolveReport({
        data: {
          report_id: reportId,
          status,
          reviewed_by: auth.user?.id || "",
          review_notes: notes || "Resolved by moderator",
        },
      });
      toast.success(`Report marked as ${status}`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve report.");
    }
  };

  // Maintenance configurations
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceSubmitBusy(true);
    try {
      await updateMaintenanceMode({
        data: {
          is_enabled: maintenanceEnabled,
          message: maintenanceMsg,
          expected_back_at: maintenanceBackAt ? new Date(maintenanceBackAt).toISOString() : "",
          allowed_roles: maintenanceRoles,
          updated_by: auth.user?.id || "",
        },
      });
      toast.success("Maintenance configuration updated");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update maintenance settings");
    } finally {
      setMaintenanceSubmitBusy(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    if (maintenanceRoles.includes(role)) {
      setMaintenanceRoles(maintenanceRoles.filter((r) => r !== role));
    } else {
      setMaintenanceRoles([...maintenanceRoles, role]);
    }
  };

  const tabs = [
    { id: "monitor", label: "Live Monitoring", icon: Activity },
    { id: "flagged", label: "Flagged Chats", icon: MessageSquareWarning },
    { id: "queue", label: "Review Queue", icon: ClipboardCheck },
    { id: "events", label: "Fraud Events Feed", icon: AlertTriangle },
    { id: "health", label: "Platform Health", icon: HeartPulse },
  ];

  // Filtering conversations for search query
  const filteredMonitor = conversationsMonitor.filter((c) => {
    if (!searchFilter) return true;
    const query = searchFilter.toLowerCase();
    return (
      c.chat_number?.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.buyer?.display_name?.toLowerCase().includes(query) ||
      c.buyer?.username?.toLowerCase().includes(query) ||
      c.buyer?.email?.toLowerCase().includes(query) ||
      c.seller?.display_name?.toLowerCase().includes(query) ||
      c.seller?.username?.toLowerCase().includes(query) ||
      c.seller?.email?.toLowerCase().includes(query) ||
      c.subject?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Shield className="text-gold animate-pulse" size={24} /> Trust, Safety & Chat V2 Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time chat monitor, automated fraud diagnostics, sequential HX-CHAT display, and user disciplinary actions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAllData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface/30 hover:border-gold/40 hover:bg-gold/5 transition-all text-gold cursor-pointer"
            title="Refresh All Dashboard Telemetry"
          >
            <RefreshCw size={13} /> Refresh Console
          </button>
          <button
            onClick={() => {
              setStrikeUserId("");
              setStrikeReason("");
              setStrikeEvidence("");
              setStrikeActionType("warning");
              setShowStrikeModal(true);
            }}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all cursor-pointer border-none shadow-lg shadow-red-900/20"
          >
            Record Moderation Action
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const ActiveIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as Tab);
                setSelectedChatId(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === t.id
                  ? "border-gold text-gold bg-gold/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/20"
              }`}
            >
              <ActiveIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 text-gold animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Initializing anti-fraud metrics...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: LIVE MONITORING */}
          {activeTab === "monitor" && !selectedChatId && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by Chat ID, buyer/seller name, email, subject..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-surface/40 border border-border/60 rounded-xl outline-none focus:border-gold/50 placeholder:text-muted-foreground text-foreground"
                />
              </div>

              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-4 px-6 min-w-[130px]">Chat ID</th>
                      <th className="py-4 px-6 min-w-[180px]">Buyer Info</th>
                      <th className="py-4 px-6 min-w-[180px]">Seller Info</th>
                      <th className="py-4 px-6 min-w-[200px]">Subject</th>
                      <th className="py-4 px-6 min-w-[150px]">Order Status</th>
                      <th className="py-4 px-6 min-w-[80px]">Msgs</th>
                      <th className="py-4 px-6 min-w-[160px]">Risk Rating</th>
                      <th className="py-4 px-6 min-w-[120px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonitor.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                          No active escrow conversations found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMonitor.map((c) => {
                        let riskColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (c.risk_level === "warning") riskColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        if (c.risk_level === "high_risk" || c.risk_level === "high") riskColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        if (c.risk_level === "critical") riskColor = "bg-red-600/15 text-red-400 border-red-500/35 animate-pulse";

                        return (
                          <tr
                            key={c.id}
                            className="border-b border-border/40 hover:bg-surface/20 transition-all text-xs"
                          >
                            <td className="py-5 px-6 font-mono font-bold text-gold align-middle">
                              <div className="flex items-center gap-1.5">
                                <span>{c.chat_number || "HX-CHAT-NEW"}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(c.chat_number, "Chat ID");
                                  }}
                                  className="text-muted-foreground hover:text-gold bg-transparent border-none p-0.5 cursor-pointer"
                                  title="Copy Chat ID"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="py-5 px-6 align-middle">
                              <div className="font-semibold text-foreground">{c.buyer?.display_name || "Buyer"}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                <span className="font-mono">{c.buyer?.email}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(c.buyer_id, "Buyer UID");
                                  }}
                                  className="text-muted-foreground/60 hover:text-gold bg-transparent border-none p-0 cursor-pointer"
                                  title="Copy Buyer UID"
                                >
                                  <Copy size={9} />
                                </button>
                              </div>
                            </td>
                            <td className="py-5 px-6 align-middle">
                              <div className="font-semibold text-foreground">{c.seller?.display_name || "Seller"}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                <span className="font-mono">{c.seller?.email}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(c.seller_id, "Seller UID");
                                  }}
                                  className="text-muted-foreground/60 hover:text-gold bg-transparent border-none p-0 cursor-pointer"
                                  title="Copy Seller UID"
                                >
                                  <Copy size={9} />
                                </button>
                              </div>
                            </td>
                            <td className="py-5 px-6 align-middle font-medium text-foreground/80" title={c.subject}>
                              <div className="truncate max-w-[180px]">{c.subject}</div>
                            </td>
                            <td className="py-5 px-6 align-middle">
                              {c.order ? (
                                <div className="space-y-1">
                                  <span className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">{c.order.status}</span>
                                  <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1.5">
                                    <span className="font-mono font-semibold">#{c.order.order_number?.slice(0, 8)}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(c.order_id, "Order ID");
                                      }}
                                      className="text-muted-foreground/60 hover:text-gold bg-transparent border-none p-0 cursor-pointer"
                                      title="Copy Order ID"
                                    >
                                      <Copy size={9} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/60 italic text-[10px]">No Order Linked</span>
                              )}
                            </td>
                            <td className="py-5 px-6 align-middle">
                              <span className="bg-surface/60 border border-border/80 text-foreground/90 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
                                {c.message_count || 0}
                              </span>
                            </td>
                            <td className="py-5 px-6 align-middle">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider inline-flex items-center gap-1 ${riskColor}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                {c.risk_level || "safe"} ({c.risk_score || 0})
                              </span>
                            </td>
                            <td className="py-5 px-6 align-middle text-right">
                              <button
                                onClick={() => setSelectedChatId(c.id)}
                                className="px-3.5 py-2 rounded-xl bg-gold text-black hover:brightness-110 font-display text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-gold/10 hover:shadow-gold/20 border-none ml-auto"
                              >
                                <ExternalLink size={11} /> Live View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "flagged" && !selectedChatId && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto animate-in fade-in duration-200">
              <table className="w-full border-collapse text-left min-w-[1000px]">
                <thead>
                  <tr className="border-b border-border/80 bg-surface/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-4 px-6 min-w-[130px]">Conversation</th>
                    <th className="py-4 px-6 min-w-[180px]">Buyer</th>
                    <th className="py-4 px-6 min-w-[180px]">Seller</th>
                    <th className="py-4 px-6 min-w-[200px]">Flag Reason</th>
                    <th className="py-4 px-6 min-w-[160px]">Risk Rating</th>
                    <th className="py-4 px-6 min-w-[140px]">Audit Status</th>
                    <th className="py-4 px-6 min-w-[120px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedChats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                        No flagged messages detected. Chats are monitored automatically for external contacts or UPI sharing.
                      </td>
                    </tr>
                  ) : (
                    flaggedChats.map((c) => {
                      let riskColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                      if (c.risk_level === "medium") riskColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      if (c.risk_level === "high") riskColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      if (c.risk_level === "critical") riskColor = "bg-red-600/15 text-red-400 border-red-500/35 animate-pulse";

                      return (
                        <tr
                          key={c.id}
                          className="border-b border-border/40 hover:bg-surface/20 transition-all text-xs"
                        >
                          <td className="py-5 px-6 font-mono font-bold text-gold align-middle">
                            <div className="flex items-center gap-1.5">
                              <span>{c.chat_number || "HX-CHAT-NEW"}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(c.chat_number, "Chat ID");
                                }}
                                className="text-muted-foreground hover:text-gold bg-transparent border-none p-0.5 cursor-pointer"
                                title="Copy Chat ID"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="font-semibold text-foreground">{c.buyer?.display_name || "Buyer"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-1">{c.buyer?.email}</div>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="font-semibold text-foreground">{c.seller?.display_name || "Seller"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-1">{c.seller?.email}</div>
                          </td>
                          <td className="py-5 px-6 align-middle font-semibold text-rose-300" title={c.flag_reason}>
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <ShieldAlert size={13} className="text-rose-400 shrink-0" />
                              <span className="truncate">{c.flag_reason}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider inline-flex items-center gap-1 ${riskColor}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {c.risk_level} ({c.risk_score || 0})
                            </span>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border inline-block ${
                                c.status === "pending_review"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                  : c.status === "resolved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                              }`}
                            >
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-5 px-6 align-middle text-right">
                            <button
                              onClick={() => setSelectedChatId(c.conversation_id || c.id)}
                              className="px-3.5 py-2 rounded-xl bg-gold text-black hover:brightness-110 font-display text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-gold/10 hover:shadow-gold/20 border-none ml-auto"
                            >
                              <ExternalLink size={11} /> Investigate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: REVIEW QUEUE */}
          {activeTab === "queue" && !selectedChatId && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Reported conversations */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Reported Escrow Chats
                </h3>
                <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto">
                  <table className="w-full border-collapse text-left min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-border/80 bg-surface/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <th className="py-4 px-6 min-w-[130px]">Chat ID</th>
                        <th className="py-4 px-6 min-w-[220px]">Report Reason</th>
                        <th className="py-4 px-6 min-w-[180px]">Reporter</th>
                        <th className="py-4 px-6 min-w-[160px]">Risk Rating</th>
                        <th className="py-4 px-6 min-w-[150px]">Created At</th>
                        <th className="py-4 px-6 min-w-[180px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQueue.reports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                            No active tickets or conversation reports pending review.
                          </td>
                        </tr>
                      ) : (
                        reviewQueue.reports.map((r) => {
                          const conv = r.conversation || {};
                          let riskColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          if (conv.risk_level === "warning") riskColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                          if (conv.risk_level === "high_risk" || conv.risk_level === "high") riskColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                          if (conv.risk_level === "critical") riskColor = "bg-red-600/15 text-red-400 border-red-500/35 animate-pulse";

                          return (
                            <tr key={r.id} className="border-b border-border/40 hover:bg-surface/20 transition-all text-xs">
                              <td className="py-5 px-6 font-mono font-bold text-gold align-middle">
                                {r.chat_number || conv.chat_number || "HX-CHAT-NEW"}
                              </td>
                              <td className="py-5 px-6 align-middle">
                                <div className="font-semibold text-rose-300 max-w-[200px] truncate" title={r.reason}>{r.reason}</div>
                                {r.additional_notes && (
                                  <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[200px] italic" title={r.additional_notes}>
                                    "{r.additional_notes}"
                                  </div>
                                )}
                              </td>
                              <td className="py-5 px-6 align-middle">
                                <div className="font-semibold">{r.reporter?.display_name || "User"}</div>
                                <div className="text-[9px] text-muted-foreground font-mono mt-1">{r.reporter?.email}</div>
                              </td>
                              <td className="py-5 px-6 align-middle">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider inline-flex items-center gap-1 ${riskColor}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                  {conv.risk_level || "safe"} ({conv.risk_score || 0})
                                </span>
                              </td>
                              <td className="py-5 px-6 align-middle font-mono text-[10px] text-muted-foreground">
                                {new Date(r.created_at).toLocaleString()}
                              </td>
                              <td className="py-5 px-6 align-middle text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleResolveReport(r.id, "dismissed")}
                                    className="px-3 py-2 rounded-xl bg-surface/50 hover:bg-surface border border-border text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    onClick={() => setSelectedChatId(r.conversation_id)}
                                    className="px-3.5 py-2 rounded-xl bg-gold text-black hover:brightness-110 font-display text-[9px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-gold/10 border-none"
                                  >
                                    <ExternalLink size={10} /> Live Audit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FRAUD EVENTS FEED */}
          {activeTab === "events" && !selectedChatId && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto animate-in fade-in duration-200">
              <table className="w-full border-collapse text-left min-w-[1000px]">
                <thead>
                  <tr className="border-b border-border/80 bg-surface/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-4 px-6 min-w-[130px]">Chat ID</th>
                    <th className="py-4 px-6 min-w-[180px]">User</th>
                    <th className="py-4 px-6 min-w-[150px]">Violation Type</th>
                    <th className="py-4 px-6 min-w-[140px]">Pattern Matched</th>
                    <th className="py-4 px-6 min-w-[200px]">Message Preview</th>
                    <th className="py-4 px-6 min-w-[120px]">Tier / Conf</th>
                    <th className="py-4 px-6 min-w-[120px] text-right">Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                        No automated fraud detection events logged in database.
                      </td>
                    </tr>
                  ) : (
                    fraudEvents.map((e) => {
                      let tierColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                      if (e.risk_tier === "warning") tierColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      if (e.risk_tier === "high_risk" || e.risk_tier === "high") tierColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      if (e.risk_tier === "critical") tierColor = "bg-red-600/15 text-red-400 border-red-500/35 animate-pulse";

                      return (
                        <tr key={e.id} className="border-b border-border/40 hover:bg-surface/20 transition-all text-xs">
                          <td className="py-5 px-6 font-mono font-bold text-gold align-middle">
                            {e.chat_number || e.conversation?.chat_number || "HX-CHAT-NEW"}
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="font-semibold">{e.user?.display_name || "User"}</div>
                            <div className="text-[9px] text-muted-foreground font-mono mt-1">{e.user?.email}</div>
                          </td>
                          <td className="py-5 px-6 align-middle font-semibold text-rose-300 text-[10px] uppercase font-mono">{e.detection_type}</td>
                          <td className="py-5 px-6 align-middle font-medium text-amber-300 font-mono text-[10px]">{e.matched_pattern || "n/a"}</td>
                          <td className="py-5 px-6 align-middle text-muted-foreground italic" title={e.message_preview}>
                            <div className="truncate max-w-[180px]">
                              "{e.message_preview || "No message body preview"}"
                            </div>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="space-y-1">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider inline-flex items-center gap-1 ${tierColor}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                {e.risk_tier}
                              </span>
                              <div className="text-[9px] text-muted-foreground font-mono mt-1.5">
                                Conf: {((e.confidence_score || 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6 align-middle text-right">
                            <button
                              onClick={() => setSelectedChatId(e.conversation_id)}
                              className="px-3.5 py-2 rounded-xl bg-gold text-black hover:brightness-110 font-display text-[9px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-gold/10 border-none ml-auto"
                            >
                              <ExternalLink size={10} /> Live Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: PLATFORM HEALTH SNAPSHOT & MAINTENANCE */}
          {activeTab === "health" && health && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Upgraded Anti-Fraud Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Total Chats", count: health.total_chats, alert: false },
                  { label: "Active Live Chats", count: health.active_chats, alert: false },
                  { label: "Reported Conversations", count: health.reported_chats, alert: health.reported_chats > 0 },
                  { label: "Flagged Chats", count: health.flagged_chats, alert: health.flagged_chats > 0 },
                  { label: "Moderation Backlog", count: health.moderation_backlog, alert: health.moderation_backlog > 0 },
                  { label: "Active Disputes", count: health.open_disputes, alert: health.open_disputes > 0 },
                  { label: "Unverified Sellers", count: health.pending_verifications, alert: health.pending_verifications > 15 },
                  { label: "Pending Withdrawals", count: health.pending_withdrawals, alert: health.pending_withdrawals > 0 },
                  { label: "Open Support Tickets", count: health.open_support_tickets, alert: health.open_support_tickets > 5 },
                  { label: "High Risk Chats", count: health.high_risk_chats, alert: health.high_risk_chats > 0 },
                  { label: "Fraud Attempts Today", count: health.fraud_attempts_today, alert: health.fraud_attempts_today > 0 },
                  { label: "UPI Sharing Blocked", count: health.upi_sharing_today || 0, alert: false },
                  { label: "Contact Sharing Flagged", count: health.contact_sharing_today || 0, alert: false },
                  { label: "Active Restrictions", count: health.account_restrictions, alert: false },
                  { label: "Suspended Accounts", count: health.suspended_users, alert: false },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden flex flex-col justify-between h-28 hover:border-gold/30 transition-all shadow-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">{item.label}</span>
                    <div className="flex items-baseline justify-between pt-4">
                      <span className={`text-3xl font-extrabold font-display ${item.alert ? "text-rose-400" : "text-gold"}`}>
                        {item.count}
                      </span>
                      {item.alert && (
                        <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Maintenance Mode Configuration */}
              <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 max-w-2xl">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Activity size={18} className="text-gold" />
                  <h3 className="font-display font-semibold text-sm">Maintenance Mode Override Controller</h3>
                </div>

                <form onSubmit={handleSaveMaintenance} className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/20">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Activate Maintenance Mode</span>
                      <p className="text-[10px] text-muted-foreground">Blocks public access to site endpoints immediately.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                      className="text-gold hover:text-gold/80 transition-all cursor-pointer border-none bg-transparent animate-in"
                    >
                      {maintenanceEnabled ? <ToggleRight size={36} className="text-gold" /> : <ToggleLeft size={36} className="text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Public Maintenance Message</label>
                    <input
                      type="text"
                      required
                      value={maintenanceMsg}
                      onChange={(e) => setMaintenanceMsg(e.target.value)}
                      placeholder="e.g. HUXZAIN is under scheduled security maintenance. We will return shortly."
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Expected Back Time</label>
                      <input
                        type="datetime-local"
                        value={maintenanceBackAt}
                        onChange={(e) => setMaintenanceBackAt(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Bypass Whitelisted Roles</label>
                      <div className="flex gap-4 pt-1">
                        {["admin", "super_admin", "owner"].map((role) => {
                          const checked = maintenanceRoles.includes(role);
                          return (
                            <div key={role} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                id={`maint-${role}`}
                                checked={checked}
                                onChange={() => handleRoleToggle(role)}
                                className="accent-gold cursor-pointer"
                              />
                              <label htmlFor={`maint-${role}`} className="capitalize select-none cursor-pointer">
                                {role.replace(/_/g, " ")}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={maintenanceSubmitBusy}
                    className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {maintenanceSubmitBusy ? "Saving Settings..." : "Save Maintenance Config"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* REALTIME LIVE CONVERSATION VIEWER (INLINE SPLIT VIEW) */}
          {selectedChatId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              
              {/* Chat Transcript Box */}
              <div className="lg:col-span-2 rounded-3xl border border-border bg-surface/40 p-6 flex flex-col justify-between h-[65vh] shadow-xl">
                <div className="flex justify-between items-center border-b border-border/60 pb-3 shrink-0">
                  <div>
                    <h3 className="font-display font-bold text-sm text-gold flex items-center gap-1.5">
                      <Activity size={16} /> Live Transcript Audit Feed
                    </h3>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      ID: {liveConvData?.conversation?.chat_number || "n/a"} • Order status: {liveConvData?.conversation?.order?.status || "None"}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChatId(null)}
                    className="px-3 py-1.5 rounded-xl border border-border hover:border-gold/50 text-xs uppercase font-bold hover:text-gold cursor-pointer transition-all active:scale-95 bg-transparent"
                  >
                    Close Viewer
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2 scrollbar-thin scroll-smooth">
                  {viewerLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="size-6 text-gold animate-spin" />
                    </div>
                  ) : liveMessages.length === 0 ? (
                    <div className="text-center py-20 text-xs text-muted-foreground">No messages sent in this channel yet.</div>
                  ) : (
                    liveMessages.map((m: any) => {
                      const isSellerMsg = m.sender_id === liveConvData?.conversation?.seller_id;
                      const isSystem = m.is_system;

                      if (isSystem) {
                        return (
                          <div key={m.id} className="mx-auto my-2 p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300 text-[10px] text-center font-mono max-w-md">
                            ⚠️ {m.body}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl border max-w-md space-y-1 ${
                            isSellerMsg
                              ? "bg-gold/5 border-gold/15 ml-auto text-right rounded-tr-none"
                              : "bg-surface/20 border-border/60 mr-auto text-left rounded-tl-none"
                          }`}
                        >
                          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 justify-between">
                            <span className="font-semibold text-gold">{isSellerMsg ? "Seller" : "Buyer"}</span>
                            <span className="font-mono text-[8px] text-muted-foreground/60">{new Date(m.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed">
                            {m.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                  <div ref={viewerMessagesEndRef} />
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4 shrink-0 text-[10px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>UUID:</span>
                    <span className="text-foreground">{liveConvData?.conversation?.id}</span>
                  </div>
                  {liveConvData?.conversation?.risk_score !== undefined && (
                    <div className="flex items-center gap-1">
                      <span>Conv Risk:</span>
                      <strong className="text-rose-400 font-bold">{liveConvData.conversation.risk_score}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Auditor Judgement & Quick Action Panel */}
              <div className="lg:col-span-1 rounded-3xl border border-border bg-surface/40 p-6 space-y-6 h-fit shadow-xl">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <Scale size={16} className="text-gold animate-bounce" /> Auditor Action Console
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Take disciplinary actions based on chat violations.</p>
                </div>

                {/* Account Profile Quick Audits */}
                <div className="space-y-3 text-xs bg-surface/10 p-3.5 rounded-2xl border border-border/60">
                  <div className="font-bold text-foreground/90 border-b border-border/40 pb-1.5 uppercase text-[10px] tracking-wider">Target Profiles</div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between font-semibold">
                        <span>Buyer: {liveConvData?.conversation?.buyer?.display_name || "n/a"}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Strikes: {liveConvData?.conversation?.buyer?.strikes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-muted-foreground">
                        <span className="truncate">{liveConvData?.conversation?.buyer_id || "n/a"}</span>
                        <button onClick={() => copyToClipboard(liveConvData?.conversation?.buyer_id, "Buyer UID")} className="hover:text-gold bg-transparent border-none p-0 cursor-pointer"><Copy size={10} /></button>
                      </div>
                    </div>

                    <div className="h-px bg-border/40 my-2" />

                    <div>
                      <div className="flex justify-between font-semibold">
                        <span>Seller: {liveConvData?.conversation?.seller?.display_name || "n/a"}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Strikes: {liveConvData?.conversation?.seller?.strikes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-muted-foreground">
                        <span className="truncate">{liveConvData?.conversation?.seller_id || "n/a"}</span>
                        <button onClick={() => copyToClipboard(liveConvData?.conversation?.seller_id, "Seller UID")} className="hover:text-gold bg-transparent border-none p-0 cursor-pointer"><Copy size={10} /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit quick actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      if (liveConvData) {
                        setStrikeUserId(liveConvData.conversation.seller_id);
                        setStrikeReason("Off-platform contact/payment solicitation in chat");
                        setStrikeActionType("strike");
                        setShowStrikeModal(true);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-primary-foreground font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none shadow-md shadow-amber-900/10 flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert size={14} /> Moderate Seller
                  </button>

                  <button
                    onClick={() => {
                      if (liveConvData) {
                        setStrikeUserId(liveConvData.conversation.buyer_id);
                        setStrikeReason("Soliciting off-platform details or direct payments");
                        setStrikeActionType("strike");
                        setShowStrikeModal(true);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert size={14} /> Moderate Buyer
                  </button>

                  {liveConvData?.reports?.some(r => r.status === "open") && (
                    <button
                      onClick={() => {
                        const openReport = liveConvData?.reports?.find(r => r.status === "open");
                        if (openReport) {
                          handleResolveReport(openReport.id, "resolved", "Resolved in live monitoring investigation.");
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none shadow-md"
                    >
                      Resolve Open Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DISCIPLINARY ACTION STRIKE MODAL */}
      {showStrikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleIssueStrike}
            className="relative w-full max-w-lg bg-[#0A0A0A] border border-border/80 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2 text-red-500">
                <AlertTriangle className="animate-pulse" size={16} /> Issue Disciplinary Strike / Ban
              </h3>
              <button
                type="button"
                onClick={() => setShowStrikeModal(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer bg-surface/10"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Target User UUID</label>
              <input
                type="text"
                required
                value={strikeUserId}
                onChange={(e) => setStrikeUserId(e.target.value)}
                placeholder="Paste account UUID of buyer/seller..."
                className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Disciplines Enforcement</label>
                <select
                  value={strikeActionType}
                  onChange={(e: any) => setStrikeActionType(e.target.value)}
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground cursor-pointer"
                >
                  <option value="warning">Issue Warning (No Strike)</option>
                  <option value="strike">Issue Strike (+1 Strike)</option>
                  <option value="mute">Mute Chat</option>
                  <option value="suspend">Suspend Account</option>
                  <option value="ban">Permanent Ban</option>
                  <option value="unban">Lift Restrictions / Unban</option>
                  <option value="strike_removal">Remove Strike (-1 Strike)</option>
                </select>
              </div>

              {strikeActionType === "mute" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mute Duration</label>
                  <select
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground cursor-pointer"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="1440">24 Hours</option>
                    <option value="10080">7 Days</option>
                    <option value="43200">30 Days</option>
                  </select>
                </div>
              )}

              {strikeActionType === "suspend" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Suspension Duration</label>
                  <select
                    value={suspendDuration}
                    onChange={(e) => setSuspendDuration(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground cursor-pointer"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>
              )}

              {strikeActionType !== "mute" && strikeActionType !== "suspend" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Policy Violation Code</label>
                  <input
                    type="text"
                    required
                    value={strikeReason}
                    onChange={(e) => setStrikeReason(e.target.value)}
                    placeholder="e.g. UPI evasion / Direct deals"
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                  />
                </div>
              )}
            </div>

            {(strikeActionType === "mute" || strikeActionType === "suspend") && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Policy Violation Code</label>
                <input
                  type="text"
                  required
                  value={strikeReason}
                  onChange={(e) => setStrikeReason(e.target.value)}
                  placeholder="e.g. UPI evasion / Direct deals"
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Audit Evidence / Chat References</label>
              <textarea
                rows={4}
                value={strikeEvidence}
                onChange={(e) => setStrikeEvidence(e.target.value)}
                placeholder="Include chat messages, contact numbers shared, or transaction ID evidence..."
                className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowStrikeModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={strikeSubmitBusy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {strikeSubmitBusy ? "Enforcing..." : "Enforce Strike"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
