import { createFileRoute } from "@tanstack/react-router";
import { PanelCard } from "@/components/seller/SellerShell";
import { conversations } from "@/lib/seller/mock-data";
import { Send, Paperclip, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/messages")({
  head: () => ({ meta: [{ title: "Messages — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Direct conversations with your buyers.</p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 rounded-2xl border border-border bg-surface/40 overflow-hidden">
        <div className="border-r border-border">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="h-9 pl-9 pr-3 w-full text-sm rounded-lg bg-background border border-border" placeholder="Search…" />
            </div>
          </div>
          <ul className="max-h-[520px] overflow-y-auto">
            {conversations.map((c, i) => (
              <li key={c.id} className={`p-3 border-b border-border/50 cursor-pointer hover:bg-surface ${i === 0 ? "bg-gold/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{c.user}</div>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{c.preview}</div>
                {c.unread > 0 && <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gold text-black font-semibold">{c.unread} new</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col h-[600px]">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="size-10 rounded-full bg-gold/20" />
            <div>
              <div className="font-medium text-sm">rylan_47</div>
              <div className="text-xs text-emerald-400">Online · responds in ~3 min</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <Bubble side="them">Hey, can you deliver tonight?</Bubble>
            <Bubble side="me">Yes! I'll be online in 10 min, send me the in-game name when ready.</Bubble>
            <Bubble side="them">Awesome, my IGN is rylan47#NA</Bubble>
            <Bubble side="them">Also, do you accept Razorpay?</Bubble>
          </div>

          <div className="p-3 border-t border-border flex items-center gap-2">
            <button className="size-9 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground"><Paperclip size={14} /></button>
            <input className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-sm" placeholder="Write a reply…" />
            <button className="h-10 px-4 rounded-lg bg-gold text-black font-semibold text-sm inline-flex items-center gap-2"><Send size={14} /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "me" | "them"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "me" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${side === "me" ? "bg-gold text-black rounded-br-md" : "bg-background border border-border rounded-bl-md"}`}>
        {children}
      </div>
    </div>
  );
}
