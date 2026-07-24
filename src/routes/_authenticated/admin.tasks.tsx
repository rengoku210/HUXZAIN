import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  Shield,
  Bell,
  BarChart,
  User,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  getStaffTasks,
  createStaffTask,
  updateStaffTaskStatus,
  getStaffPerformanceStats,
  getRolePermissions,
  updateRolePermissions,
  getInternalNotifications,
  markNotificationRead,
} from "@/lib/admin/tasks.functions";
import { listStaffMembers } from "@/lib/admin/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  head: () => ({ meta: [{ title: "Task Management — HUXZAIN Admin" }] }),
  component: TaskManagement,
});

type Tab = "board" | "create" | "performance" | "permissions" | "notifications";

const DEPARTMENT_OPTIONS = [
  "Support",
  "Finance",
  "Moderation",
  "Verification",
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];

const PERMISSION_KEYS = [
  "view_users",
  "manage_users",
  "view_listings",
  "manage_listings",
  "view_disputes",
  "manage_disputes",
  "view_finances",
  "manage_finances",
  "view_withdrawals",
  "process_withdrawals",
  "view_verifications",
  "manage_verifications",
  "view_tickets",
  "manage_tickets",
  "view_analytics",
  "manage_settings",
  "send_broadcasts",
  "manage_staff",
];

