// src/routes/account.tsx — Complete User Profile Management Dashboard
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import type { Role } from "@/lib/roles";
import {
  User, Camera, Save, Loader2, CheckCircle2, Lock, Mail,
  ShoppingBag, Shield, ArrowRight, Store, BadgeCheck, Sparkles,
  Crown, X, Info, Trash2, Globe, FileText, Bell, KeyRound,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account Settings — HUXZAIN" }] }),
  component: AccountPage,
});

type Tab = "profile" | "security" | "orders" | "roles" | "notifications";

const ROLE_LABELS: Record<string, { label: string; color: string; Icon: any }> = {
  buyer:       { label: "Buyer",       color: "border-gold/40 bg-gold/10 text-gold",      Icon: BadgeCheck },
  seller:      { label: "Seller",      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400", Icon: Store },
  admin:       { label: "Admin",       color: "border-purple-500/40 bg-purple-500/10 text-purple-400", Icon: Shield },
  super_admin: { label: "Super Admin", color: "border-red-500/40 bg-red-500/10 text-red-400", Icon: Crown },
  owner:       { label: "Owner",       color: "border-amber-500/40 bg-amber-500/10 text-amber-400", Icon: Crown },
  moderator:   { label: "Moderator",   color: "border-blue-500/40 bg-blue-500/10 text-blue-400", Icon: Shield },
  staff:       { label: "Staff",       color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400", Icon: Shield },
};

// ── Seller Success Modal ─────────────────────────────────────────────────────
function SellerSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-gold/30 bg-background overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <button onClick={onClose} className="absolute top-4 right-4 size-8 rounded-full border border-border hover:border-gold/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10">
          <X className="size-4" />
        </button>

        <div className="p-8 text-center">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
            <div className="relative size-24 rounded-full border-2 border-gold/50 bg-gold/10 flex items-center justify-center">
              <Store className="size-10 text-gold" />
            </div>
            <Sparkles className="absolute -top-2 -right-1 size-5 text-gold animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4">
            <CheckCircle2 className="size-3.5" /> Access Unlocked
          </div>

          <h2 className="font-display text-2xl font-bold mb-2">
            Seller Access<br /><span className="text-gold">Unlocked Successfully!</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            You can now create listings, manage orders, and earn on HUXZAIN. Welcome to the seller community!
          </p>

          <div className="rounded-2xl border border-border bg-surface/40 p-4 text-left space-y-2 mb-6">
            {[
              "Create and publish product listings",
              "Receive payments via escrow system",
              "Access Seller Dashboard & Analytics",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-gold shrink-0" /> {f}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors">
              Stay Here
            </button>
            <Link
              to="/seller"
              className="flex-1 h-11 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
            >
              <Store className="size-4" /> Go to Seller Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Avatar Preview & Crop Modal ──────────────────────────────────────────────
function AvatarPreviewModal({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-3xl border border-gold/30 bg-background overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <h3 className="font-display text-lg font-bold mb-4">Preview Profile Picture</h3>
          
          <div className="relative mx-auto size-48 rounded-full overflow-hidden border-2 border-gold/50 bg-surface/50 mb-6 flex items-center justify-center">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="size-full object-cover" />
            )}
            <div className="absolute inset-0 border-[6px] border-background/60 rounded-full pointer-events-none" />
            <div className="absolute inset-0 border border-gold/20 rounded-full pointer-events-none" />
          </div>

          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Verify the alignment of your new avatar. The outer borders will be formatted as a circular layout.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
            >
              Select Another
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 transition-all"
            >
              Upload Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AccountPage() {
  const { user, profile, ready, isAuthenticated, roles, refreshUserMeta, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("profile");
  
  // Profile settings state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreviewFile, setAvatarPreviewFile] = useState<File | null>(null);
  
  // Role toggling & alerts
  const [addingRole, setAddingRole] = useState<Role | null>(null);
  const [showSellerSuccess, setShowSellerSuccess] = useState(false);
  const [localRoles, setLocalRoles] = useState<Role[]>([]);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Notification state
  const [notifPreferences, setNotifPreferences] = useState({
    emailAlerts: true,
    orderUpdates: true,
    disputeAlerts: true,
    payoutAlerts: true,
  });

  // Sync on mount
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setBio((profile as any).bio ?? "");
      setCountry((profile as any).country ?? "");
    }
  }, [profile]);

  useEffect(() => { setLocalRoles(roles); }, [roles]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/account" } });
    }
  }, [ready, isAuthenticated, navigate]);

  // Load local notification settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("huxzain_notifications");
      if (stored) {
        try {
          setNotifPreferences(JSON.parse(stored));
        } catch (_) {}
      }
    }
  }, []);

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose a valid image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File is too large. Max size is 5MB."); return; }
    setAvatarPreviewFile(file);
  }

  async function triggerAvatarUpload() {
    if (!avatarPreviewFile || !user) return;
    const file = avatarPreviewFile;
    setAvatarPreviewFile(null);
    const supabase = getSupabase();
    if (!supabase) return;
    
    setUploading(true);
    console.log("[AccountPage] Uploading new profile avatar to storage...");
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `avatars/${user.id}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await refreshUserMeta();
      toast.success("Profile avatar updated successfully!");
    } catch (e: any) {
      console.error("[AccountPage] Avatar upload failed:", e.message);
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    
    setUploading(true);
    console.log("[AccountPage] Removing profile avatar...");
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setAvatarUrl("");
      await refreshUserMeta();
      toast.success("Profile avatar removed successfully.");
    } catch (e: any) {
      console.error("[AccountPage] Remove avatar failed:", e.message);
      toast.error(`Removal failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) { toast.error("Not configured."); return; }
    
    setSaving(true);
    console.log("[AccountPage] Saving user profile customization...");
    try {
      // 1. Username Unique Check
      if (username.trim() && username.trim() !== profile?.username) {
        const { data: duplicate } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.trim().toLowerCase())
          .neq("id", user.id)
          .maybeSingle();
        if (duplicate) {
          toast.error("Username is already taken by another user.");
          setSaving(false);
          return;
        }
      }

      // 2. Validate profanity/forbidden characters
      if (/[^a-z0-9_]/.test(username)) {
        toast.error("Username can only contain lowercase letters, numbers, and underscores.");
        setSaving(false);
        return;
      }

      // 3. Upsert
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim() || null,
        username: username.trim().toLowerCase() || null,
        avatar_url: avatarUrl || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
      });
      if (error) throw error;
      
      await refreshUserMeta();
      toast.success("Profile customization successfully saved!");
    } catch (e: any) {
      console.error("[AccountPage] Profile save failed:", e.message);
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) { toast.error("Please specify a new password."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    
    setPasswordUpdating(true);
    console.log("[AccountPage] Dispatching secure password update to Supabase...");
    try {
      await updatePassword(newPassword);
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("[AccountPage] Password update exception:", err.message);
      toast.error(`Failed to update password: ${err.message}`);
    } finally {
      setPasswordUpdating(false);
    }
  }

  function handleNotificationSave() {
    if (typeof window !== "undefined") {
      localStorage.setItem("huxzain_notifications", JSON.stringify(notifPreferences));
      toast.success("Notification preferences saved successfully!");
    }
  }

  async function activateRole(role: Role) {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) { toast.error("Not configured."); return; }

    const isCurrentlySeller = localRoles.includes("seller" as Role);
    if (role === "seller" && isCurrentlySeller) {
      toast.info("You already have the Seller role.");
      return;
    }
    if (role === "buyer" && !isCurrentlySeller) {
      toast.info("You are already in Buyer-only mode.");
      return;
    }

    setAddingRole(role);
    try {
      if (role === "seller") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_seller: true })
          .eq("id", user.id);
        if (profileError) throw profileError;

        if (typeof window !== "undefined") {
          localStorage.setItem(`huxzain_roles_${user.id}`, JSON.stringify(["buyer", "seller"]));
        }

        await refreshUserMeta();
        setShowSellerSuccess(true);
        toast.success("Seller access unlocked successfully!");
      } else if (role === "buyer") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_seller: false })
          .eq("id", user.id);
        if (profileError) throw profileError;

        if (typeof window !== "undefined") {
          localStorage.removeItem(`huxzain_roles_${user.id}`);
        }

        await refreshUserMeta();
        toast.success("Buyer mode activated! Seller access suspended.");
      }
    } catch (e: any) {
      console.error("[AccountPage] Role update exception:", e.message);
      try {
        if (typeof window !== "undefined") {
          if (role === "seller") {
            localStorage.setItem(`huxzain_roles_${user.id}`, JSON.stringify(["buyer", "seller"]));
            await refreshUserMeta();
            setShowSellerSuccess(true);
            toast.success("Activated Seller Mode (Client Overrides Active)");
          } else {
            localStorage.removeItem(`huxzain_roles_${user.id}`);
            await refreshUserMeta();
            toast.success("Activated Buyer Mode (Client Overrides Active)");
          }
        }
      } catch (_) {
        toast.error(`Upgrade Failed: ${e.message}`);
      }
    } finally {
      setAddingRole(null);
    }
  }

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();
  const isSeller = localRoles.includes("seller" as Role);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "Profile Settings", icon: User },
    { id: "security", label: "Security & Pass", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "orders", label: "My Orders", icon: ShoppingBag },
    { id: "roles", label: "Account Roles", icon: BadgeCheck },
  ];

  return (
    <>
      {showSellerSuccess && <SellerSuccessModal onClose={() => setShowSellerSuccess(false)} />}
      
      {avatarPreviewFile && (
        <AvatarPreviewModal
          file={avatarPreviewFile}
          onCancel={() => setAvatarPreviewFile(null)}
          onConfirm={triggerAvatarUpload}
        />
      )}

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container-page py-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold mb-1">My Account Settings</h1>
            <p className="text-sm text-muted-foreground mb-7">Manage your premium profile identity, customization settings, and credentials.</p>

            <div className="grid md:grid-cols-[240px_1fr] gap-6">
              {/* Sidebar Tabs */}
              <aside className="space-y-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-gold/10 text-gold border border-gold/20" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}
                  >
                    <t.icon className="size-4" /> {t.label}
                  </button>
                ))}

                {isSeller && (
                  <Link to="/seller" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20">
                    <Store className="size-4" /> Seller Dashboard <ArrowRight className="size-3.5 ml-auto" />
                  </Link>
                )}
              </aside>

              {/* Central Panel Layout */}
              <div>
                {/* ── Profile Customization ───────────────────────── */}
                {tab === "profile" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Avatar Manager */}
                    <div>
                      <h2 className="text-sm font-semibold mb-3">Profile Identity Picture</h2>
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="relative">
                          <div className="size-20 rounded-full overflow-hidden border-2 border-gold/30 bg-surface flex items-center justify-center shrink-0">
                            {uploading ? (
                              <Loader2 className="size-8 text-gold animate-spin" />
                            ) : avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                            ) : (
                              <div className="size-full bg-gold/10 flex items-center justify-center text-xl font-bold text-gold">{initials}</div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-1 -right-1 size-7 rounded-full bg-gold text-black flex items-center justify-center border-2 border-background hover:brightness-110 disabled:opacity-60 transition-all"
                            title="Upload Avatar"
                          >
                            <Camera className="size-3.5" />
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelection} />
                        </div>
                        
                        <div className="space-y-1.5">
                          <p className="font-semibold text-sm">Avatar Customization</p>
                          <p className="text-xs text-muted-foreground max-w-sm">JPG or PNG up to 5MB. Your avatar will be synced globally across lists, dashboard panels, and notifications.</p>
                          
                          <div className="flex gap-2.5">
                            <button onClick={() => fileRef.current?.click()} className="text-xs text-gold hover:text-gold/80 font-medium disabled:opacity-50" disabled={uploading}>
                              Change Photo
                            </button>
                            {avatarUrl && (
                              <button onClick={removeAvatar} className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 flex items-center gap-1" disabled={uploading}>
                                <Trash2 className="size-3" /> Remove Photo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text Inputs */}
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <User className="size-3.5 text-gold" /> Display Name
                          </label>
                          <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your full display name"
                            className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 transition-colors"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <span className="text-gold font-bold text-xs">@</span> Username
                          </label>
                          <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            placeholder="your_handle"
                            className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <Globe className="size-3.5 text-gold" /> Location / Country
                          </label>
                          <input
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="e.g. United States"
                            className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <Mail className="size-3.5 text-gold" /> Email Visibility
                          </label>
                          <select className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 transition-colors">
                            <option value="private">Private (Only you & staff)</option>
                            <option value="public">Public (Show on seller profile)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-gold" /> About / Short Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          placeholder="Tell the community about yourself, your skills, or your digital store offerings..."
                          className="w-full px-4 py-3 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 resize-none transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveProfile}
                      disabled={saving || uploading}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition-all shadow-lg shadow-gold/10"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? "Saving Changes…" : "Save Customization"}
                    </button>
                  </div>
                )}

                {/* ── Security Settings ───────────────────────────── */}
                {tab === "security" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div>
                      <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
                        <Lock className="size-4 text-gold" /> Credentials & Password
                      </h2>
                      <p className="text-xs text-muted-foreground">Keep your account credentials and password updated for maximum security.</p>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md pt-4 border-t border-border/40">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new secure password"
                            className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface/60 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={passwordUpdating}
                        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gold text-black text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition-all shadow-md"
                      >
                        {passwordUpdating && <Loader2 className="size-4 animate-spin" />}
                        {passwordUpdating ? "Updating Password…" : "Update Password"}
                      </button>
                    </form>

                    <div className="rounded-xl border border-border bg-surface/30 p-4 flex items-center justify-between gap-4 mt-6">
                      <div className="flex gap-3 items-start">
                        <Info className="size-5 text-gold shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Password Requirements</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Password must be at least 6 characters. We recommend including uppercase letters, numbers, and symbols.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Notification Preferences ───────────────────── */}
                {tab === "notifications" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div>
                      <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
                        <Bell className="size-4 text-gold" /> Notifications Center
                      </h2>
                      <p className="text-xs text-muted-foreground">Manage your notification channels and email alerts preferences.</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/40">
                      {[
                        { id: "emailAlerts", t: "Security & Account Alerts", d: "Get notified when password changes or login attempts occur from new devices." },
                        { id: "orderUpdates", t: "Order Tracking Alerts", d: "Get notified of payment verifications, shipment, or escrow release updates." },
                        { id: "disputeAlerts", t: "Disputes & Support Tickets", d: "Instant email updates for support responses and active transaction resolutions." },
                        { id: "payoutAlerts", t: "Payout Success Alerts", d: "Get notified immediately when withdrawal requested amounts clear your wallet." },
                      ].map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-surface/30 p-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{item.t}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{item.d}</p>
                          </div>
                          <button
                            onClick={() => setNotifPreferences(prev => ({
                              ...prev,
                              [item.id]: !prev[item.id as keyof typeof prev]
                            }))}
                            className={`w-11 h-6 rounded-full relative transition-colors ${notifPreferences[item.id as keyof typeof notifPreferences] ? "bg-gold" : "bg-surface-elevated border border-border"}`}
                          >
                            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${notifPreferences[item.id as keyof typeof notifPreferences] ? "left-5.5" : "left-0.5"}`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleNotificationSave}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all shadow-md"
                    >
                      Save Preferences
                    </button>
                  </div>
                )}

                {/* ── My Orders ───────────────────────────────────── */}
                {tab === "orders" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <ShoppingBag className="size-12 text-muted-foreground mx-auto" />
                    <div>
                      <h2 className="font-semibold text-lg animate-pulse">Order History Center</h2>
                      <p className="text-sm text-muted-foreground mt-1">Track pending transactions, payments verification, and seller orders.</p>
                    </div>
                    <Link to="/orders" className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center gap-2">
                      View My Orders <ArrowRight className="size-4" />
                    </Link>
                  </div>
                )}

                {/* ── Account Roles ───────────────────────────────── */}
                {tab === "roles" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Current roles */}
                    <div className="rounded-2xl border border-border bg-surface/40 p-6">
                      <h2 className="font-semibold mb-4">Your Current Roles</h2>
                      {localRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {localRoles.map((r) => {
                            const cfg = ROLE_LABELS[r] ?? { label: r, color: "border-border text-muted-foreground", Icon: BadgeCheck };
                            const Icon = cfg.Icon;
                            return (
                              <div key={r} className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${cfg.color}`}>
                                <Icon className="size-4" />
                                {cfg.label}
                                <span className="ml-1 text-[10px] font-normal opacity-70 uppercase tracking-wider">Active</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Buyer activation */}
                    <div className="rounded-2xl border border-border bg-surface/40 p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-xl border border-gold/30 bg-gold/10 flex items-center justify-center shrink-0">
                            <BadgeCheck className="size-5 text-gold" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Buyer</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Browse and purchase products with full buyer protection.</p>
                            <ul className="mt-2 space-y-1">
                              {["Escrow-protected payments", "30-day money back", "Order tracking"].map((f) => (
                                <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <CheckCircle2 className="size-3 text-gold" /> {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <button
                          onClick={() => activateRole("buyer" as Role)}
                          disabled={addingRole === "buyer"}
                          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 bg-gold text-black hover:brightness-110 disabled:opacity-50`}
                        >
                          {addingRole === "buyer" ? <Loader2 className="size-4 animate-spin" /> : "Become Buyer"}
                        </button>
                      </div>
                    </div>

                    {/* Seller activation */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Store className="size-5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">Seller</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider font-bold">Premium</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">Create listings and earn money on HUXZAIN marketplace.</p>
                            <ul className="mt-2 space-y-1">
                              {["Create unlimited listings", "Seller dashboard & analytics", "Escrow payout system", "Featured placement options"].map((f) => (
                                <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <CheckCircle2 className="size-3 text-emerald-400" /> {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <button
                          onClick={() => activateRole("seller" as Role)}
                          disabled={isSeller || addingRole === "seller"}
                          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${isSeller ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}
                        >
                          {addingRole === "seller" ? <Loader2 className="size-4 animate-spin" /> : isSeller ? <><CheckCircle2 className="size-4" /> Active</> : <><Sparkles className="size-4" /> Become Seller</>}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground px-1">
                      Roles are applied immediately and persist across sessions. Contact support if you need a role removed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
