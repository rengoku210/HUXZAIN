import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Crown, AlertCircle, Clock, CheckCircle2, RefreshCw, Upload, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { TierBadge } from "@/components/seller/TierBadge";
import { TIERS, type SellerTier, useSellerTier } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { SignedImage } from "@/components/SignedImage";
import { triggerRoleNotification, submitSubscriptionReupload } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/seller/subscription/")({
  head: () => ({ meta: [{ title: "Subscription — HUXZAIN Seller" }] }),
  component: Page,
});

type PaymentProof = {
  id: string;
  selected_plan: string;
  amount: number;
  status: string;
  rejection_reason?: string | null;
  screenshot_url?: string | null;
  created_at: string;
};

function Page() {
  const { tier } = useSellerTier();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  const [reuploading, setReuploading] = useState(false);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadPreview, setReuploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.size > 15 * 1024 * 1024) {
        toast.error("File is too large (max 15MB).");
        return;
      }
      setReuploadFile(selectedFile);
      setReuploadPreview(URL.createObjectURL(selectedFile));
    }
  };

  async function handleSubscriptionReupload(e: React.FormEvent) {
    e.preventDefault();
    if (!latestProof || !reuploadFile || !user) return;
    const supabase = getSupabase()!;
    setReuploading(true);

    try {
      // 1. Upload screenshot to 'payment-proofs' storage bucket
      const ext = reuploadFile.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/subscriptions/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, reuploadFile, { upsert: true, contentType: reuploadFile.type });

      if (uploadErr) throw uploadErr;

      // 2. Call the server function to update DB rows and notify admin/staff bypassing RLS
      const res = await submitSubscriptionReupload({
        data: {
          userId: user.id,
          latestProofId: latestProof.id,
          filePath,
          selectedPlan: latestProof.selected_plan,
          userEmail: user.email ?? "Unknown Seller",
        }
      });

      if (!res?.success) {
        throw new Error(res?.error || "Server transaction failed");
      }

      toast.success("Subscription payment proof re-submitted successfully!");
      setReuploadFile(null);
      setReuploadPreview(null);
      void fetchProofs();
    } catch (err: any) {
      toast.error("Re-upload failed: " + err.message);
    } finally {
      setReuploading(false);
    }
  }

  async function fetchProofs() {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data: plansData } = await supabase
        .from("subscription_plans_config")
        .select("*");
      if (plansData) {
        setDbPlans(plansData);
      }

      const { data, error } = await supabase
        .from("subscription_payment_proofs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      // If table doesn't exist in dev, we handle gracefully
      if (error) {
        console.warn("[Subscription] Error fetching payment proofs (table might be missing):", error);
        setProofs([]);
      } else {
        setProofs(data as PaymentProof[]);
      }
    } catch (err) {
      console.warn("[Subscription] Fetch proofs exception:", err);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProofs();
  }, [user]);

  // Find latest proof
  const latestProof = proofs[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You're on the <span className="text-gold font-semibold">{TIERS[tier].label}</span> plan.
            Upgrade any time to unlock premium features and increase visibility.
          </p>
        </div>
        <button
          onClick={fetchProofs}
          disabled={loading}
          className="h-9 px-3 text-xs rounded-xl border border-border bg-surface/30 hover:bg-surface text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Status
        </button>
      </div>

      {/* Seller-Side Payment Status Tracking Banner */}
      {latestProof && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          {latestProof.status === "pending" && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="size-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-amber-400 text-sm">Upgrade Verification Under Review</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your payment proof for the <span className="text-gold font-semibold uppercase">{latestProof.selected_plan}</span> plan (₹{Number(latestProof.amount).toFixed(2)}) is currently under manual review. Verification may take 24–48 hours. Your subscription will be activated automatically once approved.
                </p>
              </div>
            </div>
          )}

          {latestProof.status === "approved" && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="size-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-emerald-400 text-sm">Subscription Active!</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your manual payment proof has been verified. Your <span className="text-gold font-semibold uppercase">{latestProof.selected_plan}</span> subscription has been activated successfully!
                </p>
              </div>
            </div>
          )}

          {latestProof.status === "rejected" && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-red-400 text-sm">Payment Verification Failed</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your payment could not be verified. Please upload a valid payment proof.
                </p>
                {latestProof.rejection_reason && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/10 text-xs text-red-400 font-mono">
                    <strong>Reason for rejection:</strong> {latestProof.rejection_reason}
                  </div>
                )}
              </div>
            </div>
          )}

          {(latestProof.status === "reupload_requested" || latestProof.status === "REUPLOAD_REQUIRED") && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertCircle className="size-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-amber-400 text-sm font-display">Re-upload Required</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    The reviewer requested a new screenshot of your manual UPI payment.
                  </p>
                  {latestProof.rejection_reason && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/10 text-xs text-amber-400 font-mono">
                      <strong>Reason for request:</strong> "{latestProof.rejection_reason}"
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="border-t border-b border-border/40 py-3 my-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider px-2">
                  <span className="text-gold font-bold">1. Initiated</span>
                  <span className="text-amber-500 font-bold font-sans">2. Re-upload Required</span>
                  <span>3. Re-submitted</span>
                  <span>4. Verified</span>
                </div>
                <div className="w-full bg-surface h-1 mt-2 rounded-full overflow-hidden flex">
                  <div className="bg-gold h-full w-1/3" />
                  <div className="bg-amber-500 h-full w-1/3" />
                  <div className="bg-border h-full w-1/3" />
                </div>
              </div>

              {/* Version History & Upload Interface */}
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-2">Previous Evidence Preview</h4>
                  <div className="relative rounded-xl overflow-hidden border border-border bg-black/40 h-40 flex items-center justify-center">
                    <SignedImage
                      path={latestProof.screenshot_url}
                      bucket="payment-proofs"
                      className="w-full h-full object-contain"
                      alt="Previous Payment Screenshot"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Upload New Screenshot</h4>
                  {!reuploadFile ? (
                    <div
                      className="border-2 border-dashed border-border/60 hover:border-gold/50 rounded-xl p-5 text-center bg-surface/20 hover:bg-gold/5 cursor-pointer h-28 flex flex-col justify-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-6 text-muted-foreground mx-auto mb-1.5" />
                      <p className="text-xs font-semibold">Replace Screenshot</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-black h-28">
                      <img src={reuploadPreview || ""} alt="New Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setReuploadFile(null);
                          setReuploadPreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/80 rounded-full border border-white/10"
                      >
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubscriptionReupload}
                    disabled={reuploading || !reuploadFile}
                    className="w-full h-9 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                  >
                    {reuploading ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" /> Uploading New Screenshot...
                      </>
                    ) : (
                      <>
                        <Upload size={12} /> Submit Replacement Screenshot
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {order.map((t) => {
          const m = TIERS[t];
          const current = t === tier;
          const upgradable = TIERS[t].rank > TIERS[tier].rank;
          const isPendingThisPlan = latestProof?.status === "pending" && latestProof.selected_plan.toLowerCase() === t.toLowerCase();

          return (
            <div
              key={t}
              className={`relative rounded-2xl border p-6 flex flex-col overflow-hidden transition-all duration-300 ${
                current ? "border-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.05)] bg-surface/20" : "border-border bg-surface/10 hover:border-border/80"
              }`}
              style={{ background: m.surfaceGradient, boxShadow: current ? m.glow : undefined }}
            >
              <div
                className="absolute -right-16 -top-16 size-40 rounded-full opacity-10 pointer-events-none"
                style={{
                  background: `radial-gradient(closest-side, oklch(0.82 0.13 82), transparent)`,
                }}
              />
              <div className="relative flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <TierBadge tier={t} size="sm" />
                    {current && (
                      <span className="text-[10px] text-gold uppercase tracking-wider font-bold">
                        Current Plan
                      </span>
                    )}
                  </div>
                  {(() => {
                    const dbPlan = dbPlans.find((p) => p.id === t);
                    const monthlyPrice = dbPlan ? dbPlan.monthly_price_inr : m.monthly;
                    return (
                      <div className="mt-4 font-display text-3xl font-bold text-foreground">
                        {monthlyPrice === 0 ? "Free" : `₹${monthlyPrice.toLocaleString()}`}
                        <span className="text-sm font-normal text-muted-foreground font-sans">/mo</span>
                      </div>
                    );
                  })()}
                  <div className="text-xs text-muted-foreground mt-2">{m.tagline}</div>

                  <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                    {m.unlocked.map((u) => (
                      <li key={u} className="flex items-start gap-2 text-left">
                        <Check size={14} className="text-gold mt-0.5 shrink-0" /> <span>{u}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Platform Commission Rate Badge */}
                  <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="size-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <span className="text-gold text-[9px] font-bold">%</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white">
                        {m.commission_rate}% Platform Fee
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        HUXZAIN retains {m.commission_rate}% of each completed sale
                      </div>
                    </div>
                  </div>
                </div>


                <div className="mt-8 pt-4 border-t border-border/20">
                  {current ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-xl border border-border/40 text-xs text-muted-foreground cursor-not-allowed bg-surface/5"
                    >
                      Active Plan
                    </button>
                  ) : isPendingThisPlan ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-xl border border-amber-500/30 text-xs text-amber-500/80 cursor-not-allowed bg-amber-500/5 flex items-center justify-center gap-1.5"
                    >
                      <Clock size={12} className="animate-spin" /> Pending Approval
                    </button>
                  ) : upgradable ? (
                    <button
                      onClick={() => {
                        navigate({ to: "/seller/subscription/payment" as any, search: { plan: t } as any });
                      }}
                      className="w-full h-10 rounded-xl font-semibold text-xs text-black hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5"
                      style={{ background: m.badgeGradient }}
                    >
                      <Crown size={12} /> Upgrade to {m.label}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full h-10 rounded-xl border border-border text-xs hover:bg-surface/50 text-muted-foreground"
                    >
                      Downgrade Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PanelCard title="Manual UPI Billing Info">
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Billing Method</div>
            <div className="mt-1 font-semibold">QR Code Manual UPI Transfer</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status Verification</div>
            <div className="mt-1 text-amber-400 font-semibold inline-flex items-center gap-1">
              Manual Check (24–48h)
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Verification History</div>
            <button
              onClick={fetchProofs}
              className="mt-1 text-gold hover:underline inline-block text-left text-xs bg-transparent border-none cursor-pointer"
            >
              Reload history logs
            </button>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

const order: SellerTier[] = ["standard", "pro", "elite", "enterprise"];
