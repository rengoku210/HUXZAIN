import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { EmptyState, PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { Loader2, Trash2, Eye, EyeOff, Flag, AlertCircle } from "lucide-react";
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
};

function Page() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = getSupabase();

  async function fetchListings() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, price_inr, status, seller_id, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else {
      const mapped = (data ?? []).map((l: any) => ({
        ...l,
        price_cents: (l.price_inr ?? 0) * 100
      }));
      setListings(mapped as Listing[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
  }, []);

  async function executeDelete() {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", deleteTarget);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing deleted successfully.");
        // OPTIMISTIC UPDATE: instantly remove listing from UI state
        setListings((prev) => prev.filter((l) => l.id !== deleteTarget));
        setDeleteTarget(null);
        // Silent refetch to sync background state
        fetchListings();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    if (!supabase) return;
    const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Listing ${newStatus}.`);
      fetchListings();
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Manage Listings</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Approve, hide, flag, or remove marketplace listings.
      </p>
      <div className="mt-6">
        <PanelCard
          title="All Listings"
          action={
            <button
              onClick={fetchListings}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 transition-colors"
            >
              Refresh
            </button>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 text-gold animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              desc="Listings will appear here once sellers create them."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-left py-2 pr-4">Price</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Created</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-border/30 hover:bg-surface/40">
                      <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{l.title}</td>
                      <td className="py-2 pr-4 text-gold">₹{(l.price_cents / 100).toFixed(2)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            l.status === "active"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : l.status === "flagged" || l.status === "rejected"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : l.status === "pending_review"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-surface text-muted-foreground border-border"
                          }`}
                        >
                          {l.status ?? "unknown"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right space-x-1">
                        {l.status !== "active" && (
                          <button
                            onClick={() => updateStatus(l.id, "active")}
                            className="inline-flex items-center p-1.5 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400"
                            title="Approve / Activate"
                          >
                            <Eye className="size-4" />
                          </button>
                        )}
                        {l.status === "active" && (
                          <button
                            onClick={() => updateStatus(l.id, "paused")}
                            className="inline-flex items-center p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground"
                            title="Pause / Hide"
                          >
                            <EyeOff className="size-4" />
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(l.id, "rejected")}
                          className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                          title="Reject"
                        >
                          <Flag className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(l.id)}
                          className="inline-flex items-center p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
