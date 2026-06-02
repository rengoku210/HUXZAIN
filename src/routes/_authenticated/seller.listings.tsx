// Seller Listings — full CRUD: view, create, edit, delete, image upload
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  AlertCircle,
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
  const [seoTitle, setSeoTitle] = useState((listing as any)?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState((listing as any)?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState((listing as any)?.seo_keywords ?? "");
  
  const [gallery, setGallery] = useState<{ id: string; file?: File; url: string }[]>(() => {
    const urls = listing?.gallery_urls && listing.gallery_urls.length > 0 
      ? listing.gallery_urls 
      : (listing?.cover_image_url ? [listing.cover_image_url] : (listing?.cover_url ? [listing.cover_url] : []));
    return urls.map(url => ({ id: Math.random().toString(), url }));
  });
  
  const [tags, setTags] = useState<string[]>(listing?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);

    // 1. Validation check
    if (!userId) {
      const msg = "Authentication error: You must be logged in as an authorized seller to create a listing.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      const msg = "Title is required.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      const msg = "Description is required.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!categoryId) {
      const msg = "Please select a category.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      const msg = "Enter a valid positive price.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      const msg = "Marketplace backend is not configured.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    console.log("[Rebuild Listing Flow] Starting creation pipeline...");

    try {
      // 2. Upload all images in the gallery sequentially
      const imageUrls: string[] = [];
      
      for (let i = 0; i < gallery.length; i++) {
        const item = gallery[i];
        if (item.file) {
          console.log(`[Rebuild Listing Flow] Uploading gallery image ${i + 1} file:`, item.file.name);
          const ext = item.file.name.split(".").pop() ?? "jpg";
          const path = `${userId}/listings/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${ext}`;
          
          const { data: upData, error: upErr } = await supabase.storage
            .from("listing-images")
            .upload(path, item.file, { upsert: true, contentType: item.file.type });
            
          if (upErr) {
            console.error(`[Rebuild Listing Flow] Gallery image ${i + 1} upload error:`, upErr);
            throw new Error(`Gallery image ${i + 1} upload failed: ${upErr.message}`);
          }
          
          const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
          console.log(`[Rebuild Listing Flow] Gallery image ${i + 1} uploaded successfully. URL:`, urlData.publicUrl);
        } else if (item.url) {
          imageUrls.push(item.url);
        }
      }

      const coverImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      // Resolve category UUID
      let finalCategoryId = categoryId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (!isUuid) {
        const matched = categories.find(c => c.slug === categoryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id));
        if (matched) {
          finalCategoryId = matched.id;
        } else if (categories.length > 0) {
          finalCategoryId = categories.find(c => c.id !== "more")?.id || categories[0].id;
        }
      }

      // Generate clean slug
      const generatedSlug = slugify(trimmedTitle);

      // Status logic mapping (database enum limit check)
      let dbStatus = status;
      if (dbStatus === "pending_review") {
        dbStatus = "draft";
      }
      const finalStatus = isNew ? "active" : dbStatus;

      // 3. Direct direct insert / update payload
      const payload: any = {
        title: trimmedTitle,
        description: trimmedDescription,
        slug: generatedSlug,
        price_inr: priceNum,
        delivery_time_hours: parseInt(deliveryTime) || 24,
        status: finalStatus,
        cover_image_url: coverImageUrl,
        images: imageUrls,
        category_id: finalCategoryId,
        attributes: {},
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        seo_keywords: seoKeywords.trim() || null,
      };

      console.log("[Rebuild Listing Flow] Database payload:", JSON.stringify(payload, null, 2));

      if (isNew) {
        payload.seller_id = userId;
        console.log("[Rebuild Listing Flow] Performing direct INSERT...");
        const { data, error } = await supabase
          .from("listings")
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) {
          console.error("[Rebuild Listing Flow] INSERT error:", error);
          throw error;
        }
        
        console.log("[Rebuild Listing Flow] Direct INSERT response:", data);
        if (!data) {
          throw new Error("Database insert completed but did not return the created row. This can happen due to Row Level Security (RLS) policies blocking your user from inserting.");
        }
      } else {
        console.log("[Rebuild Listing Flow] Performing direct UPDATE...");
        payload.updated_at = new Date().toISOString();
        const { data, error } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id!)
          .select()
          .maybeSingle();

        if (error) {
          console.error("[Rebuild Listing Flow] UPDATE error:", error);
          throw error;
        }
        
        console.log("[Rebuild Listing Flow] Direct UPDATE response:", data);
        if (!data) {
          throw new Error("Database update completed but did not return the updated row. Make sure you own this listing.");
        }
      }

      // 4. Success behavior
      toast.success(isNew ? "Listing created successfully!" : "Listing updated successfully!");
      onSaved(isNew);
      onClose();
    } catch (err: any) {
      console.error("[Rebuild Listing Flow] Critical failure:", err);
      const code = err?.code ? ` [${err.code}]` : '';
      const messageText = err?.message ?? err?.details ?? JSON.stringify(err) ?? "Unknown database/network error";
      const fullError = `Unable to save listing${code}: ${messageText}`;
      setErrorMsg(fullError);
      toast.error(fullError);
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

            <div className="border border-border rounded-2xl p-4 bg-surface/30 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-white">Search Engine Optimization (SEO)</span>
                <button
                  type="button"
                  onClick={() => {
                    const categoryObj = categories.find(c => c.id === categoryId);
                    const categoryName = categoryObj ? categoryObj.name : "Digital Product";
                    setSeoTitle(title ? `${title} | Buy ${categoryName} on HUXZAIN` : "");
                    setSeoDescription(description ? `${description.slice(0, 150)}... Buy secure digital items on HUXZAIN.` : "");
                    setSeoKeywords(title ? `${title.toLowerCase().split(" ").join(", ")}, huxzain, buy ${categoryName.toLowerCase()}` : "");
                    toast.success("Listing SEO fields generated!");
                  }}
                  className="text-xs text-gold hover:underline font-bold cursor-pointer"
                >
                  Auto Generate SEO
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">SEO Slug Preview</label>
                  <div className="px-3 py-1.5 rounded-lg bg-background text-[10px] text-muted-foreground select-all border border-border/40 font-mono truncate">
                    https://huxzain.shop/product/<span className="text-gold font-semibold">{title ? slugify(title) : "url-slug"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">SEO Meta Title</label>
                    <input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="e.g. Valorant Account | HUXZAIN"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-surface/60 text-xs text-foreground focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">SEO Keywords</label>
                    <input
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      placeholder="e.g. skin, valorant, account"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-surface/60 text-xs text-foreground focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">SEO Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={2}
                    placeholder="Search engine meta description..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface/60 text-xs text-foreground focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>
              </div>
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

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
              {errorMsg}
            </div>
          )}

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
  const navigate = useNavigate();
  const { intent } = Route.useSearch();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editTarget, setEditTarget] = useState<Partial<Listing> | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
    
    // Map live database columns to frontend Listing properties.
    // Note: gallery_urls, tags, delivery_time may not exist in production DB yet.
    const mappedListings = (data ?? []).map((l: any) => ({
      ...l,
      price: l.price_inr ?? l.price ?? 0,
      price_cents: Math.round((l.price_inr ?? l.price ?? 0) * 100),
      cover_url: l.cover_image_url ?? null,
      gallery_urls: l.images && l.images.length > 0 ? l.images : (l.gallery_urls ?? []),
      delivery_time: l.delivery_time ?? "",
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

  async function executeDelete() {
    if (!deleteTarget) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(deleteTarget);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", deleteTarget);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing deleted successfully.");
        // OPTIMISTIC UPDATE: filter out the deleted listing from state immediately
        setListings((prev) => prev.filter((l) => l.id !== deleteTarget));
        setDeleteTarget(null);
        // Background sync
        fetchListings();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(null);
    }
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
          onClose={() => {
            setEditTarget(undefined);
            navigate({ to: "/seller/listings", search: {} });
          }}
          onSaved={(isNewListing) => {
            fetchListings();
            setEditTarget(undefined);
            navigate({ to: "/seller/listings", search: {} });
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
                            onClick={() => setDeleteTarget(l.id)}
                            disabled={deleting === l.id || deleting !== null}
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

      {/* ─── CUSTOM DELETE CONFIRMATION MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <AlertCircle size={18} /> Confirm Listing Deletion
            </h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Are you sure you want to delete this listing? This action cannot be undone and will permanently remove this listing from your store.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting !== null}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting !== null}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer border-none"
              >
                {deleting !== null ? (
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
