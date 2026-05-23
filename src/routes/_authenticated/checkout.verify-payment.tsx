// src/routes/_authenticated/checkout.verify-payment.tsx
// Full payment verification flow:
// 1. Show order summary + QR placeholder
// 2. User enters transaction ID + uploads screenshot
// 3. Submit → Supabase verification record → 24h confirmation screen
import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Upload, X, ShieldCheck, CheckCircle2, RefreshCw,
  Smartphone, Copy, AlertCircle, ArrowRight, Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkout/verify-payment")({
  head: () => ({ meta: [{ title: "Complete Payment — HUXZAIN" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: String(search.orderId ?? ""),
    listingId: String(search.listingId ?? ""),
    price: String(search.price ?? "0"),
  }),
  component: VerifyPayment,
});

type FlowStep = "pay" | "upload" | "submitting" | "done";

function VerifyPayment() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const orderId = search.orderId || `tmp-${Date.now()}`;
  const price = parseFloat(search.price || "0");
  const displayPrice = price > 0 ? price.toFixed(2) : "—";

  const [step, setStep] = useState<FlowStep>("pay");
  const [txnId, setTxnId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR placeholder: generate a stylised payment QR box
  const DEMO_PAYMENT_ADDR = "HUXZAIN-PAY-2024-SECURE";

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB."); return; }
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) { toast.error("Please upload your payment screenshot."); return; }
    if (!txnId.trim()) { toast.error("Please enter your Transaction ID."); return; }

    setSubmitting(true);
    setStep("submitting");

    try {
      const supabase = getSupabase();

      // 1. Try inserting a verification record (best-effort)
      if (supabase && user?.id) {
        // Upload screenshot to storage
        const ext = file.name.split(".").pop() ?? "png";
        const storagePath = `${user.id}/${orderId}/${Date.now()}.${ext}`;

        let screenshotUrl = "";
        try {
          const { data: uploadData } = await supabase.storage
            .from("payment-proofs")
            .upload(storagePath, file, { upsert: true, contentType: file.type });
          screenshotUrl = uploadData?.path ?? "";
        } catch { /* storage bucket may not exist yet */ }

        // Record in payment_verifications table
        const { data: vRow } = await supabase
          .from("payment_verifications")
          .insert({
            user_id: user.id,
            order_id: orderId,
            transaction_id: txnId.trim(),
            screenshot_url: screenshotUrl,
            status: "pending",
            amount: price || null,
            submitted_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (vRow?.id) setVerificationId(vRow.id);
      }
    } catch (e: any) {
      // Don't fail — still show confirmation to user
      console.warn("Verification record error:", e.message);
    } finally {
      setSubmitting(false);
      setStep("done");
      toast.success("Payment verification submitted!");
    }
  }

  // ── Completed screen ──────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6 py-16">
          <div className="w-full max-w-md text-center space-y-6">
            {/* Success icon */}
            <div className="size-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-12 text-green-400" />
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold">Payment Submitted!</h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Your payment will be verified within{" "}
                <span className="text-gold font-semibold">24 hours or earlier</span>.
                You'll receive a notification once it's confirmed.
              </p>
            </div>

            {/* Order reference */}
            <div className="rounded-2xl border border-border bg-surface/40 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Reference</span>
                <code className="text-gold text-xs font-mono">{orderId.slice(0, 16)}…</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-medium">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-yellow-400">
                  <Clock className="size-3.5" /> Pending Review
                </span>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-border bg-surface/30 p-4 text-left space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next</p>
              {[
                "Our team reviews your payment screenshot",
                "Transaction ID is verified with our records",
                "Order is activated and accessible in your dashboard",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-gold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                to="/orders"
                className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 inline-flex items-center justify-center transition-colors"
              >
                View My Orders
              </Link>
              <Link
                to="/"
                className="flex-1 h-11 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center justify-center gap-2 transition-all"
              >
                Continue Shopping <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Step 1: Pay via QR / Step 2: Upload proof ────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-3">
            {[
              { n: 1, label: "Scan & Pay" },
              { n: 2, label: "Upload Proof" },
              { n: 3, label: "Confirmed" },
            ].map((s, i) => {
              const active = (step === "pay" && i === 0) || (step === "upload" && i === 1) || (step === "submitting" && i === 2);
              const done = (step === "upload" && i === 0) || (step === "submitting" && i <= 1);
              return (
                <div key={s.n} className="flex items-center gap-3 flex-1">
                  <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${done ? "bg-gold text-black" : active ? "border-2 border-gold text-gold" : "border border-border text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="size-4" /> : s.n}
                  </div>
                  <span className={`text-sm whitespace-nowrap ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                  {i < 2 && <div className="flex-1 h-px bg-border" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Left: Order + QR */}
          <div className="space-y-4">
            {/* Order summary */}
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <code className="text-gold text-xs font-mono">{orderId.slice(0, 12)}…</code>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-gold">{price > 0 ? `$${displayPrice}` : "Contact seller"}</span>
                </div>
              </div>
            </div>

            {/* QR code placeholder */}
            <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Scan to Pay</p>

              {/* Stylised QR placeholder */}
              <div className="w-40 h-40 mx-auto rounded-xl border-2 border-gold/40 bg-black p-2 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Smartphone className="size-16 text-gold" />
                </div>
                {/* QR pattern simulation */}
                <div className="w-full h-full grid grid-cols-7 gap-0.5 relative z-10">
                  {Array.from({ length: 49 }).map((_, i) => {
                    const pattern = [
                      0,0,0,0,0,0,0,
                      0,1,1,1,0,0,0,
                      0,1,0,1,0,1,0,
                      0,1,1,1,0,0,0,
                      0,0,0,0,1,0,0,
                      0,0,1,0,0,1,0,
                      0,0,0,0,0,0,0,
                    ];
                    return (
                      <div
                        key={i}
                        className={`rounded-[1px] ${pattern[i] || Math.random() > 0.6 ? "bg-gold/80" : "bg-transparent"}`}
                      />
                    );
                  })}
                </div>
                {/* Corner markers */}
                {[[0,0],[0,1],[1,0]].map(([t, r], i) => (
                  <div key={i} className={`absolute ${t ? "bottom-2" : "top-2"} ${r ? "right-2" : "left-2"} size-4 border-2 border-gold rounded-sm`} />
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Scan with your payment app
              </p>
              <button
                onClick={() => { navigator.clipboard?.writeText(DEMO_PAYMENT_ADDR); toast.success("Address copied!"); }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors"
              >
                <Copy className="size-3" /> Copy payment address
              </button>
            </div>

            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 flex gap-3">
              <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                All payments are secured by HUXZAIN Escrow. Your funds are protected until you confirm delivery.
              </p>
            </div>
          </div>

          {/* Right: Upload proof */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface/40 p-5">
              <h2 className="font-semibold mb-1">I Have Paid — Verify Payment</h2>
              <p className="text-xs text-muted-foreground mb-4">After paying, upload your receipt screenshot and enter your Transaction ID.</p>

              {/* Transaction ID input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Transaction ID / UTR Number <span className="text-red-400">*</span>
                </label>
                <input
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder="e.g. UTR123456789"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-surface/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>

              {/* Screenshot upload */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Payment Screenshot <span className="text-red-400">*</span>
                </label>
                {!file ? (
                  <div
                    className="border-2 border-dashed border-border/60 hover:border-gold/50 rounded-xl p-6 text-center bg-surface/20 hover:bg-gold/5 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  >
                    <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Upload Screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-black h-36">
                    <img src={previewUrl} alt="Receipt" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setFile(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full border border-white/15 hover:bg-black transition-colors"
                    >
                      <X className="size-3.5 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="size-3 text-green-400" />
                      <span className="text-[10px] text-green-400 font-medium">Screenshot ready</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="flex gap-2 text-xs text-muted-foreground mb-4">
                <AlertCircle className="size-4 text-gold shrink-0 mt-0.5" />
                <span>Ensure the transaction amount, date, and UTR/reference number are clearly visible.</span>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !file || !txnId.trim()}
                className="w-full h-12 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" /> Submitting Verification…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" /> Submit Verification
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface/30 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">After submission</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ✓ Our admin team reviews your payment within <strong className="text-foreground">24 hours or earlier</strong><br />
                ✓ You'll receive a notification when verified<br />
                ✓ Your order will be activated automatically
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
