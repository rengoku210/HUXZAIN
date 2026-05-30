import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { 
  ArrowLeft, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { TIERS, type SellerTier } from "@/lib/seller/tier-context";
import { toast } from "sonner";
import { extractPaymentDetails } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/seller/subscription/payment")({
  validateSearch: (s: Record<string, unknown>): { plan?: string } => ({
    plan: s.plan ? String(s.plan) : undefined,
  }),
  head: () => ({ meta: [{ title: "Subscription Payment — HUXZAIN" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { plan } = Route.useSearch() as any;
  const { user } = useAuth();
  const navigate = useNavigate();

  // Validate selected plan (strip any enclosing quotes from JSON-serialized URL query format)
  const selectedPlanId = (plan?.replace(/"/g, "")?.toLowerCase() || "pro") as SellerTier;
  const planMeta = TIERS[selectedPlanId] || TIERS.pro;

  const [step, setStep] = useState<"pay" | "upload" | "success">("pay");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Max size is 5MB.");
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
      toast.error("Please upload your payment screenshot first.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !user) {
      toast.error("Database connection not configured.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload screenshot to 'payment-proofs' storage bucket
      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/subscriptions/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        // Fallback to 'listing-images' bucket if 'payment-proofs' bucket does not exist
        console.warn("[Subscription Checkout] Error uploading to payment-proofs bucket, trying listing-images fallback:", uploadErr.message);
        const { data: fallbackData, error: fallbackErr } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { upsert: true, contentType: file.type });
          
        if (fallbackErr) throw fallbackErr;
      }

      // Get public URL
      const bucketName = uploadErr ? "listing-images" : "payment-proofs";
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const screenshotUrl = urlData.publicUrl;

      // Run OCR extraction via backend to avoid browser CORS issues
      let ocrDataString = null;
      try {
        console.log("[Subscription Checkout] Running OCR extraction...");
        const ocrPromise = extractPaymentDetails({ data: screenshotUrl });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("OCR timeout")), 5000));
        const ocrData = await Promise.race([ocrPromise, timeoutPromise]) as any;
        if (ocrData) {
          ocrDataString = JSON.stringify(ocrData);
        }
      } catch (err) {
        console.warn("[Subscription Checkout] OCR extraction failed non-fatally:", err);
      }

      // 2. Insert record into subscription_payment_proofs
      const payload = {
        user_id: user.id,
        selected_plan: planMeta.label,
        amount: planMeta.monthly,
        screenshot_url: screenshotUrl,
        status: "pending",
        ai_reason: ocrDataString,
      };

      const { error: insertErr } = await supabase
        .from("subscription_payment_proofs")
        .insert(payload);

      if (insertErr) throw insertErr;

      // Move to success animation screen
      setStep("success");
      toast.success("Payment proof submitted successfully!");
    } catch (err: any) {
      console.error("[Subscription Checkout] Submission error:", err);
      toast.error(`Submission failed: ${err.message ?? "Unknown database error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 px-2">
      {/* Back button */}
      {step !== "success" && (
        <button
          onClick={() => {
            if (step === "upload") setStep("pay");
            else navigate({ to: "/seller/subscription" });
          }}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {/* STEP 1: Pay UPI & QR Code */}
      {step === "pay" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Manual QR Code Checkout</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Securely upgrade to the <span className="text-gold font-bold uppercase">{planMeta.label}</span> tier.
            </p>
          </div>

          {/* Pricing Details Panel */}
          <div className="rounded-2xl border border-border bg-surface/20 p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Selected Plan</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{planMeta.label} Subscription</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount Payable</div>
              <div className="text-2xl font-display font-extrabold text-gold mt-0.5">₹{planMeta.monthly}</div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="rounded-3xl border border-border bg-surface/40 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
            
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/20 font-semibold mb-2">
                <ShieldCheck size={12} /> UPI Verified Gateway
              </span>
              <p className="text-xs text-muted-foreground">Scan QR code using Google Pay, PhonePe, UPI, or Paytm</p>
            </div>

            {/* UPI QR Code Image (styled nicely) */}
            <div className="relative p-3 rounded-2xl border border-gold/30 bg-white shadow-2xl flex items-center justify-center w-52 h-52 group overflow-hidden">
              {/* Dynamic QR API that generates a working UPI QR Code tailored to their UPI ID */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=rammodhvadiya210@okaxis&pn=HUXZAIN&am=${planMeta.monthly}&cu=INR&tn=Huxzain%20${planMeta.label}%20Subscription`)}`}
                alt="UPI QR Code" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none" />
            </div>

            {/* UPI Payee ID Details */}
            <div className="mt-4 text-center">
              <span className="text-xs text-muted-foreground font-mono bg-surface px-3 py-1.5 rounded-xl border border-border/80">
                UPI ID: <span className="text-foreground font-semibold">rammodhvadiya210@okaxis</span>
              </span>
            </div>
          </div>

          {/* Payment Notice Section */}
          <div className="rounded-2xl border border-border bg-surface/25 p-5 flex gap-4">
            <Info className="size-5 text-gold shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">Important Payment Instructions</h4>
              <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                <li>Please pay the exact amount: <span className="text-gold font-bold">₹{planMeta.monthly}</span></li>
                <li>Do not modify the amount or pay less/more than specified.</li>
                <li>Payments are manually verified after screenshot upload.</li>
                <li>Verification may take **24–48 hours** by our staff.</li>
                <li>Keep proof screenshot safe until verification completes.</li>
              </ul>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setStep("upload")}
            className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10"
          >
            I've Paid / Confirm Payment <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* STEP 2: Screenshot Proof Upload */}
      {step === "upload" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Upload Payment Proof</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Please submit a screenshot of your successful transaction to activate your plan.
            </p>
          </div>

          {/* Drag & Drop File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
          />

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
                <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPEG, JPG (Max 5MB)</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-surface/30 p-4 relative overflow-hidden flex flex-col items-center justify-center gap-4">
              <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-black">
                <img src={previewUrl} alt="Screenshot preview" className="w-full h-full object-contain" />
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-3 right-3 size-8 rounded-full bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-black hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Loaded: <span className="text-foreground font-semibold">{file?.name}</span> ({(file!.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}

          {/* Action Submit */}
          <button
            onClick={handleSubmitProof}
            disabled={!file || uploading}
            className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-50 active:scale-98 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10"
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
          {/* Animated green success pulse background */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none -z-10" />

          {/* Checkmark bubble */}
          <div className="mx-auto size-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.15)] animate-bounce duration-1000">
            <CheckCircle2 className="size-12 text-emerald-400 stroke-[2.5]" />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold text-foreground tracking-tight">Payment Submitted</h1>
            <p className="text-sm text-emerald-400 font-semibold tracking-wider uppercase">Voucher Code Verified & Logged</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">
              Your UPI payment screenshot has been uploaded and logged in our system.
            </p>
          </div>

          {/* Notice log container */}
          <div className="max-w-sm mx-auto rounded-2xl border border-border bg-surface/20 p-5 text-left text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/20 pb-2">
              <span>Receipt status</span>
              <span className="text-amber-400 uppercase tracking-widest text-[9px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Pending Review</span>
            </div>
            <p>• Plan Chosen: <strong className="text-foreground uppercase">{planMeta.label}</strong></p>
            <p>• Review Duration: <strong>24–48 Hours</strong></p>
            <p>• Verification: Your seller privileges will be automatically updated as soon as verified.</p>
          </div>

          {/* Action Back Button */}
          <div className="max-w-sm mx-auto">
            <Link
              to="/seller/subscription"
              className="w-full h-12 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-gold/10"
            >
              OK, Got it
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
