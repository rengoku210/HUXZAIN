import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { Loader2, Trash2, EyeOff, AlertCircle, Check, X, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  head: () => ({ meta: [{ title: "Manage Listings — HUXZAIN Admin" }] }),
  component: Page,
});

type Listing = {
  id: string;
  title: string;
  price_cents: number;
  status: string;
  seller_id: string;
  created_at: string;
  risk_score?: number | null;
  suspicious_keywords?: any;
  moderator_notes?: string | null;
};

function Page() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moderationTab, setModerationTab] = useState<"pending" | "active" | "flagged" | "all">("pending");
  const [search, setSearch] = useState("");
  
  const supabase = getSupabase();

  async function fetchListings() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price_inr, status, seller_id, created_at, risk_score, suspicious_keywords, moderator_notes")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error(error.message);
      } else {
        const mapped = (data ?? []).map((l: any) => ({
          ...l,
          price_cents: (l.price_inr ?? 0) * 100
        }));
        setListings(mapped as Listing[]);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchListings();
  }, []);

  async function executeDelete() {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").update({ status: "deleted" }).eq("id", deleteTarget);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing deleted successfully.");
        setListings((prev) =>
          prev.map((l) => (l.id === deleteTarget ? { ...l, status: "deleted" } : l))
        );
        setDeleteTarget(null);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    if (!supabase) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "active") {
        updates.risk_score = 0;
        updates.suspicious_keywords = null;
      }
      
      const { error } = await supabase.from("listings").update(updates).eq("id", id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Listing status updated to ${newStatus}.`);
        fetchListings();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error updating status");
    }
  }

  const filteredListings = listings.filter((l) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = l.title?.toLowerCase().includes(q);
      const matchId = l.id?.toLowerCase().includes(q);
      const matchSeller = l.seller_id?.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchSeller) {
        return false;
      }
    }
    
    // Tab filter
    if (moderationTab === "pending") {
      return l.status === "pending" || l.status === "pending_review";
    }
    if (moderationTab === "active") {
      return l.status === "active";
    }
    if (moderationTab === "flagged") {
      const hasKeywords = l.suspicious_keywords && (
        Array.isArray(l.suspicious_keywords) 
          ? l.suspicious_keywords.length > 0 
          : typeof l.suspicious_keywords === "string" 
            ? l.suspicious_keywords.length > 2 
            : Object.keys(l.suspicious_keywords).length > 0
      );
      return (l.status === "flagged" || (l.risk_score && l.risk_score > 0) || hasKeywords) && l.status !== "deleted";
    }
    return l.status !== "deleted";
  });

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Manage Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve, reject, flag, or remove marketplace listings.
          </p>
        </div>
        <button
          onClick={fetchListings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-4">
        <div className="flex flex-wrap gap-2">
          {(["pending", "active", "flagged", "all"] as const).map((tab) => {
            const count = listings.filter((l) => {
              if (tab === "pending") return l.status === "pending" || l.status === "pending_review";
              if (tab === "active") return l.status === "active";
              if (tab === "flagged") {
                const hasKeywords = l.suspicious_keywords && (
                  Array.isArray(l.suspicious_keywords) 
                    ? l.suspicious_keywords.length > 0 
                    : typeof l.suspicious_keywords === "string" 
                      ? l.suspicious_keywords.length > 2 
                      : Object.keys(l.suspicious_keywords).length > 0
                );
                return (l.status === "flagged" || (l.risk_score && l.risk_score > 0) || hasKeywords) && l.status !== "deleted";
              }
              return l.status !== "deleted";
            }).length;
            
            return (
              <button
                key={tab}
                onClick={() => setModerationTab(tab)}
                className={`px-4 h-9 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  moderationTab === tab
                    ? "bg-gold text-black border-gold shadow-md shadow-gold/10"
                    : "border-border hover:bg-surface/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  moderationTab === tab ? "bg-black/10 text-black font-bold" : "bg-surface/80 text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Title, ID, Seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
          />
        </div>
      </div>

      <div className="mt-4">
        <PanelCard title={`${moderationTab.charAt(0).toUpperCase() + moderationTab.slice(1)} Listings`}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 text-gold animate-spin" />
            </div>
          ) : filteredListings.length === 0 ? (
            <EmptyState
              title={`No ${moderationTab} listings`}
              desc="No items match your filter selection."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2.5 pr-4 font-semibold">Title / Listing ID</th>
                    <th className="py-2.5 pr-4 font-semibold">Price</th>
                    <th className="py-2.5 pr-4 font-semibold">Status & Risk</th>
                    <th className="py-2.5 pr-4 font-semibold">Keywords Detected</th>
                    <th className="py-2.5 pr-4 font-semibold">Created At</th>
                    <th className="py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((l) => {
                    let keywordsArray: string[] = [];
                    if (l.suspicious_keywords) {
                      if (Array.isArray(l.suspicious_keywords)) {
                        keywordsArray = l.suspicious_keywords;
                      } else if (typeof l.suspicious_keywords === "string") {
                        try {
                          keywordsArray = JSON.parse(l.suspicious_keywords);
                        } catch {
                          keywordsArray = [l.suspicious_keywords];
                        }
                      }
                    }

                    return (
                      <tr key={l.id} className="border-b border-border/30 hover:bg-surface/40">
                        <td className="py-3 pr-4 font-medium max-w-[200px] truncate">
                          <div>
                            <div className="font-semibold text-foreground">{l.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{l.id}</div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gold font-mono">₹{(l.price_cents / 100).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border w-fit ${
                                l.status === "active"
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : l.status === "flagged" || l.status === "rejected"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : l.status === "pending" || l.status === "pending_review"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-surface text-muted-foreground border-border"
                              }`}
                            >
                              {l.status ?? "unknown"}
                            </span>
                            {l.risk_score !== undefined && l.risk_score !== null && l.risk_score > 0 && (
                              <span className={`text-[10px] font-bold ${
                                l.risk_score > 70 
                                  ? "text-rose-400" 
                                  : l.risk_score > 30 
                                    ? "text-amber-400" 
                                    : "text-emerald-400"
                              }`}>
                                Risk Score: {l.risk_score}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {keywordsArray.length > 0 ? (
                            <div className="max-w-[200px] flex flex-wrap gap-1">
                              {keywordsArray.map((k, idx) => (
                                <span key={idx} className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono">
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right space-x-1">
                          {l.status !== "active" && (
                            <button
                              onClick={() => updateStatus(l.id, "active")}
                              className="inline-flex items-center p-1.5 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                              title="Approve / Activate (resets flags)"
                            >
                              <Check className="size-4" />
                            </button>
                          )}
                          {l.status === "active" && (
                            <button
                              onClick={() => updateStatus(l.id, "paused")}
                              className="inline-flex items-center p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                              title="Pause / Hide"
                            >
                              <EyeOff className="size-4" />
                            </button>
                          )}
                          {l.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(l.id, "rejected")}
                              className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              title="Reject"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(l.id)}
                            className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      </div>

      {/* ─── CUSTOM DELETE CONFIRMATION MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <AlertCircle size={18} /> Confirm Listing Deletion
            </h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Are you sure you want to delete this listing? This action cannot be undone and will permanently remove this listing from the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer border-none"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Listing"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
