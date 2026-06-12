import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Globe,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Eye,
  RefreshCw,
  Download,
  Lock,
  Smartphone,
  Flag,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/security-logs")({
  head: () => ({ meta: [{ title: "Security Logs — HUXZAIN Admin" }] }),
  component: SecurityLogsPage,
});

interface SecurityEvent {
  id: string;
  user_id?: string;
  user_email?: string;
  event_type: string;
  ip_address?: string;
  location?: string;
  device?: string;
  description: string;
  risk_level: "low" | "medium" | "high" | "critical";
  status: "open" | "reviewed" | "resolved" | "escalated";
  created_at: string;
}

const RISK_CONFIG = {
  low: { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "text-amber-400", bg: "bg-amber-500/10" },
  reviewed: { label: "Reviewed", color: "text-blue-400", bg: "bg-blue-500/10" },
  resolved: { label: "Resolved", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  escalated: { label: "Escalated", color: "text-red-400", bg: "bg-red-500/10" },
};

const MOCK_EVENTS: SecurityEvent[] = [
  {
    id: "sec_001",
    user_email: "unknown@attacker.ru",
    event_type: "Multiple Failed Logins",
    ip_address: "185.220.101.52",
    location: "Russia (Tor Exit Node)",
    device: "Unknown",
    description: "15 failed login attempts on seller account within 3 minutes",
    risk_level: "critical",
    status: "open",
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "sec_002",
    user_id: "usr_abc",
    user_email: "buyer123@gmail.com",
    event_type: "Suspicious Login Location",
    ip_address: "103.55.8.201",
    location: "Mumbai, Maharashtra",
    device: "Chrome 120 / Windows",
    description: "User logged in from new location after 45 days of inactivity",
    risk_level: "medium",
    status: "reviewed",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "sec_003",
    user_email: "scam_seller@temp.com",
    event_type: "Repeated Verification Failure",
    ip_address: "47.91.88.104",
    location: "China",
    device: "Firefox / Linux",
    description: "KYC verification failed 5 times with different ID documents",
    risk_level: "high",
    status: "escalated",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "sec_004",
    user_id: "usr_def",
    user_email: "user456@gmail.com",
    event_type: "Fraud Report",
    ip_address: "49.204.12.80",
    location: "Delhi, India",
    device: "Safari / iOS",
    description: "User reported by 3 different buyers for non-delivery fraud",
    risk_level: "high",
    status: "open",
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: "sec_005",
    user_id: "usr_ghi",
    user_email: "seller_pro@huxzain.com",
    event_type: "Account Takeover Attempt",
    ip_address: "91.108.56.122",
    location: "Ukraine",
    device: "Chrome / Android",
    description: "Password reset requested from unknown device; original user flagged unusual activity",
    risk_level: "critical",
    status: "open",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "sec_006",
    user_email: "bot_123@test.com",
    event_type: "Rate Limit Exceeded",
    ip_address: "192.241.210.100",
    location: "USA",
    device: "Python Requests",
    description: "API endpoint /api/listings hit 500+ times per minute from single IP",
    risk_level: "high",
    status: "resolved",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: "sec_007",
    user_id: "usr_jkl",
    user_email: "newuser@gmail.com",
    event_type: "Suspicious Payment Activity",
    ip_address: "103.101.166.40",
    location: "Bengaluru, Karnataka",
    device: "Chrome / Windows",
    description: "User made 8 orders in 30 minutes using different payment proofs",
    risk_level: "medium",
    status: "reviewed",
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
];

function SecurityLogsPage() {
  const { hasAnyRole } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const fetchSecurityIncidents = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("security_incidents")
        .select("*, profiles(display_name, email)")
        .order("created_at", { ascending: false })
        .limit(150);

      if (error) throw error;

      if (data && data.length > 0) {
        setEvents(
          data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            user_email: row.profiles?.email || row.details?.email || "unknown@user.com",
            event_type: row.incident_type === 'failed_login' ? 'Multiple Failed Logins'
                      : row.incident_type === 'suspicious_location' ? 'Suspicious Login Location'
                      : row.incident_type === 'verification_failure' ? 'Repeated Verification Failure'
                      : row.incident_type === 'fraud_report' ? 'Fraud Report'
                      : row.incident_type === 'account_takeover' ? 'Account Takeover Attempt'
                      : row.incident_type === 'brute_force' ? 'Brute Force Attempt'
                      : row.incident_type === 'ip_anomaly' ? 'IP Anomaly Detected'
                      : row.incident_type,
            ip_address: row.ip_address,
            location: row.details?.location || "Unknown",
            device: row.details?.device || "Unknown",
            description: row.details?.description || `Security incident of type ${row.incident_type}`,
            risk_level: row.severity || "medium",
            status: row.resolved ? "resolved" : "open",
            created_at: row.created_at,
          }))
        );
      }
    } catch (err: any) {
      console.error("Failed to fetch security incidents from DB:", err);
      // Keep MOCK_EVENTS as fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSecurityIncidents();
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      e.ip_address?.includes(search) ||
      e.description.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === "all" || e.risk_level === filterRisk;
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchRisk && matchStatus;
  });

  const stats = {
    total: events.length,
    critical: events.filter((e) => e.risk_level === "critical").length,
    high: events.filter((e) => e.risk_level === "high").length,
    open: events.filter((e) => e.status === "open").length,
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  async function handleUpdateStatus(id: string, newStatus: SecurityEvent["status"]) {
    const sb = getSupabase();
    if (!sb) return;

    try {
      const resolved = newStatus === "resolved";
      
      // Update in Supabase (if it's a real DB record)
      if (!id.startsWith("sec_")) {
        const { error } = await sb
          .from("security_incidents")
          .update({
            resolved,
            resolved_by: (await sb.auth.getUser()).data.user?.id || null,
          })
          .eq("id", id);
          
        if (error) throw error;
      }
      
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
      if (selectedEvent?.id === id) {
        setSelectedEvent((prev) => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success(`Incident status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(`Failed to update incident: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="size-6 text-red-400" />
            Security Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor security incidents, suspicious activity and threat intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="security-export-btn"
            className="h-9 px-4 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
          >
            <Download className="size-3.5" />
            Export
          </button>
          <button
            id="security-refresh-btn"
            onClick={() => window.location.reload()}
            className="h-9 px-4 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.critical > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="size-5 text-red-400 shrink-0 animate-pulse" />
          <div className="flex-1">
            <div className="text-sm font-bold text-red-400">
              {stats.critical} Critical Security Event{stats.critical > 1 ? "s" : ""} Require Immediate Attention
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Review and resolve critical threats as soon as possible.
            </div>
          </div>
          <button
            className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
            onClick={() => setFilterRisk("critical")}
          >
            View Critical
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: stats.total, icon: ShieldAlert, color: "text-blue-400" },
          { label: "Critical Threats", value: stats.critical, icon: XCircle, color: "text-red-400" },
          { label: "High Risk", value: stats.high, icon: AlertTriangle, color: "text-orange-400" },
          { label: "Open Events", value: stats.open, icon: Flag, color: "text-amber-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface/40 p-4 flex items-center gap-3"
          >
            <s.icon className={`size-8 ${s.color} shrink-0`} />
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          <input
            id="security-search"
            type="text"
            placeholder="Search by event type, user, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          id="security-filter-risk"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground outline-none"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          id="security-filter-status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface/30 h-24 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface/30 py-16 text-center">
            <ShieldAlert className="size-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground font-medium">No security events found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map((event) => {
            const risk = RISK_CONFIG[event.risk_level];
            const status = STATUS_CONFIG[event.status];
            return (
              <div
                key={event.id}
                id={`security-event-${event.id}`}
                className={`rounded-xl border bg-surface/30 p-4 hover:bg-surface/50 cursor-pointer transition-all ${
                  event.risk_level === "critical"
                    ? "border-red-500/30"
                    : event.risk_level === "high"
                    ? "border-orange-500/20"
                    : "border-border"
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center shrink-0 ${risk.bg} ${risk.border} border`}
                    >
                      <ShieldAlert className={`size-5 ${risk.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{event.event_type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${risk.color} ${risk.bg} ${risk.border} border`}>
                          {risk.label} Risk
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {event.description}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {event.user_email && (
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {event.user_email}
                          </span>
                        )}
                        {event.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="size-3" />
                            {event.ip_address}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            📍 {event.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.status === "open" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(event.id, "reviewed"); }}
                          className="h-7 px-3 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                        >
                          Mark Reviewed
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(event.id, "escalated"); }}
                          className="h-7 px-3 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          Escalate
                        </button>
                      </>
                    )}
                    {event.status !== "resolved" && event.status !== "open" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(event.id, "resolved"); }}
                        className="h-7 px-3 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      className="h-7 px-3 rounded-lg text-xs font-medium border border-gold/20 text-gold hover:bg-gold/10 transition-all flex items-center gap-1"
                      id={`view-security-${event.id}`}
                    >
                      <Eye className="size-3" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-[#0f1012] border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-red-400" />
                <span className="font-semibold text-sm">Security Event Detail</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-base">{selectedEvent.event_type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RISK_CONFIG[selectedEvent.risk_level].color} ${RISK_CONFIG[selectedEvent.risk_level].bg} border ${RISK_CONFIG[selectedEvent.risk_level].border}`}>
                    {RISK_CONFIG[selectedEvent.risk_level].label} Risk
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedEvent.user_email && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">User</div>
                    <div className="font-semibold text-xs">{selectedEvent.user_email}</div>
                  </div>
                )}
                {selectedEvent.ip_address && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">IP Address</div>
                    <div className="font-mono text-xs">{selectedEvent.ip_address}</div>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Location</div>
                    <div className="text-xs">{selectedEvent.location}</div>
                  </div>
                )}
                {selectedEvent.device && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Device / Browser</div>
                    <div className="text-xs">{selectedEvent.device}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-4 flex gap-2 flex-wrap">
                {selectedEvent.status !== "resolved" && (
                  <button
                    onClick={() => { handleUpdateStatus(selectedEvent.id, "resolved"); setSelectedEvent(null); }}
                    className="h-9 px-4 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/30 transition-all"
                  >
                    Mark Resolved
                  </button>
                )}
                {selectedEvent.status === "open" && (
                  <button
                    onClick={() => { handleUpdateStatus(selectedEvent.id, "escalated"); setSelectedEvent(null); }}
                    className="h-9 px-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/30 transition-all"
                  >
                    Escalate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
