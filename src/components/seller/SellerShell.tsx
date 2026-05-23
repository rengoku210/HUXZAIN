import { ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, List, ShoppingBag, DollarSign, ArrowUpRight,
  Star, MessageSquare, Ticket, Rocket, BarChart3, Settings,
  LifeBuoy, CreditCard, Megaphone, LogOut, AlertCircle, Wallet,
  Bell, BadgeCheck, Palette, Lock, Receipt, Truck, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { SellerTierProvider, useSellerTier } from "@/lib/seller/tier-context";
import { TierBadge } from "./TierBadge";
import { UpgradeCelebration } from "./UpgradeCelebration";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/seller", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/seller/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/seller/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Catalog & Sales",
    items: [
      { to: "/seller/listings", label: "Listings", icon: List },
      { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
      { to: "/seller/delivery", label: "Delivery", icon: Truck },
      { to: "/seller/disputes", label: "Disputes", icon: AlertCircle },
      { to: "/seller/reviews", label: "Reviews", icon: Star },
      { to: "/seller/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/seller/earnings", label: "Earnings", icon: DollarSign },
      { to: "/seller/wallet", label: "Wallet", icon: Wallet },
      { to: "/seller/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
      { to: "/seller/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    title: "Growth",
    items: [
      { to: "/seller/coupons", label: "Coupons", icon: Ticket },
      { to: "/seller/boosts", label: "Boosts", icon: Rocket },
      { to: "/seller/ads", label: "Advertise", icon: Megaphone },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/seller/subscription", label: "Subscription", icon: CreditCard },
      { to: "/seller/verification", label: "Verification", icon: BadgeCheck },
      { to: "/seller/store", label: "Store", icon: Palette },
      { to: "/seller/security", label: "Security", icon: Lock },
      { to: "/seller/settings", label: "Settings", icon: Settings },
      { to: "/seller/support", label: "Support", icon: LifeBuoy },
    ],
  },
];

function SellerSidebar() {
  const { location } = useRouterState();
  const auth = useAuth();
  const { tier, meta } = useSellerTier();

  return (
    <aside className="rounded-2xl border border-border bg-surface/40 p-3 h-fit lg:sticky lg:top-32">
      <div
        className="rounded-xl p-4 mb-3 border border-border/60 relative overflow-hidden"
        style={{ background: meta.surfaceGradient }}
      >
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Seller</div>
        <div className="text-sm font-semibold truncate mt-0.5">
          {auth.profile?.display_name ?? auth.user?.email ?? "Guest"}
        </div>
        <div className="mt-3">
          <TierBadge tier={tier} size="sm" />
        </div>
      </div>

      <nav className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((n) => {
                const active = n.end ? location.pathname === n.to : location.pathname.startsWith(n.to);
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-gold/10 text-gold border border-gold/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      <n.icon className="size-4" /> <span className="flex-1">{n.label}</span>
                      {active && <ChevronRight size={12} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-surface"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </nav>
    </aside>
  );
}

function ShellInner({ children }: { children?: ReactNode }) {
  const { meta } = useSellerTier();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: `radial-gradient(1200px 600px at 80% -10%, ${meta.glow}, transparent 60%)` }}>
      <Header />
      <main className="flex-1 container-page py-6 lg:py-8 grid lg:grid-cols-[260px_1fr] gap-6">
        <SellerSidebar />
        <div className="min-w-0">{children ?? <Outlet />}</div>
      </main>
      <Footer />
      <UpgradeCelebration />
    </div>
  );
}

export function SellerShell({ children }: { children?: ReactNode }) {
  return (
    <SellerTierProvider>
      <ShellInner>{children}</ShellInner>
    </SellerTierProvider>
  );
}

export function PanelCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface/40 p-5 lg:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && <div className="font-semibold">{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  positive = true,
  icon: Icon,
  premium = false,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon?: typeof LayoutDashboard;
  premium?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface/40 p-5 relative overflow-hidden ${
        premium ? "ring-1 ring-gold/20" : ""
      }`}
    >
      {premium && (
        <div
          className="absolute -top-12 -right-12 size-32 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(closest-side, oklch(0.82 0.13 82), transparent)" }}
        />
      )}
      <div className="flex items-start justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        {Icon && (
          <div className="size-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="font-display text-2xl font-bold mt-2">{value}</div>
      {delta && (
        <div className={`text-xs mt-1.5 ${positive ? "text-emerald-400" : "text-destructive"}`}>{delta}</div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Processing: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    Pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Paused: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    Disputed: "bg-destructive/15 text-destructive border-destructive/20",
    Open: "bg-destructive/15 text-destructive border-destructive/20",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}
