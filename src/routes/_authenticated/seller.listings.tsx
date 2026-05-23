// Seller Listings — full CRUD: view, create, edit, delete, image upload
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, Trash2, Eye, X, Upload, Loader2, CheckCircle2, ImagePlus } from "lucide-react";
import { PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/listings")({
  head: () => ({ meta: [{ title: "Listings — HUXZAIN Seller" }] }),
  component: Page,
});

type Listing = {
  id: string;
  title: string;
  description?: string;
  price: number;
  status: string;
  cover_image_url?: string;
  category_id?: string;
  created_at: string;
};

// ── Edit / Create Modal ───────────────────────────────────────────────────────
function ListingModal({
  listing,
  userId,
  onClose,
  onSaved,
}: {
  listing: Partial<Listing> | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !listing?.id;
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState(String(listing?.price ?? ""));
  const [status, setStatus] = useState(listing?.status ?? "active");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(listing?.cover_image_url ?? "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required."); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error("Enter a valid price."); return; }

    const supabase = getSupabase();
    if (!supabase) { toast.error("Not configured."); return; }
    setSaving(true);

    try {
      let coverUrl = listing?.cover_image_url ?? "";

      // Upload image if selected
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `listings/${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, imageFile, { upsert: true, contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: priceNum,
        status,
        cover_image_url: coverUrl || null,
        seller_id: userId,
      };

      if (isNew) {
        const { error } = await supabase.from("listings").insert(payload);
        if (error) throw error;
        toast.success("Listing created!");
      } else {
        const { error } = await supabase.from("listings").update(payload).eq("id", listing!.id!);
        if (error) throw error;
        toast.success("Listing updated!");
      }

      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold">{isNew ? "Create New Listing" : "Edit Listing"}</h2>
            <button onClick={onClose} className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40">
              <X className="size-4" />
            </button>
          </div>

          {/* Image upload */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border h-40">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(""); }}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="size-3.5 text-white" />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-black/70 text-xs text-white hover:bg-black transition-colors"
                >
                  <ImagePlus className="size-3.5" /> Change
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border hover:border-gold/50 rounded-xl h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gold/5 transition-all"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload image</p>
                <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
                  setImageFile(f);
                }
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-400">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Premium WordPress Theme"
                className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your listing..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Price ($) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                >
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {saving ? "Saving…" : isNew ? "Create Listing" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function Page() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editTarget, setEditTarget] = useState<Partial<Listing> | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchListings() {
    const supabase = getSupabase();
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    setListings((data ?? []) as Listing[]);
    setLoading(false);
  }

  useEffect(() => { fetchListings(); }, [user]);

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(id);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Listing deleted."); fetchListings(); }
    setDeleting(null);
  }

  const filtered = listings.filter((l) =>
    l.title.toLowerCase().includes(query.toLowerCase())
  );

  const stats = {
    active: listings.filter((l) => l.status === "active").length,
    hidden: listings.filter((l) => l.status === "hidden").length,
    draft: listings.filter((l) => l.status === "draft").length,
  };

  const statusColors: Record<string, string> = {
    active: "text-green-400 bg-green-500/10 border-green-500/20",
    hidden: "text-muted-foreground bg-surface border-border",
    draft: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    flagged: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <>
      {editTarget !== undefined && (
        <ListingModal
          listing={editTarget}
          userId={user?.id ?? ""}
          onClose={() => setEditTarget(undefined)}
          onSaved={fetchListings}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage, edit, and publish your marketplace listings.</p>
          </div>
          <button
            onClick={() => setEditTarget(null)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gold text-black font-semibold text-sm hover:brightness-110 transition-all"
          >
            <Plus size={14} /> New Listing
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Active", v: stats.active, c: "text-green-400" },
            { l: "Hidden", v: stats.hidden, c: "text-muted-foreground" },
            { l: "Drafts", v: stats.draft, c: "text-yellow-400" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-surface/40 p-4 text-center">
              <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Search + Table */}
        <PanelCard
          title="All Listings"
          action={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings…"
                className="h-8 pl-9 pr-3 rounded-lg border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 w-44"
              />
            </div>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-gold" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground font-medium">
                {query ? `No listings matching "${query}"` : "No listings yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Create your first listing to start selling.</p>
              <button
                onClick={() => setEditTarget(null)}
                className="mt-4 inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-gold text-black text-sm font-semibold hover:brightness-110"
              >
                <Plus size={14} /> Create Listing
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2.5 pr-4">Listing</th>
                    <th className="text-left py-2.5 pr-4">Price</th>
                    <th className="text-left py-2.5 pr-4">Status</th>
                    <th className="text-right py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-border/30 hover:bg-surface/40 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
                            {l.cover_image_url
                              ? <img src={l.cover_image_url} alt="" className="size-full object-cover" />
                              : <div className="size-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                                  {l.title?.[0]}
                                </div>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gold">${Number(l.price).toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusColors[l.status] ?? statusColors.hidden}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <a href={`/product/${l.id}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors" title="Preview">
                            <Eye className="size-4" />
                          </a>
                          <button onClick={() => setEditTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-gold transition-colors" title="Edit">
                            <Edit className="size-4" />
                          </button>
                          <button onClick={() => deleteListing(l.id)} disabled={deleting === l.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                            {deleting === l.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      </div>
    </>
  );
}
