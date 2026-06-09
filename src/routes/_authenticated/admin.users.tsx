import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { useEffect, useState } from "react";
import { listAdminUsers, updateUserRole } from "@/lib/admin/role.functions";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import type { Role } from "@/lib/roles";
import { useAuth } from "@/lib/auth/auth-context";
import { Search, UserCheck, ShieldAlert, Ban, CheckCircle, AlertTriangle, X, StickyNote, Lock, Unlock, LogIn } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Manage Users — HUXZAIN Admin" }] }),
  component: Page,
});

interface ManagedUser {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  created_at: string;
  suspended_at: string | null;
  is_seller: boolean;
  is_verified: boolean;
  roles: Role[];
}

const ADMIN_ROLE_OPTIONS = [
  { value: "buyer", label: "User" },
  { value: "employee", label: "Employee" },
  { value: "staff", label: "Staff" },
  { value: "moderator", label: "Moderator" },
  { value: "manager", label: "Manager" },
  { value: "developer", label: "Developer" },
  { value: "admin", label: "Administrator" },
  { value: "super_admin", label: "Super Admin" },
  { value: "owner", label: "Owner" },
];

function getPrimaryRole(roles: Role[]): string {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("moderator")) return "moderator";
  if (roles.includes("staff")) return "staff";
  if (roles.includes("employee")) return "employee";
  if (roles.includes("developer")) return "developer";
  return "buyer";
}

