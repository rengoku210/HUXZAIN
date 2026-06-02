import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, ShieldCheck, ShieldAlert, Loader2, Calendar, Eye, CheckCircle, XCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Listing & Seller Reports Desk — HUXZAIN Admin" }] }),
  component: ReportsDesk,
});

type ReportItem = {
  id: string;
  reporter_id: string | null;
  reporter_email: string;
  target_type: "listing" | "seller";
  target_id: string;
  target_title: string;
  reason: string;
  note: string;
  screenshot_url: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
};

function ReportsDesk() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");

  async function loadReports() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: rawReports, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!rawReports || rawReports.length === 0) {
        setReports([]);
        return;
      }

      // Collect ids for batch loading
      const listingIds = rawReports.filter(r => r.target_type === "listing").map(r => r.target_id);
      const sellerIds = rawReports.filter(r => r.target_type === "seller").map(r => r.target_id);
      const reporterIds = rawReports.map(r => r.reporter_id).filter(Boolean);

      const [listingsRes, sellersRes, reportersRes] = await Promise.all([
        listingIds.length > 0 ? supabase.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] }),
        sellerIds.length > 0 ? supabase.from("profiles").select("id, display_name, username").in("id", sellerIds) : Promise.resolve({ data: [] }),
        reporterIds.length > 0 ? supabase.from("profiles").select("id, email").in("id", reporterIds) : Promise.resolve({ data: [] })
      ]);

      const listingsMap = new Map((listingsRes.data || []).map(l => [l.id, l.title]));
      const sellersMap = new Map((sellersRes.data || []).map(s => [s.id, s.display_name || s.username || "Unknown Seller"]));
      const reportersMap = new Map((reportersRes.data || []).map(r => [r.id, r.email || "Unknown Email"]));

      const resolvedItems: ReportItem[] = rawReports.map(r => {
        let targetTitle = "Unknown Target";
        if (r.target_type === "listing") {
          targetTitle = listingsMap.get(r.target_id) || `Listing (ID: ${r.target_id.slice(0, 8)})`;
        } else if (r.target_type === "seller") {
          targetTitle = sellersMap.get(r.target_id) || `Seller (ID: ${r.target_id.slice(0, 8)})`;
        }

        return {
          id: r.id,
          reporter_id: r.reporter_id,
          reporter_email: reportersMap.get(r.reporter_id) || "Anonymous / Deleted User",
          target_type: r.target_type,
          target_id: r.target_id,
          target_title: targetTitle,
          reason: r.reason,
          note: r.note || "No details provided.",
          screenshot_url: r.screenshot_url,
          status: r.status,
          created_at: r.created_at
        };
      });

      setReports(resolvedItems);
    } catch (e: any) {
      toast.error("Failed to load reports: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(reportId: string, status: "resolved" | "dismissed") {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from("reports")
        .update({
          status,
          resolved_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success(`Report marked as ${status}!`);
      loadReports();
    } catch (e: any) {
      toast.error("Failed to update report status: " + e.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = reports.filter(r => {
    if (filter === "open") return r.status === "open";
    if (filter === "resolved") return r.status === "resolved";
    if (filter === "dismissed") return r.status === "dismissed";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Flag className="text-gold" size={24} /> Listing & Seller Reports Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review user-submitted abuse, fake listings, delivery disputes, and copyright violations.
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
            onClick={() => setFilter("resolved")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "resolved"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            Resolved ({reports.filter(r => r.status === "resolved").length})
          </button>
          <button
            onClick={() => setFilter("dismissed")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "dismissed"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            Dismissed ({reports.filter(r => r.status === "dismissed").length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-bold border transition-all ${
              filter === "all"
                ? "bg-gold text-black border-gold shadow-md"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            All ({reports.length})
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
          <p className="text-xs text-muted-foreground mt-1">No reports currently require review.</p>
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
                  <span className="bg-gold/10 text-gold border border-gold/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Target: {r.target_type}
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
                    {r.target_type === "listing" ? (
                      <Link
                        to={`/product/${r.target_id}`}
                        className="text-gold hover:underline hover:brightness-110"
                      >
                        {r.target_title}
                      </Link>
                    ) : (
                      <span className="text-gold font-medium">{r.target_title}</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-background/40 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">
                    {r.note}
                  </p>

                  {r.screenshot_url && (
                    <div className="mt-3">
                      <a
                        href={r.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-semibold"
                      >
                        <Eye size={12} /> View Screenshot Proof
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2 shrink-0 md:justify-end">
                {r.target_type === "listing" && (
                  <Link
                    to={`/product/${r.target_id}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Eye size={12} /> View Listing
                  </Link>
                )}
                {r.status === "open" && (
                  <>
                    <button
                      onClick={() => handleResolve(r.id, "resolved")}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 transition-all active:scale-95 cursor-pointer shadow-lg shadow-gold/5"
                    >
                      <CheckCircle size={12} /> Resolve
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, "dismissed")}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/10 transition-all active:scale-95 cursor-pointer"
                    >
                      <XCircle size={12} /> Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
