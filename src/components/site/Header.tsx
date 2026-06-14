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
  Volume2,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import logo from "@/assets/huxzain-logo.png";
import mark from "@/assets/huxzain-mark.png";
import defaultAvatar from "@/assets/default-avatar.png";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase-client";
import * as LucideIcons from "lucide-react";
import { cartStore } from "@/lib/cart/cart-store";
import { formatPrice } from "@/lib/marketplace/listing-adapter";
import { primaryCategories } from "@/lib/marketplace-data";
import { CategoryMegaMenu } from "../category/CategoryMegaMenu";


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
    // Approved HUXZAIN categories
    "gaming-accounts": LucideIcons.Gamepad2,
    "in-game-currency": LucideIcons.Gem,
    "software-tools": LucideIcons.Laptop,
    "coaching-services": LucideIcons.GraduationCap,
    "boosting-services": LucideIcons.Rocket,
    "game-buddies": LucideIcons.Users2,
    "freelance-services": LucideIcons.Briefcase,
    "editing-design": LucideIcons.Palette,
    "advertising-services": LucideIcons.Megaphone,
    "digital-marketplace": LucideIcons.Store,
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

export function Header({ transparent }: { transparent?: boolean }) {
  const { isAuthenticated, user, profile, roles, signOut, ready } = useAuth();
  const navigate = useNavigate();

  const [catOpen, setCatOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaSearch, setMegaSearch] = useState("");
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const [navCategories, setNavCategories] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [listingsCounts, setListingsCounts] = useState<Record<string, number>>({});
  const [cartItems, setCartItems] = useState(cartStore.getItems());

  // Real-time Notifications & Sound (unlocked dynamically via user interaction)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (audioCtxRef.current) return;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          ctx.resume().then(() => {
            audioCtxRef.current = ctx;
            console.log("[Header] Shared AudioContext unlocked & active");
            document.removeEventListener("click", unlockAudio);
            document.removeEventListener("keydown", unlockAudio);
          });
        }
      } catch (err) {
        console.warn("[Header] Silent AudioContext unlock bypassed:", err);
      }
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  function playNotificationSound() {
    if (!soundEnabled) return;
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        ctx = new AudioContextClass();
      }

      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      
      const playTone = (freq: number, start: number, duration: number) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.1, 0.25); // E5
    } catch (err) {
      console.warn("[Header] AudioContext chime failed:", err);
    }
  }

  async function fetchNotifications() {
    if (!isAuthenticated || !user) return;
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data } = await sb
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (mountedRef.current && data) setNotifications(data);
    } catch (err) {
      console.error("[Header] Error fetching notifications:", err);
    }
  }

  async function markAsRead(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (mountedRef.current) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error("[Header] Error marking notification as read:", err);
    }
  }

  async function markAllAsRead() {
    if (!isAuthenticated || !user) return;
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (mountedRef.current) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        toast.success("All notifications marked as read.");
      }
    } catch (err) {
      console.error("[Header] Error marking all notifications as read:", err);
    }
  }

  useEffect(() => {
    const handleCartUpdate = () => {
      setCartItems(cartStore.getItems());
    };
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  // Notifications Realtime Subscription
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    void fetchNotifications();

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`user_notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[Header] New notification arrived in real-time:", payload.new);
          setNotifications((prev) => [payload.new, ...prev]);
          playNotificationSound();
          toast.info(`${payload.new.title}: ${payload.new.body || ""}`, {
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [isAuthenticated, user, soundEnabled]);

  useEffect(() => {
    let mounted = true;
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

        if (!mounted) return;

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

        setAllCategories(cats);
        setNavCategories(parents);
        setListingsCounts(slugCounts);
      } catch (err) {
        console.error("Failed to load nav bar category sync data:", err);
      }
    }

    void loadNavData();
    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin =
    roles.some((r) => ["admin", "super_admin", "owner", "staff", "moderator"].includes(r)) ||
    ADMIN_EMAILS.includes(user?.email ?? "");
  const isSeller = roles.some((r) => ["seller", "admin", "super_admin", "owner"].includes(r));

  const navItems = [
    { to: "/", label: "Home" },
    ...(isAdmin ? [{ to: "/pages", label: "All Pages" }] : []),
    ...primaryCategories.map((c) => ({
      to: "/category/$slug",
      params: { slug: c.slug },
      label: c.title,
      category: { id: c.slug, name: c.title, slug: c.slug },
    })),
  ];

  const fullCategoriesList = navCategories; // needed for subcategories reference

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
          listing_title: item.title,
          amount_inr: price,
          status: "pending_payment",
          payment_status: "created",
          payment_method: "manual",
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
        currency: "INR",
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

  const groupedNotifs = {
    Orders: notifications.filter(n => n.kind?.includes('order') || n.title?.toLowerCase().includes('order')),
    Payments: notifications.filter(n => n.kind?.includes('payment') || n.kind?.includes('withdrawal') || n.title?.toLowerCase().includes('payment') || n.kind?.includes('wallet')),
    Support: notifications.filter(n => n.kind?.includes('ticket') || n.kind?.includes('dispute')),
    Messages: notifications.filter(n => n.kind?.includes('message') || n.title?.toLowerCase().includes('message')),
  };
  const groupedIds = new Set(Object.values(groupedNotifs).flat().map(n => n.id));
  const generalNotifs = notifications.filter(n => !groupedIds.has(n.id));

  return (
    <>
      <header className={`${transparent ? "absolute top-0 left-0 right-0 z-50 border-b-0 border-transparent bg-transparent backdrop-blur-none" : "sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl"} w-full max-w-full overflow-x-clip md:overflow-x-visible`}>
        {/* â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="container-page flex h-16 items-center gap-4">
          <Link to="/" className="flex items-center shrink-0 bg-transparent border-none outline-none shadow-none p-0 hover:opacity-90 transition-opacity">
            <img 
              src={logo} 
              alt="HUXZAIN" 
              className="h-10 w-auto bg-transparent select-none pointer-events-none object-contain animate-fade-in" 
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
                className="hidden sm:inline-flex items-center justify-center size-9 rounded-full hover:bg-surface text-muted-foreground hover:text-foreground transition-colors relative border-none bg-transparent cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {notifications.filter(n => !n.read_at).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center border-2 border-background">
                    {notifications.filter(n => !n.read_at).length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-surface/30">
                    <span className="font-semibold text-sm">Notifications</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSoundEnabled(!soundEnabled)} 
                        title={soundEnabled ? "Mute notification sound" : "Unmute notification sound"}
                        className="text-xs text-muted-foreground hover:text-gold flex items-center gap-1 border-none bg-transparent cursor-pointer"
                      >
                        <Volume2 className={`size-3.5 ${soundEnabled ? "text-gold" : "text-muted-foreground/60"}`} />
                        <span className="text-[10px] font-medium">{soundEnabled ? "Sound" : "Mute"}</span>
                      </button>
                      {notifications.some(n => !n.read_at) && (
                        <button 
                          onClick={markAllAsRead} 
                          className="text-[10px] text-gold hover:underline font-semibold border-none bg-transparent cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="border-none bg-transparent cursor-pointer text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
                      <Bell className="size-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">No notifications yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You'll see order updates and alerts here
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[26rem] overflow-y-auto scrollbar-thin flex flex-col gap-1 p-2">
                      {[
                        { label: "Orders", items: groupedNotifs.Orders },
                        { label: "Payments", items: groupedNotifs.Payments },
                        { label: "Support & Disputes", items: groupedNotifs.Support },
                        { label: "Messages", items: groupedNotifs.Messages },
                        { label: "General Alerts", items: generalNotifs },
                      ].map(group => group.items.length > 0 && (
                        <div key={group.label} className="mb-2">
                          <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider px-3 py-1 bg-surface/30 rounded-md mb-1 flex items-center justify-between">
                            {group.label}
                            {group.items.filter(i => !i.read_at).length > 0 && (
                              <span className="bg-red-500 text-white px-1.5 rounded-full text-[8px]">{group.items.filter(i => !i.read_at).length} new</span>
                            )}
                          </h4>
                          <div className="divide-y divide-border/40">
                            {group.items.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => {
                                  if (!n.read_at) markAsRead(n.id);
                                }}
                                className={`w-full text-left px-3 py-2.5 hover:bg-surface/60 transition-colors flex gap-3 relative border-none bg-transparent cursor-pointer rounded-lg ${!n.read_at ? "bg-gold/5" : ""}`}
                              >
                                <div className="size-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5">
                                  <Bell className="size-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span className="font-bold text-xs truncate text-foreground/90">{n.title}</span>
                                    <span className="text-[8px] text-muted-foreground font-mono shrink-0">
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>
                                </div>
                                {!n.read_at && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-gold shrink-0 shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── AUTH STATE ──────────────────────────────────────────────────────── */}
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
                  className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-border hover:border-gold/50 bg-surface/40 hover:bg-surface transition-all border-none"
                  aria-expanded={accountOpen}
                  aria-label="User menu"
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
                      <DropLink
                        to="/dashboard"
                        icon={LayoutDashboard}
                        label="Buyer Dashboard"
                        close={() => setAccountOpen(false)}
                      />
                      {isSeller && (
                        <DropLink
                          to="/seller"
                          icon={Store}
                          label="Seller Dashboard"
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
                        to="/messages"
                        icon={MessageSquare}
                        label="Messages / Chat"
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

        {/* ── Sub nav ────────────────────────────────────────────── */}
        {/* ── Category Quick Access Ribbon ────────────────────────────── */}
        <div className={`${transparent ? "border-t-0 border-transparent bg-transparent backdrop-blur-none shadow-none" : "border-t border-border/60 bg-[#101114]/85 backdrop-blur-md shadow-inner"} hidden md:block w-full overflow-hidden relative`} onMouseLeave={() => { setHoveredCatId(null); setCatOpen(false); }}>
          <div className="container-page flex items-center justify-between h-12 gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-6 overflow-x-auto scrollbar-none py-1">
              
              {/* Categories Dropdown Trigger */}
              <button 
                onClick={() => setCatOpen((v) => !v)}
                onMouseEnter={() => setCatOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold text-gold bg-gold/5 hover:bg-gold/10 border border-gold/20 hover:border-gold/40 rounded-lg whitespace-nowrap transition-all shadow-sm cursor-pointer"
              >
                <LayoutGrid className="size-3.5" /> Categories <ChevronDown className={`size-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Navigation Links */}
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto scrollbar-none py-1">
                <Link
                  to="/"
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  🔥 Trending
                </Link>
                <Link
                  to="/categories"
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  All Pages
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "gaming-accounts" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Gaming Accounts
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "in-game-currency" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  In-Game Currency
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "gift-cards" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Gift Cards
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "software-tools" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Software & Tools
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "subscriptions" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Subscriptions
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "coaching-services" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Coaching Services
                </Link>
                <Link
                  to="/category/$slug"
                  params={{ slug: "boosting-services" } as any}
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap"
                >
                  Boosting Service
                </Link>
                <Link
                  to="/contact"
                  className="text-[13px] font-medium text-muted-foreground hover:text-gold transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  ❓ Support
                </Link>
              </div>

            </div>
          </div>
          
          {/* Render Mega Menu directly anchored to the ribbon */}
          {hoveredCatId && (
            <CategoryMegaMenu
              category={primaryCategories.find((c) => c.slug === hoveredCatId) ? { id: hoveredCatId, name: primaryCategories.find((c) => c.slug === hoveredCatId)!.title, slug: hoveredCatId } : null as any}
              isOpen={true}
              onClose={() => setHoveredCatId(null)}
              subcategories={(() => {
                const dbCat = allCategories.find(c => c.slug === hoveredCatId);
                return dbCat ? allCategories.filter(c => c.parent_id === dbCat.id) : [];
              })()}
            />
          )}
        </div>

        {/* ── Category mega dropdown ───────────────────────────── */}
        {catOpen && (
          <div
            className="absolute left-0 right-0 top-full border-b border-border bg-background/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
            onMouseLeave={() => setCatOpen(false)}
          >
            <div className="container-page py-6 grid grid-cols-1 md:grid-cols-12 gap-8 min-h-[400px]">
              {/* Left Side - Quick Lists */}
              <div className="md:col-span-3 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-wider mb-3">Popular Categories</h3>
                  <div className="space-y-1">
                    {primaryCategories.slice(0, 5).map(c => (
                      <Link
                        key={c.slug}
                        to="/category/$slug"
                        params={{ slug: c.slug } as any}
                        onClick={() => setCatOpen(false)}
                        className="block px-3 py-2 -mx-3 text-sm text-foreground/80 hover:text-gold hover:bg-surface/50 rounded-lg transition-colors"
                      >
                        {c.title}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gold uppercase tracking-wider mb-3">Trending Now</h3>
                  <div className="space-y-1">
                    {primaryCategories.slice(5, 8).map(c => (
                      <Link
                        key={c.slug}
                        to="/category/$slug"
                        params={{ slug: c.slug } as any}
                        onClick={() => setCatOpen(false)}
                        className="block px-3 py-2 -mx-3 text-sm text-foreground/80 hover:text-gold hover:bg-surface/50 rounded-lg transition-colors"
                      >
                        <Flame className="size-3.5 inline mr-1.5 text-orange-500" />
                        {c.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Search & Grid */}
              <div className="md:col-span-9 flex flex-col">
                <div className="relative mb-6 flex items-center">
                  <Search className="absolute left-4 size-4 text-muted-foreground" />
                  <input
                    value={megaSearch}
                    onChange={(e) => setMegaSearch(e.target.value)}
                    placeholder="Search all categories (e.g. Valorant, Coaching, Spotify...)"
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface/50 border border-border focus:border-gold/50 outline-none text-sm transition-colors placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] scrollbar-thin pr-2 pb-2">
                  {primaryCategories
                    .filter(c => c.title.toLowerCase().includes(megaSearch.toLowerCase()))
                    .map((c) => {
                    const Icon = c.icon;
                    const count = listingsCounts[c.slug] ?? 0;
                    return (
                      <Link
                        key={c.slug}
                        to="/category/$slug"
                        params={{ slug: c.slug } as any}
                        onClick={() => setCatOpen(false)}
                        className="group relative flex items-center gap-3 rounded-xl p-3 border border-border/50 hover:border-gold/50 bg-surface/30 hover:bg-surface transition-all overflow-hidden"
                      >
                        {(c as any).banner_image_url && (
                          <div className="absolute inset-0 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
                            <img src={(c as any).banner_image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-background to-background/50" />
                          </div>
                        )}
                        <div className="relative z-10 size-10 rounded-lg border border-gold/20 bg-gold/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="size-5 text-gold drop-shadow-md" />
                        </div>
                        <div className="relative z-10 min-w-0">
                          <div className="text-sm font-semibold truncate group-hover:text-gold transition-colors">{c.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{count.toLocaleString()} Listings</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
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
