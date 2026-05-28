import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  Bell,
  Menu,
  ChevronDown,
  Flame,
  HelpCircle,
  User,
  LayoutDashboard,
  Store,
  ShoppingBag,
  Wallet,
  Settings,
  LogOut,
  Shield,
  X,
  Package,
  ArrowRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import logo from "@/assets/huxzain-logo.png";
import defaultAvatar from "@/assets/default-avatar.png";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-client";
import * as LucideIcons from "lucide-react";
import { cartStore } from "@/lib/cart/cart-store";
import { formatPrice } from "@/lib/marketplace/listing-adapter";

function getCategoryIcon(slug: string, dbIcon?: string | null): typeof LucideIcons.Package {
  if (dbIcon && dbIcon in LucideIcons) {
    return (LucideIcons as any)[dbIcon];
  }
  const map: Record<string, typeof LucideIcons.Package> = {
    "digital-products": LucideIcons.Monitor,
    "services": LucideIcons.Cog,
    "hosting": LucideIcons.Server,
    "seo": LucideIcons.Search,
    "design": LucideIcons.Palette,
    "programming": LucideIcons.Code2,
    "marketing": LucideIcons.Megaphone,
    "business": LucideIcons.Building2,
    "gaming-entertainment": LucideIcons.Gamepad2,
    "gaming": LucideIcons.Gamepad2,
    "accounts": LucideIcons.Gamepad2,
    "game-accounts": LucideIcons.Gamepad2,
    "currency": LucideIcons.Coins,
    "in-game-credits": LucideIcons.Coins,
    "gift-cards": LucideIcons.Gift,
    "boosting": LucideIcons.Rocket,
    "rank-boosting": LucideIcons.Rocket,
    "coaching": LucideIcons.GraduationCap,
    "subscriptions": LucideIcons.Crown,
  };
  return map[slug] ?? LucideIcons.Package;
}

