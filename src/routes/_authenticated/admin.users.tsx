import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { useEffect, useState } from "react";
import { roleService } from "@/lib/marketplace/roleService";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import type { Role } from "@/lib/roles";
import { useAuth } from "@/lib/auth/auth-context";
import { Search, UserCheck, ShieldAlert, Ban, CheckCircle, AlertTriangle } from "lucide-react";

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
  { value: "staff", label: "Staff" },
  { value: "moderator", label: "Sub Admin" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

function getPrimaryRole(roles: Role[]): string {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  if (roles.includes("staff")) return "staff";
  return "buyer";
}

function Page() {
  const auth = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) return;

      const { data: profiles, error: pErr } = await sb
        .from("profiles")
        .select("id, email, display_name, username, created_at, suspended_at, is_seller, is_verified")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      const { data: roleRows, error: rErr } = await sb
        .from("user_roles")
        .select("user_id, role");

      if (rErr) throw rErr;

      const roleMap: Record<string, Role[]> = {};
      roleRows?.forEach((row) => {
        const uid = row.user_id;
        const r = row.role as Role;
        if (!roleMap[uid]) roleMap[uid] = [];
        roleMap[uid].push(r);
      });

      const combined: ManagedUser[] = (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        username: p.username,
        created_at: p.created_at,
        suspended_at: p.suspended_at,
        is_seller: p.is_seller,
        is_verified: p.is_verified,
        roles: roleMap[p.id] ?? [],
      }));

      setUsers(combined);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch users: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newPrimaryRole: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // Self-demotion protection check
    if (userId === auth.user?.id) {
      const isDemoting = !["admin", "super_admin"].includes(newPrimaryRole);
      if (isDemoting) {
        // Count other admins
        const otherAdmins = users.filter(
          (u) =>
            u.id !== auth.user?.id &&
            (u.roles.includes("admin") || u.roles.includes("super_admin"))
        ).length;

        if (otherAdmins === 0) {
          toast.error("Security Alert: You cannot remove your own admin access as you are the last remaining administrator.", {
            duration: 5000,
          });
          return;
        }
      }
    }

    try {
      // Build new roles array
      const newRoles: Role[] = ["buyer"];
      if (newPrimaryRole !== "buyer") {
        newRoles.push(newPrimaryRole as Role);
      }
      if (user.is_seller || user.roles.includes("seller")) {
        newRoles.push("seller");
      }

      const uniqueNewRoles = Array.from(new Set(newRoles));

      await roleService.setRoles(userId, uniqueNewRoles);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roles: uniqueNewRoles } : u
        )
      );

      toast.success("User role updated successfully!");

      // If we updated ourselves, refresh auth metadata immediately so that permissions apply instantly
      if (userId === auth.user?.id) {
        await auth.refreshUserMeta();
        toast.info("Your administrative privileges have been refreshed.");
      }
    } catch (e: any) {
      console.error(e);
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
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface/50 border border-border/80 rounded-xl outline-none focus:border-gold/50 transition-all placeholder:text-muted-foreground"
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

                  return (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
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
                      <td className="py-4.5">
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
                      <td className="py-4.5">
                        <select
                          value={primaryRole}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-surface/80 border border-border/80 rounded-xl px-2.5 py-1 text-xs text-foreground font-medium outline-none focus:border-gold/50 cursor-pointer"
                        >
                          {ADMIN_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-background">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleVerify(user.id, !user.is_verified)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              user.is_verified
                                ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                : "border-gold/20 text-gold hover:bg-gold/10"
                            }`}
                          >
                            {user.is_verified ? "Revoke Verification" : "Verify User"}
                          </button>
                          <button
                            onClick={() => toggleSuspend(user.id, !isSuspended)}
                            disabled={isMe}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              isMe
                                ? "border-transparent text-muted-foreground/30 cursor-not-allowed"
                                : isSuspended
                                ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-red-500/20 text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            {isSuspended ? "Unsuspend" : "Suspend"}
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
    </div>
  );
}
