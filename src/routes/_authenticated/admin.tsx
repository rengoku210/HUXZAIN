import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  Users,
  List,
  AlertCircle,
  Flag,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
} from "lucide-react";
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
  { to: "/admin/withdrawals", label: "Withdrawals", icon: CreditCard },
  { to: "/admin/verifications", label: "Verifications", icon: Shield },
  { to: "/admin/tickets", label: "Support Tickets", icon: AlertCircle },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/disputes", label: "Disputes", icon: AlertCircle },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

// Email-based admin whitelist (for accounts that may not have DB roles yet)
const ADMIN_EMAILS = ["admin@admin.com", "lullilullivabhaiva@gmail.com", "rammodhvadiya210@gmail.com"];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HUXZAIN" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const auth = useAuth();
  const nav2 = useNavigate();
  const { location } = useRouterState();
  
  const isStaff = auth.hasRole("staff");
  const isModerator = auth.hasRole("moderator");
  const isAdminOrSuper = auth.hasAnyRole(["admin", "super_admin", "owner"]);
  const isEmailWhitelist = ADMIN_EMAILS.includes(auth.user?.email ?? "");
  
  const allowed = isStaff || isModerator || isAdminOrSuper || isEmailWhitelist;
  const isStrictStaff = isStaff && !isModerator && !isAdminOrSuper && !isEmailWhitelist;
  
  const staffAllowedPaths = ["/admin/payments", "/admin/subscriptions"];

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      if (!allowed) {
        nav2({ to: "/dashboard" });
      } else if (isStrictStaff) {
        // Redirect staff if they try to access non-payment/subscription routes
        const currentPath = location.pathname;
        const isPathAllowed = staffAllowedPaths.some(p => currentPath === p || currentPath.startsWith(p + "/"));
        if (!isPathAllowed) {
          nav2({ to: "/admin/payments" });
        }
      }
    }
  }, [auth.ready, auth.isAuthenticated, allowed, isStrictStaff, location.pathname, nav2]);

  if (!allowed) return null;

  const filteredNav = nav.filter(n => {
    if (isStrictStaff) {
      return staffAllowedPaths.includes(n.to);
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-8 grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="rounded-2xl border border-border bg-surface/40 p-3 h-fit lg:sticky lg:top-32">
          <div className="px-3 py-3 border-b border-border/60 mb-3">
            <div className="text-xs text-muted-foreground">Admin Console</div>
            <div className="text-sm font-semibold truncate">
              {auth.profile?.display_name ?? auth.user?.email}
            </div>
          </div>
          <ul className="space-y-1">
            {filteredNav.map((n) => {
              const active = n.end
                ? location.pathname === n.to
                : location.pathname.startsWith(n.to);
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-gold/10 text-gold border border-gold/20" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}
                  >
                    <n.icon className="size-4" /> {n.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </li>
          </ul>
        </aside>
        <div>
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
