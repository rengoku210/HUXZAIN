import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { BadgeCheck, Upload, Shield, Mail, Phone, FileText, UserSquare2, Wallet, RefreshCw, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { submitKYCVerification } from "@/lib/seller/subscription.functions";
import { toast } from "sonner";

const govtIdTypes = [
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "national_id", label: "National ID Card" }
];

export const Route = createFileRoute("/_authenticated/seller/verification")({
  head: () => ({ meta: [{ title: "Verification — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user, profile, refreshUserMeta } = useAuth();
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload States
  const [govtFile, setGovtFile] = useState<string>("");
  const [govtFile2, setGovtFile2] = useState<string>("");
  const [selfieFile, setSelfieFile] = useState<string>("");
  const [addrFile, setAddrFile] = useState<string>("");
  
  const [govtIdType1, setGovtIdType1] = useState<string>("");
  const [govtIdType2, setGovtIdType2] = useState<string>("");
  
  // Payout Verification Form States
  // Bank transfer is the only supported payout method. UPI payouts were removed per platform policy.
  const payoutMethod = "bank_transfer" as const;
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Verified Seller Badge States
  const [badgeSub, setBadgeSub] = useState<any>(null);
  const [badgeProof, setBadgeProof] = useState<any>(null);
  const [badgePlan, setBadgePlan] = useState<"monthly" | "6months" | "yearly">("monthly");
  const [badgePayStep, setBadgePayStep] = useState<"plans" | "pay" | "upload" | "pending">("plans");
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgePreviewUrl, setBadgePreviewUrl] = useState<string | null>(null);
  const [badgeUtr, setBadgeUtr] = useState("");
  const [badgeUploading, setBadgeUploading] = useState(false);
  const isSubmittingBadgeRef = useRef(false);
  const isSubmittingKYCRef = useRef(false);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        // Fetch verifications
        const { data, error } = await supabase
          .from("verifications")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("Error loading verification details:", error);
        if (data) {
          setVerification(data);
          if (data.government_id_type_1) setGovtIdType1(data.government_id_type_1);
          if (data.government_id_type_2) setGovtIdType2(data.government_id_type_2);
          if (data.payout_details) {
            const pd = data.payout_details;
            // Bank transfer only — UPI payout fields are no longer loaded into the form.
            if (pd.accountHolder) setAccountHolder(pd.accountHolder);
            if (pd.accountNumber) setAccountNumber(pd.accountNumber);
            if (pd.ifscCode) setIfscCode(pd.ifscCode);
          }
        }

        // Fetch badge subscriptions
        const { data: bSub } = await supabase
          .from("badge_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setBadgeSub(bSub);

        // Fetch badge payment proofs
        const { data: bProof } = await supabase
          .from("payment_proofs")
          .select("*")
          .eq("buyer_id", user.id)
          .eq("payment_type", "badge")
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (bProof && bProof.length > 0) {
          setBadgeProof(bProof[0]);
          if (bSub && bSub.status === "active") {
            setBadgePayStep("plans");
          } else if (bProof[0].status === "pending") {
            setBadgePayStep("pending");
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed to load verifications:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleFileRead(file: File, type: "govt" | "govt2" | "selfie" | "addr") {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload JPG, PNG, or PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "govt") setGovtFile(reader.result as string);
        else if (type === "govt2") setGovtFile2(reader.result as string);
        else if (type === "selfie") setSelfieFile(reader.result as string);
        else setAddrFile(reader.result as string);
        toast.success(
          `${
            type === "govt"
              ? "Government ID 1"
              : type === "govt2"
                ? "Government ID 2"
                : type === "selfie"
                  ? "Selfie Photo"
                  : "Address Proof"
          } loaded successfully!`
        );
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("File parsing failed: " + err.message);
    }
  }

  async function handleSubmit() {
    if (isSubmittingKYCRef.current) return;
    if (!user) return;
    if (!govtFile && !verification?.government_id_url) {
      toast.error("Please upload your first government ID.");
      return;
    }
    if (!govtIdType1) {
      toast.error("Please select a document type for your first government ID.");
      return;
    }
    if (!govtFile2 && !verification?.government_id_2_url) {
      toast.error("Please upload your second government ID.");
      return;
    }
    if (!govtIdType2) {
      toast.error("Please select a document type for your second government ID.");
      return;
    }
    if (govtIdType1 === govtIdType2) {
      toast.error("The two government IDs must be of different types.");
      return;
    }
    if (!selfieFile && !verification?.selfie_url) {
      toast.error("Please upload a selfie photo.");
      return;
    }
    if (!addrFile && !verification?.address_proof_url) {
      toast.error("Please upload an address proof.");
      return;
    }
    if (!accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error("Please complete all bank transfer details.");
      return;
    }

    try {
      isSubmittingKYCRef.current = true;
      setSubmitting(true);
      
      await submitKYCVerification({
        data: {
          sellerId: user.id,
          govtIdUrl: govtFile || verification?.government_id_url || "",
          govtIdType1,
          govtIdType2,
          govtId2Url: govtFile2 || verification?.government_id_2_url || "",
          selfieUrl: selfieFile || verification?.selfie_url || "",
          addressProofUrl: addrFile || verification?.address_proof_url || "",
          payoutDetails: {
            method: payoutMethod,
            accountHolder: accountHolder.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            upiId: ""
          }
        }
      });

      toast.success("Verification documents and payout details submitted! Usually reviewed within 24–48 hours.");
      setGovtFile("");
      setGovtFile2("");
      setSelfieFile("");
      setAddrFile("");
      await loadData();
    } catch (err: any) {
      toast.error("Verification submission failed: " + err.message);
    } finally {
      isSubmittingKYCRef.current = false;
      setSubmitting(false);
    }
  }

  const handleBadgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("Unsupported file type. Please upload JPG, PNG, or PDF.");
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Max size is 5MB.");
        return;
      }
      setBadgeFile(selectedFile);
      setBadgePreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const submitBadgeProof = async () => {
    if (isSubmittingBadgeRef.current) return;
    if (!badgeFile) {
      toast.error("Please upload your payment screenshot first.");
      return;
    }
    if (!badgeUtr.trim()) {
      toast.error("Please enter the UTR/Reference number.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !user) {
      toast.error("Database connection not configured.");
      return;
    }

    try {
      isSubmittingBadgeRef.current = true;
      setBadgeUploading(true);

      const ext = badgeFile.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/badge/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, badgeFile, { upsert: true, contentType: badgeFile.type });

      // Badge payment proofs are financial data: keep them in the private
      // payment-proofs bucket with no public fallback. Store the in-bucket path.
      if (uploadErr) {
        throw new Error("Failed to upload payment proof. Please try again. (" + uploadErr.message + ")");
      }

      const screenshotUrl = filePath;

      const prices = {
        monthly: 499,
        "6months": 2399,
        yearly: 3999,
      };
      const price = prices[badgePlan];

      const unifiedPayload = {
        buyer_id: user.id,
        user_id: user.id,
        order_id: null,
        listing_id: null,
        payment_type: "badge",
        amount: price,
        utr_reference: badgeUtr.trim(),
        screenshot_url: screenshotUrl,
        payment_reference: `badge:${badgePlan}`,
        status: "pending",
      };

      const { error: proofErr } = await supabase.from("payment_proofs").insert(unifiedPayload);
      if (proofErr) throw proofErr;

      toast.success("Verification badge payment proof submitted!");
      setBadgeFile(null);
      setBadgePreviewUrl(null);
      setBadgeUtr("");
      setBadgePayStep("pending");
      await loadData();
    } catch (err: any) {
      console.error("[Badge Purchase] Error:", err);
      toast.error(`Submission failed: ${err.message ?? "Unknown database error"}`);
    } finally {
      isSubmittingBadgeRef.current = false;
      setBadgeUploading(false);
    }
  };
  function getDocStatus(
    localFile: string, 
    dbUrl: string | null | undefined, 
    dbStatus: string | null | undefined
  ): "NOT_STARTED" | "UPLOADED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" {
    if (localFile) return "UPLOADED";
    if (!dbUrl) return "NOT_STARTED";
    if (dbStatus === "approved" || dbStatus === "APPROVED") return "APPROVED";
    if (dbStatus === "rejected" || dbStatus === "REJECTED") return "REJECTED";
    if (dbStatus === "under_review" || dbStatus === "UNDER_REVIEW" || dbStatus === "pending") return "UNDER_REVIEW";
    return "UNDER_REVIEW";
  }

  const govtStatus = getDocStatus(govtFile, verification?.government_id_url, verification?.government_id_status);
  const govtStatus2 = getDocStatus(govtFile2, verification?.government_id_2_url, verification?.government_id_2_status);
  const selfieStatus = getDocStatus(selfieFile, verification?.selfie_url, verification?.selfie_status);
  const addrStatus = getDocStatus(addrFile, verification?.address_proof_url, verification?.address_proof_status);

  let approvedCount = 0;
  if (govtStatus === "APPROVED") approvedCount++;
  if (govtStatus2 === "APPROVED") approvedCount++;
  if (selfieStatus === "APPROVED") approvedCount++;
  if (addrStatus === "APPROVED") approvedCount++;

  const progressPercent = verification?.status === "approved" ? 100 : (approvedCount === 1 ? 25 : approvedCount === 2 ? 50 : approvedCount === 3 ? 75 : approvedCount === 4 ? 100 : 0);

  function getDocPillStatus(status: string) {
    if (status === "APPROVED") return "Completed";
    if (status === "REJECTED") return "Rejected";
    if (status === "UNDER_REVIEW") return "Under Review";
    if (status === "UPLOADED") return "Uploaded";
    return "Pending";
  }

  const isEmailVerified = !!(profile?.email_verified || user?.email_confirmed_at);
  const isPhoneVerified = !!profile?.phone_verified;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">KYC Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verified HUXZAIN sellers receive trusted badges, higher search priority, and unlock withdrawal settlements.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface/40 p-6 flex items-center gap-5">
        <div className="size-16 rounded-2xl bg-gold/10 text-gold grid place-items-center">
          <BadgeCheck size={28} />
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            Verification Level · <span className="text-gold uppercase font-bold">{verification?.status === "approved" ? "Gold (Verified)" : "Standard"}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {verification?.status === "approved"
              ? "Congratulations! Your profile is verified as a premium secure store."
              : "Upload Government ID, a Selfie, Address proof, and Payout details to reach verified state."}
          </div>
          <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold/60 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
          Retrieving KYC safety levels...
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PanelCard title="Identity Document uploads">
              <div className="space-y-5 text-sm">
                {/* Government ID 1 */}
                <div className="space-y-2.5">
                  <span className="text-xs text-muted-foreground block">1. First Government ID</span>
                  <div className="grid sm:grid-cols-2 gap-3 items-end bg-surface/10 p-3.5 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">ID Document Type</label>
                      <select
                        value={govtIdType1}
                        onChange={(e) => setGovtIdType1(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-none text-foreground"
                      >
                        <option value="">Select Type...</option>
                        {govtIdTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center justify-center w-full h-10 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                      <div className="flex items-center gap-1.5 justify-center py-2 text-xs text-muted-foreground">
                        <Upload className="size-4 text-gold" />
                        <span className="font-semibold">{govtFile ? "Change File..." : "Choose File..."}</span>
                      </div>
                      <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "govt")} className="hidden" />
                    </label>
                  </div>
                  {govtFile && (
                    <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center gap-1">
                      <span>✓ Loaded First ID: {govtIdTypes.find(t => t.value === govtIdType1)?.label || govtIdType1}</span>
                    </div>
                  )}
                  {!govtFile && verification?.government_id_url && (
                    <div className="text-[11px] text-muted-foreground bg-surface/50 p-2 rounded truncate flex items-center justify-between">
                      <span>✓ First ID ({govtIdTypes.find(t => t.value === govtIdType1)?.label || govtIdType1}) uploaded</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface/80 border border-border/40 text-muted-foreground">
                        {verification?.government_id_status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Government ID 2 */}
                <div className="space-y-2.5">
                  <span className="text-xs text-muted-foreground block">2. Second Government ID</span>
                  <div className="grid sm:grid-cols-2 gap-3 items-end bg-surface/10 p-3.5 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">ID Document Type</label>
                      <select
                        value={govtIdType2}
                        onChange={(e) => setGovtIdType2(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-none text-foreground"
                      >
                        <option value="">Select Type...</option>
                        {govtIdTypes.map(t => (
                          <option key={t.value} value={t.value} disabled={t.value === govtIdType1}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center justify-center w-full h-10 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                      <div className="flex items-center gap-1.5 justify-center py-2 text-xs text-muted-foreground">
                        <Upload className="size-4 text-gold" />
                        <span className="font-semibold">{govtFile2 ? "Change File..." : "Choose File..."}</span>
                      </div>
                      <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "govt2")} className="hidden" />
                    </label>
                  </div>
                  {govtFile2 && (
                    <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center gap-1">
                      <span>✓ Loaded Second ID: {govtIdTypes.find(t => t.value === govtIdType2)?.label || govtIdType2}</span>
                    </div>
                  )}
                  {!govtFile2 && verification?.government_id_2_url && (
                    <div className="text-[11px] text-muted-foreground bg-surface/50 p-2 rounded truncate flex items-center justify-between">
                      <span>✓ Second ID ({govtIdTypes.find(t => t.value === govtIdType2)?.label || govtIdType2}) uploaded</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface/80 border border-border/40 text-muted-foreground">
                        {verification?.government_id_2_status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Selfie */}
                <div className="space-y-2.5">
                  <span className="text-xs text-muted-foreground block">3. Upload Selfie for Verification</span>
                  <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-5 text-gold mb-1" />
                      <p className="text-[11px] text-muted-foreground text-center px-4">Upload a clear selfie holding your government ID next to your face</p>
                    </div>
                    <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "selfie")} className="hidden" />
                  </label>
                  {selfieFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Selfie loaded successfully!
                    </div>
                  )}
                  {!selfieFile && verification?.selfie_url && (
                    <div className="mt-2 text-xs text-muted-foreground bg-surface/50 p-2 rounded truncate flex items-center justify-between">
                      <span>✓ Selfie already uploaded</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface/80 border border-border/40 text-muted-foreground">
                        {verification?.selfie_status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Address Proof */}
                <div className="space-y-2.5">
                  <span className="text-xs text-muted-foreground block">4. Upload Address Proof</span>
                  <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-5 text-gold mb-1" />
                      <p className="text-[11px] text-muted-foreground text-center px-4">Upload Utility Bill or Bank Statement (under 3 months old)</p>
                    </div>
                    <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "addr")} className="hidden" />
                  </label>
                  {addrFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Address Proof loaded successfully!
                    </div>
                  )}
                  {!addrFile && verification?.address_proof_url && (
                    <div className="mt-2 text-xs text-muted-foreground bg-surface/50 p-2 rounded truncate flex items-center justify-between">
                      <span>✓ Address Proof already uploaded</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface/80 border border-border/40 text-muted-foreground">
                        {verification?.address_proof_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </PanelCard>
            <PanelCard title="Withdrawal Payout Details Verification" action={<Wallet className="text-gold size-4" />}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Payout Settlement Mode</label>
                  <div className="h-10 rounded-lg bg-gold text-black text-xs font-semibold flex items-center justify-center">
                    Bank Account Transfer
                  </div>
                </div>

                {(
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Account Holder Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Bank Account Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 50100234857412"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">IFSC Bank Code</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC0000240"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50 mt-2"
                >
                  {submitting ? "Submitting for review..." : "Submit documents and payout details"}
                </button>
              </div>
            </PanelCard>

            {/* Verified Seller Badge Card */}
            <PanelCard title="Verified Seller Badge Subscription" action={<BadgeCheck className="text-gold size-4" />}>
              {badgeSub && badgeSub.status === "active" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                    <div className="size-10 rounded-lg bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
                      <BadgeCheck size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Verified Seller Badge Active</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your Verified Seller badge is currently active and visible on your profile and listings.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-surface/50 border border-border p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground block">Plan:</span>
                      <span className="font-semibold text-foreground mt-0.5 block">{badgeSub.plan_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Expiry Date:</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {new Date(badgeSub.expiry_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : badgeProof && badgeProof.status === "pending" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <div className="size-10 rounded-lg bg-blue-500/20 text-blue-400 grid place-items-center shrink-0 animate-pulse">
                      <Clock size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Verification Proof Under Review</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your payment proof for the Verified Seller Badge is pending admin review.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs bg-surface/50 border border-border p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground block">UTR Number:</span>
                      <span className="font-mono font-semibold text-foreground mt-0.5 block truncate">{badgeProof.utr_reference || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Amount:</span>
                      <span className="font-semibold text-gold mt-0.5 block">₹{badgeProof.amount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Submitted:</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {new Date(badgeProof.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {badgeProof && badgeProof.status === "rejected" && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-red-400">Previous Submission Rejected</div>
                      <p className="text-muted-foreground">
                        Reason: {badgeProof.rejection_reason || "Invalid transaction details or screenshot."}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">Please pay again or submit a correct screenshot with the valid UTR below.</p>
                    </div>
                  )}
                  {badgeProof && badgeProof.status === "reupload_requested" && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-amber-400">Reupload Requested</div>
                      <p className="text-muted-foreground">
                        Notes: {badgeProof.rejection_reason || "Please upload a clearer screenshot of the payment."}
                      </p>
                    </div>
                  )}
                  {badgePlan && badgePayStep === "plans" && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Purchase the Verified Seller Badge separately to build unmatched credibility, unlock quick payout settlement times, and enable the hybrid escrow flow.
                      </p>
                      
                      <div className="grid sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setBadgePlan("monthly")}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            badgePlan === "monthly"
                              ? "bg-gold/5 border-gold shadow-lg shadow-gold/5"
                              : "border-border/80 hover:bg-surface/30"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Monthly</span>
                            <div className="text-lg font-bold text-foreground mt-1">₹499</div>
                          </div>
                          <span className="text-[10px] text-gold font-semibold mt-3">Select Plan →</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setBadgePlan("6months")}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            badgePlan === "6months"
                              ? "bg-gold/5 border-gold shadow-lg shadow-gold/5"
                              : "border-border/80 hover:bg-surface/30"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">6 Months</span>
                            <div className="text-lg font-bold text-foreground mt-1">₹2,399</div>
                            <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Save 20%</span>
                          </div>
                          <span className="text-[10px] text-gold font-semibold mt-3">Select Plan →</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setBadgePlan("yearly")}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            badgePlan === "yearly"
                              ? "bg-gold/5 border-gold shadow-lg shadow-gold/5"
                              : "border-border/80 hover:bg-surface/30"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Yearly</span>
                            <div className="text-lg font-bold text-foreground mt-1">₹3,999</div>
                            <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Save 33%</span>
                          </div>
                          <span className="text-[10px] text-gold font-semibold mt-3">Select Plan →</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBadgePayStep("pay")}
                        className="w-full h-10 bg-gold text-black rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all mt-2"
                      >
                        Continue to Payment · {badgePlan === "monthly" ? "₹499" : badgePlan === "6months" ? "₹2,399" : "₹3,999"}
                      </button>
                    </div>
                  )}

                  {badgePayStep === "pay" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Scan QR to Pay</span>
                        <button
                          onClick={() => setBadgePayStep("plans")}
                          className="text-[11px] text-muted-foreground hover:text-gold"
                        >
                          Change Plan
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface/30 border border-border p-4 rounded-xl">
                        <div className="bg-white p-2 rounded-lg size-32 shrink-0">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                              `upi://pay?pa=shprivateltd@upi&pn=HUXZAIN&am=${
                                badgePlan === "monthly" ? 499 : badgePlan === "6months" ? 2399 : 3999
                              }&cu=INR&tn=Verified%20Seller%20Badge`
                            )}`}
                            alt="Payment QR"
                            className="size-full object-contain"
                          />
                        </div>
                        <div className="space-y-1.5 text-center sm:text-left">
                          <div className="text-xs text-muted-foreground">Amount Payable</div>
                          <div className="text-xl font-bold text-gold font-display">
                            ₹{badgePlan === "monthly" ? "499" : badgePlan === "6months" ? "2,399" : "3,999"}
                          </div>
                          <div className="text-[10px] font-mono bg-background/50 px-2 py-1 rounded border border-border inline-block">
                            shprivateltd@upi
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Enter Transaction UTR / Ref Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 340982348574"
                            value={badgeUtr}
                            onChange={(e) => setBadgeUtr(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Upload Payment Screenshot</label>
                          <div className="flex items-center gap-3">
                            <label className="flex-1 flex items-center justify-center h-10 border border-dashed border-border rounded-lg cursor-pointer hover:bg-surface/20 transition-all text-xs text-muted-foreground gap-1.5">
                              <Upload size={14} className="text-gold" />
                              {badgeFile ? badgeFile.name : "Choose File..."}
                              <input
                                type="file"
                                accept="image/jpeg, image/png, application/pdf"
                                onChange={handleBadgeFileChange}
                                className="hidden"
                              />
                            </label>
                            {badgePreviewUrl && (
                              <div className="size-10 rounded border border-border overflow-hidden bg-surface flex items-center justify-center">
                                {badgeFile?.type === "application/pdf" ? (
                                  <FileText className="size-5 text-gold animate-in zoom-in-50" />
                                ) : (
                                  <img src={badgePreviewUrl} alt="Preview" className="size-full object-cover" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={submitBadgeProof}
                          disabled={badgeUploading}
                          className="w-full h-10 bg-gold text-black rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
                        >
                          {badgeUploading ? "Uploading Screenshot..." : "Submit Payment Proof"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PanelCard>
          </div>

          {/* Sidebar Checklist */}
          <div className="space-y-6">
            <PanelCard title="KYC Checklist">
              <ul className="divide-y divide-border/50 text-xs">
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-gold" />
                    <span>Email Address</span>
                  </div>
                  <StatusPill status={isEmailVerified ? "Completed" : "Pending"} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-gold" />
                    <span>Mobile Number</span>
                  </div>
                  {isPhoneVerified ? (
                    <StatusPill status="Completed" />
                  ) : (
                    <Link
                      to="/account/verify-phone"
                      className="text-[11px] font-semibold text-gold hover:underline transition-colors"
                    >
                      Verify Now →
                    </Link>
                  )}
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-gold" />
                    <span>Government ID</span>
                  </div>
                  <StatusPill status={getDocPillStatus(govtStatus)} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserSquare2 className="size-4 text-gold" />
                    <span>Verification Selfie</span>
                  </div>
                  <StatusPill status={getDocPillStatus(selfieStatus)} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-gold" />
                    <span>Address Proof</span>
                  </div>
                  <StatusPill status={getDocPillStatus(addrStatus)} />
                </li>
              </ul>
            </PanelCard>

            <PanelCard title="Review Status">
              <div className="text-center py-4 space-y-2">
                <div className="text-xs font-semibold">
                  Current Review:{" "}
                  <span
                    className={`font-bold ${
                      !verification || ((govtStatus === "UPLOADED" || govtStatus === "NOT_STARTED") && (selfieStatus === "UPLOADED" || selfieStatus === "NOT_STARTED") && (addrStatus === "UPLOADED" || addrStatus === "NOT_STARTED") && verification?.status !== "pending" && verification?.status !== "approved" && verification?.status !== "rejected" && verification?.status !== "action_required")
                        ? "text-zinc-400"
                        : verification?.status === "approved" 
                          ? "text-emerald-400" 
                          : verification?.status === "rejected" 
                            ? "text-rose-500" 
                            : verification?.status === "action_required"
                              ? "text-amber-500"
                              : "text-blue-400"
                    }`}
                  >
                    {!verification || ((govtStatus === "UPLOADED" || govtStatus === "NOT_STARTED") && (selfieStatus === "UPLOADED" || selfieStatus === "NOT_STARTED") && (addrStatus === "UPLOADED" || addrStatus === "NOT_STARTED") && verification?.status !== "pending" && verification?.status !== "approved" && verification?.status !== "rejected" && verification?.status !== "action_required")
                      ? "DRAFT"
                      : verification.status === "pending"
                        ? "PENDING REVIEW"
                        : verification.status === "action_required"
                          ? "ACTION REQUIRED"
                          : verification.status.toUpperCase()}
                  </span>
                </div>
                {(!verification || ((govtStatus === "UPLOADED" || govtStatus === "NOT_STARTED") && (selfieStatus === "UPLOADED" || selfieStatus === "NOT_STARTED") && (addrStatus === "UPLOADED" || addrStatus === "NOT_STARTED") && verification?.status !== "pending" && verification?.status !== "approved" && verification?.status !== "rejected" && verification?.status !== "action_required")) && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Please upload and submit your documents to start the verification process.
                  </p>
                )}
                {verification?.status === "pending" && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Verification usually completed within 24–48 hours. Thank you for your patience!
                  </p>
                )}
                {verification?.status === "action_required" && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <p className="text-[11px] text-amber-500 leading-relaxed font-bold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-left">
                      ⚠️ **Auditor notes:** {verification.admin_notes || "Please resubmit clear government ID scans and selfies."}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Please update and re-upload the missing details above.
                    </p>
                  </div>
                )}
                {verification?.status === "rejected" && (
                  <p className="text-[11px] text-rose-500 leading-relaxed font-bold">
                    Your documents were rejected: {verification.admin_notes || "Please upload valid identification."}
                  </p>
                )}
                {verification?.status === "approved" && (
                  <p className="text-[11px] text-emerald-400 leading-relaxed font-bold">
                    ✓ Profile is verified. Verified badge will display next to listings.
                  </p>
                )}
              </div>
            </PanelCard>
          </div>
        </div>
      )}
    </div>
  );
}
