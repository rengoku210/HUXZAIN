import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard, StatusPill } from "@/components/seller/SellerShell";
import { BadgeCheck, Upload, Shield, Mail, Phone, FileText, Inbox, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
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
  const [addrFile, setAddrFile] = useState<string>("");
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
        if (data) setVerification(data);
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

  async function handleFileRead(file: File, type: "govt" | "addr") {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "govt") setGovtFile(reader.result as string);
        else setAddrFile(reader.result as string);
        toast.success(`${type === "govt" ? "Government ID" : "Address Proof"} loaded successfully!`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("File parsing failed: " + err.message);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    if (!govtFile && !addrFile) {
      toast.error("Please load at least one document to submit for review");
      return;
    }

    try {
      setSubmitting(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      const payload: any = {
        id: user.id,
        status: "pending",
        updated_at: new Date().toISOString()
      };
      if (govtFile) payload.government_id_url = govtFile;
      if (addrFile) payload.address_proof_url = addrFile;

      const { error } = await supabase
        .from("verifications")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      toast.success("Verification documents submitted! Verification usually completed within 24–48 hours.");
      setGovtFile("");
      setAddrFile("");
      await loadData();
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
            Verified sellers earn 3× more trust signals on listings and unlock instant payouts.
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
              : "Complete Government ID KYC and address proof to reach verified state."}
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
            <PanelCard title="Identity Document uploads">
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Upload Government ID</span>
                  <label className="mt-1.5 flex flex-col items-center justify-center w-full h-28 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-6 text-gold mb-1" />
                      <p className="text-xs text-muted-foreground">Upload Government Passport, Driver License or National ID</p>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "govt")} className="hidden" />
                  </label>
                  {govtFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Government ID loaded successfully!
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Upload Address Proof</span>
                  <label className="mt-1.5 flex flex-col items-center justify-center w-full h-28 border border-dashed border-border/70 rounded-lg cursor-pointer hover:bg-surface/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <Upload className="size-6 text-gold mb-1" />
                      <p className="text-xs text-muted-foreground">Upload Utility Bill or Bank Statement (less than 3 months old)</p>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileRead(e.target.files?.[0] as File, "addr")} className="hidden" />
                  </label>
                  {addrFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                      ✓ Address Proof loaded successfully!
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || (!govtFile && !addrFile)}
                  className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50 mt-4"
                >
                  {submitting ? "Submitting for review..." : "Submit KYC Documents"}
                </button>
              </div>
            </PanelCard>
          </div>

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
                    <span>Phone Number</span>
                  </div>
                  <StatusPill status={isPhoneVerified ? "Completed" : "Pending"} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-gold" />
                    <span>Government ID</span>
                  </div>
                  <StatusPill status={verification?.government_id_url ? "Completed" : "Pending"} />
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-gold" />
                    <span>Address Proof</span>
                  </div>
                  <StatusPill status={verification?.address_proof_url ? "Completed" : "Pending"} />
                </li>
              </ul>
            </PanelCard>

            {verification && (
              <PanelCard title="Review Status">
                <div className="text-center py-4 space-y-2">
                  <div className="text-xs font-semibold">
                    Current Review:{" "}
                    <span
                      className={`font-bold ${verification.status === "approved" ? "text-emerald-400" : verification.status === "rejected" ? "text-destructive" : "text-amber-400"}`}
                    >
                      {verification.status.toUpperCase()}
                    </span>
                  </div>
                  {verification.status === "pending" && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Verification usually completed within 24–48 hours. Thank you for your patience!
                    </p>
                  )}
                  {verification.status === "rejected" && (
                    <p className="text-[11px] text-destructive leading-relaxed font-bold">
                      Your document was rejected. Please re-upload valid government receipts.
                    </p>
                  )}
                  {verification.status === "approved" && (
                    <p className="text-[11px] text-emerald-400 leading-relaxed font-bold">
                      ✓ Profile is completely verified and trusted.
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
