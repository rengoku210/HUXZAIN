import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
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
} from "lucide-react";
import {
  getFlaggedChats,
  reviewFlaggedChat,
  updateFlaggedChatStatus,
  getSecurityIncidents,
  resolveSecurityIncident,
} from "@/lib/admin/chats.functions";
import {
  getPlatformHealthSnapshot,
  getMaintenanceMode,
  updateMaintenanceMode,
  issueWarning,
} from "@/lib/admin/warnings.functions";

export const Route = createFileRoute("/_authenticated/admin/chats")({
  head: () => ({ meta: [{ title: "Anti-Fraud & Chat Monitor — HUXZAIN Admin" }] }),
  component: AntiFraudAndChatMonitor,
});

type Tab = "flagged" | "security" | "health";

function AntiFraudAndChatMonitor() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("flagged");
  const [loading, setLoading] = useState(true);

  // Data States
  const [flaggedChats, setFlaggedChats] = useState<any[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);

  // Flagged Chat Review panel states
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [reviewedChat, setReviewedChat] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitBusy, setReviewSubmitBusy] = useState(false);

  // Warning Overlay States
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningUserId, setWarningUserId] = useState("");
  const [warningReason, setWarningReason] = useState("");
  const [warningDetails, setWarningDetails] = useState("");
  const [warningAction, setWarningAction] = useState("warning");
  const [warningSubmitBusy, setWarningSubmitBusy] = useState(false);

  // Maintenance form states
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [maintenanceBackAt, setMaintenanceBackAt] = useState("");
  const [maintenanceRoles, setMaintenanceRoles] = useState<string[]>([]);
  const [maintenanceSubmitBusy, setMaintenanceSubmitBusy] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [chats, incidents, healthRes, maint] = await Promise.all([
        getFlaggedChats(),
        getSecurityIncidents(),
        getPlatformHealthSnapshot(),
        getMaintenanceMode(),
      ]);

      setFlaggedChats(chats || []);
      setSecurityIncidents(incidents || []);
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
      toast.error("Failed to load anti-fraud monitoring telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleReviewChat = async (id: string) => {
    setReviewLoading(true);
    setSelectedChatId(id);
    setReviewedChat(null);
    try {
      const data = await reviewFlaggedChat({ data: { id } });
      setReviewedChat(data);
      setReviewNotes(data.review_notes || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to load flagged chat logs");
      setSelectedChatId(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleResolveFlaggedChat = async (status: string) => {
    if (!selectedChatId) return;
    setReviewSubmitBusy(true);
    try {
      await updateFlaggedChatStatus({
        data: {
          id: selectedChatId,
          status,
          review_notes: reviewNotes,
          reviewed_by: auth.user?.id || "",
        },
      });
      toast.success(`Flagged chat marked as ${status}`);
      setSelectedChatId(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve chat review");
    } finally {
      setReviewSubmitBusy(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await resolveSecurityIncident({
        data: {
          id: incidentId,
          resolved_by: auth.user?.id || "",
        },
      });
      toast.success("Security incident marked resolved");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve incident");
    }
  };

  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningUserId || !warningReason) {
      toast.error("User ID and Reason are required");
      return;
    }
    setWarningSubmitBusy(true);
    try {
      await issueWarning({
        data: {
          user_id: warningUserId,
          reason: warningReason,
          details: warningDetails,
          action_taken: warningAction,
          issued_by: auth.user?.id || "",
        },
      });
      toast.success(`Action "${warningAction}" issued to user successfully!`);
      setShowWarningModal(false);
      setWarningUserId("");
      setWarningReason("");
      setWarningDetails("");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue warning strike");
    } finally {
      setWarningSubmitBusy(false);
    }
  };

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
    { id: "flagged", label: "Flagged Conversations", icon: MessageSquareWarning },
    { id: "security", label: "Threat Events", icon: Shield },
    { id: "health", label: "Platform Health", icon: HeartPulse },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <MessageSquareWarning className="text-gold" size={24} /> Anti-Fraud & Chat Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review automatically flagged deal chats, audit intrusion alarms, issue strikes, and configure maintenance modes.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowWarningModal(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all cursor-pointer border-none"
          >
            Issue Strike / Ban
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
          <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Initializing anti-fraud console...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* FLAGGED CONVERSATIONS TAB */}
          {activeTab === "flagged" && !selectedChatId && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 font-bold">Buyer</th>
                    <th className="p-4 font-bold">Seller</th>
                    <th className="p-4 font-bold">Trigger Reason</th>
                    <th className="p-4 font-bold">Risk Rating</th>
                    <th className="p-4 font-bold">Audit Status</th>
                    <th className="p-4 font-bold">Flagged At</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedChats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
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
                          onClick={() => handleReviewChat(c.id)}
                          className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs cursor-pointer"
                        >
                          <td className="p-4 font-semibold">
                            {c.buyer?.display_name || "Buyer"}
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.buyer?.email}</div>
                          </td>
                          <td className="p-4 font-semibold">
                            {c.seller?.display_name || "Seller"}
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.seller?.email}</div>
                          </td>
                          <td className="p-4 font-medium text-gold">{c.flag_reason}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${riskColor}`}>
                              {c.risk_level} (Score: {c.risk_score})
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
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
                          <td className="p-4 text-muted-foreground font-mono text-[10px]">
                            {new Date(c.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* FLAGGED REVIEW SUB-PANEL */}
          {activeTab === "flagged" && selectedChatId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Chat Transcript Box */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/40 p-6 flex flex-col justify-between h-[65vh]">
                <div className="flex justify-between items-center border-b border-border/60 pb-3 shrink-0">
                  <h3 className="font-display font-semibold text-sm">Flagged Messages Audit Stream</h3>
                  <button
                    onClick={() => setSelectedChatId(null)}
                    className="px-2 py-1 rounded border border-border text-[9px] uppercase font-bold hover:text-gold cursor-pointer"
                  >
                    Back to Feed
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                  {reviewLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="size-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : reviewedChat && Array.isArray(reviewedChat.flagged_messages) ? (
                    reviewedChat.flagged_messages.map((m: any, idx: number) => {
                      const isSellerMsg = m.sender_id === reviewedChat.seller_id;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border max-w-lg space-y-1 ${
                            isSellerMsg
                              ? "bg-gold/5 border-gold/15 ml-auto text-right"
                              : "bg-surface/20 border-border/60 mr-auto text-left"
                          }`}
                        >
                          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                            {isSellerMsg ? "Seller" : "Buyer"} • {new Date(m.timestamp).toLocaleTimeString()}
                          </div>
                          <p className="text-xs text-foreground font-medium whitespace-pre-wrap leading-relaxed">
                            {m.content}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-xs text-muted-foreground">No message snippet available.</div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4 shrink-0 text-xs font-mono text-muted-foreground">
                  <span>Chat UUID: {reviewedChat?.conversation_id || "n/a"}</span>
                  <span>Flag Reason: <strong className="text-gold">{reviewedChat?.flag_reason}</strong></span>
                </div>
              </div>

              {/* Review Judgement Panel */}
              <div className="lg:col-span-1 rounded-2xl border border-border bg-surface/40 p-6 space-y-4 h-fit">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2 border-b border-border/60 pb-3">
                  <ClipboardCheck size={16} className="text-gold" /> Auditor Judgement Panel
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Review Action Notes</label>
                  <textarea
                    rows={5}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Document why these messages were flagged and details of the action taken..."
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={reviewSubmitBusy}
                    onClick={() => handleResolveFlaggedChat("resolved")}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    Resolve (No Warning)
                  </button>
                  <button
                    disabled={reviewSubmitBusy}
                    onClick={() => {
                      if (reviewedChat) {
                        setWarningUserId(reviewedChat.seller_id);
                        setWarningReason(`Chat violation flag: ${reviewedChat.flag_reason}`);
                        setShowWarningModal(true);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-primary-foreground font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    Escalate & Issue Strike
                  </button>
                  <button
                    disabled={reviewSubmitBusy}
                    onClick={() => handleResolveFlaggedChat("ignored")}
                    className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface/60 border border-border text-muted-foreground text-xs font-semibold tracking-wider uppercase active:scale-95 transition-all cursor-pointer"
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* THREAT EVENTS TAB */}
          {activeTab === "security" && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 font-bold">User</th>
                    <th className="p-4 font-bold">Incident Type</th>
                    <th className="p-4 font-bold">Severity</th>
                    <th className="p-4 font-bold">IP Address</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {securityIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                        No security incidents flagged in the last 100 logins/operations.
                      </td>
                    </tr>
                  ) : (
                    securityIncidents.map((s) => {
                      let severityColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                      if (s.severity === "high" || s.severity === "critical") severityColor = "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse";

                      return (
                        <tr key={s.id} className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs">
                          <td className="p-4">
                            {s.profiles ? (
                              <div>
                                <div className="font-semibold">{s.profiles.display_name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">@{s.profiles.username}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Anonymous Client</span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-semibold text-gold text-[10px] uppercase">
                            {s.incident_type}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${severityColor}`}>
                              {s.severity}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-muted-foreground text-[10px]">{s.ip_address || "Unknown"}</td>
                          <td className="p-4">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                s.resolved
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {s.resolved ? "Resolved" : "Unresolved"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {!s.resolved && (
                              <button
                                onClick={() => handleResolveIncident(s.id)}
                                className="px-2.5 py-1 rounded bg-surface hover:bg-surface/60 border border-border text-[9px] font-bold uppercase tracking-wider text-gold active:scale-95 transition-all cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PLATFORM HEALTH SNAPSHOT & MAINTENANCE */}
          {activeTab === "health" && health && (
            <div className="space-y-6">
              {/* Health Grid Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Active Disputes", count: health.open_disputes, alert: health.open_disputes > 0 },
                  { label: "Unverified Sellers", count: health.pending_verifications, alert: health.pending_verifications > 15 },
                  { label: "Pending Withdrawals", count: health.pending_withdrawals, alert: health.pending_withdrawals > 0 },
                  { label: "Open Tickets", count: health.open_support_tickets, alert: health.open_support_tickets > 5 },
                  { label: "Suspended Accounts", count: health.suspended_users, alert: false },
                  { label: "Flagged Chat Review", count: health.pending_flagged_chats, alert: health.pending_flagged_chats > 0 },
                  { label: "Users Trust < 30", count: health.low_trust_users, alert: health.low_trust_users > 0 },
                  { label: "Active System Alerts", count: health.active_emergency_alerts, alert: health.active_emergency_alerts > 0 },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden flex flex-col justify-between h-28">
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
                      className="text-gold hover:text-gold/80 transition-all cursor-pointer border-none bg-transparent"
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
        </div>
      )}

      {/* WARNING STRIKE STRIKER MODAL OVERLAY */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleIssueWarning}
            className="relative w-full max-w-lg bg-[#0A0A0A] border border-border/80 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 text-red-500">
                <AlertTriangle className="animate-pulse" size={16} /> Issue User Disciplinary Action
              </h3>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
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
                value={warningUserId}
                onChange={(e) => setWarningUserId(e.target.value)}
                placeholder="Paste user's auth account UUID here..."
                className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Action Type</label>
                <select
                  value={warningAction}
                  onChange={(e) => setWarningAction(e.target.value)}
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                >
                  <option value="warning">Official Warning</option>
                  <option value="restriction">Trading Restriction</option>
                  <option value="suspension">Temporary Account Suspension</option>
                  <option value="ban">Permanent Platform Ban</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Violation Reason</label>
                <input
                  type="text"
                  required
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="e.g. Sharing contact info in chat"
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Details / Explanatory Evidence</label>
              <textarea
                rows={4}
                value={warningDetails}
                onChange={(e) => setWarningDetails(e.target.value)}
                placeholder="Include transcript segments, UPI handles shared, or listing IDs that violated policies..."
                className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-gold text-foreground"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={warningSubmitBusy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {warningSubmitBusy ? "Issuing..." : "Confirm Action"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
