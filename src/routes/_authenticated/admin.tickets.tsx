// src/routes/_authenticated/admin.tickets.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Clock, 
  User, 
  AlertTriangle,
  UserPlus,
  BookOpen,
  HelpCircle,
  FolderSync,
  Plus,
  CheckCircle,
  Star,
  Lock,
  Send,
  Trash2,
  Edit,
  Sparkles,
  BarChart3,
  CheckSquare
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { listStaffMembers } from "@/lib/admin/staff.functions";
import {
  getAdminTickets,
  getTicketDetails,
  updateTicketStatus,
  assignTicket,
  addTicketReply,
  getKBArticles,
  saveKBArticle,
  deleteKBArticle,
  getSupportStats
} from "@/lib/admin/tickets.functions";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Support & Helpdesk Center — HUXZAIN Admin" }] }),
  component: AdminTickets,
});

type Tab = "tickets" | "kb" | "workloads";

function AdminTickets() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Tickets tab states
  const [tickets, setTickets] = useState<any[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // KB articles states
  const [kbArticles, setKbArticles] = useState<any[]>([]);
  const [showKBForm, setShowKBForm] = useState(false);
  const [editKBId, setEditKBId] = useState<string | undefined>(undefined);
  const [kbTitle, setKbTitle] = useState("");
  const [kbCategory, setKbCategory] = useState("general");
  const [kbContent, setKbContent] = useState("");
  const [kbPublished, setKbPublished] = useState(true);
  const [kbFeatured, setKbFeatured] = useState(false);
  const [kbSubmitBusy, setKbSubmitBusy] = useState(false);

  // Workload states
  const [stats, setStats] = useState<any>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Fetch staff
      const staff = await listStaffMembers();
      setStaffList(staff || []);

      // Fetch tickets
      const ticketRes = await getAdminTickets({
        data: {
          status_filter: statusFilter,
          department_filter: deptFilter,
          search,
          page,
          per_page: 15
        }
      });
      setTickets(ticketRes.tickets || []);
      setTotalTickets(ticketRes.total || 0);

      // Fetch KB
      const kb = await getKBArticles({ data: { include_unpublished: true } });
      setKbArticles(kb || []);

      // Fetch stats
      const metrics = await getSupportStats();
      setStats(metrics);
    } catch (e: any) {
      toast.error("Failed to load dashboard data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [statusFilter, deptFilter, page]);

  const triggerSearch = async () => {
    setLoading(true);
    try {
      const ticketRes = await getAdminTickets({
        data: {
          status_filter: statusFilter,
          department_filter: deptFilter,
          search,
          page: 1,
          per_page: 15
        }
      });
      setTickets(ticketRes.tickets || []);
      setTotalTickets(ticketRes.total || 0);
      setPage(1);
    } catch (e: any) {
      toast.error("Search failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await getTicketDetails({ data: { ticket_id: id } });
      setActiveTicket(res.ticket);
      setMessages(res.messages || []);
    } catch (e: any) {
      toast.error("Failed to load ticket details: " + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTicketSelect = (id: string) => {
    setActiveTicketId(id);
    loadTicketMessages(id);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    setReplyBusy(true);
    try {
      await addTicketReply({
        data: {
          ticket_id: activeTicketId,
          sender_id: auth.user?.id || "",
          message: replyText,
          is_internal: isInternalNote,
        }
      });
      toast.success(isInternalNote ? "Internal note added." : "Reply sent to customer.");
      setReplyText("");
      loadTicketMessages(activeTicketId);
      // Refresh tickets list to update dates
      triggerSearch();
    } catch (e: any) {
      toast.error("Failed to send message: " + e.message);
    } finally {
      setReplyBusy(false);
    }
  };

  const handleAssignChange = async (assignedToVal: string) => {
    if (!activeTicketId) return;
    try {
      await assignTicket({
        data: {
          ticket_id: activeTicketId,
          assigned_to: assignedToVal === "unassigned" ? null : assignedToVal,
          staff_id: auth.user?.id || "",
        }
      });
      toast.success("Assignee updated.");
      loadTicketMessages(activeTicketId);
      triggerSearch();
    } catch (e: any) {
      toast.error("Failed to assign ticket: " + e.message);
    }
  };

  const handleDeptChange = async (deptVal: string) => {
    if (!activeTicketId) return;
    try {
      await assignTicket({
        data: {
          ticket_id: activeTicketId,
          assigned_to: activeTicket?.assigned_to || null,
          department: deptVal,
          staff_id: auth.user?.id || "",
        }
      });
      toast.success("Department routed successfully.");
      loadTicketMessages(activeTicketId);
      triggerSearch();
    } catch (e: any) {
      toast.error("Failed to route ticket: " + e.message);
    }
  };

  const handleStatusChange = async (statusVal: string) => {
    if (!activeTicketId) return;
    try {
      await updateTicketStatus({
        data: {
          ticket_id: activeTicketId,
          status: statusVal,
          staff_id: auth.user?.id || "",
        }
      });
      toast.success("Ticket status updated to " + statusVal.toUpperCase());
      loadTicketMessages(activeTicketId);
      triggerSearch();
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  // KB Articles handlers
  const handleSaveKB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) {
      toast.error("Please fill in article title and contents.");
      return;
    }
    setKbSubmitBusy(true);
    try {
      await saveKBArticle({
        data: {
          id: editKBId,
          title: kbTitle,
          category: kbCategory,
          content: kbContent,
          is_published: kbPublished,
          featured: kbFeatured,
          created_by: auth.user?.id || "",
        }
      });
      toast.success("Article saved successfully!");
      setShowKBForm(false);
      setEditKBId(undefined);
      setKbTitle("");
      setKbContent("");
      // Reload KB
      const kb = await getKBArticles({ data: { include_unpublished: true } });
      setKbArticles(kb || []);
    } catch (err: any) {
      toast.error("Failed to save article: " + err.message);
    } finally {
      setKbSubmitBusy(false);
    }
  };

  const handleDeleteKB = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ article?")) return;
    try {
      await deleteKBArticle({ data: { id } });
      toast.success("FAQ Article deleted.");
      setKbArticles(kbArticles.filter(art => art.id !== id));
    } catch (err: any) {
      toast.error("Failed to delete article: " + err.message);
    }
  };

  const departments = [
    { value: "general", label: "General Support" },
    { value: "verification", label: "Verification Team" },
    { value: "finance", label: "Finance Team" },
    { value: "moderation", label: "Moderation Team" },
    { value: "dispute", label: "Dispute Team" },
    { value: "technical", label: "Technical Team" },
    { value: "seller_support", label: "Seller Support" },
    { value: "buyer_support", label: "Buyer Support" },
    { value: "fraud_investigation", label: "Fraud Team" },
    { value: "management", label: "Management Team" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertCircle className="size-6 text-gold animate-pulse" /> Support & Helpdesk Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review customer support tickets, manage FAQ knowledge base resources, and audit employee workloads.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "kb" && (
            <button
              onClick={() => {
                setEditKBId(undefined);
                setKbTitle("");
                setKbCategory("general");
                setKbContent("");
                setKbPublished(true);
                setKbFeatured(false);
                setShowKBForm(!showKBForm);
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-all active:scale-95 cursor-pointer border-none"
            >
              <Plus size={14} /> {showKBForm ? "Cancel Form" : "Create Article"}
            </button>
          )}
          <button
            onClick={loadInitialData}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 flex flex-wrap gap-1.5">
        {[
          { id: "tickets", label: "Ticket Queues", icon: FolderSync },
          { id: "kb", label: "Help Center Articles", icon: BookOpen },
          { id: "workloads", label: "Workloads & Performance", icon: BarChart3 },
        ].map((t) => {
          const ActiveIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
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
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Syncing databases...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TICKETS TAB */}
          {activeTab === "tickets" && (
            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
              {/* Left Column: Queues & Search */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface/30 p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
                      placeholder="Press Enter to search..."
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Department Queue</label>
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-black text-xs focus:border-gold outline-none"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-black text-xs focus:border-gold outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="waiting_for_user">Waiting For User</option>
                      <option value="waiting_for_staff">Waiting For Staff</option>
                      <option value="escalated">Escalated</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Ticket cards feed */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {tickets.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      No tickets matching filters.
                    </div>
                  ) : (
                    tickets.map((t) => {
                      const isActive = t.id === activeTicketId;
                      const priorityColors = t.priority === "emergency" || t.priority === "critical"
                        ? "text-red-400"
                        : t.priority === "high"
                        ? "text-orange-400"
                        : "text-muted-foreground";

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTicketSelect(t.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer hover:border-gold/30 hover:bg-surface/20 transition-all ${
                            isActive ? "bg-gold/5 border-gold" : "bg-surface/30 border-border"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] uppercase font-mono text-gold font-bold">
                              {t.category}
                            </span>
                            <span className={`text-[9px] uppercase font-extrabold ${priorityColors}`}>
                              {t.priority}
                            </span>
                          </div>
                          <h4 className="font-semibold text-xs text-foreground truncate mt-1">{t.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            Customer: {t.user?.display_name || t.user?.username || "Unknown"}
                          </p>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/20">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">
                              {t.department}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              t.status === 'open' || t.status === 'waiting_for_staff'
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : t.status === 'resolved' || t.status === 'closed'
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {t.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Split Workspace */}
              <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden flex flex-col min-h-[500px]">
                {!activeTicketId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                    <AlertCircle size={40} className="text-muted-foreground opacity-60" />
                    <h3 className="font-semibold text-sm">No Ticket Selected</h3>
                    <p className="text-xs text-muted-foreground max-w-xs leading-normal">
                      Select a support request from the queue column on the left to start corresponding with the customer.
                    </p>
                  </div>
                ) : detailLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center animate-pulse gap-2">
                    <div className="size-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                    <span className="text-xs text-muted-foreground">Retrieving messages log...</span>
                  </div>
                ) : (
                  <div className="flex-1 grid md:grid-cols-[1fr_260px] divide-x divide-border">
                    {/* Chat Room */}
                    <div className="p-4 flex flex-col justify-between h-[550px]">
                      {/* Message History */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {messages.map((m) => {
                          const isSenderStaff = m.sender_id !== activeTicket?.user_id && m.sender_id !== null;
                          if (m.system_event) {
                            return (
                              <div key={m.id} className="w-full text-center py-1.5">
                                <span className="text-[10px] bg-gold/10 border border-gold/20 text-gold px-3 py-0.5 rounded-full font-bold">
                                  {m.message}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isSenderStaff ? "items-end ml-auto" : "items-start"} max-w-[85%]`}
                            >
                              <span className="text-[9px] text-muted-foreground mb-0.5 font-mono">
                                {isSenderStaff
                                  ? `${m.sender?.display_name || 'Staff'} (Staff)`
                                  : `${m.sender?.display_name || activeTicket?.user?.display_name || 'Customer'} (Customer)`}
                              </span>
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                  m.is_internal
                                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-tr-none"
                                    : isSenderStaff
                                    ? "bg-gold text-black rounded-tr-none font-semibold"
                                    : "bg-surface border border-border text-foreground rounded-tl-none"
                                }`}
                              >
                                {m.message}
                              </div>
                              <span className="text-[8px] text-muted-foreground/60 mt-0.5">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply form */}
                      <form onSubmit={handlePostReply} className="border-t border-border/40 pt-3 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isInternalNote}
                              onChange={(e) => setIsInternalNote(e.target.checked)}
                              className="accent-amber-500 cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                              <Lock size={10} /> Internal Staff Note (Customer won't see)
                            </span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={isInternalNote ? "Type private staff note..." : "Type reply to customer..."}
                            className="flex-1 h-10 px-3 rounded-lg bg-black border border-border text-xs text-foreground focus:border-gold outline-none"
                            required
                          />
                          <button
                            type="submit"
                            disabled={replyBusy}
                            className="size-10 bg-gold text-black flex items-center justify-center rounded-lg hover:brightness-110 active:scale-95 disabled:opacity-50 border-none cursor-pointer"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Metadata & Actions Panel */}
                    <div className="p-4 space-y-4 text-xs overflow-y-auto h-[550px]">
                      <h4 className="font-display font-semibold text-sm border-b border-border/40 pb-2">Ticket Details</h4>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Inquirer</span>
                        <div className="font-semibold">{activeTicket?.user?.display_name || "Guest Customer"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{activeTicket?.user?.email}</div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</span>
                        <div className="font-mono text-[10px] truncate" title={activeTicket?.id}>#{activeTicket?.id}</div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/20">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Assign Staff Handler</label>
                        <select
                          value={activeTicket?.assigned_to || "unassigned"}
                          onChange={(e) => handleAssignChange(e.target.value)}
                          className="w-full h-8 px-2 rounded bg-black border border-border text-[11px] outline-none"
                        >
                          <option value="unassigned">Unassigned</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.display_name || s.username}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Route Department</label>
                        <select
                          value={activeTicket?.department || "general"}
                          onChange={(e) => handleDeptChange(e.target.value)}
                          className="w-full h-8 px-2 rounded bg-black border border-border text-[11px] outline-none"
                        >
                          {departments.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Update Status</label>
                        <select
                          value={activeTicket?.status || "open"}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="w-full h-8 px-2 rounded bg-black border border-border text-[11px] outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="pending">Pending</option>
                          <option value="waiting_for_user">Waiting For User</option>
                          <option value="waiting_for_staff">Waiting For Staff</option>
                          <option value="escalated">Escalated</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      {activeTicket?.rating && (
                        <div className="pt-2 border-t border-border/20 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">CSAT Rating</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <Star
                                key={num}
                                size={12}
                                className={num <= activeTicket.rating ? "text-gold fill-gold" : "text-muted-foreground"}
                              />
                            ))}
                            <span className="font-semibold text-[11px] ml-1">{activeTicket.rating} Stars</span>
                          </div>
                          {activeTicket.feedback && (
                            <p className="italic text-muted-foreground bg-black/40 p-2 rounded border border-border/40 mt-1 leading-normal">
                              "{activeTicket.feedback}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KB ARTICLES TAB */}
          {activeTab === "kb" && (
            <>
              {showKBForm && (
                <form
                  onSubmit={handleSaveKB}
                  className="p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 max-w-2xl animate-in zoom-in-95 duration-200"
                >
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                    <Sparkles size={16} /> {editKBId ? "Edit KB Article" : "Create Help Center Article"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Article Title</label>
                      <input
                        type="text"
                        required
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        placeholder="e.g. How to initiate a dispute refund"
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Category</label>
                      <select
                        value={kbCategory}
                        onChange={(e) => setKbCategory(e.target.value)}
                        className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold cursor-pointer"
                      >
                        <option value="general">General Marketplace FAQ</option>
                        <option value="buying">Buying Guide</option>
                        <option value="selling">Selling Guide</option>
                        <option value="withdrawals">Withdrawals & Payouts</option>
                        <option value="disputes">Refunds & Disputes</option>
                        <option value="verification">Verification & Safety</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Article Content (Plain text / HTML support)</label>
                    <textarea
                      required
                      rows={10}
                      value={kbContent}
                      onChange={(e) => setKbContent(e.target.value)}
                      placeholder="Type article details..."
                      className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold font-sans leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kbPublished}
                        onChange={(e) => setKbPublished(e.target.checked)}
                        className="accent-gold cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Publish immediately</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kbFeatured}
                        onChange={(e) => setKbFeatured(e.target.checked)}
                        className="accent-gold cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Mark as Featured (Featured FAQs list)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={kbSubmitBusy}
                    className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    {kbSubmitBusy ? "Saving Article..." : "Save Article"}
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kbArticles.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-border bg-surface/40 p-8 text-center text-xs text-muted-foreground border-dashed">
                    No FAQs or KB articles found. Click "Create Article" to write your first FAQ.
                  </div>
                ) : (
                  kbArticles.map((art) => (
                    <div
                      key={art.id}
                      className="rounded-2xl border border-border bg-surface/40 p-5 flex flex-col justify-between gap-4 hover:border-gold/30 transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="bg-surface border border-border text-[9px] uppercase font-bold px-2 py-0.5 rounded text-gold">
                            {art.category}
                          </span>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 rounded border ${
                            art.is_published 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}>
                            {art.is_published ? "Published" : "Draft"}
                          </span>
                        </div>
                        <h4 className="font-display font-semibold text-sm">{art.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-normal">
                          {art.content}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-border/20 text-[10px] text-muted-foreground">
                        <span>Views: {art.views_count || 0}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditKBId(art.id);
                              setKbTitle(art.title);
                              setKbCategory(art.category);
                              setKbContent(art.content);
                              setKbPublished(art.is_published);
                              setKbFeatured(art.featured);
                              setShowKBForm(true);
                            }}
                            className="p-1 rounded bg-surface border border-border text-foreground hover:text-gold"
                            title="Edit Article"
                          >
                            <Edit size={10} />
                          </button>
                          <button
                            onClick={() => handleDeleteKB(art.id)}
                            className="p-1 rounded bg-surface border border-border text-red-400 hover:bg-red-500/10"
                            title="Delete Article"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* WORKLOADS TAB */}
          {activeTab === "workloads" && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Inquiries", val: stats?.total_tickets || 0, color: "text-foreground" },
                  { label: "Open Queues", val: stats?.open_tickets || 0, color: "text-red-400" },
                  { label: "Pending Response", val: stats?.pending_tickets || 0, color: "text-amber-400" },
                  { label: "Resolved Actions", val: (stats?.resolved_tickets || 0) + (stats?.closed_tickets || 0), color: "text-emerald-400" },
                  { 
                    label: "CSAT Score", 
                    val: stats?.csat_average ? `${stats.csat_average.toFixed(1)} / 5.0` : "N/A", 
                    color: "text-gold" 
                  },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl border border-border bg-surface/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.label}</span>
                    <div className={`text-xl font-bold tracking-tight mt-1 ${item.color}`}>{item.val}</div>
                  </div>
                ))}
              </div>

              {/* Leaderboards */}
              <div className="rounded-2xl border border-border bg-surface/30 p-5 space-y-4">
                <h3 className="font-display font-semibold text-sm">Employee Support Performance Leaderboard</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface/50 text-[10px] uppercase font-bold text-muted-foreground">
                        <th className="p-3">Staff Member</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Total Assigned</th>
                        <th className="p-3">Completed (Closed)</th>
                        <th className="p-3">Currently Open</th>
                        <th className="p-3">CSAT Rating (Average)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {stats?.employee_workloads?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No employees currently tracking support tickets.
                          </td>
                        </tr>
                      ) : (
                        stats?.employee_workloads?.map((emp: any) => (
                          <tr key={emp.employee_id} className="hover:bg-surface/10 transition-colors">
                            <td className="p-3 font-semibold text-foreground flex items-center gap-1.5">
                              <User size={12} className="text-gold" /> {emp.full_name}
                            </td>
                            <td className="p-3 font-mono text-[10px] uppercase">{emp.role}</td>
                            <td className="p-3 font-mono">{emp.tasks_assigned}</td>
                            <td className="p-3 font-mono text-emerald-400">{emp.tasks_completed}</td>
                            <td className="p-3 font-mono text-red-400">{emp.tasks_open}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Star size={10} className="text-gold fill-gold" />
                                <span className="font-bold">{emp.rating_average ? emp.rating_average.toFixed(1) : "0.0"} / 5.0</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
