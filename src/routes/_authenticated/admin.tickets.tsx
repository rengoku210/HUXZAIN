// src/routes/_authenticated/admin.tickets.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState } from "@/components/seller/SellerShell";
import { 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Clock, 
  User, 
  AlertTriangle,
  UserPlus,
  BookmarkCheck,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Tickets — HUXZAIN Admin" }] }),
  component: AdminTickets,
});

interface TicketRecord {
  id: string;
  user_id: string;
  title: string;
  category: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined info
  profile?: {
    username: string | null;
    display_name: string | null;
  };
  assignee?: {
    username: string | null;
    display_name: string | null;
  };
}

interface StaffProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string | null;
}

function AdminTickets() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const supabase = getSupabase();

  const loadTickets = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Fetch tickets
      const { data: tData, error: tErr } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (tErr) throw tErr;

      // 2. Fetch all staff for assignee dropdown
      const { data: sData } = await supabase
        .from("profiles")
        .select("id, username, display_name, role")
        .eq("role", "staff");

      if (sData) setStaffList(sData);

      if (tData && tData.length > 0) {
        // Fetch profiles of users + assignees
        const userIds = new Set<string>();
        tData.forEach(t => {
          if (t.user_id) userIds.add(t.user_id);
          if (t.assigned_to) userIds.add(t.assigned_to);
        });

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", Array.from(userIds));

        const mapped = tData.map((t: any) => {
          const profile = profiles?.find(p => p.id === t.user_id);
          const assignee = profiles?.find(p => p.id === t.assigned_to);
          return {
            ...t,
            profile: profile ? { username: profile.username, display_name: profile.display_name } : undefined,
            assignee: assignee ? { username: assignee.username, display_name: assignee.display_name } : undefined
          };
        });
        setTickets(mapped);
      } else {
        setTickets([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load support tickets: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    if (!supabase) return;
    setActioningId(ticketId);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      // 1. Update ticket status
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;

      // 2. Log staff action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "update_ticket_status",
          target_type: "support_ticket",
          target_id: ticketId,
          new_value: newStatus,
          notes: `Changed support ticket status to ${newStatus.toUpperCase()}`
        });
      }

      toast.success(`Ticket status updated to ${newStatus}.`);
      await loadTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to update ticket: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleAssignChange = async (ticketId: string, staffUserId: string) => {
    if (!supabase) return;
    setActioningId(ticketId);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      const assigneeVal = staffUserId === "unassigned" ? null : staffUserId;

      // 1. Assign ticket
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: assigneeVal, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;

      // 2. Log action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "assign_support_ticket",
          target_type: "support_ticket",
          target_id: ticketId,
          new_value: staffUserId,
          notes: `Assigned support ticket to ${staffUserId === "unassigned" ? "Unassigned" : staffUserId}`
        });
      }

      toast.success("Ticket assignee updated successfully.");
      await loadTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(`Assignment failed: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchesStatus = filter === "all" || t.status === filter;
    
    const name = t.profile?.display_name || t.profile?.username || "";
    const title = t.title || "";
    const category = t.category || "";
    
    const matchesSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      category.toLowerCase().includes(search.toLowerCase());
      
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertCircle className="size-6 text-gold" /> Support Ticket Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resolve user support tickets, assign customer relations cases, and modify bug resolution status.
          </p>
        </div>
        <button
          onClick={loadTickets}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Ticket ID, Category, Title, Customer..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="all">All Tickets</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium">
          Showing {filtered.length} support requests
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No support tickets" desc="No customer support tickets match the selected filter." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Ticket Details</th>
                  <th className="px-6 py-4">Billed Customer</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Assignee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground max-w-[240px] truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {t.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">
                        {t.profile?.display_name || t.profile?.username || "Valued User"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {t.user_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-border text-foreground uppercase">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <UserPlus size={12} className="text-gold" />
                        <select
                          disabled={actioningId !== null}
                          value={t.assigned_to || "unassigned"}
                          onChange={(e) => handleAssignChange(t.id, e.target.value)}
                          className="px-2 py-1 rounded bg-black border border-border text-[11px] text-foreground focus:border-gold outline-none cursor-pointer"
                        >
                          <option value="unassigned">Unassigned</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.display_name || staff.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        t.status === 'open' 
                          ? "bg-red-500/15 text-red-400 border-red-500/20" 
                          : t.status === 'pending' 
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/20" 
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      {t.status !== "resolved" && t.status !== "closed" && (
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleStatusChange(t.id, "resolved")}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 disabled:opacity-50 transition-all border-none cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                      
                      {t.status !== "closed" ? (
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleStatusChange(t.id, "closed")}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface/80 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleStatusChange(t.id, "open")}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface/80 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
