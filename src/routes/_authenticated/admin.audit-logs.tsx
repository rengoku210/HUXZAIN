import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  Search,
  Filter,
  ChevronDown,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  Globe,
  Package,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — HUXZAIN Admin" }] }),
  component: AuditLogsPage,
});

interface AuditLog {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  details?: Record<string, any>;
  created_at: string;
  severity?: "info" | "warning" | "critical";
}

const ACTION_COLORS: Record<string, string> = {
  login: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  logout: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  create: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  update: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  delete: "text-red-400 bg-red-500/10 border-red-500/20",
  approve: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  reject: "text-red-400 bg-red-500/10 border-red-500/20",
  suspend: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  ban: "text-red-500 bg-red-500/15 border-red-500/30",
  payment: "text-gold bg-gold/10 border-gold/20",
  withdrawal: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  dispute: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  refund: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  verification: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const SEVERITY_CONFIG = {
  info: { label: "Info", color: "text-blue-400", bg: "bg-blue-500/10" },
  warning: { label: "Warning", color: "text-amber-400", bg: "bg-amber-500/10" },
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10" },
};

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : "text-muted-foreground bg-surface border-border";
}

// Mock data for when Supabase table doesn't exist yet
const MOCK_LOGS: AuditLog[] = [
  {
    id: "1",
    user_id: "usr_001",
    user_email: "admin@huxzain.com",
    user_name: "Super Admin",
    action: "User Suspended",
    entity_type: "user",
    entity_id: "usr_123",
    ip_address: "192.168.1.1",
    details: { reason: "Violation of terms", target_user: "buyer_xyz" },
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    severity: "warning",
  },
  {
    id: "2",
    user_id: "usr_001",
    user_email: "admin@huxzain.com",
    user_name: "Super Admin",
    action: "Payment Approved",
    entity_type: "payment",
    entity_id: "pay_456",
    ip_address: "192.168.1.1",
    details: { amount: "₹2,500", order_id: "ORD-789" },
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    severity: "info",
  },
  {
    id: "3",
    user_id: "usr_002",
    user_email: "moderator@huxzain.com",
    user_name: "Moderator Team",
    action: "Listing Rejected",
    entity_type: "listing",
    entity_id: "lst_321",
    ip_address: "10.0.0.5",
    details: { reason: "Inappropriate content", listing_title: "Premium Account" },
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    severity: "warning",
  },
  {
    id: "4",
    user_id: "usr_001",
    user_email: "admin@huxzain.com",
    user_name: "Super Admin",
    action: "Withdrawal Approved",
    entity_type: "withdrawal",
    entity_id: "wth_654",
    ip_address: "192.168.1.1",
    details: { amount: "₹15,000", seller: "ProBoosters" },
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    severity: "info",
  },
  {
    id: "5",
    user_id: "usr_003",
    user_email: "staff@huxzain.com",
    user_name: "Support Staff",
    action: "Dispute Resolved",
    entity_type: "dispute",
    entity_id: "dsp_987",
    ip_address: "172.16.0.10",
    details: { resolution: "Refund issued", order_id: "ORD-456" },
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    severity: "info",
  },
  {
    id: "6",
    user_id: "usr_001",
    user_email: "admin@huxzain.com",
    user_name: "Super Admin",
    action: "User Banned",
    entity_type: "user",
    entity_id: "usr_bad1",
    ip_address: "192.168.1.1",
    details: { reason: "Fraud attempt", offense_count: 3 },
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    severity: "critical",
  },
  {
    id: "7",
    user_id: "usr_002",
    user_email: "moderator@huxzain.com",
    user_name: "Moderator Team",
    action: "Verification Approved",
    entity_type: "verification",
    entity_id: "ver_111",
    ip_address: "10.0.0.5",
    details: { seller_name: "EliteStore", documents: "KYC Complete" },
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    severity: "info",
  },
  {
    id: "8",
    user_id: "usr_001",
    user_email: "admin@huxzain.com",
    user_name: "Super Admin",
    action: "Refund Issued",
    entity_type: "payment",
    entity_id: "ref_222",
    ip_address: "192.168.1.1",
    details: { amount: "₹800", order_id: "ORD-123", reason: "Seller non-delivery" },
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    severity: "warning",
  },
];

