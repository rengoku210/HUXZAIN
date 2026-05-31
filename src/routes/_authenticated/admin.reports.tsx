import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, ShieldCheck, ShieldAlert, Loader2, Calendar, Eye, CheckCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Listing Reports Desk — HUXZAIN Admin" }] }),
  component: ReportsDesk,
});

type ReportItem = {
  id: string;
  status: string;
  created_at: string;
  listing_id?: string;
  listing_title?: string;
  seller_id?: string;
  reason?: string;
  description?: string;
  reporter_email?: string;
  rawTitle: string;
};

function ReportsDesk() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");

  async function loadReports() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("category", "report")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = (data ?? []).map((t: any) => {
        let parsed: any = {};
        if (t.title && t.title.startsWith("REPORT_JSON:")) {
          try {
            parsed = JSON.parse(t.title.replace("REPORT_JSON:", ""));
          } catch (err) {
            console.warn("Failed to parse report title JSON:", t.title);
          }
        }
        return {
          id: t.id,
          status: t.status,
          created_at: t.created_at,
          listing_id: parsed.listing_id || null,
          listing_title: parsed.listing_title || "Unknown Listing",
          seller_id: parsed.seller_id || null,
          reason: parsed.reason || "General Violation",
          description: parsed.description || t.title,
          reporter_email: parsed.reporter_email || "Anonymous",
          rawTitle: t.title
        };
      });

      setReports(items);

    } catch (e: any) {
      toast.error("Failed to load reports queue: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseReport(reportId: string) {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report resolved and closed!");
      loadReports();
    } catch (e: any) {
      toast.error("Failed to close report: " + e.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = reports.filter(r => {
    if (filter === "open") return r.status === "open";
    if (filter === "closed") return r.status === "closed";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Flag className="text-gold" size={24} /> Listing Reports Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review user-submitted abuse, spam, and fraudulent activity flags on product listings.
          </p>
        </div>
      </div>

      {/* Filter and Tab Options */}
      <div className="flex justify-between items-center border-b border-border/60 pb-3 flex-wrap gap-2 text-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("open")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "open"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            Open Queue ({reports.filter(r => r.status === "open").length})
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "closed"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            Reviewed ({reports.filter(r => r.status === "closed").length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "all"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            All Reports ({reports.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
          Retrieving flagged submissions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-sm text-muted-foreground bg-surface/10">
          <ShieldCheck size={32} className="mx-auto text-emerald-400 mb-3" />
          <div className="font-semibold text-white">Queue is clear!</div>
          <p className="text-xs text-muted-foreground mt-1">No listing reports currently require review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-3 min-w-0 flex-1">
                {/* Header info */}
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="bg-destructive/10 text-destructive border border-destructive/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {r.reason}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} /> {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-muted-foreground">· Reporter: {r.reporter_email}</span>
                </div>

                {/* Details */}
                <div>
                  <h3 className="font-semibold text-sm text-white">
                    Flagged:{" "}
                    {r.listing_id ? (
                      <Link
                        to={`/product/${r.listing_id}`}
                        className="text-gold hover:underline hover:brightness-110"
                      >
                        {r.listing_title}
                      </Link>
                    ) : (
                      r.listing_title
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-background/40 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">
                    {r.description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2 shrink-0 md:justify-end">
                {r.listing_id && (
                  <Link
                    to={`/product/${r.listing_id}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Eye size={12} /> View Listing
                  </Link>
                )}
                {r.status === "open" && (
                  <button
                    onClick={() => handleCloseReport(r.id)}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 cursor-pointer shadow-lg shadow-gold/5"
                  >
                    <CheckCircle size={12} /> Dismiss / Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
