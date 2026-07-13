/**
 * CategoryVaultEngine.tsx
 * 
 * Category-specific delivery vault UIs for HUXZAIN Order Room.
 * Exactly matches reference images for all 9 supported category types.
 * 
 * Security model:
 *  - Credentials are NEVER preloaded. They are fetched on-demand via
 *    reveal_listing_credentials_v2 RPC only when the user explicitly
 *    clicks a reveal/view button.
 *  - Revealed data is held ONLY in component-local state.
 *  - No localStorage, no sessionStorage, no React context.
 *  - Each field reveal is individually logged server-side.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  ExternalLink,
  Gamepad2,
  Mail,
  Key,
  RefreshCw,
  FileText,
  AlertTriangle,
  Loader2,
  Crown,
  User,
  Info,
  BookOpen,
  Globe,
  Database,
  Cpu,
  HardDrive,
  Folder,
  CircleCheck,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import type { ListingCategoryType } from "@/lib/marketplace/listing-attributes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultCredentials {
  // Gaming Accounts
  login_id?: string | null;
  password?: string | null;
  recovery_details?: string | null;
  email_transfer_details?: string | null;
  backup_codes?: string | null;
  // Shared
  instructions?: string | null;
  transfer_instructions?: string | null;
  // Gift Cards / In-Game Credit / Software
  activation_key?: string | null;
  pin?: string | null;
  // Digital / Software
  download_url?: string | null;
  download_password?: string | null;
  // Hosting
  control_panel_url?: string | null;
  // Top-up
  topup_uid?: string | null;
  // Non-sensitive fields (returned as-is, no decryption needed)
  assigned_profile?: string | null;
  plan_type?: string | null;
  expiry_date?: string | null;
  devices_allowed?: string | null;
  region_info?: string | null;
  usage_guidelines?: string | null;
  seller_note?: string | null;
  service_details?: string | null;
  product_info?: string | null;
  documentation_urls?: string | null;
  setup_guide?: string | null;
  additional_resources?: string | null;
  account_info?: string | null;
  topup_region?: string | null;
  topup_player_name?: string | null;
  topup_amount?: string | null;
  topup_game?: string | null;
}

export interface CategoryVaultEngineProps {
  categoryType: ListingCategoryType;
  listingId: string;
  orderId: string;
  orderStatus: string;
  isBuyer: boolean;
  isSeller: boolean;
  /** Pre-loaded credentials (if already revealed in parent). Pass null if not yet revealed. */
  preloadedCreds?: VaultCredentials | null;
  /** Called after a successful reveal so parent can update state */
  onRevealSuccess?: (creds: VaultCredentials) => void;
  /** Delivery sub-type for in-game currency: "topup" | "code" */
  currencyDeliveryType?: "topup" | "code";
  deliveryTime?: string | null;
  activatedAt?: string | null;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

interface VaultCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: "available" | "locked" | "none";
  children: React.ReactNode;
}

function VaultCard({ icon, title, description, status = "available", children }: VaultCardProps) {
  return (
    <div className="flex flex-col bg-[#0e1014] border border-white/8 rounded-xl p-4 gap-3 min-w-0">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-gold text-2xl">{icon}</div>
        <div className="font-bold text-[11px] uppercase tracking-wider text-foreground">{title}</div>
        <div className="text-[10px] text-muted-foreground leading-snug">{description}</div>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        {children}
        {status === "available" && (
          <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-semibold">
            <CircleCheck size={11} /> Available
          </div>
        )}
      </div>
    </div>
  );
}

interface RevealButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  revealed?: boolean;
  variant?: "gold" | "outline";
  disabled?: boolean;
}

function RevealButton({ label, icon, onClick, loading, revealed, variant = "gold", disabled }: RevealButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "gold"
          ? "bg-transparent border-gold text-gold hover:bg-gold/10"
          : "bg-transparent border-white/20 text-muted-foreground hover:border-gold hover:text-gold"
      }`}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : revealed ? (
        <EyeOff size={12} />
      ) : (
        icon || <Eye size={12} />
      )}
      {label}
    </button>
  );
}

interface RevealFieldProps {
  label: string;
  value: string | null | undefined;
  masked?: boolean;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, key: string) => void;
  isLink?: boolean;
  onOpenLink?: () => void;
}

function RevealField({ label, value, masked = false, fieldKey, copiedField, onCopy, isLink, onOpenLink }: RevealFieldProps) {
  const [show, setShow] = useState(!masked);
  if (!value) return null;

  const display = masked && !show ? "••••••••••••••••" : value;

  return (
    <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 space-y-1">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-white flex-1 break-all leading-snug">{display}</span>
        <div className="flex items-center gap-1 shrink-0">
          {masked && (
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border-none cursor-pointer"
            >
              {show ? <EyeOff size={10} /> : <Eye size={10} />}
            </button>
          )}
          {isLink && onOpenLink && (
            <button
              type="button"
              onClick={onOpenLink}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border-none cursor-pointer"
            >
              <ExternalLink size={10} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onCopy(value, fieldKey)}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border-none cursor-pointer"
          >
            {copiedField === fieldKey ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function VaultStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    "READY TO REVEAL":   { cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "READY TO REVEAL" },
    "READY TO ACCESS":   { cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "READY TO ACCESS" },
    "DELIVERY READY":    { cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "DELIVERY READY" },
    "READY TO DOWNLOAD": { cls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "READY TO DOWNLOAD" },
    "IN PROGRESS":       { cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse", label: "IN PROGRESS" },
    "PENDING":           { cls: "bg-white/10 text-muted-foreground border border-white/10", label: "PENDING" },
  };
  const c = cfg[status] ?? cfg["PENDING"];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.cls}`}>{c.label}</span>
  );
}