function AuditLogsPage() {
  const { hasAnyRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_LOGS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [dateRange, setDateRange] = useState("7d");

  const isSuper = hasAnyRole(["super_admin", "owner", "admin"]);

  useEffect(() => {
    async function fetchLogs() {
      const sb = getSupabase();
      if (!sb) return;
      setLoading(true);
      try {
        // Try to fetch from audit_logs table if it exists
        const { data, error } = await sb
          .from("audit_logs")
          .select("*, profiles(display_name, username, avatar_url)")
          .order("created_at", { ascending: false })
          .limit(200);

        if (!error && data && data.length > 0) {
          setLogs(
            data.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              user_email: row.profiles?.username || row.user_id,
              user_name: row.profiles?.display_name || "Staff Member",
              action: row.action,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              ip_address: row.ip_address,
              details: row.details,
              created_at: row.created_at,
              severity: row.severity || "info",
            }))
          );
        }
        // If table doesn't exist yet, keep mock data
      } catch (_e) {
        // Keep mock data
      } finally {
        setLoading(false);
      }
    }
    void fetchLogs();
  }, [dateRange]);

  const filtered = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || log.action.toLowerCase().includes(filterAction);
    const matchSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    return matchSearch && matchAction && matchSeverity;
  });

  const stats = {
    total: logs.length,
    critical: logs.filter((l) => l.severity === "critical").length,
    warning: logs.filter((l) => l.severity === "warning").length,
    info: logs.filter((l) => l.severity === "info").length,
  };

  function formatTimestamp(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Activity className="size-6 text-gold" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete audit trail of all admin and staff actions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            id="audit-date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground outline-none"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            id="audit-export-btn"
            className="h-9 px-4 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all flex items-center gap-2"
            title="Export audit logs as CSV"
          >
            <Download className="size-3.5" />
            Export
          </button>
          <button
            id="audit-refresh-btn"
            onClick={() => window.location.reload()}
            className="h-9 px-4 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all flex items-center gap-2"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Actions", value: stats.total, icon: Activity, color: "text-blue-400" },
          { label: "Critical Events", value: stats.critical, icon: AlertCircle, color: "text-red-400" },
          { label: "Warnings", value: stats.warning, icon: ShieldCheck, color: "text-amber-400" },
          { label: "Info Events", value: stats.info, icon: CheckCircle2, color: "text-emerald-400" },
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
            id="audit-search"
            type="text"
            placeholder="Search by action, user, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          id="audit-filter-action"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground outline-none"
        >
          <option value="all">All Actions</option>
          <option value="login">Login / Auth</option>
          <option value="payment">Payments</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="dispute">Disputes</option>
          <option value="verification">Verification</option>
          <option value="listing">Listings</option>
          <option value="suspend">Suspensions</option>
          <option value="ban">Bans</option>
          <option value="refund">Refunds</option>
        </select>
        <select
          id="audit-filter-severity"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-muted-foreground outline-none"
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="rounded-xl border border-border bg-surface/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performed By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-surface animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Activity className="size-10 mx-auto mb-3 opacity-30" />
                    <div className="font-medium">No audit logs found</div>
                    <div className="text-xs mt-1">Try adjusting your filters</div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const sev = SEVERITY_CONFIG[log.severity || "info"];
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                      id={`audit-log-${log.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="size-3 shrink-0" />
                          <span title={formatTimestamp(log.created_at)}>
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                          {formatTimestamp(log.created_at).split(",")[0]}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center shrink-0">
                            <User className="size-3.5 text-gold" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground truncate max-w-[110px]">
                              {log.user_name || "Unknown"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                              {log.user_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.entity_type && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package className="size-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground capitalize">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="font-mono text-[10px] text-foreground/60">
                                #{log.entity_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.ip_address ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Globe className="size-3 shrink-0" />
                            {log.ip_address}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold ${sev.color} ${sev.bg} px-2 py-0.5 rounded-full`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="inline-flex items-center gap-1 text-[10px] text-gold/80 hover:text-gold border border-gold/20 hover:border-gold/50 rounded-md px-2 py-0.5 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          id={`view-audit-${log.id}`}
                        >
                          <Eye className="size-2.5" />
                          View
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

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-[#0f1012] border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/30">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-gold" />
                <span className="font-semibold text-sm">Audit Log Detail</span>
                <span className="text-[10px] font-mono text-muted-foreground">#{selectedLog.id.slice(0, 8)}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Performed By</div>
                  <div className="font-semibold">{selectedLog.user_name}</div>
                  <div className="text-xs text-muted-foreground">{selectedLog.user_email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                  <div className="font-semibold text-xs">{formatTimestamp(selectedLog.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Action</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Severity</div>
                  <span className={`text-[10px] font-bold ${SEVERITY_CONFIG[selectedLog.severity || "info"].color} ${SEVERITY_CONFIG[selectedLog.severity || "info"].bg} px-2 py-0.5 rounded-full`}>
                    {SEVERITY_CONFIG[selectedLog.severity || "info"].label}
                  </span>
                </div>
                {selectedLog.entity_type && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Affected Object</div>
                    <div className="text-xs font-semibold capitalize">
                      {selectedLog.entity_type}
                      {selectedLog.entity_id && <span className="font-mono ml-1 text-muted-foreground">#{selectedLog.entity_id}</span>}
                    </div>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">IP Address</div>
                    <div className="text-xs font-mono">{selectedLog.ip_address}</div>
                  </div>
                )}
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Additional Details</div>
                  <div className="rounded-lg border border-border bg-surface/40 p-3 space-y-1.5">
                    {Object.entries(selectedLog.details).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground capitalize min-w-[100px]">{key.replace(/_/g, " ")}:</span>
                        <span className="font-semibold text-foreground">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] text-muted-foreground/60 font-mono">
                  Log ID: {selectedLog.id} | User ID: {selectedLog.user_id}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
