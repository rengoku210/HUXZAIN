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
import { getCategoryTypeFromSlug } from "@/lib/marketplace/listing-attributes";
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
  delivery_type: "instant" | "manual" | "hybrid";
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
  const [deliveryType, setDeliveryType] = useState<"instant" | "manual" | "hybrid">(listing?.delivery_type ?? "manual");
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
  const [attributes, setAttributes] = useState<Record<string, any>>((listing as any)?.attributes ?? {});

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [instructions, setInstructions] = useState("");
  const [recoveryDetails, setRecoveryDetails] = useState("");
  const [emailTransferDetails, setEmailTransferDetails] = useState("");
  const [uploadingProof, setUploadingProof] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!listing?.id) return;
    const catSlug = categories.find(c => c.id === categoryId)?.slug || "";
    if (getCategoryTypeFromSlug(catSlug) !== "game-accounts") return;

    const supabase = getSupabase();
    if (!supabase) return;
    
    supabase
      .rpc("reveal_listing_credentials", { p_listing_id: listing.id })
      .then(({ data, error }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row && !error) {
          setLoginId(row.login_id || "");
          setLoginPassword(row.password || "");
          setInstructions(row.instructions || "");
          setRecoveryDetails(row.recovery_details || "");
          setEmailTransferDetails(row.email_transfer_details || "");
        }
      });
  }, [listing?.id, categoryId, categories]);

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>, key: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB).");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setUploadingProof(prev => ({ ...prev, [key]: true }));
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/proofs/${Date.now()}-${key}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
      setAttributes(prev => ({ ...prev, [key]: urlData.publicUrl }));
      toast.success("Proof uploaded successfully!");
    } catch (err: any) {
      toast.error(`Failed to upload proof: ${err.message}`);
    } finally {
      setUploadingProof(prev => ({ ...prev, [key]: false }));
    }
  }

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

    // Resolve category UUID early
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

    const catSlug = categories.find(c => c.id === finalCategoryId)?.slug || "";
    const isGameAccount = getCategoryTypeFromSlug(catSlug) === "game-accounts";

    if (isGameAccount) {
      if (!attributes.game?.trim()) { toast.error("Game Name is required."); return; }
      if (!attributes.region?.trim()) { toast.error("Region is required."); return; }
      if (!attributes.rank?.trim()) { toast.error("Rank is required."); return; }
      if (!attributes.platform?.trim()) { toast.error("Platform is required."); return; }
      if (attributes.level === undefined || attributes.level === null || isNaN(attributes.level)) { toast.error("Level is required."); return; }
      if (attributes.skinsCount === undefined || attributes.skinsCount === null || isNaN(attributes.skinsCount)) { toast.error("Skins Count is required."); return; }
      if (!attributes.rareItems?.trim() && !attributes.rareSkins?.trim()) { toast.error("Rare Items list is required."); return; }
      if (!attributes.linkedAccounts?.trim()) { toast.error("Linked Accounts info is required."); return; }
      if (!attributes.warrantyInformation?.trim() && !attributes.warrantyPeriod?.trim()) { toast.error("Warranty Information is required."); return; }
      if (!attributes.accountCreationDate?.trim()) { toast.error("Account Creation Date is required."); return; }
      if (!attributes.recoveryHistory?.trim() && !attributes.recoveryInfo?.trim()) { toast.error("Recovery History is required."); return; }
      if (!loginId.trim()) { toast.error("Login ID / Username is required for secure credentials vault."); return; }
      if (!loginPassword.trim()) { toast.error("Login Password is required for secure credentials vault."); return; }
    }

    // Ensure key syncing for compatibility in JSONB attributes
    const syncedAttributes = isGameAccount ? {
      ...attributes,
      type: "game-accounts" as const,
      rareItems: attributes.rareItems || attributes.rareSkins || "",
      rareSkins: attributes.rareItems || attributes.rareSkins || "",
      emailChangeable: attributes.emailChangeable !== undefined ? attributes.emailChangeable : (attributes.emailChangeAvailable !== undefined ? attributes.emailChangeAvailable : true),
      emailChangeAvailable: attributes.emailChangeable !== undefined ? attributes.emailChangeable : (attributes.emailChangeAvailable !== undefined ? attributes.emailChangeAvailable : true),
      firstOwnerStatus: attributes.firstOwnerStatus !== undefined ? attributes.firstOwnerStatus : (attributes.originalOwner !== undefined ? attributes.originalOwner : true),
      originalOwner: attributes.firstOwnerStatus !== undefined ? attributes.firstOwnerStatus : (attributes.originalOwner !== undefined ? attributes.originalOwner : true),
      warrantyInformation: attributes.warrantyInformation || attributes.warrantyPeriod || "",
      warrantyPeriod: attributes.warrantyInformation || attributes.warrantyPeriod || "",
      recoveryHistory: attributes.recoveryHistory || attributes.recoveryInfo || "",
      recoveryInfo: attributes.recoveryHistory || attributes.recoveryInfo || "",
      originalEmailIncluded: attributes.originalEmailIncluded !== undefined ? attributes.originalEmailIncluded : true,
      purchaseReceiptsAvailable: attributes.purchaseReceiptsAvailable !== undefined ? attributes.purchaseReceiptsAvailable : true
    } : attributes;

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

      // Generate clean slug
      const generatedSlug = slugify(trimmedTitle);

      // Status logic mapping (database enum limit check)
      let dbStatus = status;
      if (dbStatus === "pending_review") {
        dbStatus = "draft";
      }

      // Auto-moderation check
      const prohibited = ["hack", "cheats", "cheat", "aimbot", "exploit", "cracked", "stolen", "direct payment", "discord.gg", "whatsapp", "telegram", "contact me", "private deal", "deal outside", "bypass escrow"];
      const foundKeywords: string[] = [];
      const textToSearch = `${trimmedTitle} ${trimmedDescription} ${tags.join(" ")}`.toLowerCase();
      
      prohibited.forEach(word => {
        if (textToSearch.includes(word)) {
          foundKeywords.push(word);
        }
      });

      const { data: duplicates } = await supabase
        .from("listings")
        .select("id")
        .eq("title", trimmedTitle)
        .neq("id", listing?.id || "00000000-0000-0000-0000-000000000000")
        .neq("status", "draft")
        .limit(1);

      const isDuplicate = duplicates && duplicates.length > 0;
      
      let riskScore = 0;
      let notes = "";
      let isFlagged = false;

      if (foundKeywords.length > 0) {
        riskScore += 60 + foundKeywords.length * 10;
        notes += `Auto-flagged: Prohibited keywords found: ${foundKeywords.join(", ")}. `;
        isFlagged = true;
      }

      if (isDuplicate) {
        riskScore += 50;
        notes += `Auto-flagged: Duplicate listing title detected. `;
        isFlagged = true;
      }

      if (riskScore > 100) riskScore = 100;

      // MOD-01 / LIST-25: listings are NOT instantly live. New listings enter
      // the moderation queue as "pending" and only go live once an admin
      // approves them (admin.listings.tsx). Edits to already-live listings keep
      // their current status unless flagged below.
      let finalStatus = isNew ? "pending" : dbStatus;
      let payloadRiskScore = null;
      let payloadKeywords = null;
      let payloadNotes = null;

      if (isFlagged) {
        finalStatus = "pending";
        payloadRiskScore = riskScore;
        payloadKeywords = foundKeywords.length > 0 ? foundKeywords : null;
        payloadNotes = notes;
      }

      // 3. Direct direct insert / update payload
      const payload: any = {
        title: trimmedTitle,
        description: trimmedDescription,
        slug: generatedSlug,
        price_inr: priceNum,
        delivery_type: deliveryType,
        delivery_time_hours: parseInt(deliveryTime) || 24,
        status: finalStatus,
        cover_image_url: coverImageUrl,
        images: imageUrls,
        category_id: finalCategoryId,
        attributes: syncedAttributes,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        seo_keywords: seoKeywords.trim() || null,
        tags: tags,
        risk_score: payloadRiskScore,
        suspicious_keywords: payloadKeywords,
        moderator_notes: payloadNotes
      };

      console.log("[Rebuild Listing Flow] Database payload:", JSON.stringify(payload, null, 2));

      let savedListingId = "";
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
        savedListingId = data.id;
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
        savedListingId = data.id;
      }

      // Upsert secure credentials
      if (isGameAccount) {
        const { error: credsErr } = await supabase
          .rpc("set_listing_credentials", {
            p_listing_id: savedListingId,
            p_login_id: loginId.trim(),
            p_password: loginPassword,
            p_instructions: instructions.trim() || null,
            p_recovery_details: recoveryDetails.trim() || null,
            p_email_transfer_details: emailTransferDetails.trim() || null
          });

        if (credsErr) {
          console.error("[ListingModal] Failed to save credentials:", credsErr);
          throw new Error(`Failed to save secure credentials: ${credsErr.message}`);
        }
      }

      // 4. Success behavior
      if (isFlagged) {
        toast.warning(`Listing submitted but flagged for manual review: ${notes}`);
      } else if (isNew) {
        toast.success("Listing submitted for review. It will go live once approved by our moderation team.");
      } else {
        toast.success("Listing updated successfully!");
      }
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
                  onChange={(e) => setDeliveryType(e.target.value as "instant" | "manual" | "hybrid")}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50"
                >
                  <option value="instant">Automatic / Instant (keys, gift cards, subscriptions)</option>
                  <option value="manual">Manual (coaching, services, accounts)</option>
                  <option value="hybrid">Hybrid (initial access + manual ownership transfer)</option>
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
              <span className="text-sm font-semibold text-white">Listing Attributes (Auto-updates based on Category)</span>
              <div className="space-y-4">
                {(() => {
                  const catSlug = categories.find(c => c.id === categoryId)?.slug || "";
                  const type = getCategoryTypeFromSlug(catSlug);
                  
                  if (type === "game-accounts") {
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Game Name <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.game || ""}
                              onChange={(e) => setAttributes({...attributes, game: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Valorant, Fortnite"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Region <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.region || ""}
                              onChange={(e) => setAttributes({...attributes, region: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Asia, NA, EU"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Rank <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.rank || ""}
                              onChange={(e) => setAttributes({...attributes, rank: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Radiant, Diamond"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Platform <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.platform || ""}
                              onChange={(e) => setAttributes({...attributes, platform: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. PC, PS5, Xbox"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Level <span className="text-red-400">*</span></label>
                            <input
                              type="number"
                              value={attributes.level || ""}
                              onChange={(e) => setAttributes({...attributes, level: parseInt(e.target.value) || 0, type: "game-accounts"})}
                              placeholder="e.g. 50"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Skins Count <span className="text-red-400">*</span></label>
                            <input
                              type="number"
                              value={attributes.skinsCount || ""}
                              onChange={(e) => setAttributes({...attributes, skinsCount: parseInt(e.target.value) || 0, type: "game-accounts"})}
                              placeholder="e.g. 85"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1.5">Rare Items <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.rareItems || attributes.rareSkins || ""}
                              onChange={(e) => setAttributes({...attributes, rareItems: e.target.value, rareSkins: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Renegade Raider, Vandal Prime"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Linked Accounts <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.linkedAccounts || ""}
                              onChange={(e) => setAttributes({...attributes, linkedAccounts: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Steam, Twitch, none"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Email Changeable <span className="text-red-400">*</span></label>
                            <select
                              value={attributes.emailChangeable === undefined ? "true" : String(attributes.emailChangeable)}
                              onChange={(e) => {
                                const val = e.target.value === "true";
                                setAttributes({...attributes, emailChangeable: val, emailChangeAvailable: val, type: "game-accounts"});
                              }}
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">First Owner Status <span className="text-red-400">*</span></label>
                            <select
                              value={attributes.firstOwnerStatus === undefined ? "true" : String(attributes.firstOwnerStatus)}
                              onChange={(e) => {
                                const val = e.target.value === "true";
                                setAttributes({...attributes, firstOwnerStatus: val, originalOwner: val, type: "game-accounts"});
                              }}
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            >
                              <option value="true">Yes (Original Owner)</option>
                              <option value="false">No (Resold Account)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Original Email Included <span className="text-red-400">*</span></label>
                            <select
                              value={attributes.originalEmailIncluded === undefined ? "true" : String(attributes.originalEmailIncluded)}
                              onChange={(e) => setAttributes({...attributes, originalEmailIncluded: e.target.value === "true", type: "game-accounts"})}
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Warranty Information <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.warrantyInformation || attributes.warrantyPeriod || ""}
                              onChange={(e) => setAttributes({...attributes, warrantyInformation: e.target.value, warrantyPeriod: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. 7 Days, Lifetime, None"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Account Creation Date <span className="text-red-400">*</span></label>
                            <input
                              type="date"
                              value={attributes.accountCreationDate || ""}
                              onChange={(e) => setAttributes({...attributes, accountCreationDate: e.target.value, type: "game-accounts"})}
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1.5">Recovery History <span className="text-red-400">*</span></label>
                            <input
                              value={attributes.recoveryHistory || attributes.recoveryInfo || ""}
                              onChange={(e) => setAttributes({...attributes, recoveryHistory: e.target.value, recoveryInfo: e.target.value, type: "game-accounts"})}
                              placeholder="e.g. Never recovered, recovered once in 2024"
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5">Purchase Receipts Available <span className="text-red-400">*</span></label>
                            <select
                              value={attributes.purchaseReceiptsAvailable === undefined ? "true" : String(attributes.purchaseReceiptsAvailable)}
                              onChange={(e) => setAttributes({...attributes, purchaseReceiptsAvailable: e.target.value === "true", type: "game-accounts"})}
                              className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                        </div>

                        {/* Optional Proof Uploads */}
                        <div className="border-t border-border pt-4 mt-2">
                          <span className="text-xs font-semibold text-white block mb-2">Optional Proof Uploads (Trust Enhancement)</span>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: "Rank Proof", key: "proofRankUrl" },
                              { label: "Inventory Proof", key: "proofInventoryUrl" },
                              { label: "Purchase History Proof", key: "proofPurchaseUrl" },
                              { label: "Screenshots Proof", key: "proofScreenshotsUrl" }
                            ].map((p) => (
                              <div key={p.key} className="rounded-xl border border-border bg-background/40 p-3">
                                <div className="text-[11px] font-medium text-muted-foreground mb-1">{p.label}</div>
                                {attributes[p.key] ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-gold truncate">{attributes[p.key].split('/').pop()}</span>
                                    <button
                                      type="button"
                                      onClick={() => setAttributes(prev => {
                                        const copy = { ...prev };
                                        delete copy[p.key];
                                        return copy;
                                      })}
                                      className="text-red-400 hover:text-red-500 text-xs shrink-0"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => handleProofUpload(e, p.key)}
                                      disabled={uploadingProof[p.key]}
                                      className="text-xs text-muted-foreground w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                                    />
                                    {uploadingProof[p.key] && <Loader2 className="size-3 text-gold animate-spin" />}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Secure Credential Vault */}
                        <div className="border-t border-gold/20 pt-4 mt-2 bg-gold/5 rounded-xl p-3 border border-gold/15">
                          <span className="text-xs font-semibold text-gold block mb-1">🔐 Secure Account Credentials Vault</span>
                          <p className="text-[10px] text-muted-foreground mb-3">
                            These credentials are encrypted, hidden from the public listing, and only shared with the buyer automatically after successful payment.
                          </p>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] text-muted-foreground mb-1">Login ID / Username <span className="text-red-400">*</span></label>
                                <input
                                  value={loginId}
                                  onChange={(e) => setLoginId(e.target.value)}
                                  placeholder="e.g. valorant_acc_1"
                                  className="w-full h-8 px-2 rounded-lg border border-border bg-background/60 text-xs focus:outline-none focus:border-gold/50 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-muted-foreground mb-1">Login Password <span className="text-red-400">*</span></label>
                                <input
                                  type="password"
                                  value={loginPassword}
                                  onChange={(e) => setLoginPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full h-8 px-2 rounded-lg border border-border bg-background/60 text-xs focus:outline-none focus:border-gold/50 text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-1">Delivery & Login Instructions</label>
                              <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Enter specific instructions on how the buyer should log in and secure the account..."
                                rows={2}
                                className="w-full p-2 rounded-lg border border-border bg-background/60 text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-1">Account Recovery Details (Security Questions, Codes)</label>
                              <textarea
                                value={recoveryDetails}
                                onChange={(e) => setRecoveryDetails(e.target.value)}
                                placeholder="Enter recovery codes, first location, transaction IDs, original ISP, security answers..."
                                rows={2}
                                className="w-full p-2 rounded-lg border border-border bg-background/60 text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-1">Email Transfer Details</label>
                              <textarea
                                value={emailTransferDetails}
                                onChange={(e) => setEmailTransferDetails(e.target.value)}
                                placeholder="Enter credentials for the recovery email, or instructions on how email transfer will take place..."
                                rows={2}
                                className="w-full p-2 rounded-lg border border-border bg-background/60 text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (type === "currency") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Game <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.game || ""}
                            onChange={(e) => setAttributes({...attributes, game: e.target.value, type: "currency"})}
                            placeholder="e.g. Fortnite"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Currency Type <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.currencyType || ""}
                            onChange={(e) => setAttributes({...attributes, currencyType: e.target.value, type: "currency"})}
                            placeholder="e.g. V-Bucks"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Amount <span className="text-red-400">*</span></label>
                          <input
                            type="number"
                            value={attributes.amount || ""}
                            onChange={(e) => setAttributes({...attributes, amount: parseInt(e.target.value) || 0, type: "currency"})}
                            placeholder="e.g. 5000"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Delivery Method</label>
                          <input
                            value={attributes.deliveryMethod || ""}
                            onChange={(e) => setAttributes({...attributes, deliveryMethod: e.target.value, type: "currency"})}
                            placeholder="e.g. In-game gift, UID top-up"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "boosting") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Game <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.game || ""}
                            onChange={(e) => setAttributes({...attributes, game: e.target.value, type: "boosting"})}
                            placeholder="e.g. League of Legends"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Region <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.region || ""}
                            onChange={(e) => setAttributes({...attributes, region: e.target.value, type: "boosting"})}
                            placeholder="e.g. NA, EUW, EUNE"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Current Rank <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.currentRank || ""}
                            onChange={(e) => setAttributes({...attributes, currentRank: e.target.value, type: "boosting"})}
                            placeholder="e.g. Gold IV"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Desired Rank <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.desiredRank || ""}
                            onChange={(e) => setAttributes({...attributes, desiredRank: e.target.value, type: "boosting"})}
                            placeholder="e.g. Platinum I"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Platform (Optional)</label>
                          <input
                            value={attributes.platform || ""}
                            onChange={(e) => setAttributes({...attributes, platform: e.target.value, type: "boosting"})}
                            placeholder="e.g. PC, Console"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "gift-cards") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Brand / Issuer <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.brand || ""}
                            onChange={(e) => setAttributes({...attributes, brand: e.target.value, type: "gift-cards"})}
                            placeholder="e.g. Steam, PlayStation, Amazon"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Card Value <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.value || ""}
                            onChange={(e) => setAttributes({...attributes, value: e.target.value, type: "gift-cards"})}
                            placeholder="e.g. ₹500, $50"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Region Restriction <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.region || ""}
                            onChange={(e) => setAttributes({...attributes, region: e.target.value, type: "gift-cards"})}
                            placeholder="e.g. US, India, Global"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "software-tools") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Software Name <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.softwareName || ""}
                            onChange={(e) => setAttributes({...attributes, softwareName: e.target.value, type: "software-tools"})}
                            placeholder="e.g. Windows 11 Pro, Photoshop"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">OS Compatibility <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.os || ""}
                            onChange={(e) => setAttributes({...attributes, os: e.target.value, type: "software-tools"})}
                            placeholder="e.g. Windows, MacOS, Linux"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">License Type <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.licenseType || ""}
                            onChange={(e) => setAttributes({...attributes, licenseType: e.target.value, type: "software-tools"})}
                            placeholder="e.g. Lifetime Key, 1 Year Subscription"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Device Limit</label>
                          <input
                            type="number"
                            value={attributes.deviceLimit || ""}
                            onChange={(e) => setAttributes({...attributes, deviceLimit: parseInt(e.target.value) || 0, type: "software-tools"})}
                            placeholder="e.g. 5"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "subscriptions") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Subscription Name <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.subscriptionName || ""}
                            onChange={(e) => setAttributes({...attributes, subscriptionName: e.target.value, type: "subscriptions"})}
                            placeholder="e.g. Netflix, Spotify Premium"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Plan Type <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.planType || ""}
                            onChange={(e) => setAttributes({...attributes, planType: e.target.value, type: "subscriptions"})}
                            placeholder="e.g. Premium UHD, Shared Screen"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Duration <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.duration || ""}
                            onChange={(e) => setAttributes({...attributes, duration: e.target.value, type: "subscriptions"})}
                            placeholder="e.g. 1 Month, 12 Months"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Access Model <span className="text-red-400">*</span></label>
                          <select
                            value={attributes.accessModel || ""}
                            onChange={(e) => setAttributes({...attributes, accessModel: e.target.value, type: "subscriptions"})}
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          >
                            <option value="">Select Access Model</option>
                            <option value="Shared Account">Shared Account Access</option>
                            <option value="Private Account">Private Account Access</option>
                            <option value="Upgrade Service">Upgrade Service (Existing Account)</option>
                            <option value="Invitation Link">Invitation Link / Code</option>
                          </select>
                        </div>
                      </div>
                    );
                  } else if (type === "coaching") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Game <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.game || ""}
                            onChange={(e) => setAttributes({...attributes, game: e.target.value, type: "coaching"})}
                            placeholder="e.g. Valorant"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Coach Rank / Level <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.coachRank || ""}
                            onChange={(e) => setAttributes({...attributes, coachRank: e.target.value, type: "coaching"})}
                            placeholder="e.g. Radiant / 500rr"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Session Duration <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.sessionDuration || ""}
                            onChange={(e) => setAttributes({...attributes, sessionDuration: e.target.value, type: "coaching"})}
                            placeholder="e.g. 1 Hour, 2-Hour Coached Run"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Primary Language <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.language || ""}
                            onChange={(e) => setAttributes({...attributes, language: e.target.value, type: "coaching"})}
                            placeholder="e.g. English, Hindi"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Voice Chat Support</label>
                          <select
                            value={attributes.voiceChat === undefined ? "true" : String(attributes.voiceChat)}
                            onChange={(e) => setAttributes({...attributes, voiceChat: e.target.value === "true", type: "coaching"})}
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      </div>
                    );
                  } else if (type === "game-buddies") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Game <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.game || ""}
                            onChange={(e) => setAttributes({...attributes, game: e.target.value, type: "game-buddies"})}
                            placeholder="e.g. BGMI, League"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Platform <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.platform || ""}
                            onChange={(e) => setAttributes({...attributes, platform: e.target.value, type: "game-buddies"})}
                            placeholder="e.g. Mobile, PC, PS5"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Region <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.region || ""}
                            onChange={(e) => setAttributes({...attributes, region: e.target.value, type: "game-buddies"})}
                            placeholder="e.g. India, Asia"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Language <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.language || ""}
                            onChange={(e) => setAttributes({...attributes, language: e.target.value, type: "game-buddies"})}
                            placeholder="e.g. English, Hindi"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Voice Chat</label>
                          <select
                            value={attributes.voiceChat === undefined ? "true" : String(attributes.voiceChat)}
                            onChange={(e) => setAttributes({...attributes, voiceChat: e.target.value === "true", type: "game-buddies"})}
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      </div>
                    );
                  } else if (type === "freelance") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Service Type <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.serviceType || ""}
                            onChange={(e) => setAttributes({...attributes, serviceType: e.target.value, type: "freelance"})}
                            placeholder="e.g. Web Development, Video Editing"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Estimated Delivery Time <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.deliveryTime || ""}
                            onChange={(e) => setAttributes({...attributes, deliveryTime: e.target.value, type: "freelance"})}
                            placeholder="e.g. 3 Days, 1 Week"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Revision Limit <span className="text-red-400">*</span></label>
                          <input
                            type="number"
                            value={attributes.revisionLimit || ""}
                            onChange={(e) => setAttributes({...attributes, revisionLimit: parseInt(e.target.value) || 0, type: "freelance"})}
                            placeholder="e.g. 3"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Portfolio Link (Optional)</label>
                          <input
                            value={attributes.portfolioUrl || ""}
                            onChange={(e) => setAttributes({...attributes, portfolioUrl: e.target.value, type: "freelance"})}
                            placeholder="e.g. https://behance.net/..."
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "design") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Design Category <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.designType || ""}
                            onChange={(e) => setAttributes({...attributes, designType: e.target.value, type: "design"})}
                            placeholder="e.g. Logo, Banner, Thumbnail"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Source Files Included</label>
                          <select
                            value={attributes.sourceFilesIncluded === undefined ? "true" : String(attributes.sourceFilesIncluded)}
                            onChange={(e) => setAttributes({...attributes, sourceFilesIncluded: e.target.value === "true", type: "design"})}
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Commercial Use</label>
                          <select
                            value={attributes.commercialUse === undefined ? "true" : String(attributes.commercialUse)}
                            onChange={(e) => setAttributes({...attributes, commercialUse: e.target.value === "true", type: "design"})}
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          >
                            <option value="true">Licensed for Commercial Use</option>
                            <option value="false">Personal Use Only</option>
                          </select>
                        </div>
                      </div>
                    );
                  } else if (type === "advertising") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Platform Channel <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.platformName || ""}
                            onChange={(e) => setAttributes({...attributes, platformName: e.target.value, type: "advertising"})}
                            placeholder="e.g. Discord Server, YouTube Channel"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Audience Size / Reach <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.reachAudience || ""}
                            onChange={(e) => setAttributes({...attributes, reachAudience: e.target.value, type: "advertising"})}
                            placeholder="e.g. 5,000 Members, 10k Subs"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Promo Duration (Days) <span className="text-red-400">*</span></label>
                          <input
                            type="number"
                            value={attributes.durationDays || ""}
                            onChange={(e) => setAttributes({...attributes, durationDays: parseInt(e.target.value) || 0, type: "advertising"})}
                            placeholder="e.g. 7"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  } else if (type === "digital-marketplace") {
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Product Type <span className="text-red-400">*</span></label>
                          <input
                            value={attributes.productType || ""}
                            onChange={(e) => setAttributes({...attributes, productType: e.target.value, type: "digital-marketplace"})}
                            placeholder="e.g. Ebook, WordPress Plugin, ZIP Assets"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">File Format</label>
                          <input
                            value={attributes.format || ""}
                            onChange={(e) => setAttributes({...attributes, format: e.target.value, type: "digital-marketplace"})}
                            placeholder="e.g. ZIP, PDF, EXE"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">File Size (Optional)</label>
                          <input
                            value={attributes.fileSize || ""}
                            onChange={(e) => setAttributes({...attributes, fileSize: e.target.value, type: "digital-marketplace"})}
                            placeholder="e.g. 15 MB"
                            className="w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white"
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  return <p className="text-xs text-muted-foreground">Standard generic product. No special attributes required.</p>;
                })()}
              </div>
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-muted-foreground">SEO Meta Title</label>
                      <span className={`text-[10px] ${seoTitle.length > 60 ? 'text-red-400' : 'text-muted-foreground'}`}>{seoTitle.length}/60</span>
                    </div>
                    <input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Valorant Account | HUXZAIN"
                      className={`w-full h-10 px-3 rounded-xl border ${seoTitle.length > 60 ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-gold/50'} bg-surface/60 text-xs text-foreground focus:outline-none`}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-muted-foreground">SEO Keywords</label>
                    </div>
                    <input
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      placeholder="e.g. skin, valorant, account"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-surface/60 text-xs text-foreground focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs text-muted-foreground">SEO Description</label>
                    <span className={`text-[10px] ${seoDescription.length > 160 ? 'text-red-400' : 'text-muted-foreground'}`}>{seoDescription.length}/160</span>
                  </div>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    maxLength={160}
                    rows={2}
                    placeholder="Search engine meta description..."
                    className={`w-full px-3 py-2 rounded-xl border ${seoDescription.length > 160 ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-gold/50'} bg-surface/60 text-xs text-foreground focus:outline-none resize-none`}
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
      delivery_type: (l.delivery_type ?? "manual") as "instant" | "manual" | "hybrid",
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

  const [activeTab, setActiveTab] = useState<"all" | "active" | "hidden" | "draft" | "deleted">("all");

  async function executeDelete() {
    if (!deleteTarget) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(deleteTarget);
    try {
      const { error } = await supabase.from("listings").update({ status: "deleted" }).eq("id", deleteTarget);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing deleted successfully.");
        // OPTIMISTIC UPDATE: set status to deleted in state
        setListings((prev) =>
          prev.map((l) => (l.id === deleteTarget ? { ...l, status: "deleted" } : l))
        );
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

  async function executeRestore(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: "draft" })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing restored to draft successfully.");
        // OPTIMISTIC UPDATE: set status to draft in state
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "draft" } : l))
        );
        fetchListings();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const stats = {
    active: listings.filter((l) => l.status === "active").length,
    hidden: listings.filter((l) => l.status === "hidden").length,
    draft: listings.filter((l) => l.status === "draft" || l.status === "pending" || l.status === "pending_review").length,
    deleted: listings.filter((l) => l.status === "deleted").length,
  };

  const filtered = listings.filter((l) => {
    const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    
    if (activeTab === "all") return l.status !== "deleted";
    if (activeTab === "active") return l.status === "active";
    if (activeTab === "hidden") return l.status === "hidden";
    if (activeTab === "draft") return l.status === "draft" || l.status === "pending" || l.status === "pending_review";
    if (activeTab === "deleted") return l.status === "deleted";
    return true;
  });

  const statusColors: Record<string, string> = {
    active: "text-green-400 bg-green-500/10 border-green-500/20",
    paused: "text-muted-foreground bg-surface border-border",
    draft: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    pending: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    pending_review: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
    archived: "text-muted-foreground bg-surface border-border",
    hidden: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    deleted: "text-red-400 bg-red-500/10 border-red-500/20",
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: "active", l: "Active", v: stats.active, c: "text-green-400" },
            { id: "hidden", l: "Hidden", v: stats.hidden, c: "text-purple-400" },
            { id: "draft", l: "Drafts", v: stats.draft, c: "text-yellow-400" },
            { id: "deleted", l: "Deleted", v: stats.deleted, c: "text-red-400" },
          ].map((s) => (
            <button
              key={s.l}
              onClick={() => setActiveTab(s.id as any)}
              className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
                activeTab === s.id
                  ? "border-gold bg-gold/5 shadow-md shadow-gold/5"
                  : "border-border bg-surface/40 hover:border-gold/30"
              }`}
            >
              <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
            </button>
          ))}
        </div>

        {/* Search + Table */}
        <PanelCard
          title={
            activeTab === "all"
              ? "All Listings"
              : activeTab === "active"
              ? "Active Listings"
              : activeTab === "hidden"
              ? "Hidden Listings"
              : activeTab === "draft"
              ? "Draft Listings"
              : "Deleted Listings"
          }
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
          {/* Tabs row */}
          <div className="flex border-b border-border/60 mb-6 overflow-x-auto">
            {[
              { id: "all", label: "All Listings" },
              { id: "active", label: `Active (${stats.active})` },
              { id: "hidden", label: `Hidden (${stats.hidden})` },
              { id: "draft", label: `Drafts (${stats.draft})` },
              { id: "deleted", label: `Deleted (${stats.deleted})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-gold text-gold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
                          {l.status === "deleted" ? (
                            <button
                              onClick={() => executeRestore(l.id)}
                              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold transition-all cursor-pointer border-none"
                              title="Restore"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
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
                            </>
                          )}
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
