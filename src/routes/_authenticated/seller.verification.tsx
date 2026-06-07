import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { BadgeCheck, Upload, Shield, Mail, Phone, FileText, UserSquare2, Wallet, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { submitKYCVerification } from "@/lib/seller/subscription.functions";
import { toast } from "sonner";

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
  const [selfieFile, setSelfieFile] = useState<string>("");
  const [addrFile, setAddrFile] = useState<string>("");
  
  // Payout Verification Form States
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank_transfer">("upi");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("verifications")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("Error loading verification details:", error);
        if (data) {
          setVerification(data);
          // Pre-populate payout details if they exist
          if (data.payout_details) {
            const pd = data.payout_details;
            if (pd.method) setPayoutMethod(pd.method);
            if (pd.accountHolder) setAccountHolder(pd.accountHolder);
            if (pd.accountNumber) setAccountNumber(pd.accountNumber);
            if (pd.ifscCode) setIfscCode(pd.ifscCode);
            if (pd.upiId) setUpiId(pd.upiId);
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

  async function handleFileRead(file: File, type: "govt" | "selfie" | "addr") {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "govt") setGovtFile(reader.result as string);
        else if (type === "selfie") setSelfieFile(reader.result as string);
        else setAddrFile(reader.result as string);
        toast.success(`${type === "govt" ? "Government ID" : type === "selfie" ? "Selfie Photo" : "Address Proof"} loaded successfully!`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("File parsing failed: " + err.message);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    if (!govtFile && !verification?.government_id_url) {
      toast.error("Please upload your government ID.");
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
    if (payoutMethod === "upi" && !upiId.trim()) {
      toast.error("Please fill in your UPI ID for payouts.");
      return;
    }
    if (payoutMethod === "bank_transfer" && (!accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim())) {
      toast.error("Please complete all bank transfer details.");
      return;
    }

    try {
      setSubmitting(true);
      
      await submitKYCVerification({
        data: {
          sellerId: user.id,
          govtIdUrl: govtFile || verification?.government_id_url || "",
          selfieUrl: selfieFile || verification?.selfie_url || "",
          addressProofUrl: addrFile || verification?.address_proof_url || "",
          payoutDetails: {
            method: payoutMethod,
            accountHolder: accountHolder.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            upiId: upiId.trim().toLowerCase()
          }
        }
      });

      toast.success("Verification documents and payout details submitted! Usually reviewed within 24–48 hours.");
      setGovtFile("");
      setSelfieFile("");
      setAddrFile("");
      await loadData();
      await refreshUserMeta();
    } catch (err: any) {
      toast.error("Verification submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isEmailVerified = !!(profile?.email_verified || user?.email_confirmed_at);
  const isPhoneVerified = !!profile?.phone_verified;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Verification & KYC</h1>
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
              style={{ width: verification?.status === "approved" ? "100%" : isEmailVerified ? "50%" : "25%" }}
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
            {/* ID & Uploads Panel */}
            <PanelCard title="Identity Document uploads">
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">1. Upload Government ID</span>
                  <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-5 text-gold mb-1" />
                      <p className="text-[11px] text-muted-foreground text-center px-4">Upload Passport, Driver License or National ID card</p>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "govt")} className="hidden" />
                  </label>
                  {govtFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Government ID loaded successfully!
                    </div>
                  )}
                  {!govtFile && verification?.government_id_url && (
                    <div className="mt-2 text-xs text-muted-foreground bg-surface/50 p-2 rounded truncate">
                      ✓ Government ID already uploaded
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">2. Upload Selfie for Verification</span>
                  <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-5 text-gold mb-1" />
                      <p className="text-[11px] text-muted-foreground text-center px-4">Upload a clear selfie holding your government ID next to your face</p>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "selfie")} className="hidden" />
                  </label>
                  {selfieFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Selfie loaded successfully!
                    </div>
                  )}
                  {!selfieFile && verification?.selfie_url && (
                    <div className="mt-2 text-xs text-muted-foreground bg-surface/50 p-2 rounded truncate">
                      ✓ Selfie already uploaded
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">3. Upload Address Proof</span>
                  <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-5 text-gold mb-1" />
                      <p className="text-[11px] text-muted-foreground text-center px-4">Upload Utility Bill or Bank Statement (under 3 months old)</p>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "addr")} className="hidden" />
                  </label>
                  {addrFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Address Proof loaded successfully!
                    </div>
                  )}
                  {!addrFile && verification?.address_proof_url && (
                    <div className="mt-2 text-xs text-muted-foreground bg-surface/50 p-2 rounded truncate">
                      ✓ Address Proof already uploaded
                    </div>
                  )}
                </div>
              </div>
            </PanelCard>

            {/* Payout Details Card */}
            <PanelCard title="Withdrawal Payout Details Verification" action={<Wallet className="text-gold size-4" />}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Choose Payout Settlement Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("upi")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payoutMethod === "upi" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      UPI Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("bank_transfer")}
                      className={`h-10 rounded-lg border text-xs font-semibold ${payoutMethod === "bank_transfer" ? "bg-gold text-black border-gold" : "border-border hover:bg-surface"}`}
                    >
                      Bank Account Transfer
                    </button>
                  </div>
                </div>

                {payoutMethod === "upi" ? (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. name@upi or username@oksbi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                    />
                  </div>
                ) : (
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
                  <StatusPill status={govtFile || verification?.government_id_url ? "Completed" : "Pending"} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserSquare2 className="size-4 text-gold" />
                    <span>Verification Selfie</span>
                  </div>
                  <StatusPill status={selfieFile || verification?.selfie_url ? "Completed" : "Pending"} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-gold" />
                    <span>Address Proof</span>
                  </div>
                  <StatusPill status={addrFile || verification?.address_proof_url ? "Completed" : "Pending"} />
                </li>
              </ul>
            </PanelCard>

            {verification && (
              <PanelCard title="Review Status">
                <div className="text-center py-4 space-y-2">
                  <div className="text-xs font-semibold">
                    Current Review:{" "}
                    <span
                      className={`font-bold ${
                        verification.status === "approved" 
                          ? "text-emerald-400" 
                          : verification.status === "rejected" 
                            ? "text-rose-500" 
                            : verification.status === "action_required"
                              ? "text-amber-500"
                              : "text-blue-400"
                      }`}
                    >
                      {verification.status === "action_required" ? "ACTION REQUIRED" : verification.status.toUpperCase()}
                    </span>
                  </div>
                  {verification.status === "pending" && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Verification usually completed within 24–48 hours. Thank you for your patience!
                    </p>
                  )}
                  {verification.status === "action_required" && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <p className="text-[11px] text-amber-500 leading-relaxed font-bold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-left">
                        ⚠️ **Auditor notes:** {verification.admin_notes || "Please resubmit clear government ID scans and selfies."}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Please update and re-upload the missing details above.
                      </p>
                    </div>
                  )}
                  {verification.status === "rejected" && (
                    <p className="text-[11px] text-rose-500 leading-relaxed font-bold">
                      Your documents were rejected: {verification.admin_notes || "Please upload valid identification."}
                    </p>
                  )}
                  {verification.status === "approved" && (
                    <p className="text-[11px] text-emerald-400 leading-relaxed font-bold">
                      ✓ Profile is verified. Verified badge will display next to listings.
                    </p>
                  )}
                </div>
              </PanelCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
