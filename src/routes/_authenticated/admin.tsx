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
  Megaphone,
  ClipboardList,
  Landmark,
  ShoppingBag,
  MessageSquareWarning,
  HeartPulse,
  Search,
  Activity,
  ShieldAlert,
  Palette,
  Rocket,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

type NavItem = { to: string; label: string; icon: any; end?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: Shield, end: true },
      { to: "/admin/staff", label: "Staff Management", icon: Users },
      { to: "/admin/tasks", label: "Task Management", icon: ClipboardList },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/listings", label: "Listings", icon: List },
      { to: "/admin/categories", label: "Categories", icon: List },
      { to: "/admin/disputes", label: "Disputes", icon: AlertCircle },
      { to: "/admin/chats", label: "Chat Monitoring", icon: MessageSquareWarning },
      { to: "/admin/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/admin/finances", label: "Financial Control", icon: Landmark },
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/boosts", label: "Boost Requests", icon: Rocket },
      { to: "/admin/invoices", label: "Invoices", icon: FileText },
      { to: "/admin/invoice-templates", label: "Invoice Templates", icon: Palette },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: CreditCard },
      { to: "/admin/earnings", label: "Earnings", icon: DollarSign },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/communication", label: "Communication", icon: Megaphone },
      { to: "/admin/verifications", label: "Verifications", icon: Shield },
      { to: "/admin/tickets", label: "Support Tickets", icon: AlertCircle },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Security & Compliance",
    items: [
      { to: "/admin/audit-logs", label: "Audit Logs", icon: Activity },
      { to: "/admin/security-logs", label: "Security Logs", icon: ShieldAlert },
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
    let paths: string[] = ["/admin/tasks"]; // All staff can see their tasks
    if (auth.hasRole("staff")) {
      paths.push("/admin/payments", "/admin/subscriptions", "/admin/tickets", "/admin/boosts");
    }
    if (isPaymentReviewer) {
      paths.push("/admin/withdrawals", "/admin/earnings", "/admin/finances", "/admin/boosts");
    }
    if (isVerificationOfficer) {
      paths.push("/admin/verifications");
    }
    if (isContentModerator) {
      paths.push("/admin/disputes", "/admin/tickets", "/admin/listings", "/admin/chats", "/admin/orders");
    }
    if (isSupportStaff) {
      paths.push("/admin/tickets", "/admin/disputes");
    }
    return paths;
  }, [isPaymentReviewer, isVerificationOfficer, isContentModerator, isSupportStaff, auth]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const activeItem = allItems.find((n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) || allItems[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-6 lg:py-8 grid lg:grid-cols-[240px_1fr] gap-6">
        
        {/* Mobile Navigation Dropdown for Admin Panel */}
        <div className="lg:hidden w-full mb-2 z-30 relative">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-surface/60 backdrop-blur-md shadow-lg cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                {activeItem && <activeItem.icon size={16} />}
              </div>
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Admin Console</div>
                <div className="text-sm font-bold text-foreground">{activeItem?.label || "Navigation"}</div>
              </div>
            </div>
            <span className="text-xs text-gold bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/20 font-bold transition-all active:scale-95">
              {mobileNavOpen ? "Close" : "Choose View"}
            </span>
          </button>

          {mobileNavOpen && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-border bg-background/95 backdrop-blur-xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 z-50 max-h-[60vh] overflow-y-auto space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <div className="px-3 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-1.5">
                    {group.title}
                  </div>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {group.items.map((n) => {
                      const active = n.end
                        ? location.pathname === n.to
                        : location.pathname.startsWith(n.to);
                      return (
                        <li key={n.to}>
                          <Link
                            to={n.to}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors border ${
                              active
                                ? "bg-gold/10 text-gold border-gold/20 font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-surface border-transparent"
                            }`}
                          >
                            <n.icon className="size-3.5" /> 
                            <span className="truncate flex-1">{n.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="border-t border-border/40 pt-4">
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    auth.signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-xs text-muted-foreground hover:text-destructive bg-surface/20 cursor-pointer"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden lg:block rounded-2xl border border-border bg-surface/40 p-3 h-fit lg:sticky lg:top-32">
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
