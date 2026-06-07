import { ReactNode, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-client";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  List,
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  Star,
  MessageSquare,
  Ticket,
  Rocket,
  BarChart3,
  Settings,
  LifeBuoy,
  CreditCard,
  Megaphone,
  LogOut,
  AlertCircle,
  Wallet,
  Bell,
  BadgeCheck,
  Palette,
  Lock,
  Receipt,
  Truck,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { SellerTierProvider, useSellerTier, type SellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { TierBadge } from "./TierBadge";
import { UpgradeCelebration } from "./UpgradeCelebration";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; minTier?: SellerTier };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/seller", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/seller/analytics", label: "Analytics", icon: BarChart3, minTier: "pro" },
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
      { to: "/messages", label: "Messages / Chat", icon: MessageSquare },
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
      { to: "/seller/coupons", label: "Coupons", icon: Ticket, minTier: "pro" },
      { to: "/seller/boosts", label: "Boosts", icon: Rocket, minTier: "pro" },
      { to: "/seller/ads", label: "Advertise", icon: Megaphone, minTier: "enterprise" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/seller/subscription", label: "Subscription", icon: CreditCard },
      { to: "/seller/verification", label: "Verification", icon: BadgeCheck },
      { to: "/seller/store", label: "Storefront Theme", icon: Palette, minTier: "elite" },
      { to: "/seller/security", label: "Security", icon: Lock },
      { to: "/seller/settings", label: "Settings", icon: Settings },
      { to: "/seller/support", label: "Support", icon: LifeBuoy },
    ],
  },
];