function TaskManagement() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [loading, setLoading] = useState(true);

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [perfStats, setPerfStats] = useState<any[]>([]);
  const [rolesPermissions, setRolesPermissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotifCategory, setSelectedNotifCategory] = useState("all");

  // Create Task form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDept, setTaskDept] = useState("Support");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskSubmitBusy, setTaskSubmitBusy] = useState(false);

  // Task Action notes state
  const [statusUpdateNotes, setStatusUpdateNotes] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [tasksRes, staffRes, statsRes, permsRes] = await Promise.all([
        getStaffTasks(),
        listStaffMembers(),
        getStaffPerformanceStats(),
        getRolePermissions(),
      ]);

      setTasks(tasksRes || []);
      setStaffList(staffRes || []);
      setPerfStats(statsRes || []);
      setRolesPermissions(permsRes || []);

      if (auth.user?.id) {
        const notifs = await getInternalNotifications({ data: { user_id: auth.user.id } });
        setNotifications(notifs || []);
      }

      if (staffRes && staffRes.length > 0 && !taskAssignee) {
        setTaskAssignee(staffRes[0].id);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load tasks and staff data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssignee || !taskDept) {
      toast.error("Please fill in required fields.");
      return;
    }
    setTaskSubmitBusy(true);
    try {
      await createStaffTask({
        data: {
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          assigned_to: taskAssignee,
          department: taskDept,
          due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
          notes: taskNotes,
          created_by: auth.user?.id || "",
        },
      });
      toast.success("Task assigned successfully!");
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("medium");
      setTaskNotes("");
      setTaskDueDate("");
      setActiveTab("board");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setTaskSubmitBusy(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setActionBusy((prev) => ({ ...prev, [taskId]: true }));
    try {
      await updateStaffTaskStatus({
        data: {
          id: taskId,
          status: newStatus,
          notes: statusUpdateNotes[taskId] || `Task updated to ${newStatus}`,
          changed_by: auth.user?.id || "",
        },
      });
      toast.success(`Task status updated to ${newStatus}`);
      setStatusUpdateNotes((prev) => ({ ...prev, [taskId]: "" }));
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setActionBusy((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleTogglePermission = async (roleObj: any, perm: string, checked: boolean) => {
    const currentPerms = Array.isArray(roleObj.permissions) ? roleObj.permissions : [];
    let updatedPerms: string[] = [];
    if (checked) {
      updatedPerms = [...currentPerms, perm];
    } else {
      updatedPerms = currentPerms.filter((p: string) => p !== perm);
    }

    try {
      await updateRolePermissions({
        data: {
          role: roleObj.role,
          permissions: updatedPerms,
        },
      });
      // Local state update
      setRolesPermissions((prev) =>
        prev.map((r) => (r.role === roleObj.role ? { ...r, permissions: updatedPerms } : r))
      );
      toast.success(`Updated permissions for ${roleObj.role}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    try {
      await markNotificationRead({ data: { id: notifId } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      toast.success("Notification marked as read");
    } catch (err: any) {
      toast.error(err.message || "Failed to update notification");
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesDept = deptFilter === "all" || t.department === deptFilter;
    const matchesSearch =
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const tabs = [
    { id: "board", label: "Task Board", icon: ClipboardList },
    { id: "create", label: "Assign Task", icon: Plus },
    { id: "performance", label: "Leaderboard", icon: BarChart },
    { id: "permissions", label: "Role Matrix", icon: Shield },
    { id: "notifications", label: "Staff Mailbox", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-gold" size={24} /> Task Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign operations workflows, inspect staff leaderboard, customize security matrix, and review alerts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
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
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Loading workflows...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* BOARD TAB */}
          {activeTab === "board" && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface/10 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Search Tasks</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description..."
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Filter Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Department</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-gold"
                  >
                    <option value="all">All Departments</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tasks List */}
              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 font-bold">Task Info</th>
                      <th className="p-4 font-bold">Assignee</th>
                      <th className="p-4 font-bold">Priority</th>
                      <th className="p-4 font-bold">Due Date</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                          No tasks match current filters. Add a new task to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t) => {
                        let priorityColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        if (t.priority === "medium") priorityColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        if (t.priority === "high") priorityColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        if (t.priority === "critical") priorityColor = "bg-red-600/15 text-red-400 border-red-500/35 animate-pulse";

                        let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        if (t.status === "in_progress") statusColor = "bg-amber-500/15 text-amber-400 border-amber-500/25";
                        if (t.status === "completed") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        if (t.status === "overdue") statusColor = "bg-red-500/10 text-red-400 border-red-500/20";

                        const isBusy = actionBusy[t.id];

                        return (
                          <tr key={t.id} className="border-b border-border/60 hover:bg-surface/20 transition-all text-xs">
                            <td className="p-4">
                              <div className="font-semibold text-sm">{t.title}</div>
                              <div className="text-muted-foreground mt-0.5 text-xs">{t.description}</div>
                              <div className="flex gap-2 mt-1.5 items-center">
                                <span className="bg-surface/60 border border-border text-[9px] font-bold px-1.5 py-0.5 rounded text-gold uppercase tracking-wider font-mono">
                                  {t.department}
                                </span>
                                {t.notes && (
                                  <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                                    Note: {t.notes}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-gold">
                              {t.profiles ? (
                                <div>
                                  {t.profiles.display_name}
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    {t.profiles.email}
                                  </div>
                                </div>
                              ) : (
                                "Unassigned"
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${priorityColor}`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground text-[10px]">
                              {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No Due Date"}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {t.status !== "completed" && (
                                <div className="flex flex-col md:flex-row gap-1.5 items-end md:items-center justify-end">
                                  <input
                                    type="text"
                                    placeholder="Private action notes..."
                                    value={statusUpdateNotes[t.id] || ""}
                                    onChange={(e) =>
                                      setStatusUpdateNotes((prev) => ({ ...prev, [t.id]: e.target.value }))
                                    }
                                    className="bg-[#101114] border border-border rounded-lg px-2 py-1 text-[10px] outline-none focus:border-gold w-36"
                                  />
                                  <div className="flex gap-1.5 shrink-0">
                                    {t.status === "pending" && (
                                      <button
                                        onClick={() => handleUpdateStatus(t.id, "in_progress")}
                                        disabled={isBusy}
                                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase font-bold hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer"
                                      >
                                        Start
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleUpdateStatus(t.id, "completed")}
                                      disabled={isBusy}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                    >
                                      Complete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* CREATE TAB */}
          {activeTab === "create" && (
            <form
              onSubmit={handleCreateTask}
              className="p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4 max-w-2xl"
            >
              <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-gold">
                <Plus size={16} /> Assign New Operation Workflow
              </h3>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Audit Payment Proof Screenshot for Order #776"
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Detailed Description</label>
                <textarea
                  rows={4}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Describe step-by-step instructions or target outcomes..."
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Assigned Employee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    {staffList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Department</label>
                  <select
                    value={taskDept}
                    onChange={(e) => setTaskDept(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Creator Notes (Optional)</label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Notes shown on details matrix"
                  className="w-full bg-[#101114] border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>

              <button
                type="submit"
                disabled={taskSubmitBusy}
                className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
              >
                {taskSubmitBusy ? "Assigning..." : "Assign Task"}
              </button>
            </form>
          )}

          {/* PERFORMANCE LEADERBOARD */}
          {activeTab === "performance" && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-x-auto overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-surface/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 font-bold">Employee Name</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold text-center">Tasks Completed</th>
                    <th className="p-4 font-bold text-center">Tasks Assigned</th>
                    <th className="p-4 font-bold text-center">Overdue Tasks</th>
                    <th className="p-4 font-bold text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {perfStats.map((p) => {
                    const rate = p.tasks_assigned > 0 ? Math.round((p.tasks_completed / p.tasks_assigned) * 100) : 100;
                    const isTop = rate >= 80 && p.tasks_completed > 0;
                    return (
                      <tr
                        key={p.employee_id}
                        className={`border-b border-border/60 hover:bg-surface/20 transition-all text-xs ${
                          isTop ? "bg-gold/5 border-l-2 border-l-gold" : ""
                        }`}
                      >
                        <td className="p-4 font-semibold flex items-center gap-2">
                          <User size={14} className="text-gold" /> {p.full_name}
                        </td>
                        <td className="p-4 text-muted-foreground uppercase text-[10px] font-mono">{p.department}</td>
                        <td className="p-4 text-muted-foreground capitalize">{p.role}</td>
                        <td className="p-4 text-center font-bold text-emerald-400">{p.tasks_completed}</td>
                        <td className="p-4 text-center font-bold">{p.tasks_assigned}</td>
                        <td className="p-4 text-center font-bold text-red-400">{p.tasks_overdue}</td>
                        <td className="p-4 text-right font-mono font-bold text-gold">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PERMISSIONS MATRIX */}
          {activeTab === "permissions" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rolesPermissions.map((roleObj) => (
                <div key={roleObj.role} className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <Lock size={16} className="text-gold" />
                    <div>
                      <h4 className="font-display font-semibold text-sm capitalize">{roleObj.label || roleObj.role}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono">{roleObj.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {PERMISSION_KEYS.map((perm) => {
                      const hasPerm = Array.isArray(roleObj.permissions) && roleObj.permissions.includes(perm);
                      return (
                        <div key={perm} className="flex items-center gap-2 p-1 hover:bg-surface/20 rounded">
                          <input
                            type="checkbox"
                            id={`${roleObj.role}-${perm}`}
                            checked={hasPerm}
                            onChange={(e) => handleTogglePermission(roleObj, perm, e.target.checked)}
                            className="accent-gold cursor-pointer size-3.5"
                          />
                          <label
                            htmlFor={`${roleObj.role}-${perm}`}
                            className="text-[10px] text-muted-foreground select-none cursor-pointer font-mono truncate"
                            title={perm}
                          >
                            {perm.replace(/_/g, " ")}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INTERNAL NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md p-6 space-y-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 border-b border-border/60 pb-3">
                <Bell size={16} className="text-gold" /> Unread Work Alerts
              </h3>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
                {["all", "disputes", "payments", "tickets", "orders", "general"].map((cat) => {
                  const count = notifications.filter((n) => {
                    if (cat === "all") return true;
                    return (n.category || "general").toLowerCase() === cat;
                  }).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedNotifCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedNotifCategory === cat
                          ? "bg-gold text-black border-gold"
                          : "bg-surface/20 border-border text-muted-foreground hover:text-white"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {notifications.filter((n) => {
                  if (selectedNotifCategory === "all") return true;
                  return (n.category || "general").toLowerCase() === selectedNotifCategory;
                }).length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No notifications in this category.
                  </div>
                ) : (
                  notifications
                    .filter((n) => {
                      if (selectedNotifCategory === "all") return true;
                      return (n.category || "general").toLowerCase() === selectedNotifCategory;
                    })
                    .map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          !n.read_at ? "bg-gold/5 border-gold/25" : "bg-surface/10 border-border/80 opacity-70"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{n.title}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{n.body || n.message}</p>
                          {n.link && (
                            <div className="mt-1">
                              <Link
                                to={n.link}
                                className="inline-flex items-center text-[10px] text-gold hover:underline"
                              >
                                View details &rarr;
                              </Link>
                            </div>
                          )}
                        </div>
                        {!n.read_at && (
                          <button
                            onClick={() => handleMarkNotifRead(n.id)}
                            className="px-2 py-1 rounded-lg border border-border text-[9px] uppercase font-bold tracking-wider hover:text-gold hover:border-gold/30 active:scale-95 transition-all cursor-pointer bg-surface/20 shrink-0"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