// ─── Warning banner ───────────────────────────────────────────────────────────

function VaultWarning({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2.5 mt-1">
      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[10px] text-amber-300 leading-snug">
        <strong>Important:</strong> {text}
      </p>
    </div>
  );
}

// ─── Main reveal hook ─────────────────────────────────────────────────────────

function useVaultReveal(listingId: string, onRevealSuccess?: (creds: VaultCredentials) => void) {
  const [revealing, setRevealing] = useState(false);
  const [creds, setCreds] = useState<VaultCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const reveal = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || creds) return creds;
    setRevealing(true);
    try {
      const { data, error } = await supabase.rpc("reveal_listing_credentials_v2", {
        p_listing_id: listingId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("No credentials found for this listing.");
      setCreds(row as VaultCredentials);
      onRevealSuccess?.(row as VaultCredentials);
      return row as VaultCredentials;
    } catch (err: any) {
      toast.error("Failed to reveal: " + (err.message || "Unknown error"));
      return null;
    } finally {
      setRevealing(false);
    }
  }, [listingId, creds, onRevealSuccess]);

  const copyField = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  return { revealing, creds, setCreds, reveal, copiedField, copyField };
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 1: GAMING ACCOUNTS — "ACCOUNT DELIVERY VAULT"
// ─────────────────────────────────────────────────────────────────────────────

function GamingAccountVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);

  // If seller pre-loaded or parent revealed
  const data = creds ?? preloadedCreds ?? null;

  const isDeliveryReady = !!data?.login_id;
  const badgeStatus = data ? "DELIVERY READY" : "PENDING";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Lock size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">ACCOUNT DELIVERY VAULT</div>
            <div className="text-[11px] text-muted-foreground">Securely view your gaming account credentials and related information.</div>
          </div>
        </div>
        <VaultStatusBadge status={badgeStatus} />
      </div>

      {/* Cards grid */}
      <div className="p-4 grid grid-cols-5 gap-3">
        {/* 1. Game Credentials */}
        <VaultCard
          icon={<Gamepad2 size={22} />}
          title="Game Credentials"
          description="View your game login username & password"
          status={data?.login_id ? "available" : "locked"}
        >
          {data?.login_id ? (
            <>
              <RevealField label="Username" value={data.login_id} fieldKey="login_id" copiedField={copiedField} onCopy={copyField} />
              <RevealField label="Password" value={data.password} masked fieldKey="password" copiedField={copiedField} onCopy={copyField} />
            </>
          ) : (
            <RevealButton
              label="View Credentials"
              icon={<Lock size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
              disabled={!isBuyer && !isSeller}
            />
          )}
        </VaultCard>

        {/* 2. Email Credentials */}
        <VaultCard
          icon={<Mail size={22} />}
          title="Email Credentials"
          description="View associated email login details"
          status={data?.email_transfer_details ? "available" : "locked"}
        >
          {data?.email_transfer_details ? (
            <RevealField label="Email Details" value={data.email_transfer_details} fieldKey="email_details" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton
              label="View Email"
              icon={<Lock size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
              disabled={!data}
            />
          )}
        </VaultCard>

        {/* 3. Backup Codes */}
        <VaultCard
          icon={<Shield size={22} />}
          title="Backup Codes"
          description="View 2FA / backup codes (if included)"
          status={data?.backup_codes ? "available" : "locked"}
        >
          {data?.backup_codes ? (
            <RevealField label="Backup Codes" value={data.backup_codes} fieldKey="backup_codes" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton
              label="View Codes"
              icon={<Lock size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
              disabled={!data}
            />
          )}
        </VaultCard>

        {/* 4. Recovery Info */}
        <VaultCard
          icon={<Key size={22} />}
          title="Recovery Info"
          description="View recovery information (if included)"
          status={data?.recovery_details ? "available" : "locked"}
        >
          {data?.recovery_details ? (
            <RevealField label="Recovery Details" value={data.recovery_details} fieldKey="recovery" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton
              label="View Recovery"
              icon={<Lock size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
              disabled={!data}
            />
          )}
        </VaultCard>

        {/* 5. Transfer Instructions */}
        <VaultCard
          icon={<FileText size={22} />}
          title="Transfer Instructions"
          description="Read account transfer steps & important notes"
          status={data?.transfer_instructions || data?.instructions ? "available" : "locked"}
        >
          {data?.transfer_instructions || data?.instructions ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.transfer_instructions || data.instructions}
            </div>
          ) : (
            <RevealButton
              label="Read Instructions"
              icon={<FileText size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
              disabled={!data}
            />
          )}
        </VaultCard>
      </div>

      {/* Warning */}
      <div className="px-4 pb-4">
        <VaultWarning text="Do not share these details with anyone. HUXZAIN will never ask for your credentials." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 2: IN-GAME CURRENCY — TOP-UP DELIVERY CENTER
// ─────────────────────────────────────────────────────────────────────────────

export function parseDeliveryTimeToMs(deliveryTimeStr: string | null | undefined): number {
  if (!deliveryTimeStr) return 24 * 60 * 60 * 1000; // 24 hours fallback
  const str = deliveryTimeStr.toLowerCase().trim();
  const num = parseInt(str.replace(/\D/g, ''));
  if (isNaN(num)) return 24 * 60 * 60 * 1000;

  if (str.includes("minute")) {
    return num * 60 * 1000;
  }
  if (str.includes("hour")) {
    return num * 60 * 60 * 1000;
  }
  if (str.includes("day")) {
    return num * 24 * 60 * 60 * 1000;
  }
  return num * 60 * 60 * 1000;
}

interface TopupDeliveryVaultProps extends Omit<CategoryVaultEngineProps, "categoryType" | "currencyDeliveryType"> {
  orderStatus: string;
}

function TopupDeliveryVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess, orderStatus, deliveryTime, activatedAt }: TopupDeliveryVaultProps) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const durationMs = parseDeliveryTimeToMs(deliveryTime || "10 Minutes");
    const startTime = activatedAt ? new Date(activatedAt).getTime() : Date.now();
    const endTime = startTime + durationMs;

    const tick = () => {
      const remaining = endTime - Date.now();
      setTimeLeft(Math.max(0, remaining));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deliveryTime, activatedAt]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Delayed / Overdue";
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const steps = [
    { label: "Verified", done: true },
    { label: "Accepted", done: ["order_active", "seller_delivering", "buyer_reviewing", "delivered", "completed"].includes(orderStatus) },
    { label: "In Progress", done: ["buyer_reviewing", "delivered", "completed"].includes(orderStatus), active: orderStatus === "seller_delivering" },
    { label: "Ready", done: ["delivered", "completed"].includes(orderStatus) },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Database size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">TOP-UP DELIVERY CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your in-game currency top-up is being processed. Track the live status below.</div>
          </div>
        </div>
        <VaultStatusBadge status={orderStatus === "completed" ? "DELIVERY READY" : "IN PROGRESS"} />
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Destination panel */}
        <div className="bg-[#0e1014] border border-white/8 rounded-xl p-4 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-gold flex items-center gap-1.5 mb-2">
              <Gamepad2 size={13} /> DESTINATION
            </div>
            {data?.topup_game && (
              <div className="font-bold text-[13px] text-foreground mb-3">{data.topup_game}</div>
            )}
            <div className="space-y-1.5 text-[11px]">
              {data?.topup_uid && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UID</span>
                  <span className="font-mono font-bold text-foreground select-all">{data.topup_uid}</span>
                </div>
              )}
              {data?.topup_region && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-bold text-foreground">{data.topup_region}</span>
                </div>
              )}
              {data?.topup_player_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Player Name</span>
                  <span className="font-bold text-foreground">{data.topup_player_name}</span>
                </div>
              )}
            </div>
          </div>
          {data?.topup_amount && (
            <div className="pt-2 border-t border-white/8 mt-2">
              <div className="text-muted-foreground text-[10px]">Top-up Amount</div>
              <div className="font-bold text-lg text-gold mt-0.5">{data.topup_amount}</div>
            </div>
          )}
          {!data && (
            <RevealButton
              label="View Details"
              icon={<Eye size={12} />}
              onClick={async () => { const r = await reveal(); if (r) setCreds(r); }}
              loading={revealing}
            />
          )}
        </div>

        {/* Estimated delivery + notes */}
        <div className="bg-[#0e1014] border border-white/8 rounded-xl p-4 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-gold mb-3">ESTIMATED DELIVERY</div>
            <div className="text-center py-2">
              <div className="text-2xl font-mono font-bold text-foreground">{formatTimeLeft(timeLeft)}</div>
              <div className="text-muted-foreground text-[10px] mt-1">Configured Delivery Time: {deliveryTime || "10 Minutes"}</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/8">
            <div className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground mb-1">IMPORTANT RULES</div>
            <ul className="text-[9px] text-muted-foreground space-y-0.5">
              <li>• Do not login to your game account during top-up</li>
              <li>• Coins/Points will be added directly</li>
            </ul>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="bg-[#0e1014] border border-white/8 rounded-xl p-4 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-gold mb-3">Escrow Status</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Status</span>
                <span className="font-bold text-gold uppercase">{orderStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protection</span>
                <span className="font-bold text-emerald-400">Escrow Secured</span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/8 text-[9px] text-muted-foreground leading-snug">
             escrow balance is only released to the seller after your confirmation.
          </div>
        </div>

        {/* Amazon-Style Horizontal Tracker Row */}
        <div className="col-span-1 lg:col-span-3 bg-[#0e1014] border border-white/8 rounded-xl p-5 mt-2">
          <div className="font-bold text-[11px] uppercase tracking-wider text-gold mb-6 flex items-center gap-1.5">
            <Gamepad2 size={13} /> LIVE TOP-UP PROGRESS (AMAZON-STYLE TRACKER)
          </div>
          
          <div className="relative flex items-center justify-between w-full mt-4 mb-4 px-2">
            {/* Background track line */}
            <div className="absolute left-0 right-0 h-1 bg-white/5 rounded-full z-0" />
            
            {/* Active tracking progress line */}
            <div 
              className="absolute left-0 h-1 bg-gradient-to-r from-emerald-500 via-gold to-emerald-400 rounded-full transition-all duration-500 z-0"
              style={{
                width: ["delivered", "completed"].includes(orderStatus) 
                  ? "100%" 
                  : orderStatus === "buyer_reviewing" 
                  ? "66%" 
                  : orderStatus === "seller_delivering" 
                  ? "33%" 
                  : "0%"
              }}
            />

            {/* Steps circles */}
            {steps.map((step, idx) => {
              const isActive = step.active || (idx === 1 && orderStatus === "order_active");
              const isDone = step.done;
              
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className={`size-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isDone 
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                      : isActive 
                      ? "bg-gold text-black border-gold shadow-[0_0_15px_rgba(212,180,106,0.5)] animate-pulse" 
                      : "bg-[#0a0c0f] text-muted-foreground border-white/10"
                  }`}>
                    {idx === 0 && <ShieldCheck size={14} />}
                    {idx === 1 && <Gamepad2 size={14} />}
                    {idx === 2 && (isActive ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />)}
                    {idx === 3 && <Crown size={14} />}
                  </div>
                  <div className="absolute top-10 text-center w-24">
                    <span className={`block text-[9px] uppercase tracking-wider ${isDone ? "text-emerald-400 font-bold" : isActive ? "text-gold font-bold" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-6" /> {/* Spacer for absolute layout alignment */}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2.5">
          <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-300 leading-snug">
            You will be notified immediately once the top-up is completed.{" "}
            <strong className="text-red-400">Do not mark as complete</strong> before receiving your credits.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 3: IN-GAME CURRENCY — CREDIT DELIVERY CENTER (Code/Manual)
// ─────────────────────────────────────────────────────────────────────────────

function CreditDeliveryVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Database size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">CREDIT DELIVERY CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your in-game currency will be delivered securely. Follow the steps below.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "DELIVERY READY" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-3 gap-3">
        {/* 1. Redemption Code */}
        <VaultCard icon={<Key size={22} />} title="Redemption Code" description="Reveal your redemption code" status={data?.activation_key ? "available" : "locked"}>
          {data?.activation_key ? (
            <RevealField label="Code" value={data.activation_key} fieldKey="code" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton label="Reveal Code" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Redemption Instructions */}
        <VaultCard icon={<FileText size={22} />} title="Redemption Instructions" description="How to redeem your credits" status={data?.instructions ? "available" : "locked"}>
          {data?.instructions ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.instructions}
            </div>
          ) : (
            <RevealButton label="View Instructions" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Important Notes */}
        <VaultCard icon={<ShieldCheck size={22} />} title="Important Notes" description="Things to keep in mind" status={data?.account_info ? "available" : "locked"}>
          {data?.account_info ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.account_info}
            </div>
          ) : (
            <RevealButton label="View Notes" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <VaultWarning text="Once revealed, do not share your code with anyone. HUXZAIN will never ask for your code." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 4: GIFT CARDS — "GIFT CARD VAULT"
// ─────────────────────────────────────────────────────────────────────────────

function GiftCardVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Lock size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">GIFT CARD VAULT</div>
            <div className="text-[11px] text-muted-foreground">Your gift card details are securely protected. Click to reveal each detail.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO REVEAL" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-3 gap-3">
        {/* 1. Gift Card Code */}
        <VaultCard icon={<Key size={22} />} title="Gift Card Code" description="Reveal your gift card code" status={data?.activation_key ? "available" : "locked"}>
          {data?.activation_key ? (
            <RevealField label="Card Code" value={data.activation_key} fieldKey="gc_code" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <>
              <div className="flex items-center justify-center gap-1 py-2">
                <span className="font-mono text-[11px] text-muted-foreground tracking-widest">•••• •••• •••• ••••</span>
                <Lock size={11} className="text-muted-foreground" />
              </div>
              <RevealButton label="Reveal Code" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
              <div className="text-[10px] text-muted-foreground text-center">Code will be visible after confirmation</div>
            </>
          )}
        </VaultCard>

        {/* 2. Gift Card PIN */}
        <VaultCard icon={<Lock size={22} />} title="Gift Card PIN" description="Reveal your gift card PIN" status={data?.pin ? "available" : "locked"}>
          {data?.pin ? (
            <RevealField label="PIN" value={data.pin} masked fieldKey="gc_pin" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <>
              <div className="flex items-center justify-center gap-1 py-2">
                <span className="font-mono text-[11px] text-muted-foreground tracking-widest">••• •••</span>
                <Lock size={11} className="text-muted-foreground" />
              </div>
              <RevealButton label="Reveal PIN" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
              <div className="text-[10px] text-muted-foreground text-center">PIN will be visible after confirmation</div>
            </>
          )}
        </VaultCard>

        {/* 3. Redemption Guide */}
        <VaultCard icon={<FileText size={22} />} title="Redemption Guide" description="How to redeem this gift card" status={data?.instructions ? "available" : "locked"}>
          {data?.instructions ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.instructions}
            </div>
          ) : (
            <RevealButton label="View Instructions" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <VaultWarning text="Do not share your gift card code or PIN with anyone. HUXZAIN will never ask for these details." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 5: SUBSCRIPTIONS — "SUBSCRIPTION ACCESS CENTER"
// ─────────────────────────────────────────────────────────────────────────────

function SubscriptionVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Crown size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">SUBSCRIPTION ACCESS CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your subscription details and access information are ready. Please read all instructions carefully.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO ACCESS" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-5 gap-3">
        {/* 1. Login Credentials */}
        <VaultCard icon={<User size={22} />} title="Login Credentials" description="Use the credentials below to access your account." status={data?.login_id ? "available" : "locked"}>
          {data?.login_id ? (
            <>
              <RevealField label="Email / Username" value={data.login_id} fieldKey="sub_login" copiedField={copiedField} onCopy={copyField} />
              <RevealField label="Password" value={data.password} masked fieldKey="sub_pw" copiedField={copiedField} onCopy={copyField} />
            </>
          ) : (
            <RevealButton label="View Login Details" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Assigned Profile */}
        <VaultCard icon={<User size={22} />} title="Assigned Profile" description="Use the assigned profile as instructed." status={data?.assigned_profile ? "available" : "locked"}>
          {data?.assigned_profile ? (
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile</span>
                <span className="font-bold text-foreground">{data.assigned_profile}</span>
              </div>
              {data.region_info && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-bold text-foreground">{data.region_info}</span>
                </div>
              )}
            </div>
          ) : (
            <RevealButton label="View Profile Info" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Membership Information */}
        <VaultCard icon={<Crown size={22} />} title="Membership Information" description="Plan, validity, and important details." status={data?.plan_type ? "available" : "locked"}>
          {data?.plan_type ? (
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-bold text-foreground">{data.plan_type}</span>
              </div>
              {data.expiry_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="font-bold text-foreground">{data.expiry_date}</span>
                </div>
              )}
              {data.devices_allowed && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devices</span>
                  <span className="font-bold text-foreground">{data.devices_allowed}</span>
                </div>
              )}
              {data.region_info && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-bold text-foreground">{data.region_info}</span>
                </div>
              )}
            </div>
          ) : (
            <RevealButton label="View Full Details" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 4. Usage Guidelines */}
        <VaultCard icon={<AlertTriangle size={22} />} title="Usage Guidelines" description="Follow all rules to avoid account issues." status={data?.usage_guidelines ? "available" : "locked"}>
          {data?.usage_guidelines ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.usage_guidelines}
            </div>
          ) : (
            <RevealButton label="View All Rules" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 5. Support Notes */}
        <VaultCard icon={<Info size={22} />} title="Support Notes" description="If you face any issues, contact the seller first." status={data?.seller_note ? "available" : "locked"}>
          {data?.seller_note ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.seller_note}
            </div>
          ) : (
            <RevealButton label="View Seller Note" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-300 leading-snug">
            This subscription may be shared or family-based. Changing passwords, recovery methods, or account settings without permission may violate HUXZAIN policy and may result in order cancellation or account restriction.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 6: HOSTING & WEB SERVICES — "HOSTING & WEB SERVICE DELIVERY CENTER"
// ─────────────────────────────────────────────────────────────────────────────

function HostingVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Database size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">HOSTING & WEB SERVICE DELIVERY CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your hosting & web service details are ready. Access your account and resources below.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO ACCESS" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-5 gap-3">
        {/* 1. Account Access */}
        <VaultCard icon={<User size={22} />} title="Account Access" description="Access your hosting / service dashboard." status={data?.login_id ? "available" : "locked"}>
          {data?.login_id ? (
            <>
              <RevealField label="Username / Email" value={data.login_id} fieldKey="host_login" copiedField={copiedField} onCopy={copyField} />
            </>
          ) : (
            <RevealButton label="View Login Details" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Access Password */}
        <VaultCard icon={<Lock size={22} />} title="Access Password" description="Password to access your account." status={data?.password ? "available" : "locked"}>
          {data?.password ? (
            <RevealField label="Password" value={data.password} masked fieldKey="host_pw" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton label="View Password" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Service Details */}
        <VaultCard icon={<Globe size={22} />} title="Service Details" description="Your purchased hosting / service information." status={data?.service_details ? "available" : "locked"}>
          {data?.service_details ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line">
              {data.service_details}
            </div>
          ) : (
            <RevealButton label="View Full Details" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 4. Control Panel Link */}
        <VaultCard icon={<Cpu size={22} />} title="Control Panel Link" description="Login to your hosting control panel." status={data?.control_panel_url ? "available" : "locked"}>
          {data?.control_panel_url ? (
            <RevealField label="Control Panel URL" value={data.control_panel_url} fieldKey="cp_url" copiedField={copiedField} onCopy={copyField} isLink onOpenLink={() => window.open(data.control_panel_url!, "_blank", "noopener noreferrer")} />
          ) : (
            <RevealButton label="Open Control Panel" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 5. Resource & Guides */}
        <VaultCard icon={<BookOpen size={22} />} title="Resource & Guides" description="Helpful resources for setup and management." status={data?.documentation_urls || data?.setup_guide ? "available" : "locked"}>
          {data?.setup_guide ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.setup_guide}
            </div>
          ) : (
            <RevealButton label="View All Guides" icon={<Folder size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <VaultWarning text="Do not share your account details, passwords, or control panel links with anyone. HUXZAIN will never ask for these details." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 7: DIGITAL PRODUCTS — "DIGITAL DOWNLOAD CENTER"
// ─────────────────────────────────────────────────────────────────────────────

function DigitalProductVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  const parsedDocs: Array<{ name: string; url?: string }> = (() => {
    try { return data?.documentation_urls ? JSON.parse(data.documentation_urls) : []; }
    catch { return data?.documentation_urls ? [{ name: data.documentation_urls }] : []; }
  })();

  const productInfoLines: Array<{ label: string; value: string }> = (() => {
    try { return data?.product_info ? JSON.parse(data.product_info) : []; }
    catch { return data?.product_info ? [{ label: "Info", value: data.product_info }] : []; }
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Download size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">DIGITAL DOWNLOAD CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your digital product access details are ready. Follow the information below to download your product.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO DOWNLOAD" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-4 gap-3">
        {/* 1. Download Access */}
        <VaultCard icon={<Download size={22} />} title="Download Access" description="Access your product using the secure download link below." status={data?.download_url ? "available" : "locked"}>
          {data?.download_url ? (
            <>
              <div className="bg-background/60 border border-white/8 rounded-lg p-2 flex items-center gap-1.5">
                <Lock size={10} className="text-gold shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate flex-1">{data.download_url.slice(0, 35)}…</span>
                <button type="button" onClick={() => window.open(data.download_url!, "_blank", "noopener noreferrer")} className="p-0.5 rounded text-gold hover:text-gold/80 border-none bg-transparent cursor-pointer"><ExternalLink size={10} /></button>
              </div>
              <button
                type="button"
                onClick={() => window.open(data.download_url!, "_blank", "noopener noreferrer")}
                className="w-full h-8 rounded-lg border border-gold text-gold text-[11px] font-bold flex items-center justify-center gap-1.5 bg-transparent hover:bg-gold/10 transition-all cursor-pointer"
              >
                <ExternalLink size={12} /> Open Download Link
              </button>
              <div className="text-[10px] text-muted-foreground text-center">This is the secure download link provided by the seller.</div>
            </>
          ) : (
            <RevealButton label="Open Download Link" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Download Password */}
        <VaultCard icon={<Lock size={22} />} title="Download Password" description="Password required to extract or access the files." status={data?.download_password ? "available" : "locked"}>
          {data?.download_password ? (
            <>
              <RevealField label="Password" value={data.download_password} masked fieldKey="dl_pw" copiedField={copiedField} onCopy={copyField} />
              <div className="text-[10px] text-muted-foreground text-center">Password is case-sensitive.</div>
            </>
          ) : (
            <RevealButton label="View Password" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Documentation */}
        <VaultCard icon={<FileText size={22} />} title="Documentation" description="Important guides and documents related to your product." status={parsedDocs.length > 0 || data?.instructions ? "available" : "locked"}>
          {parsedDocs.length > 0 || data?.instructions ? (
            <div className="space-y-1.5">
              {parsedDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 bg-background/60 border border-white/8 rounded-lg">
                  <FileText size={10} className="text-gold shrink-0" />
                  <span className="text-[10px] text-foreground flex-1 truncate">{doc.name}</span>
                  {doc.url && (
                    <button type="button" onClick={() => window.open(doc.url, "_blank", "noopener noreferrer")} className="border-none bg-transparent cursor-pointer text-muted-foreground hover:text-gold">
                      <ExternalLink size={9} />
                    </button>
                  )}
                </div>
              ))}
              {data?.instructions && !parsedDocs.length && (
                <div className="text-[10px] text-muted-foreground leading-relaxed">{data.instructions}</div>
              )}
            </div>
          ) : (
            <RevealButton label="View All Documents" icon={<Folder size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 4. Product Information */}
        <VaultCard icon={<Info size={22} />} title="Product Information" description="Version, compatibility, and file details." status={productInfoLines.length > 0 || data?.product_info ? "available" : "none"}>
          {productInfoLines.length > 0 ? (
            <div className="space-y-1 text-[11px]">
              {productInfoLines.map((row, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-bold text-foreground text-right">{row.value}</span>
                </div>
              ))}
            </div>
          ) : data?.product_info ? (
            <div className="text-[10px] text-muted-foreground leading-relaxed max-h-20 overflow-y-auto">{data.product_info}</div>
          ) : (
            <div className="text-[10px] text-muted-foreground text-center italic">No additional info</div>
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-1">
        <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <Info size={12} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-snug">
            Seller provides download access via external link. HUXZAIN does not host large files. Maximum attachment size is 15 MB per listing.
          </p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-1.5">
        <div className="flex items-start gap-2 bg-gold/5 border border-gold/20 rounded-lg px-3 py-2">
          <ShieldCheck size={12} className="text-gold shrink-0 mt-0.5" />
          <p className="text-[10px] text-gold/80 leading-snug">
            Verify the download source before opening files. HUXZAIN recommends downloading only from links provided within this secure Order Room.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 8: AI TOOLS — "AI TOOL ACCESS CENTER"
// ─────────────────────────────────────────────────────────────────────────────

function AiToolVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <FileText size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">AI TOOL ACCESS CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your AI tool account access and resources are ready. Follow the details below.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO ACCESS" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-5 gap-3">
        {/* 1. Account Access */}
        <VaultCard icon={<User size={22} />} title="Account Access" description="View your login credentials securely." status={data?.login_id ? "available" : "locked"}>
          {data?.login_id ? (
            <>
              <RevealField label="Username" value={data.login_id} fieldKey="ai_login" copiedField={copiedField} onCopy={copyField} />
              <RevealField label="Password" value={data.password} masked fieldKey="ai_pw" copiedField={copiedField} onCopy={copyField} />
            </>
          ) : (
            <RevealButton label="View Credentials" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Access Details */}
        <VaultCard icon={<Lock size={22} />} title="Access Details" description="Username, password and login URL." status={data?.login_id ? "available" : "locked"}>
          {data?.login_id ? (
            <div className="text-[10px] text-muted-foreground text-center">Credentials visible in Account Access section above.</div>
          ) : (
            <RevealButton label="View Details" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Setup Guide */}
        <VaultCard icon={<BookOpen size={22} />} title="Setup Guide" description="Step-by-step setup and usage guide." status={data?.setup_guide || data?.instructions ? "available" : "locked"}>
          {data?.setup_guide || data?.instructions ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.setup_guide || data.instructions}
            </div>
          ) : (
            <RevealButton label="View Guide" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 4. Additional Resources */}
        <VaultCard icon={<Folder size={22} />} title="Additional Resources" description="Helpful resources shared by the seller." status={data?.additional_resources ? "available" : "locked"}>
          {data?.additional_resources ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.additional_resources}
            </div>
          ) : (
            <RevealButton label="View Resources" icon={<Folder size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 5. Account Information */}
        <VaultCard icon={<Info size={22} />} title="Account Information" description="Plan, validity, and important notes." status={data?.account_info ? "available" : "locked"}>
          {data?.account_info ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.account_info}
            </div>
          ) : (
            <RevealButton label="View Information" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <VaultWarning text="Do not share your account details with anyone. This account is for your personal use only." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VAULT 9: SOFTWARE & TOOLS — "LICENSE DELIVERY CENTER"
// ─────────────────────────────────────────────────────────────────────────────

function SoftwareVault({ listingId, orderId, isBuyer, isSeller, preloadedCreds, onRevealSuccess }: Omit<CategoryVaultEngineProps, "categoryType" | "orderStatus" | "currencyDeliveryType">) {
  const { revealing, creds, setCreds, reveal, copiedField, copyField } = useVaultReveal(listingId, onRevealSuccess);
  const data = creds ?? preloadedCreds ?? null;

  const additionalFiles: Array<{ name: string; url?: string }> = (() => {
    try { return data?.documentation_urls ? JSON.parse(data.documentation_urls) : []; }
    catch { return []; }
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c0f] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <HardDrive size={16} className="text-gold" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-foreground">LICENSE DELIVERY CENTER</div>
            <div className="text-[11px] text-muted-foreground">Your software license and resources are ready. Access your product details below.</div>
          </div>
        </div>
        <VaultStatusBadge status={data ? "READY TO ACCESS" : "PENDING"} />
      </div>

      <div className="p-4 grid grid-cols-4 gap-3">
        {/* 1. Product Key */}
        <VaultCard icon={<Key size={22} />} title="Product Key" description="View your unique license key for activation." status={data?.activation_key ? "available" : "locked"}>
          {data?.activation_key ? (
            <RevealField label="License Key" value={data.activation_key} fieldKey="sw_key" copiedField={copiedField} onCopy={copyField} />
          ) : (
            <RevealButton label="View Product Key" icon={<Eye size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} />
          )}
        </VaultCard>

        {/* 2. Download Resources */}
        <VaultCard icon={<Download size={22} />} title="Download Resources" description="Download official installer and related files." status={data?.download_url ? "available" : "locked"}>
          {data?.download_url ? (
            <button
              type="button"
              onClick={() => window.open(data.download_url!, "_blank", "noopener noreferrer")}
              className="w-full h-8 rounded-lg border border-gold text-gold text-[11px] font-bold flex items-center justify-center gap-1.5 bg-transparent hover:bg-gold/10 transition-all cursor-pointer"
            >
              <Download size={12} /> Download Installer
            </button>
          ) : (
            <RevealButton label="Download Installer" icon={<Download size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 3. Activation Guide */}
        <VaultCard icon={<FileText size={22} />} title="Activation Guide" description="Step-by-step instructions to activate your product." status={data?.setup_guide || data?.instructions ? "available" : "locked"}>
          {data?.setup_guide || data?.instructions ? (
            <div className="bg-background/60 border border-white/8 rounded-lg p-2.5 text-[10px] text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
              {data.setup_guide || data.instructions}
            </div>
          ) : (
            <RevealButton label="View Activation Guide" icon={<ExternalLink size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled={!data} />
          )}
        </VaultCard>

        {/* 4. Additional Files */}
        <VaultCard icon={<Folder size={22} />} title="Additional Files" description="Other files included by the seller." status={additionalFiles.length > 0 || data?.additional_resources ? "available" : "none"}>
          {additionalFiles.length > 0 ? (
            <div className="space-y-1.5">
              {additionalFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 bg-background/60 border border-white/8 rounded-lg">
                  <FileText size={10} className="text-gold shrink-0" />
                  <span className="text-[10px] text-foreground flex-1 truncate">{f.name}</span>
                  {f.url && (
                    <button type="button" onClick={() => window.open(f.url, "_blank", "noopener noreferrer")} className="border-none bg-transparent cursor-pointer text-muted-foreground hover:text-gold">
                      <ExternalLink size={9} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : data?.additional_resources ? (
            <div className="text-[10px] text-muted-foreground leading-relaxed">{data.additional_resources}</div>
          ) : (
            <div className="text-[10px] text-muted-foreground text-center italic">No additional files</div>
          )}
          {!data && (
            <RevealButton label="View Files" icon={<Folder size={12} />} onClick={async () => { const r = await reveal(); if (r) setCreds(r); }} loading={revealing} disabled />
          )}
        </VaultCard>
      </div>

      <div className="px-4 pb-4">
        <VaultWarning text="Keep your license key and download files private. Do not redistribute purchased software outside the license terms." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE — dispatches to the correct vault
// ─────────────────────────────────────────────────────────────────────────────

export function CategoryVaultEngine(props: CategoryVaultEngineProps) {
  const { categoryType, currencyDeliveryType, orderStatus, deliveryTime, activatedAt, ...rest } = props;

  switch (categoryType) {
    case "game-accounts":
      return <GamingAccountVault {...rest} />;
    case "currency":
      if (currencyDeliveryType === "topup") {
        return <TopupDeliveryVault {...rest} orderStatus={orderStatus} deliveryTime={deliveryTime} activatedAt={activatedAt} />;
      }
      return <CreditDeliveryVault {...rest} />;
    case "gift-cards":
      return <GiftCardVault {...rest} />;
    case "subscriptions":
      return <SubscriptionVault {...rest} />;
    case "software-tools":
      return <SoftwareVault {...rest} />;
    case "digital-marketplace":
      return <DigitalProductVault {...rest} />;
    case "hosting":
      return <HostingVault {...rest} />;
    case "ai-tools":
      return <AiToolVault {...rest} />;
    default:
      return null;
  }
}

/**
 * Detects the currency delivery sub-type from a listing's attributes or delivery_engine field.
 * "topup" = live top-up / UID-based; "code" = redemption code / manual
 */
export function detectCurrencyDeliveryType(listing: any): "topup" | "code" {
  const da = listing?.delivery_type || listing?.attributes?.deliveryMethod || "";
  if (
    da.toLowerCase().includes("topup") ||
    da.toLowerCase().includes("top-up") ||
    da.toLowerCase().includes("top_up") ||
    da.toLowerCase().includes("uid") ||
    da.toLowerCase().includes("direct")
  ) {
    return "topup";
  }
  return "code";
}

/**
 * Maps a listing category slug to a vault-specific "Delivery Status" label
 * used in the right sidebar.
 */
export function getVaultDeliveryStatusLabel(categoryType: ListingCategoryType, creds: any): string {
  if (!creds) return "Pending";
  switch (categoryType) {
    case "game-accounts":       return "Ready to View";
    case "gift-cards":          return "Ready to Reveal";
    case "currency":            return "Ready to View";
    case "subscriptions":       return "Ready to Access";
    case "software-tools":      return "Ready to Access";
    case "digital-marketplace": return "Ready to Download";
    default:                    return "Ready";
  }
}
