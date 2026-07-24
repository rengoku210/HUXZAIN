import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Inbox, 
  CheckCheck, 
  ShoppingBag, 
  AlertTriangle, 
  ShieldCheck, 
  BadgeCheck, 
  Sparkles, 
  MessageSquare,
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/seller/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HUXZAIN" }] }),
  component: Page,
});

function getNotificationLink(n: any): string {
  const kind = n.kind ? String(n.kind).toLowerCase() : "";
  const entityId = n.entity_id || "";
  const link = n.link || "";

  if (link && link.startsWith("/")) {
    if (kind === "listing.approved" && link.includes("/seller/listings/")) {
      const parts = link.split("/");
      const id = parts[parts.length - 1];
      if (id && id.length === 36) {
        return `/product/${id}`;
      }
    }
    return link;
  }

  if (kind.startsWith("order.") || kind.startsWith("dispute.") || kind.startsWith("refund.")) {
    const orderId = entityId || link.match(/orders?\/([a-zA-Z0-9\-_]+)/)?.[1] || "";
    if (orderId) {
      return `/messages?orderId=${orderId}`;
    }
    return "/messages";
  }

  if (kind.startsWith("listing.")) {
    if (kind === "listing.approved" && entityId) {
      return `/product/${entityId}`;
    }
    return "/seller/listings";
  }

  if (kind.startsWith("membership.") || kind.startsWith("verification.")) {
    return "/seller/verification";
  }

  if (kind.startsWith("finance.") || kind.startsWith("withdrawal.")) {
    return "/seller/withdrawals";
  }

  if (kind.startsWith("security.")) {
    return "/account";
  }

  return "/dashboard";
}

function Page() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const navigate = useNavigate();

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read_at;
    if (filter === "read") return !!n.read_at;
    return true;
  });

  const getNotificationIcon = (kind?: string | null) => {
    const k = kind ? kind.toLowerCase() : "";
    if (k.startsWith("order")) return <ShoppingBag className="size-4 text-blue-400" />;
    if (k.startsWith("payment") || k.includes("earnings") || k.includes("withdrawal")) {
      return <ShieldCheck className="size-4 text-gold" />;
    }
    if (k.startsWith("dispute")) return <AlertTriangle className="size-4 text-red-400" />;
    if (k.startsWith("verification") || k.startsWith("kyc")) {
      return <BadgeCheck className="size-4 text-emerald-400" />;
    }
    if (k.startsWith("message") || k.includes("chat")) {
      return <MessageSquare className="size-4 text-sky-400" />;
    }
    return <Sparkles className="size-4 text-gold" />;
  };

  const getKindBadge = (kind?: string | null) => {
    const k = kind ? kind.toLowerCase().replace(/[._]/g, " ") : "general";
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full border border-border bg-surface/40">
        {k}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/60 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with real-time alerts for orders, payouts, reviews, and security changes.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-gold/30 hover:border-gold/50 text-gold text-xs font-bold transition-all cursor-pointer bg-gold/5"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 overflow-x-auto">
        {[
          { key: "all", label: `All Alerts` },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "read", label: `Read` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`pb-3 text-sm font-semibold relative transition-colors cursor-pointer ${
              filter === tab.key
                ? "text-gold border-b-2 border-gold font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PanelCard title="Live Alerts Feed">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="size-8 text-gold animate-spin mb-3" />
            <p className="text-xs text-muted-foreground">Checking live alert stream...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={40} className="text-muted-foreground mb-4 opacity-40 animate-pulse" />
            <h2 className="text-sm font-bold text-foreground">No alerts matching filter</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              We couldn't find any notifications here. You will receive real-time notifications about orders, payouts, verifications, and disputes once active.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read_at) void markAsRead(n.id);
                  const targetLink = getNotificationLink(n);
                  navigate({ to: targetLink as any });
                }}
                className={`py-4 flex gap-4 items-start transition-all cursor-pointer group ${
                  !n.read_at ? "bg-gold/5 px-4 rounded-xl -mx-4 border border-gold/10" : ""
                }`}
              >
                <div className={`size-9 rounded-xl border flex items-center justify-center shrink-0 ${
                  !n.read_at 
                    ? "bg-gold/10 border-gold/25" 
                    : "bg-surface/50 border-border"
                }`}>
                  {getNotificationIcon(n.kind)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-sm font-semibold transition-colors ${
                      !n.read_at ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {n.title}
                    </span>
                    {getKindBadge(n.kind)}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/75 mt-2">
                    <Clock size={11} />
                    <span>
                      {(() => {
                        // Null-safe: an invalid/missing created_at must never crash
                        // the whole page (formatDistanceToNow throws on Invalid Date).
                        const d = n.created_at ? new Date(n.created_at) : null;
                        return d && !isNaN(d.getTime())
                          ? formatDistanceToNow(d, { addSuffix: true })
                          : "just now";
                      })()}
                    </span>
                  </div>
                </div>

                {!n.read_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void markAsRead(n.id);
                    }}
                    className="h-7 px-2.5 rounded-lg border border-border hover:border-gold/30 hover:bg-surface text-[10px] font-bold text-muted-foreground hover:text-gold transition-all cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
