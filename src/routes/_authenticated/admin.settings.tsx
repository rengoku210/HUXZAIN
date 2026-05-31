import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Settings, Save, Mail, Percent, Globe, Key, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — HUXZAIN Admin" }] }),
  component: Page,
});

function Page() {
  const [saving, setSaving] = useState(false);

  // Platform Form States
  const [platformName, setPlatformName] = useState("HUXZAIN");
  const [supportEmail, setSupportEmail] = useState("support@huxzain.shop");
  const [commissionRate, setCommissionRate] = useState("1.9");
  const [payoutFee, setPayoutFee] = useState("0.0");
  const [kycRequired, setKycRequired] = useState(true);
  const [escrowTimeout, setEscrowTimeout] = useState("24");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Load from localStorage if present
  useEffect(() => {
    const savedName = localStorage.getItem("huxzain_platform_name");
    const savedEmail = localStorage.getItem("huxzain_support_email");
    const savedCommission = localStorage.getItem("huxzain_commission_rate");
    const savedPayout = localStorage.getItem("huxzain_payout_fee");
    const savedKyc = localStorage.getItem("huxzain_kyc_required");
    const savedEscrow = localStorage.getItem("huxzain_escrow_timeout");
    const savedMaint = localStorage.getItem("huxzain_maintenance_mode");

    if (savedName) setPlatformName(savedName);
    if (savedEmail) setSupportEmail(savedEmail);
    if (savedCommission) setCommissionRate(savedCommission);
    if (savedPayout) setPayoutFee(savedPayout);
    if (savedKyc) setKycRequired(savedKyc === "true");
    if (savedEscrow) setEscrowTimeout(savedEscrow);
    if (savedMaint) setMaintenanceMode(savedMaint === "true");
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      localStorage.setItem("huxzain_platform_name", platformName);
      localStorage.setItem("huxzain_support_email", supportEmail);
      localStorage.setItem("huxzain_commission_rate", commissionRate);
      localStorage.setItem("huxzain_payout_fee", payoutFee);
      localStorage.setItem("huxzain_kyc_required", kycRequired ? "true" : "false");
      localStorage.setItem("huxzain_escrow_timeout", escrowTimeout);
      localStorage.setItem("huxzain_maintenance_mode", maintenanceMode ? "true" : "false");
      
      toast.success("Platform settings updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Settings className="text-gold" size={24} /> Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure global marketplace commissions, support endpoints, payout fees, and operational policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* General Branding */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Globe className="text-gold size-4" /> Branding & Identity
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Platform Name</label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Support Contact Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 text-muted-foreground size-4" />
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Percent className="text-gold size-4" /> Fee Schedule
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Base Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Standard tier fee. Pro and elite tiers reduce this dynamically.</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Withdrawal / Payout Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={payoutFee}
                  onChange={(e) => setPayoutFee(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Operational Rules */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="text-gold size-4" /> Trust & Moderation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Default Escrow Timeout (Hours)</label>
                <input
                  type="number"
                  required
                  value={escrowTimeout}
                  onChange={(e) => setEscrowTimeout(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kycRequired}
                  onChange={(e) => setKycRequired(e.target.checked)}
                  className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Enforce KYC Verification</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Require government ID uploads before creating active seller withdraw requests.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Maintenance Settings */}
          <div className="rounded-2xl border border-border bg-surface/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Key className="text-gold size-4" /> System Control
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Activate Maintenance Mode</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Locks the checkout and listing catalog. Platform displays offline maintenance banner.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-gold/5"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
