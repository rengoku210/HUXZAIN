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
  DollarSign,
  FileText,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

type NavItem = { to: string; label: string; icon: any; end?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Overview", icon: Shield, end: true },
      { to: "/admin/staff", label: "Staff Management", icon: Users },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/listings", label: "Listings", icon: List },
      { to: "/admin/categories", label: "Categories", icon: List },
      { to: "/admin/disputes", label: "Disputes", icon: AlertCircle },
      { to: "/admin/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/invoices", label: "Invoices", icon: FileText },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: CreditCard },
      { to: "/admin/earnings", label: "Earnings", icon: DollarSign },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/verifications", label: "Verifications", icon: Shield },
      { to: "/admin/tickets", label: "Support Tickets", icon: AlertCircle },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Emergency admin override: set VITE_ADMIN_OVERRIDE_EMAIL in .env to allow
// a single break-glass email if all DB roles are lost. Leave blank in production.
const ADMIN_OVERRIDE_EMAIL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ADMIN_OVERRIDE_EMAIL) || "";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HUXZAIN" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const auth = useAuth();
  const nav2 = useNavigate();
  const { location } = useRouterState();
  const isPaymentReviewer = auth.hasRole("payment_reviewer");
  const isVerificationOfficer = auth.hasRole("verification_officer");
  const isContentModerator = auth.hasRole("moderator") || auth.hasRole("dispute_manager");
  const isSupportStaff = auth.hasRole("support_agent");
  
  const isStaff = auth.hasRole("staff") || isPaymentReviewer || isVerificationOfficer || isContentModerator || isSupportStaff;
  const isAdminOrSuper = auth.hasAnyRole(["admin", "super_admin", "owner"]);
  const isEmailWhitelist = ADMIN_OVERRIDE_EMAIL.length > 0 && auth.user?.email === ADMIN_OVERRIDE_EMAIL;
  
  const allowed = isStaff || isAdminOrSuper || isEmailWhitelist;
  const isStrictStaff = isStaff && !isAdminOrSuper && !isEmailWhitelist;
  
  // Dynamic staff allowed paths based on specific role
  const staffAllowedPaths = useMemo(() => {
    let paths: string[] = [];
    if (isPaymentReviewer) {
      paths.push("/admin/withdrawals", "/admin/earnings");
    }
    if (isVerificationOfficer) {
      paths.push("/admin/verifications");
    }
    if (isContentModerator) {
      paths.push("/admin/disputes", "/admin/tickets", "/admin/listings");
    }
    if (isSupportStaff) {
      paths.push("/admin/tickets", "/admin/disputes");
    }
    // Fallback for general staff
    if (auth.hasRole("staff") && paths.length === 0) {
      paths.push("/admin/tickets");
    }
    return paths;
  }, [isPaymentReviewer, isVerificationOfficer, isContentModerator, isSupportStaff, auth]);

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      if (!allowed) {
        nav2({ to: "/dashboard" });
      } else if (location.pathname === "/admin/earnings" && !(isAdminOrSuper || isPaymentReviewer)) {
        nav2({ to: "/admin" });
      } else if (location.pathname === "/admin/staff" && !isAdminOrSuper) {
        nav2({ to: "/admin" });
      } else if (isStrictStaff) {
        // Redirect staff if they try to access non-allowed routes
        const currentPath = location.pathname;
        const isPathAllowed = staffAllowedPaths.some(p => currentPath === p || currentPath.startsWith(p + "/"));
        if (!isPathAllowed && staffAllowedPaths.length > 0) {
          nav2({ to: staffAllowedPaths[0] });
        }
      }
    }
  }, [auth.ready, auth.isAuthenticated, allowed, isStrictStaff, location.pathname, nav2, auth.roles, staffAllowedPaths, isPaymentReviewer, isAdminOrSuper]);

  if (!allowed) return null;

  const allItems = navGroups.flatMap((g) => g.items);

  const filteredNav = allItems.filter((n) => {
    if (isStrictStaff) {
      return staffAllowedPaths.includes(n.to);
    }
    if (n.to === "/admin/earnings") {
      return isAdminOrSuper || isPaymentReviewer;
    }
    if (n.to === "/admin/staff") {
      return isAdminOrSuper;
    }
    return true;
  });

  const filteredGroups: NavGroup[] = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => filteredNav.some((x) => x.to === i.to)) }))
    .filter((g) => g.items.length > 0);

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
          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.title}>
                <div className="px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">
                  {group.title}
                </div>
                <ul className="space-y-1">
                  {group.items.map((n) => {
                    const active = n.end
                      ? location.pathname === n.to
                      : location.pathname.startsWith(n.to);
                    return (
                      <li key={n.to}>
                        <Link
                          to={n.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            active
                              ? "bg-gold/10 text-gold border border-gold/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-surface"
                          }`}
                        >
                          <n.icon className="size-4" /> {n.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="border-t border-border/60 pt-3">
              <button
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </div>
          </div>
        </aside>
        <div>
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
