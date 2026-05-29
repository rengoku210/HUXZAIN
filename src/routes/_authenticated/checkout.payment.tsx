import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { 
  ArrowLeft, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  ChevronRight,
  Info,
  Copy,
  Clock,
  Sparkles,
  User,
  ExternalLink
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TIERS, type SellerTier } from "@/lib/seller/tier-context";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace/listing-adapter";

export const Route = createFileRoute("/_authenticated/checkout/payment")({
  validateSearch: (s: Record<string, unknown>): { plan?: string; listingId?: string; price?: string; orderId?: string } => ({
    plan: s.plan ? String(s.plan) : undefined,
    listingId: s.listingId ? String(s.listingId) : undefined,
    price: s.price ? String(s.price) : undefined,
    orderId: s.orderId ? String(s.orderId) : undefined,
  }),
  head: () => ({ meta: [{ title: "Complete Checkout — HUXZAIN" }] }),
  component: UnifiedPaymentPage,
});

type StepType = "pay" | "upload" | "success";

function UnifiedPaymentPage() {
  const search = Route.useSearch() as any;
  const planParam = search.plan;
  const listingIdParam = search.listingId;
  const priceParam = search.price;
  const orderIdParam = search.orderId;

  const { user } = useAuth();
  const navigate = useNavigate();

  // Load Tier Meta if subscription upgrade
  const isSubscription = !!planParam;
  const selectedPlanId = (planParam?.replace(/"/g, "")?.toLowerCase() || "pro") as SellerTier;
  const planMeta = TIERS[selectedPlanId] || TIERS.pro;

  // Listing State
  const [listing, setListing] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(orderIdParam || null);

  // Flow & Upload State
  const [step, setStep] = useState<StepType>("pay");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch listing & seller info if listingId is provided
  useEffect(() => {
    if (!listingIdParam || isSubscription) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchListingData = async () => {
      setLoadingListing(true);
      try {
        const { data: listData, error: listErr } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingIdParam)
          .maybeSingle();

        if (listErr) throw listErr;
        if (!listData) {
          toast.error("Listing not found.");
          return;
        }

        setListing(listData);

        // Fetch seller profile
        if (listData.seller_id) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("display_name, username, email")
            .eq("id", listData.seller_id)
            .maybeSingle();
          setSellerProfile(profData);
        }
      } catch (err: any) {
        console.error("Error loading listing checkout details:", err);
        toast.error(`Error loading product info: ${err.message}`);
      } finally {
        setLoadingListing(false);
      }
    };

    fetchListingData();
  }, [listingIdParam, isSubscription]);

  // Determine pricing and titles
  const checkoutTitle = isSubscription 
    ? `${planMeta.label} Platform Tier Upgrade`
    : listing?.title || "Marketplace Product Checkout";

  const rawPrice = isSubscription
    ? planMeta.monthly
    : listing
      ? (listing.price_cents ? listing.price_cents / 100 : parseFloat(priceParam || "0"))
      : parseFloat(priceParam || "0");

  const checkoutPrice = isNaN(rawPrice) ? 0 : rawPrice;

  const sellerName = isSubscription
    ? "HUXZAIN Platform"
    : sellerProfile?.display_name || sellerProfile?.username || "Verified Seller";

  const upiId = "rammodhvadiya210@okaxis";

  // Dynamic UPI URI formulation
  const transactionNote = isSubscription
    ? `Huxzain ${planMeta.label} Subscription Upgrade`
    : `Huxzain Order ${orderId ? orderId.slice(0, 8) : "Checkout"}`;

  const upiUri = `upi://pay?pa=${upiId}&pn=HUXZAIN&am=${checkoutPrice}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  // Handle Clipboard Copy
  const copyToClipboard = (text: string, type: "id" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Screenshot is too large. Max size is 5MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitProof = async () => {
    if (!file) {
      toast.error("Please select a receipt screenshot to upload.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !user) {
      toast.error("Database connection not configured.");
      return;
    }

    setUploading(true);
    try {
      // 1. Double check / auto-create Listing Order on the fly if missing (listing checkout)
      let finalOrderId = orderId;
      if (!isSubscription && listing && !finalOrderId) {
        // Try creating the order now
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            seller_id: listing.seller_id,
            listing_id: listing.id,
            qty: 1,
            amount_total: checkoutPrice,
            currency: "INR",
            payment_method: "manual",
            status: "pending_payment",
          })
          .select("id")
          .single();

        if (orderErr) throw orderErr;
        finalOrderId = newOrder.id;
        setOrderId(finalOrderId);

        // Also create charge transaction
        const amountCents = Math.round(checkoutPrice * 100);
        await supabase.from("transactions").insert({
          user_id: user.id,
          order_id: finalOrderId,
          type: "charge",
          amount_cents: amountCents,
          currency: "INR",
          ref: `manual:${finalOrderId}`,
          status: "pending",
        });

        // Insert notification
        await supabase.from("notifications").insert({
          user_id: listing.seller_id,
          kind: "order.created",
          title: "New order received",
          body: `${user.email ?? "A buyer"} started checkout for ${listing.title}`,
        });
      }

      // 2. Upload screenshot file to storage
      const ext = file.name.split(".").pop() ?? "png";
      const folder = isSubscription ? "subscriptions" : "listings";
      const filePath = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      let bucketName = "payment-proofs";
      if (uploadErr) {
        console.warn("[Unified Checkout] Upload to payment-proofs bucket failed, trying listing-images fallback:", uploadErr.message);
        const { error: fallbackErr } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { upsert: true, contentType: file.type });

        if (fallbackErr) throw fallbackErr;
        bucketName = "listing-images";
      }

      // 3. Get public URL of screenshot
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const screenshotUrl = urlData.publicUrl;

      // 4. Create record in public.payment_proofs (New unified schema table)
      const unifiedPayload = {
        user_id: user.id,
        listing_id: isSubscription ? null : listingIdParam,
        payment_type: isSubscription ? "subscription" : "listing",
        amount: checkoutPrice,
        screenshot_url: screenshotUrl,
        payment_reference: isSubscription ? `subscription:${planMeta.id}` : `order:${finalOrderId}`,
        status: "pending",
      };

      const { error: proofErr } = await supabase
        .from("payment_proofs")
        .insert(unifiedPayload);

      if (proofErr) {
        console.warn("[Unified Checkout] Error saving to unified payment_proofs table:", proofErr.message);
      }

      // 5. Dual-write backup to maintain strict backwards-compatibility with old dashboards
      if (isSubscription) {
        // Save to subscription_payment_proofs table so subscription review dashboard works
        await supabase
          .from("subscription_payment_proofs")
          .insert({
            user_id: user.id,
            selected_plan: planMeta.label,
            amount: checkoutPrice,
            screenshot_url: screenshotUrl,
            status: "pending"
          });
      } else if (finalOrderId) {
        console.log("[Unified Checkout] Submitting listing payment proof to payment_events...", {
          order_id: finalOrderId,
          user_id: user.id,
          amount: checkoutPrice,
          screenshot_url: screenshotUrl,
        });

        // Save to payment_events table
        const { data: eventData, error: eventErr } = await supabase
          .from("payment_events")
          .insert({
            order_id: finalOrderId,
            provider: "manual",
            event_type: "proof_uploaded",
            payload: {
              user_id: user.id,
              screenshot_url: screenshotUrl,
              screenshot_hash: `hash_${Date.now()}`,
              amount: checkoutPrice,
              status: "pending",
              payment_reference: `order:${finalOrderId}`,
            },
          })
          .select("*");

        if (eventErr) {
          console.error("[Unified Checkout] Error saving to payment_events table:", eventErr);
          throw eventErr;
        }

        console.log("[Unified Checkout] Successfully inserted payment_event:", eventData);

        // Try writing to legacy payment_verifications as non-blocking
        try {
          await supabase
            .from("payment_verifications")
            .insert({
              order_id: finalOrderId,
              user_id: user.id,
              screenshot_url: screenshotUrl,
              screenshot_hash: `hash_${Date.now()}`,
              status: "pending",
            });
        } catch (e) {
          console.warn("[Unified Checkout] Non-blocking legacy payment_verifications insert failed:", e);
        }

        // Update transaction status
        await supabase
          .from("transactions")
          .update({ ref: `manual:${finalOrderId}`, status: "submitted" })
          .eq("order_id", finalOrderId)
          .eq("user_id", user.id);

        // Notify Seller
        if (listing?.seller_id) {
          await supabase.from("notifications").insert({
            user_id: listing.seller_id,
            kind: "payment.submitted",
            title: "Payment proof submitted",
            body: `Order ${finalOrderId.slice(0, 8)} is awaiting admin verification.`,
          });
        }
      }

      setStep("success");
      toast.success("Payment proof submitted successfully!");
    } catch (err: any) {
      console.error("[Unified Checkout] Submission error:", err);
      toast.error(`Submission failed: ${err.message ?? "Unknown database error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      
      <main className="flex-1 container-page py-10 flex flex-col items-center">
        <div className="w-full max-w-xl mx-auto px-4">
          
          {/* Back button link */}
          {step !== "success" && (
            <button
              onClick={() => {
                if (step === "upload") setStep("pay");
                else {
                  if (isSubscription) navigate({ to: "/seller/subscription" });
                  else if (listingIdParam) navigate({ to: `/product/${listingIdParam}` });
                  else navigate({ to: "/" });
                }
              }}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {loadingListing ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-gold" />
              <p className="text-sm text-muted-foreground">Loading checkout details...</p>
            </div>
          ) : (
            <>
              {/* STEP 1: QR Payment Panel */}
              {step === "pay" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
                  <div className="text-center">
                    <h1 className="font-display text-2xl font-bold tracking-tight">Verified Checkout</h1>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Secure checkout powered by manual manual-escrow UPI payment proof
                    </p>
                  </div>

                  {/* Step 1: Order Summary */}
                  <div className="rounded-2xl border border-border bg-surface/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isSubscription ? (
                        <div className="size-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                          <Sparkles className="size-6" />
                        </div>
                      ) : listing?.cover_image_url ? (
                        <img 
                          src={listing.cover_image_url} 
                          alt="Cover" 
                          className="size-12 rounded-xl object-cover border border-border bg-black shrink-0" 
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground shrink-0">
                          <ImageIcon className="size-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Summary</div>
                        <div className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">{checkoutTitle}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Seller: {sellerName}</div>
                      </div>
                    </div>
                    <div className="text-left md:text-right border-t md:border-t-0 border-border/40 pt-3 md:pt-0">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount Payable</div>
                      <div className="text-2xl font-display font-extrabold text-gold mt-0.5">₹{checkoutPrice.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Step 2: UPI QR Scanner Section */}
                  <div className="rounded-3xl border border-border bg-surface/40 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
                    
                    <div className="text-center mb-5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/20 font-bold mb-2.5 uppercase tracking-wider">
                        <ShieldCheck size={11} /> UPI Secure Gateway
                      </span>
                      <p className="text-xs text-muted-foreground">Scan QR code using Google Pay, PhonePe, UPI, or Paytm</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="relative p-3 rounded-2xl border border-gold/30 bg-white shadow-2xl flex items-center justify-center w-52 h-52 group overflow-hidden">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`}
                        alt="UPI QR Code" 
                        className="w-full h-full object-contain select-none"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none" />
                    </div>

                    {/* Copy Buttons */}
                    <div className="mt-5 w-full space-y-2">
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface/80 border border-border text-xs">
                        <span className="font-mono text-muted-foreground truncate pl-1">UPI ID: {upiId}</span>
                        <button
                          onClick={() => copyToClipboard(upiId, "id")}
                          className="h-8 px-3 rounded-lg bg-border/60 hover:bg-border text-[11px] font-semibold flex items-center gap-1.5 transition-colors border-none cursor-pointer"
                        >
                          <Copy size={12} /> {copiedId ? "Copied" : "Copy ID"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface/80 border border-border text-xs">
                        <span className="font-mono text-muted-foreground pl-1">Amount: ₹{checkoutPrice}</span>
                        <button
                          onClick={() => copyToClipboard(String(checkoutPrice), "amount")}
                          className="h-8 px-3 rounded-lg bg-border/60 hover:bg-border text-[11px] font-semibold flex items-center gap-1.5 transition-colors border-none cursor-pointer"
                        >
                          <Copy size={12} /> {copiedAmount ? "Copied" : "Copy Amount"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Payment Notice Box */}
                  <div className="rounded-2xl border border-border bg-surface/25 p-5 flex gap-4">
                    <Info className="size-5 text-gold shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Important Payment Instructions</h4>
                      <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                        <li>Pay exact amount only: <span className="text-gold font-bold">₹{checkoutPrice}</span></li>
                        <li>Do not pay less or more than shown amount</li>
                        <li>Upload valid payment screenshot after payment</li>
                        <li>Orders verified manually by HUXZAIN administrators</li>
                        <li>Verification may take <strong className="text-foreground">24–48 hours</strong></li>
                        <li>Support is available immediately if any payment issue occurs</li>
                      </ul>
                    </div>
                  </div>

                  {/* Next Step trigger */}
                  <button
                    onClick={() => setStep("upload")}
                    className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10 cursor-pointer border-none"
                  >
                    I Paid / Confirm Payment <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* STEP 2: Screenshot Proof Upload */}
              {step === "upload" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-300">
                  <div className="text-center">
                    <h1 className="font-display text-2xl font-bold">Upload Payment Proof</h1>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Please submit a screenshot of your successful transaction to verify and log your purchase.
                    </p>
                  </div>

                  {/* File Selector input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                  />

                  {/* Drag and drop preview panel */}
                  {!previewUrl ? (
                    <div
                      onClick={handleUploadClick}
                      className="rounded-3xl border-2 border-dashed border-border hover:border-gold/50 bg-surface/10 hover:bg-gold/5 p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 gap-3 group min-h-[220px]"
                    >
                      <div className="size-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Upload size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Select transaction screenshot</p>
                        <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, JPEG (Max 5MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-border bg-surface/30 p-4 relative overflow-hidden flex flex-col items-center justify-center gap-4">
                      <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-black">
                        <img src={previewUrl} alt="Receipt Screenshot" className="w-full h-full object-contain" />
                        <button
                          onClick={() => {
                            setFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-3 right-3 size-8 rounded-full bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-black hover:text-red-400 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-center text-xs text-muted-foreground">
                        File: <span className="text-foreground font-semibold">{file?.name}</span> ({(file!.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  )}

                  {/* Action submit button */}
                  <button
                    onClick={handleSubmitProof}
                    disabled={!file || uploading}
                    className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-50 active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10 cursor-pointer border-none"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Submitting Proof...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} /> Submit Payment Proof
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 3: Satisfying GPay/UPI Success Confirmation Screen */}
              {step === "success" && (
                <div className="space-y-8 py-8 animate-in zoom-in-95 duration-500 text-center relative">
                  {/* Glowing green radial confirmation pulse */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none -z-10 animate-pulse" />

                  {/* Bouncing checkmark bubble */}
                  <div className="mx-auto size-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-bounce duration-1000">
                    <CheckCircle2 className="size-12 text-emerald-400 stroke-[2.5]" />
                  </div>

                  <div className="space-y-3">
                    <h1 className="font-display text-3xl font-extrabold text-foreground tracking-tight">Payment Submitted Successfully</h1>
                    <p className="text-sm text-emerald-400 font-semibold tracking-wider uppercase">Voucher Receipt Processed</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">
                      Your manual UPI payment screenshot has been uploaded and logged securely in HUXZAIN.
                    </p>
                  </div>

                  {/* Verification log status box */}
                  <div className="max-w-sm mx-auto rounded-2xl border border-border bg-surface/20 p-5 text-left text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/20 pb-2">
                      <span>Verification status</span>
                      <span className="text-amber-400 uppercase tracking-widest text-[9px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">Pending Review</span>
                    </div>
                    <p>• Type: <strong className="text-foreground uppercase">{isSubscription ? "Subscription Upgrade" : "Product Listing Purchase"}</strong></p>
                    <p>• Review Duration: <strong>24–48 Hours</strong></p>
                    <p>• Verification: Your status will be automatically updated as soon as verified.</p>
                  </div>

                  {/* Action back home */}
                  <div className="max-w-sm mx-auto">
                    <Link
                      to={isSubscription ? "/seller/subscription" : "/orders"}
                      className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10 border-none cursor-pointer"
                    >
                      OK, Got it
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