const ADMIN_EMAILS = ["admin@admin.com", "lullilullivabhaiva@gmail.com"];

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function Header() {
  const { isAuthenticated, user, profile, roles, signOut, ready } = useAuth();
  const navigate = useNavigate();

  const [catOpen, setCatOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [navCategories, setNavCategories] = useState<any[]>([]);
  const [listingsCounts, setListingsCounts] = useState<Record<string, number>>({});
  const [cartItems, setCartItems] = useState(cartStore.getItems());

  useEffect(() => {
    const handleCartUpdate = () => {
      setCartItems(cartStore.getItems());
    };
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  useEffect(() => {
    async function loadNavData() {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const [catsRes, listingsRes] = await Promise.all([
          sb.from("categories").select("*").order("sort_order"),
          sb.from("listings").select("category_id").eq("status", "active")
        ]);

        if (catsRes.error) throw catsRes.error;
        if (listingsRes.error) throw listingsRes.error;

        const cats = catsRes.data ?? [];
        const listings = listingsRes.data ?? [];

        const counts: Record<string, number> = {};
        listings.forEach((item: any) => {
          if (item.category_id) {
            counts[item.category_id] = (counts[item.category_id] ?? 0) + 1;
          }
        });

        const hasParentId = cats.length > 0 && "parent_id" in cats[0];

        const parents = hasParentId
          ? cats.filter((c: any) => c.parent_id === null)
          : cats.filter((c: any) => !["accounts", "currency", "gift-cards", "boosting", "coaching", "subscriptions", "game-accounts", "rank-boosting", "in-game-credits"].includes(c.slug));

        const slugCounts: Record<string, number> = {};
        parents.forEach((p: any) => {
          const children = hasParentId
            ? cats.filter((c: any) => c.parent_id === p.id)
            : (p.slug === "gaming-entertainment"
                ? cats.filter((c: any) => ["accounts", "currency", "gift-cards", "boosting", "coaching", "subscriptions", "game-accounts", "rank-boosting", "in-game-credits"].includes(c.slug))
                : []);
          
          const totalCount = (counts[p.id] ?? 0) + children.reduce((sum: number, child: any) => sum + (counts[child.id] ?? 0), 0);
          slugCounts[p.slug] = totalCount;
        });

        setNavCategories(parents);
        setListingsCounts(slugCounts);
      } catch (err) {
        console.error("Failed to load nav bar category sync data:", err);
      }
    }

    void loadNavData();
  }, []);

  const navItems = [
    { to: "/", label: "Home" },
    ...navCategories.map((c) => ({
      to: "/category/$slug",
      params: { slug: c.slug },
      label: c.name,
    })),
  ];

  const accountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setAccountOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) setCartOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const isAdmin =
    roles.some((r) => ["admin", "super_admin", "owner", "staff", "moderator"].includes(r)) ||
    ADMIN_EMAILS.includes(user?.email ?? "");
  const isSeller = roles.some((r) => ["seller", "admin", "super_admin", "owner"].includes(r));

  const displayName =
    profile?.display_name ?? user?.user_metadata?.display_name ?? user?.email ?? "Account";
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = getInitials(
    profile?.display_name ?? user?.user_metadata?.display_name,
    user?.email,
  );

  async function handleSignOut() {
    setAccountOpen(false);
    await signOut();
    toast.success("Signed out successfully.");
    navigate({ to: "/" });
  }

  async function handleCheckout() {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to checkout.");
      navigate({ to: "/login", search: { redirect: "/" } });
      return;
    }
    if (cartItems.length === 0) return;

    const sb = getSupabase();
    if (!sb) {
      toast.error("Backend not configured.");
      return;
    }

    setCartOpen(false);
    const item = cartItems[0]; // Simple logic: checkout first item
    try {
      const price = Number(item.price_inr ?? item.price ?? 0);
      const { data: order, error: orderError } = await sb
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: item.seller_id,
          listing_id: item.id,
          qty: 1,
          amount_total: price,
          currency: item.currency ?? "INR",
          payment_method: "manual",
          status: "pending_payment",
        })
        .select("id")
        .single();
      if (orderError) throw orderError;

      const amountCents = Math.round(price * 100);
      await sb.from("transactions").insert({
        user_id: user.id,
        order_id: order.id,
        type: "charge",
        amount_cents: amountCents,
        currency: item.currency ?? "INR",
        ref: `manual:${order.id}`,
        status: "pending",
      });

      // Optional: clear cart after order creation or item specifically
      cartStore.removeItem(item.id);

      navigate({
        to: "/checkout/payment",
        search: { orderId: order.id, listingId: item.id, price: String(price) },
      });
    } catch (e: any) {
      toast.error(`Checkout failed: ${e.message}`);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        {/* â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="container-page flex h-16 items-center gap-4">
          <Link to="/" className="flex items-center shrink-0 bg-transparent border-none outline-none shadow-none p-0 hover:opacity-90 transition-opacity">
            <img 
              src={logo} 
              alt="HUXZAIN" 
              className="h-10 w-auto bg-transparent select-none pointer-events-none" 
            />
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-2xl items-stretch rounded-xl border border-border bg-surface/80 overflow-hidden focus-within:border-gold/60 transition-colors">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="flex items-center gap-1.5 px-4 text-sm text-muted-foreground hover:text-foreground border-r border-border whitespace-nowrap"
            >
              All Categories <ChevronDown className="size-3.5" />
            </button>
            <input
              placeholder="Search for digital products, services..."
              className="flex-1 bg-transparent outline-none text-sm px-4 placeholder:text-muted-foreground h-11"
            />
            <button className="px-5 bg-gold text-primary-foreground hover:brightness-110 transition-all flex items-center justify-center">
              <Search className="size-4" />
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 ml-auto">
            {!isSeller && (
              <Link
                to="/seller-panel"
                className="hidden lg:inline-flex items-center h-9 px-4 text-sm text-foreground/90 hover:text-gold transition-colors"
              >
                Become a Seller
              </Link>
            )}

            {/* Cart */}
            <div className="relative" ref={cartRef}>
              <button
                onClick={() => {
                  setCartOpen((v) => !v);
                  setNotifOpen(false);
                  setAccountOpen(false);
                }}
                className="inline-flex items-center justify-center size-9 rounded-full hover:bg-surface text-muted-foreground hover:text-foreground transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingCart className="size-4" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-gold text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                    {cartItems.length}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                    <span className="font-semibold text-sm">Cart ({cartItems.length})</span>
                    <button onClick={() => setCartOpen(false)}>
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                  {cartItems.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
                      <ShoppingCart className="size-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Your cart is empty</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Browse the marketplace to add items
                        </p>
                      </div>
                      <Link
                        to="/"
                        onClick={() => setCartOpen(false)}
                        className="h-9 px-5 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center gap-1.5 transition-all"
                      >
                        Browse <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto py-2">
                      {cartItems.map((item) => (
                        <div key={item.id} className="px-4 py-2 flex items-center gap-3 hover:bg-surface/50 group">
                          <div className="size-12 rounded-lg bg-surface border border-border overflow-hidden shrink-0">
                            {item.cover_image_url ? (
                              <img src={item.cover_image_url} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-[8px] font-bold text-muted-foreground p-1 text-center">
                                {item.title}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate group-hover:text-gold transition-colors">{item.title}</div>
                            <div className="text-[10px] text-gold font-bold mt-0.5">
                              {formatPrice(Number(item.price_inr ?? item.price ?? 0))}
                            </div>
                          </div>
                          <button 
                            onClick={() => cartStore.removeItem(item.id)}
                            className="size-7 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 flex items-center justify-center transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="p-4 border-t border-border/60 mt-2">
                        <button
                          onClick={handleCheckout}
                          className="w-full h-10 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 flex items-center justify-center transition-all"
                        >
                          Checkout Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setCartOpen(false);
                  setAccountOpen(false);
                }}
                className="hidden sm:inline-flex items-center justify-center size-9 rounded-full hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}>
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
                    <Bell className="size-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">No notifications yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll see order updates and alerts here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* â”€â”€ AUTH STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {!ready ? (
              <div className="size-9 rounded-full bg-surface/60 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => {
                    setAccountOpen((v) => !v);
                    setCartOpen(false);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-border hover:border-gold/50 bg-surface/40 hover:bg-surface transition-all"
                  aria-expanded={accountOpen}
                >
                  <div className="size-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-gold">{initials}</span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[90px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`size-3.5 text-muted-foreground transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                    {/* User header */}
                    <div className="px-4 py-3 border-b border-border/60 bg-surface/30">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="size-8 rounded-full bg-gold/20 border border-gold/30 overflow-hidden flex items-center justify-center shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-gold">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{displayName}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      {(roles.length > 0 || isAdmin) && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {[...new Set([...(isAdmin ? ["admin"] : []), ...roles.slice(0, 1)])].map(
                            (r) => (
                              <span
                                key={r}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 capitalize"
                              >
                                {r.replace("_", " ")}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="py-1.5">
                      {isSeller && (
                        <DropLink
                          to="/seller"
                          icon={Store}
                          label="Dashboard"
                          close={() => setAccountOpen(false)}
                        />
                      )}
                      <DropLink
                        to="/orders"
                        icon={Package}
                        label="My Orders"
                        close={() => setAccountOpen(false)}
                      />
                      <DropLink
                        to="/account"
                        icon={User}
                        label="My Account"
                        close={() => setAccountOpen(false)}
                      />
                      <DropLink
                        to="/account"
                        icon={Settings}
                        label="Settings"
                        close={() => setAccountOpen(false)}
                      />

                      {isAdmin && (
                        <>
                          <div className="my-1 border-t border-border/50 mx-3" />
                          <DropLink
                            to="/admin"
                            icon={Shield}
                            label="Admin Panel"
                            close={() => setAccountOpen(false)}
                            gold
                          />
                        </>
                      )}
                    </div>

                    <div className="border-t border-border/60 py-1.5">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="size-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  search={{ redirect: "/dashboard" }}
                  className="hidden sm:inline-flex items-center h-9 px-4 rounded-lg border border-border text-sm hover:border-gold/50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center h-9 px-4 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}

            <button
              className="md:hidden inline-flex items-center justify-center size-9 rounded-full hover:bg-surface"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* â”€â”€ Sub nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="border-t border-border/60 bg-surface/30">
          <div className="container-page flex items-center h-11 gap-1 overflow-x-auto scrollbar-none">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to as any}
                params={"params" in item ? (item.params as any) : undefined}
                activeOptions={{ exact: item.to === "/" }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md whitespace-nowrap transition-colors data-[status=active]:text-gold data-[status=active]:font-medium"
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-3 pr-2 shrink-0">
              <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-sm text-gold">
                <Flame className="size-4" /> Deals
              </Link>
              <Link
                to="/"
                className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="size-4" /> Support
              </Link>
            </div>
          </div>
        </div>

        {/* â”€â”€ Category mega dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {catOpen && (
          <div
            className="absolute left-0 right-0 top-full border-b border-border bg-background/95 backdrop-blur-xl shadow-2xl"
            onMouseLeave={() => setCatOpen(false)}
          >
            <div className="container-page py-8 grid grid-cols-2 md:grid-cols-4 gap-2">
              {navCategories.map((c) => {
                const Icon = getCategoryIcon(c.slug, c.icon);
                const count = listingsCounts[c.slug] ?? 0;
                const countStr = `${count.toLocaleString()} ${count === 1 ? "Listing" : "Listings"}`;
                return (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug } as any}
                    onClick={() => setCatOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface transition-colors"
                  >
                    <div className="size-9 rounded-md border border-gold/20 bg-gold/10 flex items-center justify-center">
                      <Icon className="size-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{countStr}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* â”€â”€ Mobile drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="container-page py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to as any}
                  params={"params" in item ? (item.params as any) : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center h-10 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-surface/60 rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="flex gap-2 pt-3 border-t border-border/60 mt-3">
                  <Link
                    to="/login"
                    search={{ redirect: "/dashboard" }}
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 h-10 flex items-center justify-center rounded-lg border border-border text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 h-10 flex items-center justify-center rounded-lg bg-gold text-primary-foreground text-sm font-semibold"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              {isAuthenticated && (
                <div className="pt-3 border-t border-border/60 mt-3 space-y-1">
                  <Link
                    to="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 h-10 px-3 text-sm hover:bg-surface/60 rounded-lg"
                  >
                    <Package className="size-4 text-gold" /> My Orders
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 h-10 px-3 text-sm hover:bg-surface/60 rounded-lg"
                  >
                    <User className="size-4 text-gold" /> My Account
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 h-10 px-3 text-sm text-gold hover:bg-gold/10 rounded-lg"
                    >
                      <Shield className="size-4" /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 h-10 px-3 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <LogOut className="size-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

function DropLink({
  to,
  icon: Icon,
  label,
  close,
  gold,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  close: () => void;
  gold?: boolean;
}) {
  return (
    <Link
      to={to as any}
      onClick={close}
      className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface/60 transition-colors ${gold ? "text-gold" : "text-foreground/90"}`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