function SellerSidebar({ 
  onLinkClick, 
  logoUrl,
  className = "hidden lg:block rounded-2xl border border-border bg-surface/40 p-3 h-fit lg:sticky lg:top-32"
}: { 
  onLinkClick?: () => void; 
  logoUrl?: string | null;
  className?: string;
}) {
  const { location } = useRouterState();
  const auth = useAuth();
  const { tier, meta } = useSellerTier();
  const supabase = getSupabase();

  const requestAdminAccess = async () => {
    const sb = getSupabase();
    if (!sb) {
      toast.error('Supabase not configured');
      return;
    }
    const email = auth.user?.email?.toLowerCase();
    if (email === "lullilullivabhaiva@gmail.com") {
      const { error } = await sb
        .from("user_roles")
        .insert({ user_id: auth.user!.id, role: "admin" })
        .maybeSingle();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Admin access granted successfully");
        await auth.refreshUserMeta();
      }
    } else {
      toast.error("You are not authorized for admin access");
    }
  };

  return (
    <aside className={className}>
      <div
        className="rounded-xl p-4 mb-3 border border-border/60 relative overflow-hidden flex flex-col gap-3"
        style={{ background: meta.surfaceGradient }}
      >
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <div className="size-9 rounded-lg border border-border/60 overflow-hidden bg-background shrink-0 shadow-md">
              <img src={logoUrl} className="w-full h-full object-cover" alt="Store logo" />
            </div>
          ) : (
            <div className="size-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center font-display text-xs font-bold text-gold shrink-0 shadow-md">
              {(auth.profile?.display_name ?? auth.user?.email ?? "S")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 leading-none">Storefront</div>
            <div className="text-xs font-bold truncate text-foreground mt-0.5">
              {auth.profile?.display_name ?? auth.user?.email?.split("@")[0] ?? "Store"}
            </div>
          </div>
        </div>
        <div className="border-t border-border/40 pt-2.5 flex items-center justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Tier</span>
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
                const active = n.end
                  ? location.pathname === n.to
                  : location.pathname.startsWith(n.to);
                const isLocked = n.minTier ? !tierAtLeast(tier, n.minTier) : false;
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      onClick={() => {
                        if (onLinkClick) onLinkClick();
                      }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-gold/10 text-gold border border-gold/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      <n.icon className={`size-4 ${isLocked ? "text-muted-foreground/50" : ""}`} /> 
                      <span className={`flex-1 ${isLocked ? "text-muted-foreground/80" : ""}`}>{n.label}</span>
                      {isLocked ? (
                        <Lock className="size-3 text-muted-foreground/50 shrink-0" />
                      ) : active ? (
                        <ChevronRight size={12} />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Admin Panel Link */}
        {auth.roles.includes("admin") && (
          <Link
            to="/admin"
            onClick={() => {
              if (onLinkClick) onLinkClick();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-gold/10 text-gold hover:bg-gold/20"
          >
            <Shield className="size-4" /> Admin Panel
          </Link>
        )}

        <button
          onClick={() => {
            if (onLinkClick) onLinkClick();
            auth.signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-surface"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </nav>
    </aside>
  );
}

function MobileSellerNav() {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const auth = useAuth();
  const { tier, meta } = useSellerTier();

  // Find active nav item to display in the collapsed bar
  const allItems = navGroups.flatMap(g => g.items);
  const activeItem = allItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) || allItems[0];

  return (
    <div className="lg:hidden w-full mb-4">
      {/* Active Item and Menu Toggle Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-surface/60 backdrop-blur-md shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
            {activeItem && <activeItem.icon size={16} />}
          </div>
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Seller Menu</div>
            <div className="text-sm font-bold text-foreground">{activeItem?.label || "Navigation"}</div>
          </div>
        </div>
        <span className="text-xs text-gold bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/20 font-bold transition-all active:scale-95">
          {open ? "Close" : "Choose View"}
        </span>
      </button>

      {/* Expanded Menu Dropdown */}
      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-surface/90 backdrop-blur-xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 z-40 relative max-h-[70vh] overflow-y-auto space-y-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-1.5">
                {group.title}
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {group.items.map((n) => {
                  const active = n.end
                    ? location.pathname === n.to
                    : location.pathname.startsWith(n.to);
                  const isLocked = n.minTier ? !tierAtLeast(tier, n.minTier) : false;
                  return (
                    <li key={n.to}>
                      <Link
                        to={n.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors border ${
                          active
                            ? "bg-gold/10 text-gold border-gold/20 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface border-transparent"
                        }`}
                      >
                        <n.icon className={`size-3.5 ${isLocked ? "text-muted-foreground/50" : ""}`} /> 
                        <span className={`truncate flex-1 ${isLocked ? "text-muted-foreground/80" : ""}`}>{n.label}</span>
                        {isLocked && <Lock className="size-2.5 text-muted-foreground/50 shrink-0" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Action buttons */}
          <div className="border-t border-border/40 pt-4 flex gap-2">
            <button
              onClick={() => {
                setOpen(false);
                auth.signOut();
              }}
              className="flex-1 h-9 rounded-xl border border-border text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 bg-surface/20"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShellInner({ children }: { children?: ReactNode }) {
  const { meta } = useSellerTier();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useRouterState().location;
  const allowed = auth.hasAnyRole(["seller", "admin", "super_admin", "owner"]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Store Customizations States for active accents / branding
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("midnight");
  const [themeEnabled, setThemeEnabled] = useState<boolean>(true);

  useEffect(() => {
    async function loadCustomizations() {
      if (!auth.user) return;
      try {
        const sb = getSupabase();
        if (sb) {
          const { data } = await sb
            .from("seller_customizations")
            .select("accent_color, theme_color, logo_url")
            .eq("id", auth.user.id)
            .maybeSingle();
            
          if (data) {
            const rawTheme = data.theme_color || "midnight";
            const [themeId, status] = rawTheme.split("|");
            const isEnabled = status !== "disabled";
            
            setThemeEnabled(isEnabled);
            setActiveTheme(themeId || "midnight");
            
            if (isEnabled) {
              setAccentColor(data.accent_color || "#d4b46a");
            } else {
              setAccentColor(null);
            }
            setLogoUrl(data.logo_url || null);
          }
        }
      } catch (e) {
        console.warn("Failed to load seller panel customizations:", e);
      }
    }
    loadCustomizations();

    window.addEventListener("seller-theme-updated", loadCustomizations);
    return () => {
      window.removeEventListener("seller-theme-updated", loadCustomizations);
    };
  }, [auth.user, auth.ready]);

  // Find active nav item to display in the mobile top bar
  const allItems = navGroups.flatMap(g => g.items);
  const activeItem = allItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)) || allItems[0];

  useEffect(() => {
    if (auth.ready && !allowed) navigate({ to: "/account" });
  }, [auth.ready, allowed, navigate]);

  if (!allowed) return null;

  // Custom Theme Palette Definitions
  const themeColors: Record<string, {
    background: string;
    surface: string;
    surfaceElevated: string;
    card: string;
    gold: string;
    goldSoft: string;
    border: string;
    ring: string;
    primary: string;
    primaryForeground: string;
  }> = {
    midnight: {
      background: "oklch(0.16 0.012 250)",
      surface: "oklch(0.19 0.013 250)",
      surfaceElevated: "oklch(0.225 0.014 250)",
      card: "oklch(0.205 0.013 250)",
      gold: "oklch(0.82 0.13 82)",
      goldSoft: "oklch(0.72 0.105 80)",
      border: "oklch(0.28 0.014 250 / 70%)",
      ring: "oklch(0.82 0.13 82 / 50%)",
      primary: "oklch(0.82 0.13 82)",
      primaryForeground: "oklch(0.18 0.015 250)"
    },
    noir: {
      background: "#080808",
      surface: "#141414",
      surfaceElevated: "#222222",
      card: "#0d0d0d",
      gold: "#e85d3a",
      goldSoft: "#a83d22",
      border: "rgba(232, 93, 58, 0.3)",
      ring: "rgba(232, 93, 58, 0.5)",
      primary: "#e85d3a",
      primaryForeground: "#ffffff"
    },
    indigo: {
      background: "#04040f",
      surface: "#0c0c24",
      surfaceElevated: "#18184a",
      card: "#08081c",
      gold: "#6366f1",
      goldSoft: "#4338ca",
      border: "rgba(99, 102, 241, 0.3)",
      ring: "rgba(99, 102, 241, 0.5)",
      primary: "#6366f1",
      primaryForeground: "#ffffff"
    },
    platinum: {
      background: "#0a0a0a",
      surface: "#1a1a1a",
      surfaceElevated: "#2d2d2d",
      card: "#141414",
      gold: "#e5e5e5",
      goldSoft: "#a3a3a3",
      border: "rgba(229, 229, 229, 0.3)",
      ring: "rgba(229, 229, 229, 0.5)",
      primary: "#e5e5e5",
      primaryForeground: "#000000"
    },
    violet: {
      background: "#080312",
      surface: "#14072b",
      surfaceElevated: "#240d4f",
      card: "#0f0521",
      gold: "#a78bfa",
      goldSoft: "#7c3aed",
      border: "rgba(167, 139, 250, 0.3)",
      ring: "rgba(167, 139, 250, 0.5)",
      primary: "#a78bfa",
      primaryForeground: "#ffffff"
    }
  };

  const currentTheme = themeEnabled ? (themeColors[activeTheme] || themeColors.midnight) : null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(1200px 600px at 80% -10%, ${meta.glow}, transparent 60%)`,
      }}
    >
      {currentTheme && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --background: ${currentTheme.background} !important;
            --surface: ${currentTheme.surface} !important;
            --surface-elevated: ${currentTheme.surfaceElevated} !important;
            --card: ${currentTheme.card} !important;
            --gold: ${currentTheme.gold} !important;
            --gold-soft: ${currentTheme.goldSoft} !important;
            --primary: ${currentTheme.gold} !important;
            --primary-foreground: ${currentTheme.primaryForeground} !important;
            --border: ${currentTheme.border} !important;
            --ring: ${currentTheme.ring} !important;
          }
          .text-gold {
            color: ${currentTheme.gold} !important;
          }
          .bg-gold {
            background-color: ${currentTheme.gold} !important;
            color: ${currentTheme.primaryForeground} !important;
          }
          .border-gold {
            border-color: ${currentTheme.gold} !important;
          }
          .border-gold\\/40 {
            border-color: ${currentTheme.gold}66 !important;
          }
          .border-gold\\/20 {
            border-color: ${currentTheme.gold}33 !important;
          }
          .bg-gold\\/10 {
            background-color: ${currentTheme.gold}1a !important;
          }
          .bg-gold\\/15 {
            background-color: ${currentTheme.gold}26 !important;
          }
          .bg-gold\\/5 {
            background-color: ${currentTheme.gold}0d !important;
          }
          .hover\\:bg-gold\\/10:hover {
            background-color: ${currentTheme.gold}1a !important;
          }
          .hover\\:border-gold\\/40:hover {
            border-color: ${currentTheme.gold}66 !important;
          }
          .text-gold-gradient {
            background: linear-gradient(135deg, ${currentTheme.gold}, #ffffff) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
          }
        `}} />
      )}
      <Header />
      
      {/* Sticky Mobile Top Bar */}
      <div className="lg:hidden sticky top-[72px] z-30 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setDrawerOpen(true)}
          className="size-10 rounded-xl border border-border bg-surface/20 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gold/30 active:scale-95 transition-all"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
            {activeItem && <activeItem.icon size={12} />}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            {activeItem?.label || "Seller Portal"}
          </span>
        </div>
        <div className="w-10 flex justify-end">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Slide-out Navigation Drawer Portal for Mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out animate-in fade-in"
          />

          {/* Drawer Panel Container */}
          <div className="relative w-[280px] max-w-[85vw] h-full bg-background border-r border-border p-4 flex flex-col overflow-y-auto z-50 animate-in slide-in-from-left duration-300 ease-out">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/20">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-gold tracking-wider text-sm">HUXZAIN SELLER</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Render the sidebar in drawer mode */}
            <SellerSidebar 
              onLinkClick={() => setDrawerOpen(false)} 
              logoUrl={logoUrl}
              className="flex-1 space-y-4"
            />
          </div>
        </div>
      )}

      <main className="flex-1 container-page py-6 lg:py-8 grid lg:grid-cols-[260px_1fr] gap-6">
        <SellerSidebar logoUrl={logoUrl} />
        <div className="min-w-0">
          {children ?? <Outlet />}
        </div>
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

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: ReactNode;
}) {
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
        <div className={`text-xs mt-1.5 ${positive ? "text-emerald-400" : "text-destructive"}`}>
          {delta}
        </div>
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
    Review: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Approved: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    Paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Rejected: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status}
    </span>
  );
}
