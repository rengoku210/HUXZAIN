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
  Star,
  Zap,
  Sparkles,
  Rocket,
  RotateCcw,
  Clock,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { PanelCard } from "@/components/seller/SellerShell";
import {
  GamingListingPublishedNotice,
  BeforeDeleteListingNotice,
  BeforeUploadSecureDelivery,
  InventoryUploadedNotice,
  OutOfStockNotice,
  LowInventoryReminder,
} from "@/components/ui/HuxzainNotices";
import { getSupabase } from "@/lib/supabase-client";

import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { slugify } from "@/lib/marketplace/listing-adapter";
import { getCategoryTypeFromSlug } from "@/lib/marketplace/listing-attributes";
import { TransactionSummaryPanel } from "@/components/finance/TransactionSummaryPanel";
import { useFinanceConfig, computeTransactionSummary } from "@/lib/finance";
import { useCategoryConfig, validateDynamicAttributes, type CategoryField } from "@/lib/marketplace/category-engine";
type Category = { id: string; name: string; slug: string };

export const Route = createFileRoute("/_authenticated/seller/listings")({
  validateSearch: (s: Record<string, unknown>): { intent?: string; listingId?: string } => ({
    intent: s.intent ? String(s.intent) : undefined,
    listingId: s.listingId ? String(s.listingId) : undefined,
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
  // Lifecycle + promotion flags (DB columns; see 20260604113000 + 20260702150000)
  expiry_date?: string | null;
  is_featured?: boolean;
  is_homepage_featured?: boolean;
  is_urgent?: boolean;
  has_glow?: boolean;
  glow_color?: string | null;
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
  const [activationKey, setActivationKey] = useState("");
  const [pin, setPin] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadPassword, setDownloadPassword] = useState("");
  const [controlPanelUrl, setControlPanelUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState("");
  const [topupUid, setTopupUid] = useState("");
  const [assignedProfile, setAssignedProfile] = useState("");
  const [planType, setPlanType] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [devicesAllowed, setDevicesAllowed] = useState("");
  const [regionInfo, setRegionInfo] = useState("");
  const [usageGuidelines, setUsageGuidelines] = useState("");
  const [sellerNote, setSellerNote] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [documentationUrls, setDocumentationUrls] = useState("");
  const [setupGuide, setSetupGuide] = useState("");
  const [additionalResources, setAdditionalResources] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [topupRegion, setTopupRegion] = useState("");
  const [topupPlayerName, setTopupPlayerName] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupGame, setTopupGame] = useState("");
  const [transferInstructions, setTransferInstructions] = useState("");
  const [uploadingProof, setUploadingProof] = useState<Record<string, boolean>>({});

  // Dynamic secure delivery state variables
  const [inventoryItems, setInventoryItems] = useState<{
    id?: string;
    login_id: string;
    password?: string;
    credentials_data?: string;
    instructions?: string;
    notes?: string;
    status: 'available' | 'assigned' | 'hold';
  }[]>([]);
  const [newInvLoginId, setNewInvLoginId] = useState("");
  const [newInvPassword, setNewInvPassword] = useState("");
  const [newInvCredentialsData, setNewInvCredentialsData] = useState("");
  const [newInvInstructions, setNewInvInstructions] = useState("");
  const [newInvNotes, setNewInvNotes] = useState("");

  const [secureNoticeAcknowledged, setSecureNoticeAcknowledged] = useState(false);
  const [showBeforeUploadNotice, setShowBeforeUploadNotice] = useState(false);
  const [showInventoryUploadedNotice, setShowInventoryUploadedNotice] = useState(false);


  // Declarations checkboxes (5 of them)
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [decl3, setDecl3] = useState(false);
  const [decl4, setDecl4] = useState(false);
  const [decl5, setDecl5] = useState(false);

  // Multi-level Category selection states
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [selectedBoostId, setSelectedBoostId] = useState("");

  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [subCategorySearchFocused, setSubCategorySearchFocused] = useState(false);
  const [boostTypeSearch, setBoostTypeSearch] = useState("");
  const [boostTypeSearchFocused, setBoostTypeSearchFocused] = useState(false);

  // HX-007: seller plan + finance config drive the live Transaction Summary.
  const [sellerTier, setSellerTier] = useState<string>("standard");
  const { config: financeConfig } = useFinanceConfig();

  // Load Category Engine config dynamically
  const catSlug = categories.find(c => c.id === categoryId)?.slug || "";
  const { fields: dynamicFields, engine: dynamicEngine, loading: configLoading } = useCategoryConfig(catSlug);

  // Resolve hierarchy on category select
  useEffect(() => {
    if (!categoryId || categories.length === 0) return;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const catAny = cat as any;
    if (catAny.parent_id) {
      const parent = categories.find(c => c.id === catAny.parent_id);
      const parentAny = parent as any;
      if (parent && parentAny.parent_id) {
        // 3 levels (boosting -> game -> boost-type)
        setSelectedParentId(parentAny.parent_id);
        setSelectedSubId(parent.id);
        setSubCategorySearch(parent.name);
        setSelectedBoostId(cat.id);
        setBoostTypeSearch(cat.name);
      } else {
        // 2 levels (parent -> sub)
        setSelectedParentId(catAny.parent_id);
        setSelectedSubId(cat.id);
        setSubCategorySearch(cat.name);
        setSelectedBoostId("");
        setBoostTypeSearch("");
      }
    } else {
      // 1 level
      setSelectedParentId(cat.id);
      setSelectedSubId("");
      setSubCategorySearch("");
      setSelectedBoostId("");
      setBoostTypeSearch("");
    }
  }, [categoryId, categories]);

  const isBoosting = () => {
    if (!categoryId) return false;
    let cur = categories.find(c => c.id === categoryId);
    while (cur) {
      if (cur.slug === 'boosting') return true;
      cur = categories.find(x => x.id === (cur as any).parent_id);
    }
    return false;
  };

  // Calculation of Listing Health Score
  const calculateHealthScore = () => {
    let score = 0;
    // Cover image (+5)
    if (gallery.length > 0) score += 5;
    // Additional gallery images (+5)
    if (gallery.length > 1) score += 5;
    // Detailed description (+10)
    if (description.trim().length > 100) score += 10;
    // Activation instructions (+10)
    if (instructions.trim() || attributes.instructions || newInvInstructions.trim()) score += 10;
    // Compatibility Information (+10)
    if (attributes.region || attributes.platform || attributes.server) score += 10;
    // Additional delivery notes (+5)
    if (attributes.deliveryNotes || attributes.notes || newInvNotes.trim()) score += 5;
    // Screenshots (+5)
    if (gallery.length > 2) score += 5;
    // Tags (+5)
    if (tags.length > 0) score += 5;
    // SEO Information (+5)
    if (seoTitle || seoDescription) score += 5;
    // Secure delivery specific (+45)
    if (deliveryType === 'instant' || deliveryType === 'hybrid') {
      if (inventoryItems.length > 0) score += 20;
      if (decl1 && decl2 && decl3 && decl4 && decl5) score += 25;
    } else {
      score += 45;
    }
    return Math.min(score, 100);
  };

  // Handle Category Switching: preserve compatible values, clear stale metadata, reload delivery engine
  useEffect(() => {
    if (dynamicFields.length > 0) {
      setAttributes(prev => {
        const newAttributes: Record<string, any> = {};
        dynamicFields.forEach(f => {
          if (prev[f.field_key] !== undefined) {
            newAttributes[f.field_key] = prev[f.field_key];
          } else {
            if (f.field_type === 'checkbox' || f.field_type === 'boolean') {
              newAttributes[f.field_key] = false;
            } else {
              newAttributes[f.field_key] = '';
            }
          }
        });
        newAttributes.type = catSlug;
        return newAttributes;
      });

      if (dynamicEngine?.delivery_type) {
        setDeliveryType(dynamicEngine.delivery_type);
      }
    }
  }, [categoryId, dynamicFields, dynamicEngine, catSlug]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setSellerTier((data?.subscription_tier as string) || "standard"));
  }, [userId]);

  const summaryCategorySlug = categories.find((c) => c.id === categoryId)?.slug ?? null;
  const summaryPrice = parseFloat(price) || 0;
  const transactionSummary = computeTransactionSummary(financeConfig, {
    categorySlug: summaryCategorySlug,
    tier: sellerTier,
    priceInr: summaryPrice,
  });

  useEffect(() => {
    if (!listing?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // Load listing credentials if they exist
    supabase
      .rpc("reveal_listing_credentials_v2", { p_listing_id: listing.id })
      .then(({ data, error }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row && !error) {
          setLoginId(row.login_id || "");
          setLoginPassword(row.password || "");
          setInstructions(row.instructions || "");
          setRecoveryDetails(row.recovery_details || "");
          setEmailTransferDetails(row.email_transfer_details || "");
          setActivationKey(row.activation_key || "");
          setPin(row.pin || "");
          setDownloadUrl(row.download_url || "");
          setDownloadPassword(row.download_password || "");
          setControlPanelUrl(row.control_panel_url || "");
          setBackupCodes(row.backup_codes || "");
          setTopupUid(row.topup_uid || "");
          setAssignedProfile(row.assigned_profile || "");
          setPlanType(row.plan_type || "");
          setExpiryDate(row.expiry_date || "");
          setDevicesAllowed(row.devices_allowed || "");
          setRegionInfo(row.region_info || "");
          setUsageGuidelines(row.usage_guidelines || "");
          setSellerNote(row.seller_note || "");
          setServiceDetails(row.service_details || "");
          setProductInfo(row.product_info || "");
          setDocumentationUrls(row.documentation_urls || "");
          setSetupGuide(row.setup_guide || "");
          setAdditionalResources(row.additional_resources || "");
          setAccountInfo(row.account_info || "");
          setTopupRegion(row.topup_region || "");
          setTopupPlayerName(row.topup_player_name || "");
          setTopupAmount(row.topup_amount || "");
          setTopupGame(row.topup_game || "");
          setTransferInstructions(row.transfer_instructions || "");
        }
      });

    // Load multi-item inventory
    supabase
      .rpc("reveal_listing_inventory", { p_listing_id: listing.id })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) {
          setInventoryItems(data.map(item => ({
            id: item.id,
            login_id: item.login_id || "",
            password: item.password || "",
            credentials_data: item.credentials_data || "",
            instructions: item.instructions || "",
            notes: item.notes || "",
            status: item.status || "available"
          })));
        }
      });
  }, [listing?.id, categoryId, categories]);

  function renderSecureVaultFormFields(catSlug: string) {
    const categoryType = getCategoryTypeFromSlug(catSlug);

    return (
      <div className="border-t border-gold/20 pt-4 mt-2 bg-gold/5 rounded-xl p-3 border border-gold/15 space-y-3">
        <span className="text-xs font-semibold text-gold block mb-1">🔐 Secure Credentials Vault ({categoryType.toUpperCase()})</span>
        <p className="text-[10px] text-muted-foreground mb-3">
          These credentials are encrypted, hidden from the public listing, and only shared with the buyer automatically after successful payment.
        </p>

        {categoryType === "game-accounts" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Login ID / Username <span className="text-red-400">*</span></label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. game_username"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Login Password <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Backup Codes / 2FA Codes</label>
              <textarea
                value={backupCodes}
                onChange={(e) => setBackupCodes(e.target.value)}
                placeholder="Enter 2FA backup codes..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Account Recovery Details</label>
              <textarea
                value={recoveryDetails}
                onChange={(e) => setRecoveryDetails(e.target.value)}
                placeholder="Enter security questions, creation location/date, original ISP..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Email Transfer Details</label>
              <textarea
                value={emailTransferDetails}
                onChange={(e) => setEmailTransferDetails(e.target.value)}
                placeholder="Recovery email login credentials or transfer details..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Transfer Guide / Instructions</label>
              <textarea
                value={transferInstructions}
                onChange={(e) => setTransferInstructions(e.target.value)}
                placeholder="Step-by-step account migration instructions..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}

        {categoryType === "gift-cards" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Gift Card Code <span className="text-red-400">*</span></label>
                <input
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="e.g. AMZN-500-XXXX"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Gift Card PIN</label>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Redemption Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How to redeem this gift card..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}

        {categoryType === "currency" && (
          <div className="space-y-3 text-left">
            <div className="border border-white/10 rounded-lg p-2.5 bg-background/30 space-y-2">
              <span className="text-[10px] font-bold text-gold uppercase">Top-up/Auto-Delivery Fields</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-0.5">Game Name</label>
                  <input
                    value={topupGame}
                    onChange={(e) => setTopupGame(e.target.value)}
                    placeholder="e.g. Valorant"
                    className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-0.5">UID / Account ID</label>
                  <input
                    value={topupUid}
                    onChange={(e) => setTopupUid(e.target.value)}
                    placeholder="e.g. 879541245"
                    className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-0.5">Region</label>
                  <input
                    value={topupRegion}
                    onChange={(e) => setTopupRegion(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-0.5">Player Name</label>
                  <input
                    value={topupPlayerName}
                    onChange={(e) => setTopupPlayerName(e.target.value)}
                    placeholder="e.g. KnowNastro"
                    className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] text-muted-foreground mb-0.5">Amount</label>
                  <input
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="e.g. 5600 VP"
                    className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                  />
                </div>
              </div>
            </div>
            <div className="border border-white/10 rounded-lg p-2.5 bg-background/30 space-y-2">
              <span className="text-[10px] font-bold text-gold uppercase">Redeem Code Fields</span>
              <div>
                <label className="block text-[9px] text-muted-foreground mb-0.5">Redemption Code</label>
                <input
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
                  className="w-full h-7 px-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[9px] text-muted-foreground mb-0.5">Redemption Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="How to redeem..."
                  rows={2}
                  className="w-full p-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-muted-foreground mb-0.5">Important Notes</label>
                <textarea
                  value={accountInfo}
                  onChange={(e) => setAccountInfo(e.target.value)}
                  placeholder="Read before redeeming..."
                  rows={2}
                  className="w-full p-2 rounded bg-background/50 border border-border text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {categoryType === "subscriptions" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Username / Email <span className="text-red-400">*</span></label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. sub_email@domain.com"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Password <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Assigned Profile</label>
                <input
                  value={assignedProfile}
                  onChange={(e) => setAssignedProfile(e.target.value)}
                  placeholder="e.g. Profile 3"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Plan Type</label>
                <input
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  placeholder="e.g. Premium 4K"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Expiry Date / Duration</label>
                <input
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="e.g. 28 Feb 2027"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Devices/Screens Allowed</label>
                <input
                  value={devicesAllowed}
                  onChange={(e) => setDevicesAllowed(e.target.value)}
                  placeholder="e.g. 4 Screens"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-muted-foreground mb-1">Region</label>
                <input
                  value={regionInfo}
                  onChange={(e) => setRegionInfo(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Usage Guidelines</label>
              <textarea
                value={usageGuidelines}
                onChange={(e) => setUsageGuidelines(e.target.value)}
                placeholder="Do not change password, do not change email..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Support Notes</label>
              <textarea
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                placeholder="Seller note regarding warranty or support..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}

        {categoryType === "software-tools" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Product Key <span className="text-red-400">*</span></label>
                <input
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Download Installer URL</label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Activation Guide</label>
              <textarea
                value={setupGuide}
                onChange={(e) => setSetupGuide(e.target.value)}
                placeholder="Step-by-step instructions to activate..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Additional Files / Notes</label>
              <textarea
                value={additionalResources}
                onChange={(e) => setAdditionalResources(e.target.value)}
                placeholder="Other details/files included..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}

        {categoryType === "digital-marketplace" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Download Link <span className="text-red-400">*</span></label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Download Password / Archive Password</label>
                <input
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  placeholder="Password to decrypt/extract"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Documentation Links (e.g. Guides / ReadMe)</label>
              <textarea
                value={documentationUrls}
                onChange={(e) => setDocumentationUrls(e.target.value)}
                placeholder='[{"name": "ReadMe.txt", "url": "https://..."}] or plain instructions'
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Product Information (Compatibility / Version)</label>
              <textarea
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                placeholder='[{"label": "Version", "value": "v3.2"}] or plain text details'
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}

        {categoryType === "generic" && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Username / Login ID</label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. username"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Instructions / Notes</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Access/activation instructions..."
                rows={2}
                className="w-full p-2 rounded-lg border border-border bg-[#141820] text-xs focus:outline-none focus:border-gold/50 text-white resize-none"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>, key: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File is too large (max 15MB).");
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
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 15MB).`);
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
    
    // Duplicate detection helper function
    const findSimilarCategory = (name: string, parentId: string | null, allCats: any[]) => {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetNorm = normalize(name);
      
      const aliases: Record<string, string[]> = {
        "gta5": ["grandtheftautov", "grandtheftauto5", "gtav", "gta5"],
        "grandtheftautov": ["grandtheftautov", "grandtheftauto5", "gtav", "gta5"],
        "grandtheftauto5": ["grandtheftautov", "grandtheftauto5", "gtav", "gta5"],
        "gtav": ["grandtheftautov", "grandtheftauto5", "gtav", "gta5"],
        
        "chatgpt": ["chatgpt", "chatgptplus", "chatgptpro"],
        "chatgptplus": ["chatgpt", "chatgptplus", "chatgptpro"],
        "chatgptpro": ["chatgpt", "chatgptplus", "chatgptpro"],
      };

      const checkAlias = (n1: string, n2: string) => {
        const norm1 = normalize(n1);
        const norm2 = normalize(n2);
        if (aliases[norm1] && aliases[norm1].includes(norm2)) return true;
        if (aliases[norm2] && aliases[norm2].includes(norm1)) return true;
        return norm1 === norm2;
      };

      const siblings = allCats.filter(c => c.parent_id === parentId);
      return siblings.find(c => checkAlias(c.name, name) || normalize(c.name) === targetNorm);
    };

    // If sub category is a custom typed string, insert/select it
    if (selectedSubId === "CUSTOM_CAT" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedSubId)) {
      const normSub = subCategorySearch.trim();
      if (!normSub) {
        toast.error("Sub Category name cannot be empty.");
        return;
      }
      
      // Perform duplicate detection
      const existing = findSimilarCategory(normSub, selectedParentId, categories);
      if (existing) {
        finalCategoryId = existing.id;
        setSelectedSubId(existing.id);
      } else {
        const slugVal = normSub.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const { data: newCat, error: insertErr } = await supabase
          .from("categories")
          .insert({
            name: normSub,
            slug: `${slugVal}-${Date.now().toString().slice(-4)}`,
            parent_id: selectedParentId || null,
            sort_order: 100
          })
          .select()
          .single();
        if (insertErr) {
          toast.error(`Failed to create custom subcategory: ${insertErr.message}`);
          return;
        }
        finalCategoryId = newCat.id;
        setSelectedSubId(newCat.id);
      }
    }

    // If boost type is a custom typed string, insert/select it under the resolved subcategory
    if (selectedBoostId === "CUSTOM_BOOST" || (boostTypeSearch.trim() !== "" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedBoostId))) {
      const normBoost = boostTypeSearch.trim();
      if (normBoost) {
        const parentIdForBoost = finalCategoryId;
        const existingBoost = findSimilarCategory(normBoost, parentIdForBoost, categories);
        if (existingBoost) {
          finalCategoryId = existingBoost.id;
          setSelectedBoostId(existingBoost.id);
        } else {
          const slugVal = normBoost.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const { data: newBoost, error: insertErr } = await supabase
            .from("categories")
            .insert({
              name: normBoost,
              slug: `${slugVal}-${Date.now().toString().slice(-4)}`,
              parent_id: parentIdForBoost,
              sort_order: 100
            })
            .select()
            .single();
          if (insertErr) {
            toast.error(`Failed to create custom boost type: ${insertErr.message}`);
            return;
          }
          finalCategoryId = newBoost.id;
          setSelectedBoostId(newBoost.id);
        }
      }
    }

    // Fallback if UUID validation fails
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalCategoryId);
    if (!isUuid) {
      const matched = categories.find(c => c.slug === finalCategoryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id));
      if (matched) {
        finalCategoryId = matched.id;
      } else if (categories.length > 0) {
        finalCategoryId = categories.find(c => c.id !== "more")?.id || categories[0].id;
      }
    }

    const catSlug = categories.find(c => c.id === finalCategoryId)?.slug || "";

    // Dynamic Validation Check
    if (dynamicFields.length > 0) {
      const valError = validateDynamicAttributes(dynamicFields, attributes);
      if (valError) {
        toast.error(valError);
        return;
      }
      // If delivery engine requires Credentials vault
      if (dynamicEngine?.delivery_engine === 'Credentials') {
        if (!loginId.trim()) { toast.error("Login ID / Username is required for secure credentials vault."); return; }
        if (!loginPassword.trim()) { toast.error("Login Password is required for secure credentials vault."); return; }
      }
    } else {
      // Backward Compatibility Fallback
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
    }

    // Ensure key syncing for compatibility in JSONB attributes
    const isGameAccount = dynamicFields.length > 0 ? (catSlug === "accounts") : (getCategoryTypeFromSlug(catSlug) === "game-accounts");
    const syncedAttributes = isGameAccount ? {
      ...attributes,
      type: (dynamicFields.length > 0 ? catSlug : "game-accounts") as any,
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
        moderator_notes: payloadNotes,
        health_score: calculateHealthScore(),
        declarations_accepted: (deliveryType === 'instant' || deliveryType === 'hybrid') ? (decl1 && decl2 && decl3 && decl4 && decl5) : false
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

      // Upsert secure credentials / multi-item inventory
      if (deliveryType === 'instant' || deliveryType === 'hybrid') {
        const { error: invErr } = await supabase.rpc("save_listing_inventory", {
          p_listing_id: savedListingId,
          p_items: inventoryItems.map(item => ({
            login_id: item.login_id,
            password: item.password || null,
            credentials_data: item.credentials_data || null,
            instructions: item.instructions || null,
            notes: item.notes || null
          }))
        });

        if (invErr) {
          console.error("[ListingModal] Failed to save inventory:", invErr);
          throw new Error(`Failed to save inventory: ${invErr.message}`);
        }
      } else {
        const categoryType = getCategoryTypeFromSlug(catSlug);
        const requiresCredentials = ["game-accounts", "gift-cards", "currency", "subscriptions", "software-tools", "digital-marketplace"].includes(categoryType);
        if (requiresCredentials) {
          const { error: credsErr } = await supabase
            .rpc("set_listing_credentials_v2", {
              p_listing_id: savedListingId,
              p_login_id: loginId.trim() || null,
              p_password: loginPassword || null,
              p_instructions: instructions.trim() || null,
              p_recovery_details: recoveryDetails.trim() || null,
              p_email_transfer_details: emailTransferDetails.trim() || null,
              p_activation_key: activationKey.trim() || null,
              p_pin: pin.trim() || null,
              p_download_url: downloadUrl.trim() || null,
              p_download_password: downloadPassword || null,
              p_control_panel_url: controlPanelUrl.trim() || null,
              p_backup_codes: backupCodes.trim() || null,
              p_topup_uid: topupUid.trim() || null,
              p_assigned_profile: assignedProfile.trim() || null,
              p_plan_type: planType.trim() || null,
              p_expiry_date: expiryDate.trim() || null,
              p_devices_allowed: devicesAllowed.trim() || null,
              p_region_info: regionInfo.trim() || null,
              p_usage_guidelines: usageGuidelines.trim() || null,
              p_seller_note: sellerNote.trim() || null,
              p_service_details: serviceDetails.trim() || null,
              p_product_info: productInfo.trim() || null,
              p_documentation_urls: documentationUrls.trim() || null,
              p_setup_guide: setupGuide.trim() || null,
              p_additional_resources: additionalResources.trim() || null,
              p_account_info: accountInfo.trim() || null,
              p_topup_region: topupRegion.trim() || null,
              p_topup_player_name: topupPlayerName.trim() || null,
              p_topup_amount: topupAmount.trim() || null,
              p_topup_game: topupGame.trim() || null,
              p_transfer_instructions: transferInstructions.trim() || null
            });

          if (credsErr) {
            console.error("[ListingModal] Failed to save credentials:", credsErr);
            throw new Error(`Failed to save secure credentials: ${credsErr.message}`);
          }
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
      const hasInventory = (deliveryType === 'instant' || deliveryType === 'hybrid') && inventoryItems.length > 0;
      if (hasInventory) {
        setShowInventoryUploadedNotice(true);
      } else {
        onSaved(isNew);
        onClose();
      }

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
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      {/* ─── TITLE & STEP TRACKER HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {isNew ? "Create Marketplace Listing" : "Edit Marketplace Listing"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Provide accurate information about your product or service. Category-specific fields will appear automatically.
          </p>
        </div>
        
        {/* Stepper (Image 1 Mockup) */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-display">
          <div className="flex items-center gap-1.5 text-gold">
            <span className="size-5 rounded-full bg-gold text-black flex items-center justify-center text-[10px] font-black">1</span>
            <span>Listing Details</span>
          </div>
          <div className="w-8 h-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-5 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black">2</span>
            <span>Review Listing</span>
          </div>
          <div className="w-8 h-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-5 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black">3</span>
            <span>Publish Listing</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-24">

          {/* Image gallery upload */}
        {/* ─── CARD 1: LISTING MEDIA ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-gold">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 20.4L15 15L10 20"/></svg>
            <h3 className="text-sm font-bold uppercase tracking-wider font-display">Listing Media</h3>
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            Upload clear, high-quality images that represent your product or service. The first image will be used as the marketplace cover.
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {gallery.map((item, i) => (
              <div key={item.id} className="relative w-36 h-36 flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 group bg-surface">
                <img src={item.url} alt="Gallery item" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                  {i > 0 && (
                    <button type="button" onClick={() => moveImage(i, -1)} className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-xs cursor-pointer transition-colors">&larr;</button>
                  )}
                  <button type="button" onClick={() => removeImage(item.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500 border border-red-500/30 rounded-lg text-red-400 hover:text-white text-xs cursor-pointer transition-colors">Del</button>
                  {i < gallery.length - 1 && (
                    <button type="button" onClick={() => moveImage(i, 1)} className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-xs cursor-pointer transition-colors">&rarr;</button>
                  )}
                </div>
                {i === 0 && (
                  <span className="absolute top-2 left-2 bg-gold/90 text-black text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md font-display">Cover</span>
                )}
              </div>
            ))}
            <div
              className="w-36 h-36 border-2 border-dashed border-white/10 hover:border-gold/40 hover:bg-gold/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-6 text-muted-foreground animate-bounce" />
              <span className="text-xs font-bold text-white font-sans">Upload Images</span>
              <span className="text-[10px] text-muted-foreground font-sans">PNG, JPG or WEBP (Max 10MB each)</span>
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

        {/* ─── CARD 2: BASIC INFORMATION ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-gold">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <h3 className="text-sm font-bold uppercase tracking-wider font-display">Basic Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                Listing Title <span className="text-red-400">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="Enter a clear, descriptive title for your listing"
                className="w-full h-11 px-4 pr-16 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 transition-colors font-sans"
              />
              <span className="absolute right-4 bottom-3.5 text-[10px] text-muted-foreground font-sans font-bold select-none">
                {title.length}/100
              </span>
            </div>
            
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                Listing Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                placeholder="Provide a detailed description of your product or service, including key features, requirements, and delivery information"
                rows={5}
                className="w-full p-4 pr-16 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 transition-colors resize-none font-sans"
              />
              <span className="absolute right-4 bottom-3 text-[10px] text-muted-foreground font-sans font-bold select-none">
                {description.length}/2000
              </span>
            </div>
          </div>
        </div>
        {/* ─── LISTING HEALTH SCORE ─── */}
        <div className="rounded-2xl border border-gold/30 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl -z-10" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold">
              <Sparkles className="size-5 text-gold animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-display">Listing Health Score</h3>
            </div>
            <span className="text-sm font-extrabold text-gold font-mono">{calculateHealthScore()}/100</span>
          </div>
          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-500" 
              style={{ width: `${calculateHealthScore()}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal font-sans">
            Listings with a higher Listing Health Score are generally easier for buyers to understand and create a better buying experience. Complete description, instructions, compatibility info, tags, and secure inventory to maximize your score.
          </p>
        </div>

        {/* ─── CARD 3: MARKETPLACE SETTINGS ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 text-gold">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <h3 className="text-sm font-bold uppercase tracking-wider font-display">Marketplace Settings</h3>
          </div>
          
          {/* Dynamic Category Hierarchy Dropdowns */}
          <div className="space-y-4 border border-white/5 bg-[#0a0b0d]/50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-gold uppercase tracking-wider">Select Category Pathway</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Parent Category <span className="text-red-400">*</span></label>
                <select
                  value={selectedParentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedParentId(val);
                    setSelectedSubId("");
                    setSelectedBoostId("");
                    if (val) {
                      const subCats = categories.filter(c => (c as any).parent_id === val);
                      if (subCats.length > 0) {
                        setCategoryId(subCats[0].id);
                      } else {
                        setCategoryId(val);
                      }
                    } else {
                      setCategoryId("");
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-xs text-white focus:outline-none focus:border-gold/40 cursor-pointer font-sans"
                >
                  <option value="">Choose Parent Category</option>
                  {categories.filter(c => 
                    c.slug !== 'gaming-entertainment' && 
                    ((c as any).parent_id === null || (c as any).parent_id === categories.find(x => x.slug === 'gaming-entertainment')?.id)
                  ).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedParentId && (
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Sub Category (e.g. Game/Brand) <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={subCategorySearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubCategorySearch(val);
                      setSelectedSubId(val ? "CUSTOM_CAT" : "");
                      setSelectedBoostId("");
                      setCategoryId(val ? "CUSTOM_CAT" : "");
                    }}
                    onFocus={() => setSubCategorySearchFocused(true)}
                    onBlur={() => setTimeout(() => setSubCategorySearchFocused(false), 250)}
                    placeholder="Search or type custom name..."
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-xs text-white focus:outline-none focus:border-gold/40 font-sans"
                  />
                  {subCategorySearchFocused && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-elevated border border-white/10 rounded-xl shadow-2xl z-50 text-left text-xs divide-y divide-white/5 scrollbar-thin">
                      {subCategorySearch.trim() !== "" && !categories.some(c => (c as any).parent_id === selectedParentId && c.name.toLowerCase() === subCategorySearch.toLowerCase()) && (
                        <div
                          onMouseDown={() => {
                            setSelectedSubId("CUSTOM_CAT");
                            setCategoryId("CUSTOM_CAT");
                            setSubCategorySearchFocused(false);
                          }}
                          className="p-2.5 text-gold hover:bg-gold/10 cursor-pointer font-bold flex items-center gap-1.5"
                        >
                          <span>+ Create new category:</span>
                          <span className="text-white italic">"{subCategorySearch}"</span>
                        </div>
                      )}
                      {categories
                        .filter(c => (c as any).parent_id === selectedParentId && c.name.toLowerCase().includes(subCategorySearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => {
                              setSelectedSubId(c.id);
                              setSubCategorySearch(c.name);
                              const subCats = categories.filter(x => (x as any).parent_id === c.id);
                              if (subCats.length > 0) {
                                setCategoryId(subCats[0].id);
                              } else {
                                setCategoryId(c.id);
                              }
                              setSubCategorySearchFocused(false);
                            }}
                            className="p-2.5 text-white hover:bg-white/5 cursor-pointer flex justify-between items-center"
                          >
                            <span>{c.name}</span>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase">Existing</span>
                          </div>
                        ))}
                      {categories.filter(c => (c as any).parent_id === selectedParentId && c.name.toLowerCase().includes(subCategorySearch.toLowerCase())).length === 0 && subCategorySearch.trim() === "" && (
                        <div className="p-2.5 text-muted-foreground italic text-center">Start typing to search...</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedSubId && (selectedSubId === "CUSTOM_CAT" || categories.filter(c => (c as any).parent_id === selectedSubId).length > 0 || boostTypeSearch !== "") && (
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Boost / Sub Type <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={boostTypeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBoostTypeSearch(val);
                      setSelectedBoostId(val ? "CUSTOM_BOOST" : "");
                      setCategoryId(val ? "CUSTOM_BOOST" : selectedSubId);
                    }}
                    onFocus={() => setBoostTypeSearchFocused(true)}
                    onBlur={() => setTimeout(() => setBoostTypeSearchFocused(false), 250)}
                    placeholder="Search or type custom type..."
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-xs text-white focus:outline-none focus:border-gold/40 font-sans"
                  />
                  {boostTypeSearchFocused && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-elevated border border-white/10 rounded-xl shadow-2xl z-50 text-left text-xs divide-y divide-white/5 scrollbar-thin">
                      {boostTypeSearch.trim() !== "" && !categories.some(c => (c as any).parent_id === selectedSubId && c.name.toLowerCase() === boostTypeSearch.toLowerCase()) && (
                        <div
                          onMouseDown={() => {
                            setSelectedBoostId("CUSTOM_BOOST");
                            setCategoryId("CUSTOM_BOOST");
                            setBoostTypeSearchFocused(false);
                          }}
                          className="p-2.5 text-gold hover:bg-gold/10 cursor-pointer font-bold flex items-center gap-1.5"
                        >
                          <span>+ Create new type:</span>
                          <span className="text-white italic">"{boostTypeSearch}"</span>
                        </div>
                      )}
                      {categories
                        .filter(c => (c as any).parent_id === selectedSubId && c.name.toLowerCase().includes(boostTypeSearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => {
                              setSelectedBoostId(c.id);
                              setBoostTypeSearch(c.name);
                              setCategoryId(c.id);
                              setBoostTypeSearchFocused(false);
                            }}
                            className="p-2.5 text-white hover:bg-white/5 cursor-pointer flex justify-between items-center"
                          >
                            <span>{c.name}</span>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase">Existing</span>
                          </div>
                        ))}
                      {categories.filter(c => (c as any).parent_id === selectedSubId && c.name.toLowerCase().includes(boostTypeSearch.toLowerCase())).length === 0 && boostTypeSearch.trim() === "" && (
                        <div className="p-2.5 text-muted-foreground italic text-center">Start typing to search...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                Delivery Method <span className="text-red-400">*</span>
              </label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 cursor-pointer font-sans"
              >
                <option value="instant">Automatic / Instant Delivery</option>
                <option value="manual">Manual Delivery</option>
                <option value="hybrid">Hybrid Delivery</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                Estimated Delivery Time <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-2/3 h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 font-sans"
                />
                <select className="w-1/3 h-11 px-3 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 cursor-pointer font-sans">
                  <option>Hours</option>
                  <option>Days</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">
                Listing Price (₹) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 font-sans"
              />
            </div>
          </div>

          {/* Custom Boosting Service Fields if Boosting Category Selected */}
          {isBoosting() && (
            <div className="border border-gold/20 bg-gold/[0.02] p-5 rounded-2xl space-y-4 text-left">
              <h4 className="text-xs font-bold uppercase text-gold tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Rocket size={14} /> Boosting Services Custom Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Server / Region</label>
                  <select
                    value={attributes.region || ""}
                    onChange={(e) => setAttributes({ ...attributes, region: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0c0d10] text-xs text-white"
                  >
                    <option value="">Select Region</option>
                    <option value="Asia">Asia Pacific / India</option>
                    <option value="Europe">Europe</option>
                    <option value="NA">North America</option>
                    <option value="SA">South America</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Platform</label>
                  <select
                    value={attributes.platform || ""}
                    onChange={(e) => setAttributes({ ...attributes, platform: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0c0d10] text-xs text-white"
                  >
                    <option value="">Select Platform</option>
                    <option value="PC">PC</option>
                    <option value="PS5">PlayStation 5</option>
                    <option value="Xbox">Xbox Series X/S</option>
                    <option value="Mobile">Mobile (iOS / Android)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Pricing Model</label>
                  <select
                    value={attributes.boostingPricingModel || "fixed_price"}
                    onChange={(e) => setAttributes({ ...attributes, boostingPricingModel: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0c0d10] text-xs text-white"
                  >
                    <option value="fixed_price">Fixed Price</option>
                    <option value="per_rank">Price Per Rank</option>
                    <option value="per_division">Price Per Division</option>
                    <option value="per_win">Price Per Match / Win</option>
                    <option value="per_hour">Price Per Hour</option>
                    <option value="custom_quote">Starting From (Custom quote)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Queue Limit (Max Active Orders)</label>
                  <input
                    type="number"
                    min="1"
                    value={attributes.queueLimit || 5}
                    onChange={(e) => setAttributes({ ...attributes, queueLimit: parseInt(e.target.value) || 5 })}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-[#0c0d10] text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!attributes.boostingDuoBoost}
                    onChange={(e) => setAttributes({ ...attributes, boostingDuoBoost: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold/30"
                  />
                  Duo Boost Available (Play with booster)
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!attributes.boostingStreaming}
                    onChange={(e) => setAttributes({ ...attributes, boostingStreaming: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold/30"
                  />
                  Live Stream Available
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!attributes.boostingVpn}
                    onChange={(e) => setAttributes({ ...attributes, boostingVpn: e.target.checked })}
                    className="rounded border-border text-gold focus:ring-gold/30"
                  />
                  VPN Usage Toggled (For account security)
                </label>
              </div>
            </div>
          )}

          {/* Secure Delivery notice & Multi-item Inventory Upload */}
          {(deliveryType === 'instant' || deliveryType === 'hybrid') && (
            <div className="border border-emerald-500/20 bg-emerald-500/[0.01] p-5 rounded-2xl space-y-4 text-left">
              <h4 className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <ShieldCheck size={14} /> Secure Delivery Vault & Inventory Manager
              </h4>

              {!secureNoticeAcknowledged && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-emerald-400 animate-bounce" /> Secure Delivery Requirements Notice
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The credentials and keys uploaded here are stored in our secure, symmetric PGP-encrypted rest vault. They are only decrypted and shown to the buyer once their payment is verified and cleared by the HUXZAIN team.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBeforeUploadNotice(true)}
                    className="px-3.5 h-8 text-[11px] font-bold rounded-lg bg-emerald-500 text-black cursor-pointer hover:brightness-110"
                  >
                    Continue to Inventory Setup
                  </button>

                </div>
              )}

              {secureNoticeAcknowledged && (
                <div className="space-y-4">
                  {/* Add New Stock Item form */}
                  <div className="bg-[#0b0c0f] border border-white/5 p-4 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase text-gold">Upload New Inventory Item</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase mb-0.5">Username / Login ID</label>
                        <input
                          value={newInvLoginId}
                          onChange={(e) => setNewInvLoginId(e.target.value)}
                          placeholder="e.g. game_username or login_email"
                          className="w-full h-8 px-2.5 rounded-lg border border-white/5 bg-[#0c0d10] text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase mb-0.5">Password</label>
                        <input
                          type="password"
                          value={newInvPassword}
                          onChange={(e) => setNewInvPassword(e.target.value)}
                          placeholder="e.g. login_password"
                          className="w-full h-8 px-2.5 rounded-lg border border-white/5 bg-[#0c0d10] text-xs text-white"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[9px] text-muted-foreground uppercase mb-0.5">Activation Code / Key / Redemption Token</label>
                        <input
                          value={newInvCredentialsData}
                          onChange={(e) => setNewInvCredentialsData(e.target.value)}
                          placeholder="Paste product key, activation code, or gift card pin here..."
                          className="w-full h-8 px-2.5 rounded-lg border border-white/5 bg-[#0c0d10] text-xs text-white"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[9px] text-muted-foreground uppercase mb-0.5">Special Instructions for Buyer (Only visible after purchase)</label>
                        <textarea
                          value={newInvInstructions}
                          onChange={(e) => setNewInvInstructions(e.target.value)}
                          placeholder="Provide steps for downloading, redeeming, or securing..."
                          rows={2}
                          className="w-full p-2.5 rounded-lg border border-white/5 bg-[#0c0d10] text-xs text-white resize-none"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[9px] text-muted-foreground uppercase mb-0.5">Private Notes (Only visible to you, the seller)</label>
                        <input
                          value={newInvNotes}
                          onChange={(e) => setNewInvNotes(e.target.value)}
                          placeholder="Internal SKU, supplier notes, cost, etc."
                          className="w-full h-8 px-2.5 rounded-lg border border-white/5 bg-[#0c0d10] text-xs text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newInvLoginId.trim() && !newInvCredentialsData.trim()) {
                          toast.error("You must enter either a Login ID or an Activation Code.");
                          return;
                        }
                        setInventoryItems(prev => [
                          ...prev,
                          {
                            login_id: newInvLoginId.trim(),
                            password: newInvPassword || undefined,
                            credentials_data: newInvCredentialsData.trim() || undefined,
                            instructions: newInvInstructions.trim() || undefined,
                            notes: newInvNotes.trim() || undefined,
                            status: 'available'
                          }
                        ]);
                        setNewInvLoginId("");
                        setNewInvPassword("");
                        setNewInvCredentialsData("");
                        setNewInvInstructions("");
                        setNewInvNotes("");
                        toast.success("Item added to temporary inventory. Click Save to publish.");
                      }}
                      className="w-full h-8 text-[11px] font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black cursor-pointer text-emerald-400 transition-all"
                    >
                      + Add Item to Inventory
                    </button>
                  </div>

                  {/* Stock List and Counts */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Stock List ({inventoryItems.length} items)</span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        Available: {inventoryItems.filter(i => i.status === 'available').length} | Assigned: {inventoryItems.filter(i => i.status === 'assigned').length}
                      </span>
                    </div>

                    {inventoryItems.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-white/5 rounded-xl text-xs text-muted-foreground">
                        No inventory items added yet. Please add stock above.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {inventoryItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-surface/35 border border-white/5 p-2 rounded-xl text-[10px]">
                            <div className="space-y-0.5 text-left font-mono">
                              <div>
                                <span className="text-muted-foreground">ID/Login:</span> <span className="text-white select-all">{item.login_id || "Nil"}</span>
                              </div>
                              {item.credentials_data && (
                                <div>
                                  <span className="text-muted-foreground">Code:</span> <span className="text-white select-all">{item.credentials_data.substring(0, 10)}...</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                item.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gold/20 text-gold'
                              }`}>
                                {item.status}
                              </span>
                              {item.status === 'available' ? (
                                <button
                                  type="button"
                                  onClick={() => setInventoryItems(prev => prev.filter((_, i) => i !== index))}
                                  className="text-red-400 hover:text-red-300 font-bold bg-transparent border-none cursor-pointer"
                                >
                                  Remove
                                </button>
                              ) : (
                                <span className="text-muted-foreground select-none opacity-50 font-bold">Locked</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">Search Keywords</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-surface border border-white/5 px-2.5 py-1 rounded-lg text-xs text-white font-sans">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Add keywords and press Enter"
              className="w-full h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 font-sans"
            />
          </div>
        </div>

        {/* ─── CARD 5: CATEGORY SPECIFICATIONS ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-gold">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l-7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <h3 className="text-sm font-bold uppercase tracking-wider font-display">
              {dynamicFields.length > 0
                ? `${categories.find((c) => c.id === categoryId)?.name || "Listing"} Details`
                : "Category Specifications"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground font-sans font-sans">
            Fields below will update automatically based on your selected category.
          </p>

          <div className="pt-2">
              <div className="space-y-4">
                {(() => {
                  const catSlug = categories.find(c => c.id === categoryId)?.slug || "";
                  const type = getCategoryTypeFromSlug(catSlug);
                  
                  if (dynamicFields.length > 0) {
                    // Group fields by validation_rules.group
                    const groups: Record<string, CategoryField[]> = {};
                    dynamicFields.forEach(f => {
                      const gName = f.validation_rules?.group || "General Details";
                      if (!groups[gName]) groups[gName] = [];
                      groups[gName].push(f);
                    });

                    return (
                      <div className="space-y-6">
                        {Object.entries(groups).map(([groupName, fields]) => {
                          const visibleFields = fields.filter(field => {
                            const dependsOn = field.validation_rules?.depends_on;
                            if (dependsOn && attributes[dependsOn.field] !== dependsOn.value) {
                              return false;
                            }
                            return true;
                          });

                          if (visibleFields.length === 0) return null;

                          return (
                            <div key={groupName} className="space-y-3 border-t border-border/30 pt-4 first:border-t-0 first:pt-0">
                              <h4 className="text-xs font-semibold text-gold/80 tracking-wider uppercase">{groupName}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                {visibleFields.map((field) => {
                                  const value = attributes[field.field_key] ?? "";
                                  const renderInput = () => {
                                    const baseClass = "w-full h-9 px-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white";
                                    switch (field.field_type) {
                                      case 'textarea':
                                        return (
                                          <textarea
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || ""}
                                            rows={3}
                                            className="w-full p-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 text-white resize-none"
                                          />
                                        );
                                      case 'number':
                                        return (
                                          <input
                                            type="number"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value === "" ? "" : Number(e.target.value) })}
                                            placeholder={field.placeholder || ""}
                                            min={field.validation_rules?.min}
                                            max={field.validation_rules?.max}
                                            className={baseClass}
                                          />
                                        );
                                      case 'select':
                                        return (
                                          <select
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            className={baseClass}
                                          >
                                            <option value="">{field.placeholder || "Select option"}</option>
                                            {(field.validation_rules?.allowed_values || []).map((val) => (
                                              <option key={val} value={val}>{val}</option>
                                            ))}
                                          </select>
                                        );
                                      case 'checkbox':
                                      case 'boolean':
                                        return (
                                          <div className="flex items-center gap-2 mt-2">
                                            <input
                                              type="checkbox"
                                              checked={!!value}
                                              onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.checked })}
                                              className="rounded border-border text-gold focus:ring-gold/30 bg-surface/60"
                                            />
                                            <span className="text-xs text-muted-foreground">{field.placeholder || "Enable"}</span>
                                          </div>
                                        );
                                      case 'radio':
                                        return (
                                          <div className="flex flex-wrap gap-4 mt-2">
                                            {(field.validation_rules?.allowed_values || []).map((val) => (
                                              <label key={val} className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                                                <input
                                                  type="radio"
                                                  name={field.field_key}
                                                  value={val}
                                                  checked={value === val}
                                                  onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                                  className="text-gold focus:ring-gold/30"
                                                />
                                                {val}
                                              </label>
                                            ))}
                                          </div>
                                        );
                                      case 'date':
                                        return (
                                          <input
                                            type="date"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            className={baseClass}
                                          />
                                        );
                                      case 'datetime':
                                        return (
                                          <input
                                            type="datetime-local"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            className={baseClass}
                                          />
                                        );
                                      case 'email':
                                        return (
                                          <input
                                            type="email"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || "e.g. user@domain.com"}
                                            className={baseClass}
                                          />
                                        );
                                      case 'password':
                                        return (
                                          <input
                                            type="password"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || "Password"}
                                            className={baseClass}
                                          />
                                        );
                                      case 'url':
                                        return (
                                          <input
                                            type="url"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || "https://..."}
                                            className={baseClass}
                                          />
                                        );
                                      case 'tags':
                                        return (
                                          <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || "e.g. rare, cheap (comma separated)"}
                                            className={baseClass}
                                          />
                                        );
                                      case 'file':
                                      case 'image':
                                        return (
                                          <div className="rounded-xl border border-border bg-background/40 p-2.5 w-full">
                                            {value ? (
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-gold truncate">{String(value).split('/').pop()}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => setAttributes(prev => {
                                                    const copy = { ...prev };
                                                    delete copy[field.field_key];
                                                    return copy;
                                                  })}
                                                  className="text-red-400 hover:text-red-500 text-xs shrink-0 font-medium"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 w-full">
                                                <input
                                                  type="file"
                                                  accept={field.field_type === 'image' ? "image/*" : "*"}
                                                  onChange={(e) => handleProofUpload(e, field.field_key)}
                                                  disabled={uploadingProof[field.field_key]}
                                                  className="text-xs text-muted-foreground w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                                                />
                                                {uploadingProof[field.field_key] && <Loader2 className="size-3 text-gold animate-spin" />}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      default:
                                        return (
                                          <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => setAttributes({ ...attributes, [field.field_key]: e.target.value })}
                                            placeholder={field.placeholder || ""}
                                            className={baseClass}
                                          />
                                        );
                                    }
                                  };
                                  const isFullWidth = field.field_type === 'textarea' || field.field_type === 'file' || field.field_type === 'image';
                                  return (
                                    <div key={field.field_key} className={isFullWidth ? "col-span-2" : ""}>
                                      <label className="block text-xs font-medium mb-1.5 flex items-center justify-between">
                                        <span>
                                          {field.label} {field.is_required && <span className="text-red-400">*</span>}
                                        </span>
                                        {field.validation_rules?.pricing_hint && (
                                          <span className="text-[10px] text-gold font-medium bg-gold/10 px-2 py-0.5 rounded-full border border-gold/15">
                                            💡 {field.validation_rules.pricing_hint}
                                          </span>
                                        )}
                                      </label>
                                      {renderInput()}
                                      {field.help_text && (
                                        <p className="text-[10px] text-muted-foreground mt-1">{field.help_text}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {dynamicEngine?.delivery_engine === 'Credentials' && renderSecureVaultFormFields(catSlug)}
                      </div>
                    );
                  }

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

                        {renderSecureVaultFormFields(catSlug)}
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
                })()}
              </div>
            </div>
          </div>
                  
              {/* ─── CARD 6: MARKETPLACE VISIBILITY (SEO) ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
            <div className="flex items-center gap-2 text-gold">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <h3 className="text-sm font-bold uppercase tracking-wider font-display">Marketplace Visibility & SEO</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const categoryObj = categories.find(c => c.id === categoryId);
                const categoryName = categoryObj ? categoryObj.name : "Digital Product";
                setSeoTitle(title ? `${title.slice(0, 40)} | Buy ${categoryName} on HUXZAIN` : "");
                setSeoDescription(description ? `${description.slice(0, 120)}... Buy secure digital items on HUXZAIN.` : "");
                setSeoKeywords(title ? `${title.toLowerCase().split(" ").join(", ")}, huxzain, buy ${categoryName.toLowerCase()}` : "");
                toast.success("Listing SEO fields generated!");
              }}
              className="h-8 px-3 rounded-lg border border-gold/30 hover:bg-gold/10 text-gold text-xs font-bold transition-all flex items-center gap-1 cursor-pointer bg-transparent"
            >
              <span>✨</span> Generate Automatically
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            Improve your listing visibility in search results and on the marketplace.
          </p>
          
          <div className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Listing URL Preview</label>
              <div className="w-full h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/40 flex items-center text-xs text-muted-foreground select-all font-mono truncate">
                https://huxzain.shop/product/<span className="text-gold font-semibold">{title ? slugify(title) : "url-slug"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Result Title</label>
                  <span className={`text-[10px] font-bold ${seoTitle.length > 60 ? 'text-red-400' : 'text-muted-foreground'}`}>{seoTitle.length}/60</span>
                </div>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value.slice(0, 60))}
                  placeholder="Enter a title for search results"
                  className={`w-full h-11 px-4 rounded-xl border ${seoTitle.length > 60 ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-gold/40'} bg-[#0d0e11]/80 text-sm text-white focus:outline-none transition-colors font-sans`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Keywords</label>
                  <span className={`text-[10px] font-bold ${seoKeywords.length > 120 ? 'text-red-400' : 'text-muted-foreground'}`}>{seoKeywords.length}/120</span>
                </div>
                <input
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value.slice(0, 120))}
                  placeholder="e.g. digital product, premium license, 12 month"
                  className={`w-full h-11 px-4 rounded-xl border ${seoKeywords.length > 120 ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-gold/40'} bg-[#0d0e11]/80 text-sm text-white focus:outline-none transition-colors font-sans`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Preview Description</label>
                <span className={`text-[10px] font-bold ${seoDescription.length > 160 ? 'text-red-400' : 'text-muted-foreground'}`}>{seoDescription.length}/160</span>
              </div>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value.slice(0, 160))}
                placeholder="Enter a short description to appear in search results"
                rows={3}
                className={`w-full p-4 rounded-xl border ${seoDescription.length > 160 ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-gold/40'} bg-[#0d0e11]/80 text-sm text-white focus:outline-none transition-colors resize-none font-sans`}
              />
            </div>
          </div>
        </div>

        {/* ─── CARD 7: PUBLISHING ─── */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0d10]/40 p-6 space-y-4 shadow-xl text-left">
          <div className="flex items-center gap-2 text-gold">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <h3 className="text-sm font-bold uppercase tracking-wider font-display">Publishing</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">Listing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-white/5 bg-[#0d0e11]/80 text-sm text-white focus:outline-none focus:border-gold/40 cursor-pointer font-sans"
                >
                  <option value="draft">Draft (Not Visible)</option>
                  <option value="active">Active (Published)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-2 font-sans leading-relaxed">
                  Draft listings are not visible to buyers until you publish. You can edit and publish anytime.
                </p>
              </div>
            </div>

            {/* Important Reminder Card */}
            <div className="rounded-xl border border-gold/15 bg-gold/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider font-display">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Important Reminder
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground font-sans">
                <li className="flex items-center gap-2">
                  <span className="text-gold">✓</span> Ensure all information is accurate before publishing.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">✓</span> You can edit most details after publishing.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">✓</span> Some categories may require admin approval.
                </li>
              </ul>
            </div>
          </div>

          {/* Secure Delivery Declarations Checklist */}
          {(deliveryType === 'instant' || deliveryType === 'hybrid') && (
            <div className="border border-red-500/20 bg-red-500/[0.01] p-4 rounded-xl space-y-3 mt-4">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <AlertCircle size={14} /> Mandatory Seller Declarations Checklist
              </h4>
              <p className="text-[10px] text-muted-foreground leading-normal">
                You must read and tick all of the following declarations before you can publish a secure delivery listing:
              </p>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decl1}
                    onChange={(e) => setDecl1(e.target.checked)}
                    className="rounded border-border text-red-500 focus:ring-red-500/30 mt-0.5"
                  />
                  <span>I declare that the credentials/keys uploaded are 100% accurate, operational, and owned by me.</span>
                </label>
                <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decl2}
                    onChange={(e) => setDecl2(e.target.checked)}
                    className="rounded border-border text-red-500 focus:ring-red-500/30 mt-0.5"
                  />
                  <span>I agree that I will not attempt to recover, change, or modify the account credentials after they are purchased.</span>
                </label>
                <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decl3}
                    onChange={(e) => setDecl3(e.target.checked)}
                    className="rounded border-border text-red-500 focus:ring-red-500/30 mt-0.5"
                  />
                  <span>I understand that recovering or pulling back this listing after sale will result in an immediate permanent ban and HUXZAIN legal intervention.</span>
                </label>
                <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decl4}
                    onChange={(e) => setDecl4(e.target.checked)}
                    className="rounded border-border text-red-500 focus:ring-red-500/30 mt-0.5"
                  />
                  <span>I declare that this listing does not contain any minors' details or sensitive information.</span>
                </label>
                <label className="flex items-start gap-2.5 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decl5}
                    onChange={(e) => setDecl5(e.target.checked)}
                    className="rounded border-border text-red-500 focus:ring-red-500/30 mt-0.5"
                  />
                  <span>I agree to HUXZAIN's seller terms and secure escrow release hold procedures.</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ─── ERROR CONTAINER ─── */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium font-sans">
            {errorMsg}
          </div>
        )}

        {/* ─── FORM ACTIONS FOOTER BAR ─── */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl border border-white/10 hover:bg-white/[0.02] hover:text-white text-xs font-bold text-muted-foreground transition-all cursor-pointer flex items-center gap-2 bg-transparent"
          >
            <Trash2 className="size-4" /> Discard
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || ((deliveryType === 'instant' || deliveryType === 'hybrid') && !(decl1 && decl2 && decl3 && decl4 && decl5))}
            className="h-11 px-8 rounded-xl bg-gold text-[#0a0b0d] text-xs font-black uppercase tracking-wider hover:brightness-110 disabled:opacity-60 transition-all flex items-center gap-2 cursor-pointer border-none font-display"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
            {saving ? "Saving..." : isNew ? "Continue to Review" : "Save Changes"}
          </button>
        </div>

      {showBeforeUploadNotice && (
        <BeforeUploadSecureDelivery
          onContinue={() => {
            setShowBeforeUploadNotice(false);
            setSecureNoticeAcknowledged(true);
          }}
          onCancel={() => setShowBeforeUploadNotice(false)}
        />
      )}

      {showInventoryUploadedNotice && (
        <InventoryUploadedNotice
          onContinue={() => {
            setShowInventoryUploadedNotice(false);
            onSaved(isNew);
            onClose();
          }}
          onManageListing={() => {
            setShowInventoryUploadedNotice(false);
            onSaved(isNew);
            onClose();
          }}
        />
      )}
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
  const { intent, listingId } = Route.useSearch() as any;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editTarget, setEditTarget] = useState<Partial<Listing> | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showGamingPublishedNotice, setShowGamingPublishedNotice] = useState(false);
  const [deleteNoticeTarget, setDeleteNoticeTarget] = useState<string | null>(null);
  const [outOfStockTarget, setOutOfStockTarget] = useState<string | null>(null);
  const [lowInventoryTarget, setLowInventoryTarget] = useState<string | null>(null);
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, { available: number; hold: number; assigned: number }>>({});

  useEffect(() => {
    if (listingId && listings.length > 0) {
      const matched = listings.find((l) => l.id === listingId);
      if (matched) setEditTarget(matched);
    }
  }, [listingId, listings]);

  useEffect(() => {
    if (listings.length === 0) return;
    
    const outOfStockListing = listings.find((l) => {
      if (l.status !== "active") return false;
      if (l.delivery_type !== "instant" && l.delivery_type !== "hybrid") return false;
      
      const counts = inventoryCounts[l.id] || { available: 0, hold: 0, assigned: 0 };
      const total = counts.available + counts.hold + counts.assigned;
      const isOos = counts.available === 0 && total > 0;
      const seenKey = `seen_oos_${l.id}`;
      return isOos && !sessionStorage.getItem(seenKey);
    });

    if (outOfStockListing) {
      setOutOfStockTarget(outOfStockListing.id);
      return;
    }

    const lowInvListing = listings.find((l) => {
      if (l.status !== "active") return false;
      if (l.delivery_type !== "instant" && l.delivery_type !== "hybrid") return false;
      
      const counts = inventoryCounts[l.id] || { available: 0, hold: 0, assigned: 0 };
      const isLow = counts.available > 0 && counts.available <= 2;
      const seenKey = `seen_low_inv_${l.id}`;
      return isLow && !sessionStorage.getItem(seenKey);
    });

    if (lowInvListing) {
      setLowInventoryTarget(lowInvListing.id);
    }
  }, [listings, inventoryCounts]);


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

    // Fetch listing inventory status counts
    const { data: invData } = await supabase
      .from("listing_inventory")
      .select("id, listing_id, status");
      
    const countsMap: Record<string, { available: number; hold: number; assigned: number }> = {};
    if (invData) {
      invData.forEach((item: any) => {
        const lid = item.listing_id;
        if (!countsMap[lid]) {
          countsMap[lid] = { available: 0, hold: 0, assigned: 0 };
        }
        if (item.status === 'available') countsMap[lid].available++;
        else if (item.status === 'hold') countsMap[lid].hold++;
        else if (item.status === 'assigned') countsMap[lid].assigned++;
      });
    }
    setInventoryCounts(countsMap);

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

  const [activeTab, setActiveTab] = useState<"all" | "active" | "promoted" | "draft" | "expired" | "deleted">("all");

  const [hasActiveOrdersForDelete, setHasActiveOrdersForDelete] = useState(false);
  const [checkingDeleteOrders, setCheckingDeleteOrders] = useState(false);

  async function handleStartDelete(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setCheckingDeleteOrders(true);
    try {
      const { data: activeOrders, error } = await supabase
        .from("orders")
        .select("id")
        .eq("listing_id", id)
        .not("status", "in", '("completed","cancelled","refunded")');

      if (error) throw error;
      setHasActiveOrdersForDelete(!!(activeOrders && activeOrders.length > 0));
      setDeleteNoticeTarget(id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCheckingDeleteOrders(false);
    }
  }

  async function executeDeleteActual(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("listings").update({ status: "deleted" }).eq("id", id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Listing deleted successfully.");
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "deleted" } : l))
        );
        setDeleteNoticeTarget(null);
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

  // Derived listing-state helpers (no category-specific logic).
  const isPromoted = (l: any) =>
    !!(l.is_featured || l.is_homepage_featured || l.is_urgent || l.has_glow);
  const isExpired = (l: any) =>
    l.status === "archived" ||
    (!!l.expiry_date && new Date(l.expiry_date).getTime() < Date.now());
  const isDraftLike = (l: any) =>
    l.status === "draft" || l.status === "pending" || l.status === "pending_review";

  // Official spec (Universal Listing Expiry): show a countdown per listing.
  const expiryLabel = (l: any): { text: string; tone: string } | null => {
    if (!l.expiry_date) return null;
    const ms = new Date(l.expiry_date).getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (ms <= 0) return { text: "Expired", tone: "text-red-400" };
    if (days === 1) return { text: "Expires Tomorrow", tone: "text-amber-400" };
    if (days <= 7) return { text: `Expires in ${days} Days`, tone: "text-amber-400" };
    return { text: `Expires in ${days} Days`, tone: "text-muted-foreground" };
  };

  async function setListingLifecycle(id: string, patch: Record<string, any>, msg: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from("listings").update(patch).eq("id", id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(msg);
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
        fetchListings();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const executeExpire = (id: string) =>
    setListingLifecycle(
      id,
      { status: "archived", expiry_date: new Date().toISOString() },
      "Listing expired. It is no longer visible to buyers."
    );

  const executeRenew = (id: string) => {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    setListingLifecycle(
      id,
      { status: "active", expiry_date: in30.toISOString() },
      "Listing renewed for 30 days and set back to Active."
    );
  };

  const stats = {
    active: listings.filter((l) => l.status === "active" && !isExpired(l)).length,
    promoted: listings.filter((l) => l.status !== "deleted" && isPromoted(l)).length,
    draft: listings.filter((l) => l.status !== "deleted" && isDraftLike(l)).length,
    expired: listings.filter((l) => l.status !== "deleted" && isExpired(l)).length,
  };

  const filtered = listings.filter((l) => {
    const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (activeTab === "all") return l.status !== "deleted";
    if (activeTab === "active") return l.status === "active" && !isExpired(l);
    if (activeTab === "promoted") return l.status !== "deleted" && isPromoted(l);
    if (activeTab === "draft") return l.status !== "deleted" && isDraftLike(l);
    if (activeTab === "expired") return l.status !== "deleted" && isExpired(l);
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
      {showPublishSuccess && (
        <PublishSuccessModal
          message={successMessage}
          onClose={() => setShowPublishSuccess(false)}
        />
      )}

      {editTarget !== undefined ? (
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
      ) : (
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
            { id: "promoted", l: "Promoted", v: stats.promoted, c: "text-gold" },
            { id: "draft", l: "Drafts", v: stats.draft, c: "text-yellow-400" },
            { id: "expired", l: "Expired", v: stats.expired, c: "text-red-400" },
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
              : activeTab === "promoted"
              ? "Promoted Listings"
              : activeTab === "draft"
              ? "Draft & Pending Listings"
              : activeTab === "expired"
              ? "Expired Listings"
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
              { id: "promoted", label: `Promoted (${stats.promoted})` },
              { id: "draft", label: `Drafts (${stats.draft})` },
              { id: "expired", label: `Expired (${stats.expired})` },
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
                    <th className="text-left py-2.5 pr-4">Inventory</th>
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
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {new Date(l.created_at).toLocaleDateString()}
                              </span>
                              {(() => {
                                const exp = expiryLabel(l);
                                return exp ? (
                                  <span className={`inline-flex items-center gap-1 ${exp.tone}`}>
                                    <Clock className="size-3" /> {exp.text}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gold">
                        ₹{(l.price ?? (l.price_cents / 100)).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        {l.delivery_type === 'instant' || l.delivery_type === 'hybrid' ? (
                          (() => {
                            const counts = inventoryCounts[l.id] || { available: 0, hold: 0, assigned: 0 };
                            return (
                              <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-emerald-400">Available:</span>
                                  <span className="text-foreground">{counts.available}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-amber-400">Reserved:</span>
                                  <span className="text-foreground">{counts.hold}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-blue-400">Delivered:</span>
                                  <span className="text-foreground">{counts.assigned}</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Manual Delivery</span>
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const expired = isExpired(l);
                            const label = expired
                              ? "Expired"
                              : l.status === "active" && isPromoted(l)
                              ? "Promoted"
                              : l.status === "pending" || l.status === "pending_review"
                              ? "Pending Approval"
                              : l.status === "active"
                              ? "Active"
                              : l.status === "draft"
                              ? "Draft"
                              : l.status === "sold"
                              ? "Sold"
                              : l.status === "rejected"
                              ? "Rejected"
                              : l.status;
                            const cls = expired
                              ? "text-red-400 bg-red-500/10 border-red-500/20"
                              : l.status === "active" && isPromoted(l)
                              ? "text-gold bg-gold/10 border-gold/20"
                              : statusColors[l.status] ?? "text-muted-foreground bg-surface border-border";
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
                                {label}
                              </span>
                            );
                          })()}
                          {/* Promotion indicator icons — driven by real listing flags */}
                          {l.is_homepage_featured && (
                            <Star className="size-3.5 text-gold" aria-label="Homepage Featured" />
                          )}
                          {l.is_featured && !l.is_homepage_featured && (
                            <Star className="size-3.5 text-purple-400" aria-label="Featured in Category" />
                          )}
                          {l.is_urgent && (
                            <Zap className="size-3.5 text-red-400" aria-label="Urgent Sale" />
                          )}
                          {l.has_glow && (
                            <Sparkles className="size-3.5 text-amber-400" aria-label="Glow Highlight" />
                          )}
                        </div>
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
                          ) : isExpired(l) ? (
                            <>
                              <button
                                onClick={() => executeRenew(l.id)}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold transition-all cursor-pointer border-none"
                                title="Renew for 30 days"
                              >
                                <RotateCcw className="size-3.5" /> Renew
                              </button>
                              <button
                                onClick={() => handleStartDelete(l.id)}
                                disabled={deleting === l.id || deleting !== null}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </button>

                            </>
                          ) : (
                            <>
                              {/* Promote → Promotion Center (Boost, Glow, Urgent, Featured) */}
                              <a
                                href={`/seller/boosts?listing=${l.id}`}
                                className="p-1.5 rounded-lg hover:bg-gold/10 text-muted-foreground hover:text-gold transition-colors"
                                title="Promote (Boost / Glow / Urgent)"
                              >
                                <Rocket className="size-4" />
                              </a>
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
                              {l.status === "active" && (
                                <button
                                  onClick={() => executeExpire(l.id)}
                                  className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-red-400 transition-colors"
                                  title="Expire (unpublish)"
                                >
                                  <Clock className="size-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleStartDelete(l.id)}
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
      )}

      {/* Before Delete/Unpublish safety warning modal */}
      {deleteNoticeTarget && (
        <BeforeDeleteListingNotice
          hasActiveOrders={hasActiveOrdersForDelete}
          onConfirm={() => executeDeleteActual(deleteNoticeTarget)}
          onCancel={() => setDeleteNoticeTarget(null)}
        />
      )}

      {/* Gaming Account Listing Published notice */}
      {showGamingPublishedNotice && (
        <GamingListingPublishedNotice
          onAcknowledge={() => setShowGamingPublishedNotice(false)}
        />
      )}

      {/* Listing Out of Stock notice */}
      {outOfStockTarget && (
        <OutOfStockNotice
          onManageInventory={() => {
            const matched = listings.find(l => l.id === outOfStockTarget);
            if (matched) setEditTarget(matched);
            sessionStorage.setItem(`seen_oos_${outOfStockTarget}`, "true");
            setOutOfStockTarget(null);
          }}
          onClose={() => {
            sessionStorage.setItem(`seen_oos_${outOfStockTarget}`, "true");
            setOutOfStockTarget(null);
          }}
        />
      )}

      {/* Low Inventory Reminder notice */}
      {lowInventoryTarget && (
        <LowInventoryReminder
          onUpload={() => {
            const matched = listings.find(l => l.id === lowInventoryTarget);
            if (matched) setEditTarget(matched);
            sessionStorage.setItem(`seen_low_inv_${lowInventoryTarget}`, "true");
            setLowInventoryTarget(null);
          }}
          onRemindLater={() => {
            sessionStorage.setItem(`seen_low_inv_${lowInventoryTarget}`, "true");
            setLowInventoryTarget(null);
          }}
        />
      )}
    </>
  );
}
