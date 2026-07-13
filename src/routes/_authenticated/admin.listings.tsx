import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { Loader2, Trash2, EyeOff, AlertCircle, Check, X, Search, RefreshCw, Eye, Clock, Package, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { onListingApproved, onListingRejected } from "@/lib/notifications/hooks";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  head: () => ({ meta: [{ title: "Manage Listings — HUXZAIN Admin" }] }),
  component: Page,
});

type Listing = {
  id: string;
  title: string;
  price_cents: number;
  price_inr?: number;
  status: string;
  seller_id: string;
  created_at: string;
  risk_score?: number | null;
  suspicious_keywords?: any;
  moderator_notes?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  images?: any;
  attributes?: any;
  delivery_type?: string | null;
  delivery_time_hours?: number | null;
  tags?: any;
  health_score?: number | null;
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function Page() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: "active" | "paused" | "rejected" } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [moderationTab, setModerationTab] = useState<"pending" | "active" | "flagged" | "all">("pending");
  const [search, setSearch] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<Listing | null>(null);
  
  const supabase = getSupabase();

  async function fetchListings() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id, title, price_inr, status, seller_id, created_at, risk_score, suspicious_keywords, moderator_notes, description, cover_image_url, images, attributes, delivery_type, delivery_time_hours, tags, health_score,
          profiles:seller_id(display_name, username, email),
          categories:category_id(id, name, slug)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error(error.message);
      } else {
        const mapped = (data ?? []).map((l: any) => ({
          ...l,
          price_cents: (l.price_inr ?? 0) * 100
        }));
        setListings(mapped as Listing[]);
        
        // If a listing is currently being previewed, update its state from the new list
        if (selectedPreview) {
          const updatedPreview = mapped.find((item: any) => item.id === selectedPreview.id);
          if (updatedPreview) {
            setSelectedPreview(updatedPreview);
          }
        }
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
        if (selectedPreview?.id === deleteTarget) {
          setSelectedPreview(null);
        }
        setDeleteTarget(null);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function executeStatusUpdate() {
    if (!confirmTarget) return;
    try {
      await updateStatus(confirmTarget.id, confirmTarget.action);
      setConfirmTarget(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    if (!supabase) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "active") {
        updates.risk_score = 0;
        updates.suspicious_keywords = null;
        // Stamp approved_at and correct expires_at (30 days from approval)
        updates.approved_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase.from("listings").update(updates).eq("id", id).select("id");
      if (error) {
        toast.error(error.message);
      } else if (!data || data.length === 0) {
        toast.error("Permission denied or listing not found. You might not have moderator / staff permissions in the database.");
      } else {
        // HX-006: notify the seller when a listing is approved (active) or rejected.
        const row = listings.find((l) => l.id === id);
        if (row) {
          try {
            if (newStatus === "active") {
              await onListingApproved(id, row.seller_id, row.title);
            } else if (newStatus === "rejected") {
              await onListingRejected(id, row.seller_id, row.title, row.moderator_notes || "");
            }
          } catch (notifEx) {
            console.warn("[AdminListings] Listing-status notification non-blocking exception:", notifEx);
          }
        }
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
                          <button
                            onClick={() => setSelectedPreview(l)}
                            className="text-left hover:underline text-gold hover:text-gold/80 transition-colors focus:outline-hidden bg-transparent border-none p-0 cursor-pointer block w-full truncate"
                          >
                            <div className="font-semibold">{l.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{l.id}</div>
                          </button>
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
                        <td className="py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPreview(l)}
                            className="inline-flex items-center p-1.5 rounded hover:bg-gold/10 text-muted-foreground hover:text-gold transition-colors cursor-pointer border-none bg-transparent"
                            title="Preview / Details"
                          >
                            <Eye className="size-4" />
                          </button>
                          {l.status !== "active" && (
                            <button
                              onClick={() => setConfirmTarget({ id: l.id, action: "active" })}
                              className="inline-flex items-center p-1.5 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors cursor-pointer border-none bg-transparent"
                              title="Approve / Activate (resets flags)"
                            >
                              <Check className="size-4" />
                            </button>
                          )}
                          {l.status === "active" && (
                            <button
                              onClick={() => setConfirmTarget({ id: l.id, action: "paused" })}
                              className="inline-flex items-center p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
                              title="Pause / Hide"
                            >
                              <EyeOff className="size-4" />
                            </button>
                          )}
                          {l.status !== "rejected" && (
                            <button
                              onClick={() => setConfirmTarget({ id: l.id, action: "rejected" })}
                              className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                              title="Reject"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(l.id)}
                            className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
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
      {/* ─── CUSTOM STATUS UPDATE CONFIRMATION MODAL ─── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl text-left">
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
              confirmTarget.action === "active" 
                ? "from-transparent via-green-500 to-transparent" 
                : confirmTarget.action === "rejected"
                ? "from-transparent via-red-500 to-transparent"
                : "from-transparent via-amber-500 to-transparent"
            }`} />
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-foreground">
              {confirmTarget.action === "active" ? (
                <span className="text-green-400 flex items-center gap-1"><Check size={16} /> Confirm Listing Approval</span>
              ) : confirmTarget.action === "rejected" ? (
                <span className="text-red-400 flex items-center gap-1"><X size={16} /> Confirm Listing Rejection</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><EyeOff size={16} /> Confirm Listing Deactivation</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Are you sure you want to {confirmTarget.action === "active" ? "approve and publish" : confirmTarget.action === "rejected" ? "reject" : "hide/pause"} this listing?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer bg-transparent text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={executeStatusUpdate}
                className={`flex-1 h-10 rounded-xl hover:brightness-110 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border-none ${
                  confirmTarget.action === "active"
                    ? "bg-green-500 text-white font-bold"
                    : confirmTarget.action === "rejected"
                    ? "bg-red-500 text-white font-bold"
                    : "bg-amber-500 text-black font-bold"
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LISTING DETAILS/PREVIEW MODAL ─── */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-[#101114] p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border/40">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  selectedPreview.status === "active"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : selectedPreview.status === "rejected" || selectedPreview.status === "flagged"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {selectedPreview.status}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mt-1.5">{selectedPreview.title}</h3>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {selectedPreview.id}</p>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-1 rounded-lg border border-border/50 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column (Images + Description) */}
              <div className="md:col-span-7 space-y-4">
                {/* Images */}
                {selectedPreview.cover_image_url && (
                  <div className="rounded-xl overflow-hidden border border-border bg-[#0B0C10] aspect-video flex items-center justify-center relative">
                    <img 
                      src={selectedPreview.cover_image_url} 
                      alt={selectedPreview.title} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                {/* Gallery */}
                {selectedPreview.images && Array.isArray(selectedPreview.images) && selectedPreview.images.length > 1 && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Gallery</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedPreview.images.map((img: string, idx: number) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-border bg-[#0B0C10] aspect-square flex items-center justify-center">
                          <img src={img} alt="" className="object-cover size-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Description */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Description</h4>
                  <div className="rounded-xl border border-border/30 bg-[#0B0C10] p-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedPreview.description || <span className="italic text-muted-foreground/60">No description provided.</span>}
                  </div>
                </div>
              </div>

              {/* Right Column (Sidebar details) */}
              <div className="md:col-span-5 space-y-4">
                {/* Details Card */}
                <div className="rounded-xl border border-border/40 bg-surface/30 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-mono font-bold text-gold text-sm">₹{(selectedPreview.price_inr ?? (selectedPreview.price_cents / 100)).toFixed(2)}</span>
                  </div>
                  {selectedPreview.categories && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-semibold text-foreground">{selectedPreview.categories.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Delivery Type</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Package size={12} className="text-muted-foreground" />
                      <span className="capitalize">{selectedPreview.delivery_type || "manual"}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Delivery Window</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Clock size={12} className="text-muted-foreground" />
                      <span>{selectedPreview.delivery_time_hours || 24} Hours</span>
                    </span>
                  </div>
                  {selectedPreview.profiles && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Seller Name</span>
                        <span className="font-semibold text-foreground truncate max-w-[140px]" title={selectedPreview.profiles.display_name ?? selectedPreview.profiles.username ?? ""}>
                          {selectedPreview.profiles.display_name ?? selectedPreview.profiles.username ?? "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Seller Email</span>
                        <span className="font-semibold text-foreground truncate max-w-[140px]" title={selectedPreview.profiles.email ?? ""}>
                          {selectedPreview.profiles.email ?? "N/A"}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Seller ID</span>
                    <span className="font-mono text-muted-foreground truncate max-w-[120px]" title={selectedPreview.seller_id}>
                      {selectedPreview.seller_id}
                    </span>
                  </div>
                  {selectedPreview.health_score !== undefined && selectedPreview.health_score !== null && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Health Score</span>
                      <span className={`font-bold ${
                        selectedPreview.health_score >= 80 ? "text-green-400" : selectedPreview.health_score >= 50 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {selectedPreview.health_score}%
                      </span>
                    </div>
                  )}
                  {/* Public Link */}
                  <div className="pt-2 border-t border-border/20 flex justify-center">
                    <a
                      href={`/product/${selectedPreview.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-2 rounded-lg border border-gold/30 hover:bg-gold/10 text-gold text-xs font-bold transition-all cursor-pointer bg-transparent block"
                      style={{ textDecoration: 'none' }}
                    >
                      👁 View Listing public page
                    </a>
                  </div>
                </div>

                {/* Risk & keywords detection */}
                {((selectedPreview.risk_score && selectedPreview.risk_score > 0) || selectedPreview.suspicious_keywords) && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                      <ShieldAlert size={12} /> Moderation Flags
                    </h4>
                    {selectedPreview.risk_score !== undefined && selectedPreview.risk_score !== null && selectedPreview.risk_score > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground text-[11px]">System Risk Score: </span>
                        <span className={`font-bold ${selectedPreview.risk_score > 70 ? "text-red-400" : "text-amber-400"}`}>{selectedPreview.risk_score}%</span>
                      </div>
                    )}
                    {selectedPreview.suspicious_keywords && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Prohibited Keywords detected:</div>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(selectedPreview.suspicious_keywords) 
                            ? selectedPreview.suspicious_keywords 
                            : typeof selectedPreview.suspicious_keywords === "string" 
                              ? [selectedPreview.suspicious_keywords] 
                              : Object.keys(selectedPreview.suspicious_keywords)
                          ).map((k: string, idx: number) => (
                            <span key={idx} className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Attributes */}
                {selectedPreview.attributes && typeof selectedPreview.attributes === 'object' && Object.keys(selectedPreview.attributes).length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Attributes</h4>
                    <div className="rounded-xl border border-border/30 bg-[#0B0C10] p-3 space-y-1.5 max-h-36 overflow-y-auto">
                      {Object.entries(selectedPreview.attributes).map(([key, val]: [string, any]) => (
                        <div key={key} className="flex justify-between text-[11px] border-b border-border/10 pb-1 last:border-b-0 last:pb-0">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-foreground truncate max-w-[140px]" title={String(val)}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedPreview.tags && (Array.isArray(selectedPreview.tags) ? selectedPreview.tags.length > 0 : typeof selectedPreview.tags === 'object') && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(selectedPreview.tags) 
                        ? selectedPreview.tags 
                        : typeof selectedPreview.tags === 'string' 
                          ? [selectedPreview.tags] 
                          : Object.keys(selectedPreview.tags)
                      ).map((t: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-surface border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Moderation Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 mt-6 pt-4 border-t border-border/40">
              <div className="flex gap-2">
                {selectedPreview.status !== "active" && (
                  <button
                    onClick={() => {
                      setConfirmTarget({ id: selectedPreview.id, action: "active" });
                    }}
                    className="h-9 px-4 rounded-lg bg-green-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Check size={14} /> Approve & Publish
                  </button>
                )}
                {selectedPreview.status === "active" && (
                  <button
                    onClick={() => {
                      setConfirmTarget({ id: selectedPreview.id, action: "paused" });
                    }}
                    className="h-9 px-4 rounded-lg bg-amber-500 hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <EyeOff size={14} /> Pause / Hide
                  </button>
                )}
                {selectedPreview.status !== "rejected" && (
                  <button
                    onClick={() => {
                      setConfirmTarget({ id: selectedPreview.id, action: "rejected" });
                    }}
                    className="h-9 px-4 rounded-lg bg-red-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <X size={14} /> Reject
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeleteTarget(selectedPreview.id);
                  }}
                  className="h-9 px-3 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-1.5 cursor-pointer bg-transparent"
                  title="Permanently Delete"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="h-9 px-4 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
