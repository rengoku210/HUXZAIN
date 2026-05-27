import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { Loader2, AlertCircle, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  head: () => ({ meta: [{ title: "Disputes — HUXZAIN Admin" }] }),
  component: Page,
});

type Dispute = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: "open" | "investigating" | "resolved_buyer" | "resolved_seller" | "closed";
  resolution: string | null;
  created_at: string;
  profiles?: { display_name: string };
};

function Page() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function fetchDisputes() {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select("*, profiles:opened_by(display_name)")
      .order("created_at", { ascending: false });
    setDisputes((data ?? []) as Dispute[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchDisputes();
  }, []);

  async function updateStatus(id: string, status: Dispute["status"], resolution?: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setResolving(id);
    const { error } = await supabase
      .from("disputes")
      .update({ 
        status, 
        resolution: resolution || null,
        resolved_at: ["resolved_buyer", "resolved_seller", "closed"].includes(status) ? new Date().toISOString() : null
      })
      .eq("id", id);
    
    if (error) toast.error(error.message);
    else {
      toast.success(`Dispute ${status.replace("_", " ")}`);
      fetchDisputes();
    }
    setResolving(null);
  }

  const statusColors = {
    open: "text-red-400 bg-red-500/10 border-red-500/20",
    investigating: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    resolved_buyer: "text-green-400 bg-green-500/10 border-green-500/20",
    resolved_seller: "text-gold bg-gold/10 border-gold/20",
    closed: "text-muted-foreground bg-surface border-border",
  };

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Disputes</h1>
      <p className="text-sm text-muted-foreground mt-1">Mediate open buyer/seller disputes.</p>
      
      <div className="mt-6">
        <PanelCard 
          title="Open Disputes"
          action={
            <button onClick={fetchDisputes} className="text-xs text-gold hover:underline">
              Refresh
            </button>
          }
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 text-gold animate-spin" />
            </div>
          ) : disputes.length === 0 ? (
            <EmptyState
              title="No disputes"
              desc="Everything is running smoothly. No active disputes found."
            />
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-surface/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusColors[d.status]}`}>
                          {d.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {d.id.slice(0, 8)} • {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">Reason: {d.reason}</h3>
                      <p className="text-xs text-muted-foreground">
                        Opened by: <span className="text-foreground">{d.profiles?.display_name || d.profiles?.email || d.opened_by}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Order ID: <span className="text-foreground">{d.order_id}</span>
                      </p>
                      {d.resolution && (
                        <div className="mt-3 p-3 rounded-lg bg-surface/60 border border-border/50 text-xs">
                          <div className="font-bold text-gold mb-1">Resolution Note:</div>
                          {d.resolution}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {d.status === "open" && (
                        <button
                          onClick={() => updateStatus(d.id, "investigating")}
                          disabled={resolving === d.id}
                          className="h-8 px-3 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 flex items-center gap-2"
                        >
                          <Loader2 className={`size-3 animate-spin ${resolving === d.id ? "block" : "hidden"}`} />
                          Investigate
                        </button>
                      )}
                      {(d.status === "open" || d.status === "investigating") && (
                        <>
                          <button
                            onClick={() => {
                              const note = prompt("Resolution note (optional):");
                              updateStatus(d.id, "resolved_buyer", note || undefined);
                            }}
                            disabled={resolving === d.id}
                            className="h-8 px-3 rounded-lg border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/10 flex items-center gap-2"
                          >
                            Resolve (Buyer)
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt("Resolution note (optional):");
                              updateStatus(d.id, "resolved_seller", note || undefined);
                            }}
                            disabled={resolving === d.id}
                            className="h-8 px-3 rounded-lg border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/10 flex items-center gap-2"
                          >
                            Resolve (Seller)
                          </button>
                        </>
                      )}
                      {["resolved_buyer", "resolved_seller"].includes(d.status) && (
                        <button
                          onClick={() => updateStatus(d.id, "closed")}
                          disabled={resolving === d.id}
                          className="h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-surface flex items-center gap-2"
                        >
                          Close Case
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </>
  );
}
