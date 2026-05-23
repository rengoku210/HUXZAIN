import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Shield, Users, List, AlertCircle, Flag, BarChart3, Settings, LogOut, CreditCard } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

const nav = [
  { to: "/admin", label: "Overview", icon: Shield, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/listings", label: "Listings", icon: List },
  { to: "/admin/categories", label: "Categories", icon: List },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/disputes", label: "Disputes", icon: AlertCircle },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

// Email-based admin whitelist (for accounts that may not have DB roles yet)
const ADMIN_EMAILS = [
  "admin@admin.com",
  "lullilullivabhaiva@gmail.com",
];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HUXZAIN" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const auth = useAuth();
  const nav2 = useNavigate();
  const { location } = useRouterState();
  const allowed = auth.hasAnyRole(["admin", "super_admin", "moderator", "staff", "owner"])
    || ADMIN_EMAILS.includes(auth.user?.email ?? "");

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated && !allowed) nav2({ to: "/dashboard" });
  }, [auth.ready, auth.isAuthenticated, allowed, nav2]);

  if (!allowed) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-8 grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="rounded-2xl border border-border bg-surface/40 p-3 h-fit lg:sticky lg:top-32">
          <div className="px-3 py-3 border-b border-border/60 mb-3">
            <div className="text-xs text-muted-foreground">Admin Console</div>
            <div className="text-sm font-semibold truncate">{auth.profile?.display_name ?? auth.user?.email}</div>
          </div>
          <ul className="space-y-1">
            {nav.map((n) => {
              const active = n.end ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <li key={n.to}>
                  <Link to={n.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-gold/10 text-gold border border-gold/20" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
                    <n.icon className="size-4" /> {n.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button onClick={() => auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface">
                <LogOut className="size-4" /> Logout
              </button>
            </li>
          </ul>
        </aside>
        <div><Outlet /></div>
      </main>
      <Footer />
    </div>
  );
}
