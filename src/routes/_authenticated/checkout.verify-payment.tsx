import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ShieldCheck,
  Smartphone,
  Copy,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/marketplace/listing-adapter";
import { uploadPaymentProof } from "@/lib/payments/paymentUploadService";
import { createVerification } from "@/lib/payments/verificationQueueService";
import { onPaymentSubmitted } from "@/lib/notifications/hooks";

export const Route = createFileRoute("/_authenticated/checkout/verify-payment")({
  head: () => ({ meta: [{ title: "Complete Payment - HUXZAIN" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: String(search.orderId ?? ""),
    listingId: String(search.listingId ?? ""),
    price: String(search.price ?? "0"),
  }),
  component: VerifyPayment,
});

type FlowStep = "pay" | "submitting" | "done";
type OrderSummary = {
  id: string;
  amount_inr?: number;
  amount_total?: number;
  currency: string;
  listing_id: string;
  seller_id: string;
  listings?: { title?: string | null; cover_image_url?: string | null } | null;
};

function VerifyPayment() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const orderId = search.orderId;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [step, setStep] = useState<FlowStep>("pay");
  const [paymentNote, setPaymentNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  
  const fallbackPrice = parseFloat(search.price || "0");
  const price = order?.amount_inr ?? order?.amount_total ?? fallbackPrice;
  const displayPrice = formatPrice(price);
  const paymentAddress = `HUXZAIN-PAY-${orderId || "ORDER"}`;

  useEffect(() => {
    if (!orderId || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase
      .from("orders")
      .select("id, amount_inr, currency, listing_id, seller_id, listings:listing_id(title, cover_image_url)")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => setOrder((data as OrderSummary | null) ?? null));
  }, [orderId, user]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const [submissionStatus, setSubmissionStatus] = useState("");

  async function handleSubmit() {
    if (!file || !orderId || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setSubmitting(true);
    setUploadErrorMsg(null);
    setSubmissionStatus("Initializing secure upload channel...");
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 1. Upload proof image
      setSubmissionStatus("Uploading payment proof to cloud vault...");
      const uploadResult = await uploadPaymentProof({
        file,
        userId: user.id,
        orderId: orderId,
        signal: controller.signal,
      });

      // 2. Create verification record (handles fallback to payment_events)
      setSubmissionStatus("Analyzing transaction and running security checks...");
      const verification = await createVerification({
        userId: user.id,
        orderId: orderId,
        uploadResult,
      });

      // 3. Update transaction status
      setSubmissionStatus("Registering payment receipt...");
      await supabase
        .from("transactions")
        .update({ ref: `manual:${orderId}`, status: "submitted" })
        .eq("order_id", orderId)
        .eq("user_id", user.id);

      // HX-006: buyer acknowledgement + payment-verification queue for staff.
      try {
        await onPaymentSubmitted(orderId, user.id);
      } catch (notifEx) {
        console.warn("[VerifyPayment] Payment-submitted notification non-blocking exception:", notifEx);
      }

      setVerificationId(verification.id);
      setStep("done");
      toast.success("Payment verification submitted successfully.");
    } catch (e: any) {
      if (e.name === "AbortError" || e.message?.includes("aborted") || e.message?.includes("cancelled")) {
        setUploadErrorMsg("Upload cancelled.");
        toast.error("Upload cancelled.");
      } else {
        setUploadErrorMsg(e.message || "Something went wrong.");
        toast.error(`Submission failed: ${e.message}`);
      }
    } finally {
      setSubmitting(false);
      setAbortController(null);
      setSubmissionStatus("");
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6 py-16">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="size-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-12 text-green-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Payment Submitted</h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Your payment proof is linked to the order and will be reviewed by admin.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <code className="text-gold text-xs">{orderId.slice(0, 16)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verification</span>
                <code className="text-gold text-xs">{verificationId.slice(0, 16)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-yellow-400">
                  <Clock className="size-3.5" /> Pending
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/orders"
                className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 inline-flex items-center justify-center"
              >
                View Orders
              </Link>
              <Link
                to="/"
                className="flex-1 h-11 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-3">
            {["Scan & Pay", "Upload Proof", "Review"].map((label, i) => (
              <div key={label} className="flex items-center gap-3 flex-1">
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? "bg-gold text-black" : i === 1 ? "border-2 border-gold text-gold" : "border border-border text-muted-foreground"}`}
                >
                  {i + 1}
                </div>
                <span className="text-sm whitespace-nowrap text-muted-foreground">{label}</span>
                {i < 2 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                Order Summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <code className="text-gold text-xs">
                    {orderId ? orderId.slice(0, 12) : "missing"}
                  </code>
                </div>
                {order?.listings?.title && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Item</span>
                    <span className="text-right">{order.listings.title}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-gold">{displayPrice}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Manual Payment
              </p>
              <div className="w-40 h-40 mx-auto rounded-xl border-2 border-gold/40 bg-black p-2 relative overflow-hidden flex items-center justify-center">
                <Smartphone className="size-16 text-gold/60" />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(paymentAddress);
                  toast.success("Payment reference copied.");
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
              >
                <Copy className="size-3" /> Copy payment reference
              </button>
            </div>

            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 flex gap-3">
              <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Funds are tracked against this order until verification and delivery are complete.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 p-5 h-fit">
            <h1 className="font-display text-2xl font-bold mb-1">Upload Payment Proof</h1>
            <p className="text-xs text-muted-foreground mb-4">
              Upload your receipt screenshot to complete payment.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Payment note (optional)
              </label>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Add any note about this payment (optional)."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Payment Screenshot
              </label>
              {!file ? (
                <div
                  className="border-2 border-dashed border-border/60 hover:border-gold/50 rounded-xl p-6 text-center bg-surface/20 hover:bg-gold/5 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Upload Screenshot</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black h-36">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full border border-white/15"
                  >
                    <X className="size-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground mb-4">
              <AlertCircle className="size-4 text-gold shrink-0 mt-0.5" />
              <span>Make sure the amount and transaction number are visible.</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !file || !orderId}
              className="w-full h-12 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Upload & Verify
                </>
              )}
            </button>
            {submitting && submissionStatus && (
              <p className="text-[11px] text-muted-foreground text-center animate-pulse mt-2 font-mono">
                {submissionStatus}
              </p>
            )}
            {submitting && (
              <button
                type="button"
                onClick={() => {
                  if (abortController) {
                    abortController.abort();
                  }
                }}
                className="w-full mt-2 h-12 rounded-xl border border-border text-sm hover:border-gold/40 inline-flex items-center justify-center bg-transparent cursor-pointer"
              >
                Cancel
              </button>
            )}
            {uploadErrorMsg && (
              <div className="text-red-500 text-xs mt-2 text-center font-medium">
                {uploadErrorMsg}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