function Page() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const isSuper = auth.roles.includes("owner") || auth.roles.includes("super_admin") || ["admin@admin.com", "lullilullivabhaiva@gmail.com", "rammodhvadiya210@gmail.com"].includes(auth.user?.email?.toLowerCase() ?? "");

  // Modal Detail states
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [isUserFrozen, setIsUserFrozen] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [freezeChanging, setFreezeChanging] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      console.log("[AdminUsers] Querying Supabase database directly from client side...");
      let profiles: any[] | null = null;
      let pErr: any = null;
      try {
        const res = await sb
          .from("profiles")
          .select("id, display_name, username, created_at, suspended_at, is_seller, is_verified, email, role")
          .order("created_at", { ascending: false });
        profiles = res.data;
        pErr = res.error;
      } catch (err) {
        console.warn("[AdminUsers] Direct fetch profiles.role column threw exception:", err);
      }

      if (pErr || !profiles) {
        console.log("[AdminUsers] Fetching profiles without role column...");
        const res = await sb
          .from("profiles")
          .select("id, display_name, username, created_at, suspended_at, is_seller, is_verified, email")
          .order("created_at", { ascending: false });
        if (res.error) throw res.error;
        profiles = res.data;
      }

      const { data: roleRows, error: rErr } = await sb
        .from("user_roles")
        .select("user_id, role");

      if (rErr) throw rErr;

      const roleMap: Record<string, string[]> = {};
      roleRows?.forEach((row) => {
        const uid = row.user_id;
        const r = row.role;
        if (!roleMap[uid]) roleMap[uid] = [];
        roleMap[uid].push(r);
      });

      const combined = (profiles ?? []).map((p: any) => {
        const roles = roleMap[p.id] ?? [];
        const granularRole = p.role;
        if (
          granularRole &&
          ["admin", "staff", "employee", "manager", "moderator", "developer", "super_admin", "owner"].includes(
            granularRole,
          )
        ) {
          if (!roles.includes(granularRole)) {
            roles.push(granularRole);
          }
        }
        
        return {
          id: p.id,
          email: p.email,
          display_name: p.display_name,
          username: p.username,
          created_at: p.created_at,
          suspended_at: p.suspended_at,
          is_seller: p.is_seller,
          is_verified: p.is_verified,
          roles: roles as Role[],
        };
      });

      setUsers(combined as ManagedUser[]);
      console.log("[AdminUsers] Users successfully loaded directly from DB:", combined.length);
    } catch (e: any) {
      console.error("[AdminUsers] Direct query failed, executing server function fallback:", e);
      try {
        const sb = getSupabase();
        const { data: { session } } = await sb!.auth.getSession();
        const response = await listAdminUsers({
          data: { token: session!.access_token }
        });

        if (response && response.success && response.data) {
          setUsers(response.data as ManagedUser[]);
        } else {
          throw new Error(response?.error || "Server function error");
        }
      } catch (fallbackErr: any) {
        console.error("[AdminUsers] Server function fallback failed:", fallbackErr);
        toast.error("Failed to fetch users: " + fallbackErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch notes and freeze details for details view
  const loadUserControls = async (userId: string) => {
    const sb = getSupabase();
    if (!sb) return;

    try {
      const { data, error } = await sb
        .from("reports")
        .select("*")
        .eq("target_id", userId)
        .eq("target_type", "seller");
      
      if (error) throw error;
      
      const noteRow = data?.find(r => r.reason === "internal_notes");
      const freezeRow = data?.find(r => r.reason === "freeze");

      setUserNotes(noteRow?.note || "");
      setIsUserFrozen(freezeRow ? freezeRow.status === "open" : false);
    } catch (e) {
      console.error("Failed to load user controls:", e);
      setUserNotes("");
      setIsUserFrozen(false);
    }
  };

  const handleOpenDetails = async (u: ManagedUser) => {
    setSelectedUser(u);
    await loadUserControls(u.id);
  };

  // Save notes handler
  const handleSaveNotes = async () => {
    if (!selectedUser) return;
    const sb = getSupabase();
    if (!sb) return;

    try {
      setNotesSaving(true);
      
      const { data: existing } = await sb
        .from("reports")
        .select("id")
        .eq("target_id", selectedUser.id)
        .eq("target_type", "seller")
        .eq("reason", "internal_notes")
        .maybeSingle();

      if (existing) {
        await sb
          .from("reports")
          .update({ note: userNotes, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await sb
          .from("reports")
          .insert({
            target_id: selectedUser.id,
            target_type: "seller",
            reason: "internal_notes",
            note: userNotes,
            status: "resolved"
          });
      }

      // Sync directly to the profiles table internal_notes column
      await sb
        .from("profiles")
        .update({ internal_notes: userNotes, updated_at: new Date().toISOString() })
        .eq("id", selectedUser.id);

      // Log staff action
      if (auth.user) {
        try {
          await sb.from("staff_action_logs").insert({
            staff_id: auth.user.id,
            action: "update_internal_notes",
            target_type: "user",
            target_id: selectedUser.id,
            new_value: userNotes,
            ip_address: "Client Session"
          });
        } catch (err) {
          console.error("Failed to log staff action:", err);
        }
      }

      toast.success("Internal notes updated successfully!");
    } catch (e: any) {
      toast.error("Failed to save notes: " + e.message);
    } finally {
      setNotesSaving(false);
    }
  };

  // Toggle freeze handler
  const handleToggleFreeze = async () => {
    if (!selectedUser) return;
    const sb = getSupabase();
    if (!sb) return;

    const nextFreeze = !isUserFrozen;

    try {
      setFreezeChanging(true);
      
      const { data: existing } = await sb
        .from("reports")
        .select("id")
        .eq("target_id", selectedUser.id)
        .eq("target_type", "seller")
        .eq("reason", "freeze")
        .maybeSingle();

      if (existing) {
        await sb
          .from("reports")
          .update({ status: nextFreeze ? "open" : "resolved", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await sb
          .from("reports")
          .insert({
            target_id: selectedUser.id,
            target_type: "seller",
            reason: "freeze",
            note: "Account withdrawals frozen by administrator",
            status: nextFreeze ? "open" : "resolved"
          });
      }

      // Sync directly to the profiles table frozen_at column
      await sb
        .from("profiles")
        .update({ frozen_at: nextFreeze ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
        .eq("id", selectedUser.id);

      // Log staff action
      if (auth.user) {
        try {
          await sb.from("staff_action_logs").insert({
            staff_id: auth.user.id,
            action: nextFreeze ? "freeze_user" : "unfreeze_user",
            target_type: "user",
            target_id: selectedUser.id,
            new_value: nextFreeze ? "frozen" : "active",
            ip_address: "Client Session"
          });
        } catch (err) {
          console.error("Failed to log staff action:", err);
        }
      }

      setIsUserFrozen(nextFreeze);
      toast.success(nextFreeze ? "User payouts and withdrawals frozen!" : "User payouts and withdrawals unfrozen.");
    } catch (e: any) {
      toast.error("Failed to toggle freeze override: " + e.message);
    } finally {
      setFreezeChanging(false);
    }
  };

  // Login simulation handler
  const handleSimulateLogin = async () => {
    if (!selectedUser) return;
    
    try {
      const sb = getSupabase();
      if (sb) {
        // Log simulation access
        await sb.from("support_tickets").insert({
          user_id: auth.user?.id,
          title: `Simulated Login: Admin entered profile of ${selectedUser.email}`,
          category: "safety",
          status: "open"
        });
      }
      
      await auth.simulateUser(selectedUser.id);
      toast.success(`Simulation active: Now acting as ${selectedUser.display_name || selectedUser.username}`);
      setSelectedUser(null);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error("Failed to start simulation: " + e.message);
    }
  };

  const handleRoleChange = async (userId: string, newPrimaryRole: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    if (userId === auth.user?.id) {
      const isDemoting = !["admin", "super_admin", "owner"].includes(newPrimaryRole);
      if (isDemoting) {
        const otherAdmins = users.filter(
          (u) =>
            u.id !== auth.user?.id &&
            (u.roles.includes("admin") || u.roles.includes("super_admin") || u.roles.includes("owner"))
        ).length;

        if (otherAdmins === 0) {
          toast.error("Security Alert: You cannot remove your own admin access as you are the last remaining administrator.", {
            duration: 5000,
          });
          return;
        }
      }
    }

    const originalRoles = [...user.roles];
    const newRoles: Role[] = ["buyer"];
    if (newPrimaryRole !== "buyer") {
      newRoles.push(newPrimaryRole as Role);
    }
    if (user.is_seller || user.roles.includes("seller")) {
      newRoles.push("seller");
    }

    const uniqueNewRoles = Array.from(new Set(newRoles));

    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roles: uniqueNewRoles } : u
        )
      );

      const sb = getSupabase();
      if (!sb) throw new Error("Database client not configured");
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await updateUserRole({
        data: {
          targetUserId: userId,
          newRoles: uniqueNewRoles,
          token,
        },
      });
      if (!res?.success) {
        throw new Error(res?.error || "Failed to update roles");
      }
      // Log staff action
      try {
        await sb.from("staff_action_logs").insert({
          staff_id: auth.user?.id,
          action: "update_user_roles",
          target_type: "user",
          target_id: userId,
          previous_value: originalRoles.join(","),
          new_value: uniqueNewRoles.join(","),
          ip_address: "Client Session"
        });
      } catch (err) {
        console.error("Failed to log staff action for role update:", err);
      }

      toast.success("User role updated successfully!");

      if (userId === auth.user?.id) {
        await auth.refreshUserMeta();
        toast.info("Your administrative privileges have been refreshed.");
      }
    } catch (e: any) {
      console.error("[AdminUsers] Role update failed, rolling back:", e);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roles: originalRoles } : u
        )
      );
      toast.error("Failed to update role: " + e.message);
    }
  };

  const toggleVerify = async (userId: string, verified: boolean) => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { error } = await sb
        .from("profiles")
        .update({ is_verified: verified })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_verified: verified } : u))
      );
      toast.success(verified ? "User verification approved" : "User verification revoked");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSuspend = async (userId: string, isSuspended: boolean) => {
    const sb = getSupabase();
    if (!sb) return;

    if (userId === auth.user?.id && isSuspended) {
      toast.error("You cannot suspend your own account.");
      return;
    }

    try {
      const timestamp = isSuspended ? new Date().toISOString() : null;
      const { error } = await sb
        .from("profiles")
        .update({ suspended_at: timestamp })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, suspended_at: timestamp } : u))
      );
      toast.success(isSuspended ? "User account suspended" : "User account unsuspended");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.display_name?.toLowerCase().includes(q) ?? false) ||
      (u.username?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Manage Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit registered accounts, update roles, verify, or suspend users.
          </p>
        </div>
        <PanelCard title="All Platform Users">
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
            <div className="text-sm text-muted-foreground">Fetching platform users...</div>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Manage Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit registered accounts, update roles, verify, or suspend users.
        </p>
      </div>

      <div className="flex gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface/50 border border-border/80 rounded-xl outline-none focus:border-gold/50 transition-all placeholder:text-muted-foreground text-foreground"
          />
        </div>
      </div>

      <PanelCard title={`Platform Users (${filteredUsers.length})`}>
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No Users Found"
            desc={searchQuery ? "No users matches your search query." : "No registered users in system database."}
          />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 lg:-mx-6 lg:px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-3">User info</th>
                  <th className="text-left font-medium py-3">Registration Date</th>
                  <th className="text-left font-medium py-3">Account Status</th>
                  <th className="text-left font-medium py-3">Current Role</th>
                  <th className="text-right font-medium py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const primaryRole = getPrimaryRole(user.roles);
                  const isSuspended = !!user.suspended_at;
                  const isMe = user.id === auth.user?.id;
                  const targetIsRestricted = user.roles.some((r) => ["owner", "super_admin"].includes(r));
                  const canEditTarget = isSuper || !targetIsRestricted;
                  const roleOptions = isSuper
                    ? ADMIN_ROLE_OPTIONS
                    : ADMIN_ROLE_OPTIONS.filter((o) => !["admin", "super_admin", "owner"].includes(o.value));

                  return (
                    <tr 
                      key={user.id} 
                      className="border-b border-border/50 hover:bg-surface/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetails(user)}
                    >
                      <td className="py-4.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {user.display_name ?? user.username ?? "Anonymous User"}
                            {isMe && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            {user.email ?? "no email"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4.5 text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-4.5" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1.5">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                              <Ban size={10} /> Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle size={10} /> Active
                            </span>
                          )}
                          {user.is_verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                              <UserCheck size={10} /> Verified
                            </span>
                          )}
                          {user.is_seller && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Seller
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4.5" onClick={e => e.stopPropagation()}>
                        <select
                          value={primaryRole}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={!canEditTarget}
                          className="bg-surface/80 border border-border/80 rounded-xl px-2.5 py-1 text-xs text-foreground font-medium outline-none focus:border-gold/50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-background">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetails(user)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface"
                          >
                            View details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {/* User Details Modal Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-lg rounded-3xl p-6 relative shadow-2xl flex flex-col gap-5 text-sm">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div>
              <div className="text-xs uppercase tracking-wider text-gold font-bold">User Control Center</div>
              <h2 className="font-display font-bold text-lg text-foreground mt-1">
                {selectedUser.display_name || selectedUser.username || "User Details"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{selectedUser.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-background/40 p-4 rounded-2xl border border-border/60">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Registered Email</span>
                <div className="font-mono text-xs font-bold text-foreground mt-1 truncate">{selectedUser.email || "—"}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Username</span>
                <div className="font-mono text-xs font-bold text-foreground mt-1">@{selectedUser.username || "—"}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Registration Date</span>
                <div className="text-xs font-bold text-foreground mt-1">
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Verification Badge</span>
                <div className="text-xs font-bold mt-1 text-gold">
                  {selectedUser.is_verified ? "Approved Verification" : "Not Verified"}
                </div>
              </div>
            </div>

            {/* Withdrawals Freeze Override */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-surface-elevated">
              <div className="flex gap-2">
                {isUserFrozen ? <Lock className="text-red-400 size-5 shrink-0" /> : <Unlock className="text-emerald-400 size-5 shrink-0" />}
                <div>
                  <div className="font-bold text-xs">Freeze Withdrawals</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Freeze all wallet payouts and withdrawal actions.</div>
                </div>
              </div>
              <button
                type="button"
                disabled={freezeChanging}
                onClick={handleToggleFreeze}
                className={`h-8 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
                  isUserFrozen ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {freezeChanging ? "Processing…" : isUserFrozen ? "Unfreeze Payouts" : "Freeze Payouts"}
              </button>
            </div>

            {/* Internal Notes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <StickyNote size={14} className="text-gold" />
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Staff Internal Notes (Private to Admin)</span>
              </div>
              <textarea
                value={userNotes}
                onChange={e => setUserNotes(e.target.value)}
                placeholder="Add audit history warnings, customer behavior notes, or staff reviews..."
                className="w-full min-h-[90px] p-3 text-xs bg-background/60 border border-border rounded-2xl focus:border-gold/50 outline-none text-foreground placeholder:text-muted-foreground/60 resize-none"
              />
              <button
                type="button"
                disabled={notesSaving}
                onClick={handleSaveNotes}
                className="h-8 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all self-end border-none cursor-pointer"
              >
                {notesSaving ? "Saving Notes…" : "Save Notes"}
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleVerify(selectedUser.id, !selectedUser.is_verified)}
                  className="h-9 px-4 rounded-xl border border-border text-xs font-bold hover:bg-surface transition-all cursor-pointer bg-transparent text-foreground"
                >
                  {selectedUser.is_verified ? "Revoke Verification" : "Approve Verification"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSuspend(selectedUser.id, !selectedUser.suspended_at)}
                  className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-transparent ${
                    selectedUser.suspended_at ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" : "border-red-500/20 text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  {selectedUser.suspended_at ? "Unsuspend Account" : "Suspend Account"}
                </button>
              </div>

              {/* Login Simulation Button */}
              {selectedUser.id !== auth.user?.id && (
                <button
                  type="button"
                  onClick={handleSimulateLogin}
                  className="h-9 px-4 rounded-xl bg-gold text-black font-extrabold text-xs inline-flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
                >
                  <LogIn size={13} /> Login As User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
