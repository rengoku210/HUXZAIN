import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { notifications } from "@/lib/seller/mock-data";
import { Bell, ShoppingBag, Star, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HUXZAIN Seller" }] }),
  component: Page,
});

const iconFor = (k: string) => k === "order" ? ShoppingBag : k === "review" ? Star : Settings;

function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Order, payout, review and system alerts.</p>
        </div>
        <button className="text-xs text-gold hover:underline">Mark all as read</button>
      </div>

      <PanelCard title="Recent" action={<Bell size={14} className="text-muted-foreground" />}>
        <ul className="divide-y divide-border/50">
          {notifications.map((n) => {
            const Icon = iconFor(n.kind);
            return (
              <li key={n.id} className={`py-3 flex items-start gap-3 ${!n.read ? "" : "opacity-60"}`}>
                <div className="size-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0"><Icon size={14} /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{n.time}</div>
                {!n.read && <span className="size-2 rounded-full bg-gold mt-2" />}
              </li>
            );
          })}
        </ul>
      </PanelCard>

      <PanelCard title="Notification preferences">
        <div className="space-y-3">
          {["New order received", "Buyer message", "New review", "Withdrawal status", "Dispute opened", "Marketing & tips"].map((p, i) => (
            <div key={p} className="flex items-center justify-between text-sm">
              <span>{p}</span>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={i < 5} className="accent-gold" /> Email</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={i < 4} className="accent-gold" /> Push</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={i === 0} className="accent-gold" /> SMS</label>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
