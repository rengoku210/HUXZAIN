import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { useEffect, useState } from "react";
import { roleService } from "@/lib/marketplace/roleService";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS, ROLES } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Manage Users — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  const [users, setUsers] = useState<{ id: string; email: string | null; roles: Role[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await roleService.getAllUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (userId: string, role: Role, enabled: boolean) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newRoles = enabled
      ? Array.from(new Set([...user.roles, role]))
      : user.roles.filter((r) => r !== role);
    try {
      await roleService.setRoles(userId, newRoles);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: newRoles } : u))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <>
        <h1 className="font-display text-2xl font-bold">Manage Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Suspend, verify, assign roles, and audit users.</p>
        <PanelCard title="Manage Users">
          <EmptyState title="Loading..." desc="Fetching users from Supabase." />
        </PanelCard>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Manage Users</h1>
      <p className="text-sm text-muted-foreground mt-1">Suspend, verify, assign roles, and audit users.</p>
      <div className="mt-6">
        <PanelCard title="Manage Users">
          {users.length === 0 ? (
            <EmptyState title="No users" desc="No users found in the database." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-surface/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/30">
                      <td className="px-4 py-2 text-sm text-foreground">{user.email ?? "(no email)"}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {ROLES.map((role) => (
                            <label key={role} className="inline-flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={user.roles.includes(role)}
                                onChange={(e) => toggleRole(user.id, role, e.target.checked)}
                                className="size-4 rounded border-gray-300 text-gold focus:ring-gold"
                              />
                              <span className="text-sm text-foreground">{ROLE_LABELS[role]}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      </div>
    </>
  );
}
