// Seller Listings — full CRUD: view, create, edit, delete, image upload
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import { PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { slugify } from "@/lib/marketplace/listing-adapter";
type Category = { id: string; name: string; slug: string };

export const Route = createFileRoute("/_authenticated/seller/listings")({
  validateSearch: (s: Record<string, unknown>): { intent?: string } => ({
    intent: s.intent ? String(s.intent) : undefined,
  }),
  head: () => ({ meta: [{ title: "Listings — HUXZAIN Seller" }] }),
  component: Page,
});

type Listing = {
  id: string;
  title: string;
  description?: string;
  price: number;
  price_cents: number;
  status: string;
  cover_image_url?: string;
  cover_url?: string;
  gallery_urls?: string[];
  tags?: string[];
  category_id?: string;
  delivery_type: "instant" | "manual";
  delivery_time?: string;
  created_at: string;
};

// ── Edit / Create Modal ──────────────────────────────────────────────────────────
function ListingModal({
  listing,
  userId,
  onClose,
  onSaved,
  categories,
}: {
  listing: Partial<Listing> | null;
  userId: string;
  onClose: () => void;
  onSaved: (isNew: boolean) => void;
  categories: Category[];
}) {
  const isNew = !listing?.id;
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : (listing?.price_cents ? String(listing.price_cents / 100) : ""));
  const [status, setStatus] = useState(listing?.status ?? "active");
  const [categoryId, setCategoryId] = useState(listing?.category_id ?? "");
  const [deliveryType, setDeliveryType] = useState<"instant" | "manual">(listing?.delivery_type ?? "manual");
  const [deliveryTime, setDeliveryTime] = useState(listing?.delivery_time ? listing.delivery_time.replace(/\D/g, '') || "24" : "24");
  
  const [gallery, setGallery] = useState<{ id: string; file?: File; url: string }[]>(() => {
    const urls = listing?.gallery_urls && listing.gallery_urls.length > 0 
      ? listing.gallery_urls 
      : (listing?.cover_image_url ? [listing.cover_image_url] : (listing?.cover_url ? [listing.cover_url] : []));
    return urls.map(url => ({ id: Math.random().toString(), url }));
  });
  
  const [tags, setTags] = useState<string[]>(listing?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newItems = files.map(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 5MB).`);
        return null;
      }
      return { id: Math.random().toString(), file: f, url: URL.createObjectURL(f) };
    }).filter(Boolean) as { id: string; file: File; url: string }[];
    setGallery(prev => [...prev, ...newItems]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= gallery.length) return;
    const newGallery = [...gallery];
    const temp = newGallery[index];
    newGallery[index] = newGallery[newIndex];
    newGallery[newIndex] = temp;
    setGallery(newGallery);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Not configured.");
      return;
    }
    setSaving(true);

    try {
      const uploadedUrls: string[] = [];
      for (const item of gallery) {
        if (item.file) {
          const ext = item.file.name.split(".").pop() ?? "jpg";
          const path = `${userId}/listings/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("listing-images")
            .upload(path, item.file, { upsert: true, contentType: item.file.type });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          uploadedUrls.push(item.url);
        }
      }

      const coverUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;

      let finalCategoryId: string | null = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUuid) {
        finalCategoryId = categoryId;
      } else if (categoryId) {
        const matched = categories.find(
          (c) =>
            c.slug === categoryId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
        );
        if (matched) finalCategoryId = matched.id;
      }

      if (!categoryId) {
        toast.error("Please select a category.");
        setSaving(false);
        return;
      }

      // Ensure category_id is not null to satisfy database NOT NULL constraint
      if (!finalCategoryId && categories.length > 0) {
        finalCategoryId = categories.find(c => c.id !== "more")?.id || categories[0].id;
      }

      // Ensure status is valid for database enum listing_status
      // Valid values: 'draft', 'active', 'hidden', 'flagged', 'archived'
      // 'pending_review' is not a valid enum value — map it to 'draft'
      let dbStatus = status;
      if (dbStatus === "pending_review") {
        dbStatus = "draft";
      }

      // New listings always start as 'active'; edits keep the chosen status
      const finalStatus = isNew ? "active" : dbStatus;

      // Use correct DB column names matching the actual live listings table schema
      const basePayload = {
        title: title.trim(),
        description: description.trim() || null,
        slug: slugify(title.trim()),
        price: priceNum,
        delivery_time: String(parseInt(deliveryTime) || 24),
        delivery_type: deliveryType,
        status: finalStatus,
        cover_image_url: coverUrl,
        gallery_urls: uploadedUrls,
        tags: tags,
        category_id: finalCategoryId,
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please check your network connection.")), 10000)
      );

      if (isNew) {
        const insertPromise = async () => {
          const payload = {
            ...basePayload,
            seller_id: userId,
          };
          const { error } = await supabase.from("listings").insert(payload);
          if (error) throw error;
        };
        await Promise.race([insertPromise(), timeoutPromise]);
      } else {
        const updatePromise = async () => {
          console.log('[Update] listing.id:', listing?.id);
          console.log('[Update] userId:', userId);
          console.log('[Update] payload:', basePayload);

          // Verify the row exists first
          const { data: existingRow } = await supabase
            .from('listings')
            .select('id, seller_id, status')
            .eq('id', listing?.id!)
            .maybeSingle();
          console.log('[Update] Existing DB row:', existingRow);

          const { data, error } = await supabase
            .from('listings')
            .update({
              ...basePayload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', listing?.id!)
            .select();
          console.log('[Update] Updated listing:', data);
          console.log('[Update] Update error:', error);
          if (error) throw error;
        };
        await Promise.race([updatePromise(), timeoutPromise]);
      }

      // Call onSaved BEFORE onClose so the parent can refresh + show success modal
      onSaved(isNew);
      onClose();
    } catch (e: any) {
      console.error("[ListingModal] Save error:", e);
      const msg = e?.message ?? e?.details ?? JSON.stringify(e) ?? "Unknown error";
      toast.error(`Could not save listing: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold">
              {isNew ? "Create New Listing" : "Edit Listing"}
            </h2>
            <button
              onClick={onClose}
              className="size-8 rounded-full border border-border flex items-center justify-center hover:border-gold/40"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Image gallery upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Gallery Images (First is Cover)</label>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {gallery.map((item, i) => (
                <div key={item.id} className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-border group">
                  <img src={item.url} alt="Gallery item" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {i > 0 && (
                      <button onClick={() => moveImage(i, -1)} className="p-1 bg-white/20 rounded hover:bg-white/40 text-white text-xs">&lt;</button>
                    )}
                    <button onClick={() => removeImage(item.id)} className="p-1 bg-red-500/80 rounded hover:bg-red-500 text-white text-xs">Del</button>
                    {i < gallery.length - 1 && (
                      <button onClick={() => moveImage(i, 1)} className="p-1 bg-white/20 rounded hover:bg-white/40 text-white text-xs">&gt;</button>
                    )}
                  </div>
                </div>
              ))}
              <div
                className="w-32 h-32 flex-shrink-0 border-2 border-dashed border-border hover:border-gold/50 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gold/5 transition-all"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Image</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
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
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Delivery Type</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as "instant" | "manual")}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                >
                  <option value="manual">Manual Delivery</option>
                  <option value="instant">Instant Download</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Delivery Time (Hours)</label>
                <input
                  type="number"
                  min="1"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="24"
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Price (₹) <span className="text-red-400">*</span>
                </label>
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Tags (Press Enter to add)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-surface border border-border px-2 py-1 rounded text-xs">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tag..."
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
                <option value="draft">Draft</option>
                <option value="active">Active (Published)</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {saving ? "Saving..." : isNew ? "Create Listing" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success Modal ────────────────────────────────────────────────────────────────
function PublishSuccessModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="p-6 text-center">
          <div className="mx-auto size-16 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="size-8 text-gold animate-bounce" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">Success!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {message}
          </p>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
function Page() {
  const { user } = useAuth();
  const { intent } = Route.useSearch();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editTarget, setEditTarget] = useState<Partial<Listing> | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchListings() {
    const supabase = getSupabase();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    
    // Map live database columns to frontend Listing properties
    // DB columns: price, delivery_time, delivery_type, gallery_urls, cover_image_url
    const mappedListings = (data ?? []).map((l: any) => ({
      ...l,
      price: l.price ?? 0,
      price_cents: Math.round((l.price ?? 0) * 100),
      cover_url: l.cover_image_url ?? null,
      gallery_urls: l.gallery_urls ?? [],
      delivery_time: l.delivery_time ?? "24",
      delivery_type: (l.delivery_type ?? "manual") as "instant" | "manual",
    }));
    setListings(mappedListings as Listing[]);
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("sort_order")
      .order("name");

    let loadedCats = (cats ?? []) as Category[];

    if (loadedCats.length === 0) {
      loadedCats = [
        { id: "e01c9566-a63d-4013-925a-2b1986437cb1", name: "Digital Products", slug: "digital-products" },
        { id: "c9f925e3-5f7d-425b-b893-4e0f7b1e6c53", name: "Services", slug: "services" },
        { id: "f4f4468f-ae87-46d3-8a86-3a805085fd3c", name: "Hosting", slug: "hosting" },
        { id: "79193b66-8457-4386-b17f-87cf001c6d8d", name: "SEO", slug: "seo" },
        { id: "def5bbfd-6c94-48c4-b740-f3fa3e420ab1", name: "Design", slug: "design" },
        { id: "0bca47c6-f647-441e-8144-09351f43bfc6", name: "Programming", slug: "programming" },
        { id: "507f770d-711b-4800-94bb-fbf4c60c483a", name: "Marketing", slug: "marketing" },
        { id: "acfc3f9e-53e2-4ece-8796-3095d03221ac", name: "Business", slug: "business" },
        { id: "21321113-d5dc-49aa-a201-f135438e5b50", name: "More", slug: "more" }
      ];
    } else {
      const hasMore = loadedCats.some(c => c.slug === "more");
      if (!hasMore) {
        loadedCats.push({ id: "more", name: "More", slug: "more" });
      }
    }

    setCategories(loadedCats);
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
  }, [user]);

  useEffect(() => {
    if (intent === "new" || intent === "create") {
      setEditTarget(null);
    }
  }, [intent]);

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(id);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Listing deleted.");
      fetchListings();
    }
    setDeleting(null);
  }

  const filtered = listings.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()));

  const stats = {
    active: listings.filter((l) => l.status === "active").length,
    hidden: listings.filter((l) => l.status === "hidden").length,
    draft: listings.filter((l) => l.status === "draft").length,
  };

  const statusColors: Record<string, string> = {
    active: "text-green-400 bg-green-500/10 border-green-500/20",
    paused: "text-muted-foreground bg-surface border-border",
    draft: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    pending_review: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
    archived: "text-muted-foreground bg-surface border-border",
  };

  return (
    <>
      {editTarget !== undefined && (
        <ListingModal
          listing={editTarget}
          userId={user?.id ?? ""}
          onClose={() => setEditTarget(undefined)}
          onSaved={(isNewListing) => {
            fetchListings();
            setSuccessMessage(
              isNewListing
                ? "Your listing has been created successfully."
                : "Listing published successfully."
            );
            setShowPublishSuccess(true);
          }}
          categories={categories}
        />
      )}

      {showPublishSuccess && (
        <PublishSuccessModal
          message={successMessage}
          onClose={() => setShowPublishSuccess(false)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage, edit, and publish your marketplace listings.
            </p>
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
            <div
              key={s.l}
              className="rounded-xl border border-border bg-surface/40 p-4 text-center"
            >
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
                placeholder="Search listings..."
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
              <p className="text-sm text-muted-foreground mt-1">
                Create your first listing to start selling.
              </p>
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
                    <tr
                      key={l.id}
                      className="border-b border-border/30 hover:bg-surface/40 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
                            {l.cover_url ? (
                              <img
                                src={l.cover_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                                {l.title?.[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{l.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(l.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gold">
                        ₹{(l.price ?? (l.price_cents / 100)).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusColors[l.status] ?? "text-muted-foreground bg-surface border-border"}`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`/product/${l.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                            title="Preview"
                          >
                            <Eye className="size-4" />
                          </a>
                          <button
                            onClick={() => setEditTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-gold transition-colors"
                            title="Edit"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            onClick={() => deleteListing(l.id)}
                            disabled={deleting === l.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            {deleting === l.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
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
