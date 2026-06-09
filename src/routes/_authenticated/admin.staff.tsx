import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Key, 
  ShieldAlert, 
  Activity, 
  History, 
  Eye, 
  EyeOff,
  UserCheck,
  Ban,
  X
} from "lucide-react";
import { 
  listStaffMembers, 
  createStaffAccount, 
  resetStaffPassword, 
  toggleStaffStatus, 
  listStaffAuditLogs, 
  listTeamLoginHistory 
} from "@/lib/admin/staff.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({ meta: [{ title: "Staff Management — HUXZAIN" }] }),
  component: StaffManagementPage,
});

type TabType = "employees" | "create" | "history" | "audit";

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  created_at: string;
}

interface LoginLog {
  id: string;
  employee_id: string | null;
  email: string;
  success: boolean;
  device: string | null;
  role_attempted: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
  staff_id: string;
  profiles: {
    display_name: string | null;
  } | null;
}

function StaffManagementPage() {
  const auth = useAuth();
  const nav = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down and filter states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [drawerTab, setDrawerTab] = useState<"drawer_audit" | "drawer_history">("drawer_audit");
  
  // Creation form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("support_agent");
  const [department, setDepartment] = useState("Support");
  const [submitting, setSubmitting] = useState(false);
  
  // Created credentials modal state
  const [createdCredentials, setCreatedCredentials] = useState<{
    employeeId: string;
    tempPassword: string;
    email: string;
  } | null>(null);

  // Fetch functions
  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, historyList, auditList] = await Promise.all([
        listStaffMembers(),
        listTeamLoginHistory(),
        listStaffAuditLogs()
      ]);
      setEmployees(empList as any);
      setLoginLogs(historyList as any);
      setAuditLogs(auditList as any);
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Double check auth
    if (auth.ready) {
      const isAdminOrSuper = auth.roles.some(r => ["admin", "super_admin", "owner"].includes(r));
      if (!isAdminOrSuper) {
        toast.error("Access denied. Admin permissions required.");
        nav({ to: "/admin" });
        return;
      }
      void loadData();
    }
  }, [auth.ready, auth.roles, nav]);

  // Handle staff creation
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !department.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    
    setSubmitting(true);
    try {
      const ip = "127.0.0.1"; // Default fallback IP
      const res = await createStaffAccount({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          department: department.trim(),
          creatorUserId: auth.user?.id || "",
          creatorIp: ip
        }
      });
      
      if (res.success) {
        toast.success(`Account created successfully for ${fullName}`);
        setCreatedCredentials({
          employeeId: res.employeeId,
          tempPassword: res.tempPassword,
          email: res.email
        });
        
        // Reset form
        setFullName("");
        setEmail("");
        setRole("support_agent");
        setDepartment("Support");
        
        // Reload list
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle account active/disabled status
  const handleToggleStatus = async (emp: Employee) => {
    // Super admins cannot disable themselves to prevent locking out
    if (emp.id === auth.user?.id) {
      toast.error("You cannot disable your own active account.");
      return;
    }

    try {
      const loadingToast = toast.loading(`Updating status for ${emp.full_name}...`);
      const ip = "127.0.0.1";
      const res = await toggleStaffStatus({
        data: {
          targetUserId: emp.id,
          employeeId: emp.employee_id,
          currentStatus: emp.status,
          creatorUserId: auth.user?.id || "",
          creatorIp: ip
        }
      });

      toast.dismiss(loadingToast);
      if (res.success) {
        toast.success(`Employee account status set to ${res.newStatus}`);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  // Reset employee password
  const handleResetPassword = async (emp: Employee) => {
    const confirm = window.confirm(`Are you sure you want to reset password for ${emp.full_name}?`);
    if (!confirm) return;

    try {
      const loadingToast = toast.loading(`Resetting password for ${emp.full_name}...`);
      const ip = "127.0.0.1";
      const res = await resetStaffPassword({
        data: {
          targetUserId: emp.id,
          employeeId: emp.employee_id,
          creatorUserId: auth.user?.id || "",
          creatorIp: ip
        }
      });

      toast.dismiss(loadingToast);
      if (res.success) {
        alert(`TEMPORARY PASSWORD FOR ${emp.full_name}:\n\nEmployee ID: ${emp.employee_id}\nPassword: ${res.newTempPassword}\n\nWARNING: Copy this now. It will not be shown again.`);
        toast.success("Password reset completed successfully.");
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    }
  };

  const getRoleLabel = (roleKey: string) => {
    const rolesMap: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      moderator: "Moderator",
      payment_reviewer: "Payment Reviewer",
      verification_officer: "Verification Officer",
      support_agent: "Support Agent",
      employee: "Employee",
    };
    return rolesMap[roleKey] || roleKey;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Staff Portal <Users className="size-6 text-gold" />
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Create staff accounts, assign roles, manage status and track security audit logs
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/80">
        {[
          { key: "employees", label: "Employees", icon: Users },
          { key: "create", label: "Create Staff", icon: UserPlus },
          { key: "history", label: "Login History", icon: History },
          { key: "audit", label: "Activity Audit Logs", icon: Activity },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key as TabType);
              setCreatedCredentials(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === t.key
                ? "border-gold text-gold bg-gold/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/30"
            }`}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground font-semibold flex items-center justify-center gap-2">
          <div className="size-5 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          Loading portal records...
        </div>
      ) : (
        <div className="bg-surface/10 rounded-2xl border border-border p-6 backdrop-blur-md">
          
          {/* TAB 1: EMPLOYEES LIST */}
          {activeTab === "employees" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Active Staff Directory <span className="text-xs font-normal text-muted-foreground">({employees.length} members)</span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-border/50 hover:bg-surface/20 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-gold text-xs">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="hover:underline text-left text-gold font-bold font-mono text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            {emp.employee_id}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="hover:underline hover:text-gold text-left text-foreground font-semibold cursor-pointer"
                          >
                            {emp.full_name}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{emp.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.role === "super_admin" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : emp.role === "admin"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {getRoleLabel(emp.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{emp.department}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            emp.status === "active" ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {emp.status === "active" ? <UserCheck className="size-3.5" /> : <Ban className="size-3.5" />}
                            {emp.status === "active" ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="size-3.5" /> View Logs
                          </button>

                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              emp.status === "active"
                                ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {emp.status === "active" ? "Disable" : "Enable"}
                          </button>
                          
                          <button
                            onClick={() => handleResetPassword(emp)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gold/30 text-gold hover:bg-gold/10 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Key className="size-3" /> Reset Pass
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground font-semibold">
                          No employees registered in portal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE STAFF */}
          {activeTab === "create" && (
            <div className="max-w-xl mx-auto space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Register New Employee Account <UserPlus className="size-5 text-gold" />
              </h2>
              
              {createdCredentials ? (
                <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-6 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-sm">
                    <ShieldAlert className="size-5 animate-pulse" />
                    WARNING: ACTION REQUIRED
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Please copy and save these credentials securely. The password will not be shown again.
                  </p>
                  
                  <div className="bg-background/80 border border-border/80 rounded-xl p-4 inline-block text-left space-y-2 font-mono text-sm max-w-sm w-full mx-auto">
                    <div>
                      <span className="text-muted-foreground text-xs font-sans">Employee ID:</span>
                      <div className="font-bold text-gold text-lg select-all">{createdCredentials.employeeId}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-sans">Email Address:</span>
                      <div className="font-semibold text-foreground select-all">{createdCredentials.email}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-sans">Temporary Password:</span>
                      <div className="font-bold text-emerald-400 text-lg select-all">{createdCredentials.tempPassword}</div>
                    </div>
                  </div>
                  
                  <div>
                    <button
                      onClick={() => setCreatedCredentials(null)}
                      className="px-6 h-10 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all cursor-pointer"
                    >
                      Acknowledge & Continue
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none focus:border-gold/50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Company Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rahul@huxzain.com"
                      className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none focus:border-gold/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Assign Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                      >
                        <option value="support_agent">Support Agent</option>
                        <option value="verification_officer">Verification Officer</option>
                        <option value="payment_reviewer">Payment Reviewer</option>
                        <option value="dispute_manager">Dispute Manager</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Department</label>
                      <input
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Operations"
                        className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>

                  <button
                    disabled={submitting}
                    className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Registering Employee..." : "Create Staff Account"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: LOGIN HISTORY */}
          {activeTab === "history" && (() => {
            const filteredLoginLogs = loginLogs.filter((log) => {
              if (selectedStaffFilter === "all") return true;
              const emp = employees.find(e => e.id === selectedStaffFilter);
              if (!emp) return false;
              return log.employee_id === emp.employee_id || log.email.toLowerCase() === emp.email.toLowerCase();
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Team Access History <History className="size-5 text-gold" />
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filter by Employee:</span>
                    <select
                      value={selectedStaffFilter}
                      onChange={(e) => setSelectedStaffFilter(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-[#101114] px-3 text-xs outline-none focus:border-gold/50 cursor-pointer text-foreground"
                    >
                      <option value="all">All Staff</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id} className="bg-[#101114]">
                          {emp.full_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Email Attempt</th>
                        <th className="py-3 px-4">Success</th>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoginLogs.map((log) => {
                        const matchedEmp = employees.find(
                          (e) => e.employee_id === log.employee_id || e.email.toLowerCase() === log.email.toLowerCase()
                        );
                        return (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-surface/20 transition-all text-xs">
                            <td className="py-3 px-4 text-muted-foreground font-semibold">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 font-mono font-bold text-gold select-all">
                              {matchedEmp ? (
                                <button
                                  onClick={() => setSelectedEmployee(matchedEmp)}
                                  className="hover:underline text-left text-gold font-bold font-mono text-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  {log.employee_id}
                                </button>
                              ) : (
                                log.employee_id || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-foreground font-semibold">
                              {matchedEmp ? (
                                <button
                                  onClick={() => setSelectedEmployee(matchedEmp)}
                                  className="hover:underline hover:text-gold text-left text-foreground cursor-pointer font-semibold inline-flex items-center gap-1 animate-none"
                                >
                                  {log.email}
                                  <Eye className="size-3 text-muted-foreground/60" />
                                </button>
                              ) : (
                                log.email
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                log.success 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {log.success ? "Success" : "Failed"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{log.device || "Desktop"}</td>
                            <td className="py-3 px-4 font-mono select-all">{log.ip_address || "127.0.0.1"}</td>
                          </tr>
                        );
                      })}
                      {filteredLoginLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground font-semibold">
                            No login history available for the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "audit" && (() => {
            const filteredAuditLogs = auditLogs.filter((log) => {
              if (selectedStaffFilter === "all") return true;
              return log.staff_id === selectedStaffFilter;
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Team Action Audit Logs <Activity className="size-5 text-gold" />
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filter by Staff:</span>
                    <select
                      value={selectedStaffFilter}
                      onChange={(e) => setSelectedStaffFilter(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-[#101114] px-3 text-xs outline-none focus:border-gold/50 cursor-pointer text-foreground"
                    >
                      <option value="all">All Staff</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id} className="bg-[#101114]">
                          {emp.full_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Staff Name</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Change Log details</th>
                        <th className="py-3 px-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map((log) => {
                        const matchedEmp = employees.find(e => e.id === log.staff_id);
                        return (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-surface/20 transition-all text-xs">
                            <td className="py-3 px-4 text-muted-foreground font-semibold">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 font-bold text-foreground">
                              {matchedEmp ? (
                                <button
                                  onClick={() => setSelectedEmployee(matchedEmp)}
                                  className="hover:underline hover:text-gold text-left text-foreground cursor-pointer font-bold inline-flex items-center gap-1"
                                >
                                  {log.profiles?.display_name || "System"}
                                  <Eye className="size-3 text-muted-foreground/60" />
                                </button>
                              ) : (
                                log.profiles?.display_name || "System"
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gold">{log.action}</td>
                            <td className="py-3 px-4 max-w-xs break-words text-muted-foreground font-mono text-[10px]">
                              {log.new_value || (log.previous_value ? `Changed from ${log.previous_value}` : "N/A")}
                            </td>
                            <td className="py-3 px-4 font-mono select-all">{log.ip_address || "127.0.0.1"}</td>
                          </tr>
                        );
                      })}
                      {filteredAuditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground font-semibold">
                            No action audit logs registered for the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* EMPLOYEE DETAIL DRAWER */}
          {selectedEmployee && (
            <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={() => setSelectedEmployee(null)} 
              />
              
              <div className="relative w-full max-w-2xl h-full bg-[#0f1013] border-l border-border p-6 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 text-left">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border/80">
                  <div>
                    <h3 className="text-xl font-bold font-display text-foreground">
                      {selectedEmployee.full_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono font-bold text-gold text-xs px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                        {selectedEmployee.employee_id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {getRoleLabel(selectedEmployee.role)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-surface text-muted-foreground border border-border">
                        {selectedEmployee.department}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                        selectedEmployee.status === "active" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        ● {selectedEmployee.status === "active" ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEmployee(null)}
                    className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-all cursor-pointer border-none bg-transparent"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-6 space-y-6">
                  {/* Info Card */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface/30 border border-border/60">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Email Address</div>
                      <a 
                        href={`mailto:${selectedEmployee.email}`}
                        className="text-sm font-semibold text-gold hover:underline mt-0.5 block truncate"
                      >
                        {selectedEmployee.email}
                      </a>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Registered At</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">
                        {new Date(selectedEmployee.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="space-y-4">
                    <div className="border-b border-border/80 flex gap-4">
                      <button
                        onClick={() => setDrawerTab("drawer_audit")}
                        className={`pb-2 text-sm font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                          drawerTab === "drawer_audit" 
                            ? "border-gold text-gold" 
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Activity Logs
                      </button>
                      <button
                        onClick={() => setDrawerTab("drawer_history")}
                        className={`pb-2 text-sm font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                          drawerTab === "drawer_history" 
                            ? "border-gold text-gold" 
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Login Sessions
                      </button>
                    </div>

                    {/* Action Logs Tab */}
                    {drawerTab === "drawer_audit" && (() => {
                      const userAudit = auditLogs.filter(log => log.staff_id === selectedEmployee.id);
                      return (
                        <div className="space-y-3">
                          {userAudit.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">No action logs found for this staff member.</p>
                          ) : (
                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                              {userAudit.map(log => (
                                <div key={log.id} className="p-3 rounded-lg border border-border/50 bg-surface/10 text-xs space-y-1">
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="font-semibold text-gold">{log.action}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {new Date(log.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {log.new_value && (
                                    <pre className="mt-1 p-2 rounded bg-background/50 font-mono text-[9px] text-muted-foreground max-w-full overflow-x-auto whitespace-pre-wrap break-all">
                                      {log.new_value}
                                    </pre>
                                  )}
                                  {log.ip_address && (
                                    <div className="text-[10px] text-muted-foreground/60 font-mono pt-1">
                                      IP: {log.ip_address}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Login Logs Tab */}
                    {drawerTab === "drawer_history" && (() => {
                      const userLogins = loginLogs.filter(
                        log => log.employee_id === selectedEmployee.employee_id || log.email.toLowerCase() === selectedEmployee.email.toLowerCase()
                      );
                      return (
                        <div className="space-y-3">
                          {userLogins.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">No login sessions found for this staff member.</p>
                          ) : (
                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                              {userLogins.map(log => (
                                <div key={log.id} className="p-3 rounded-lg border border-border/50 bg-surface/10 text-xs flex justify-between items-center gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                        log.success 
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      }`}>
                                        {log.success ? "Success" : "Failed"}
                                      </span>
                                      <span className="text-muted-foreground">{log.device || "Desktop"}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/60 font-mono">
                                      IP: {log.ip_address || "127.0.0.1"}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/80 flex justify-end">
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="px-4 py-2 rounded-lg bg-surface hover:bg-surface/80 text-xs font-semibold cursor-pointer transition-all border-none text-foreground"
                  >
                    Close Panel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
