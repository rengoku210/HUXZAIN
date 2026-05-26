// src/routes/account.tsx — Complete User Profile Management Dashboard
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import type { Role } from "@/lib/roles";
import {
  User,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Mail,
  ShoppingBag,
  Shield,
  ArrowRight,
  Store,
  BadgeCheck,
  Sparkles,
  Crown,
  X,
  Info,
  Trash2,
  Globe,
  FileText,
  Bell,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  validateSearch: (s: Record<string, unknown>): { intent?: string } => ({
    intent: s.intent ? String(s.intent) : undefined,
  }),
  head: () => ({ meta: [{ title: "My Account Settings — HUXZAIN" }] }),
  component: AccountPage,
});

type Tab = "profile" | "security" | "orders" | "roles" | "notifications";

const ROLE_LABELS: Record<string, { label: string; color: string; Icon: any }> = {
  buyer: { label: "Buyer", color: "border-gold/40 bg-gold/10 text-gold", Icon: BadgeCheck },
  seller: {
    label: "Seller",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    Icon: Store,
  },
  admin: {
    label: "Admin",
    color: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    Icon: Shield,
  },
  super_admin: {
    label: "Super Admin",
    color: "border-red-500/40 bg-red-500/10 text-red-400",
    Icon: Crown,
  },
  owner: {
    label: "Owner",
    color: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    Icon: Crown,
  },
  moderator: {
    label: "Moderator",
    color: "border-blue-500/40 bg-blue-500/10 text-blue-400",
    Icon: Shield,
  },
  staff: { label: "Staff", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400", Icon: Shield },
};

// —— Seller Success Modal —————————————————————————————————————————————————————
function SellerSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-gold/30 bg-background overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full border border-border hover:border-gold/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        >
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
            Seller Access
            <br />
            <span className="text-gold">Unlocked Successfully!</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            You can now create listings, manage orders, and earn on HUXZAIN. Welcome to the seller
            community!
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
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm hover:border-gold/40 transition-colors"
            >
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

// —— Avatar Preview Modal ——————————————————————————————————————————————————————
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
            Verify the alignment of your new avatar. The outer borders will be formatted as a
            circular layout.
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

// —— Main Page ——————————————————————————————————————————————————————————————————————
function AccountPage() {
  const { 
    user, 
    profile, 
    ready, 
    isAuthenticated, 
    roles, 
    refreshUserMeta, 
    updatePassword,
    updateProfile,
    becomeSeller
  } = useAuth();
  const navigate = useNavigate();
  const { intent } = Route.useSearch();
  const fileRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);
  const intentProcessed = useRef(false);

  const [tab, setTab] = useState<Tab>("profile");

  // Local form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [emailVisibility, setEmailVisibility] = useState("private");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreviewFile, setAvatarPreviewFile] = useState<File | null>(null);

  // Role management state
  const [activatingRole, setActivatingRole] = useState<Role | null>(null);
  const [showSellerSuccess, setShowSellerSuccess] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Notifications state
  const [notifPreferences, setNotifPreferences] = useState({
    emailAlerts: true,
    orderUpdates: true,
    disputeAlerts: true,
    payoutAlerts: true,
  });

  // 1. Initial State Hydration
  useEffect(() => {
    if (profile && !isInitialized.current) {
      console.log("[Account] Hydrating form state from profile:", profile.id);
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setBio(profile.bio ?? "");
      setCountry(profile.country ?? "");
      setEmailVisibility(profile.email_visibility ?? "private");
      isInitialized.current = true;
    }
  }, [profile]);

  // 2. Auth Guard
  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/account" } });
    }
  }, [ready, isAuthenticated, navigate]);

  // 3. Load Notifications
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

  // 4. Role Activation Logic
  const activateRole = useCallback(async (role: Role) => {
    if (!user) return;
    
    if (roles.includes(role)) {
      if (role === "seller") toast.info("You are already a seller.");
      return;
    }

    setActivatingRole(role);
    console.log(`[Account] Activating role: ${role} for ${user.id}`);

    try {
      if (role === "seller") {
        // Create an explicit 10-second timeout to prevent infinite spinner on network hangs
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out. Please check your network connection.")), 10000)
        );

        await Promise.race([becomeSeller(), timeoutPromise]);
        setShowSellerSuccess(true);
        toast.success("Seller access unlocked successfully!");
      } else {
        // Fallback for other roles if ever needed
        const supabase = getSupabase();
        if (supabase) {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out. Please check your network connection.")), 10000)
          );

          const insertPromise = async () => {
            const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
            if (error) throw error;
            await refreshUserMeta();
          };

          await Promise.race([insertPromise(), timeoutPromise]);
          toast.success(`${role} role activated.`);
        }
      }
    } catch (e: any) {
      console.error("[Account] Role activation error:", e);
      toast.error(e?.message || "Could not activate seller account. Please try again.");
    } finally {
      setActivatingRole(null);
    }
  }, [user, roles, becomeSeller, refreshUserMeta]);

  // 5. Handle intent=seller from URL
  useEffect(() => {
    if (ready && isAuthenticated && intent === "seller" && !intentProcessed.current) {
      if (!roles.includes("seller" as Role)) {
        activateRole("seller" as Role);
      }
      intentProcessed.current = true;
    }
  }, [ready, isAuthenticated, intent, roles, activateRole]);

  // 6. Avatar Management
  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }
    setAvatarPreviewFile(file);
  }

  async function triggerAvatarUpload() {
    if (!avatarPreviewFile || !user) return;
    const file = avatarPreviewFile;
    setAvatarPreviewFile(null);
    const supabase = getSupabase();
    if (!supabase) return;

    setUploading(true);
    console.log("[Account] Uploading avatar to storage...");
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/avatar.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
      
      console.log("[Account] Updating profile with new avatarUrl:", publicUrlWithCacheBust);
      await updateProfile({ avatar_url: publicUrlWithCacheBust });
      
      setAvatarUrl(publicUrlWithCacheBust);
      toast.success("Avatar updated successfully!");
    } catch (e: any) {
      console.error("[Account] Avatar error:", e.message);
      toast.error(`Avatar upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user) return;
    setUploading(true);
    try {
      await updateProfile({ avatar_url: null });
      setAvatarUrl("");
      toast.success("Avatar removed.");
    } catch (e: any) {
      toast.error("Failed to remove avatar.");
    } finally {
      setUploading(false);
    }
  }

  // 7. Profile Persistence
  async function saveProfile() {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    console.log("[Account] Persisting profile changes...");
    try {
      const cleanUsername = username.trim().toLowerCase();
      
      // Validation
      if (cleanUsername && cleanUsername !== profile?.username) {
        if (/[^a-z0-9_]/.test(cleanUsername)) {
          toast.error("Username: lowercase letters, numbers, and underscores only.");
          setSaving(false);
          return;
        }
        
        const { data: dup } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", user.id)
          .maybeSingle();
        
        if (dup) {
          toast.error("Username is already taken.");
          setSaving(false);
          return;
        }
      }

      await updateProfile({
        display_name: displayName.trim() || null,
        username: cleanUsername || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
        email_visibility: emailVisibility,
      });

      toast.success("Profile saved successfully!");
    } catch (e: any) {
      console.error("[Account] Save error:", e.message);
      toast.error(`Update failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // 8. Security & Notifications
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) return toast.error("New password required.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");

    setPasswordUpdating(true);
    try {
      await updatePassword(newPassword);
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setPasswordUpdating(false);
    }
  }

  function handleNotificationSave() {
    localStorage.setItem("huxzain_notifications", JSON.stringify(notifPreferences));
    toast.success("Preferences saved.");
  }

  const isSellerActive = roles.includes("seller" as Role);
  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

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

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container-page py-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold mb-1">My Account Settings</h1>
            <p className="text-sm text-muted-foreground mb-7">
              Manage your premium profile identity, customization settings, and credentials.
            </p>

            <div className="grid md:grid-cols-[240px_1fr] gap-6">
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

                {isSellerActive && (
                  <Link
                    to="/seller"
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
                  >
                    <Store className="size-4" /> Seller Dashboard <ArrowRight className="size-3.5 ml-auto" />
                  </Link>
                )}
              </aside>

              <div className="min-h-[500px]">
                {/* —— Profile Customization ————————————————————————————————————— */}
                {tab === "profile" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                              <div className="size-full bg-gold/10 flex items-center justify-center text-xl font-bold text-gold">
                                {initials}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-1 -right-1 size-7 rounded-full bg-gold text-black flex items-center justify-center border-2 border-background hover:brightness-110 disabled:opacity-60 transition-all shadow-lg"
                          >
                            <Camera className="size-3.5" />
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelection} />
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-semibold text-sm">Avatar Customization</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            JPG or PNG up to 5MB. Your avatar will be synced globally across the platform.
                          </p>
                          <div className="flex gap-2.5">
                            <button onClick={() => fileRef.current?.click()} className="text-xs text-gold hover:text-gold/80 font-medium" disabled={uploading}>
                              Change Photo
                            </button>
                            {avatarUrl && (
                              <button onClick={removeAvatar} className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1" disabled={uploading}>
                                <Trash2 className="size-3" /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium flex items-center gap-1.5"><User className="size-3.5 text-gold" /> Display Name</label>
                          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full Name" className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium flex items-center gap-1.5"><span className="text-gold font-bold text-xs">@</span> Username</label>
                          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username" className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none transition-colors" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium flex items-center gap-1.5"><Globe className="size-3.5 text-gold" /> Country</label>
                          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United Kingdom" className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium flex items-center gap-1.5"><Mail className="size-3.5 text-gold" /> Email Visibility</label>
                          <select 
                            value={emailVisibility} 
                            onChange={(e) => setEmailVisibility(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none transition-colors"
                          >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5"><FileText className="size-3.5 text-gold" /> Short Bio</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." className="w-full px-4 py-3 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none resize-none transition-colors" />
                      </div>
                    </div>

                    <button onClick={saveProfile} disabled={saving || uploading} className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 disabled:opacity-60 transition-all">
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? "Saving..." : "Save Customization"}
                    </button>
                  </div>
                )}

                {/* —— Roles —————————————————————————————————————————————————————— */}
                {tab === "roles" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="rounded-2xl border border-border bg-surface/40 p-6">
                      <h2 className="font-semibold mb-4">Your Current Roles</h2>
                      <div className="flex flex-wrap gap-3">
                        {roles.map((r) => {
                          const cfg = ROLE_LABELS[r] ?? { label: r, color: "border-border", Icon: User };
                          return (
                            <div key={r} className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${cfg.color}`}>
                              <cfg.Icon className="size-4" /> {cfg.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Store className="size-5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">Seller Account</h3>
                              {!isSellerActive && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase font-bold">Premium</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create listings, manage digital products, and earn revenue on HUXZAIN.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => activateRole("seller" as Role)}
                          disabled={isSellerActive || activatingRole === "seller"}
                          className={`h-11 px-6 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 ${isSellerActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}
                        >
                          {activatingRole === "seller" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : isSellerActive ? (
                            <>
                              <CheckCircle2 className="size-4" /> Seller Active
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-4" /> Become Seller
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rest of tabs (security, notifications, orders) ... */}
                {tab === "security" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h2 className="text-base font-semibold flex items-center gap-2"><Lock className="size-4 text-gold" /> Security Settings</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">New Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none" placeholder="••••••••" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Confirm Password</label>
                        <div className="relative">
                          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface/60 text-sm focus:border-gold/50 outline-none" placeholder="••••••••" />
                        </div>
                      </div>
                      <button disabled={passwordUpdating} className="h-11 px-6 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-60">
                        {passwordUpdating ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>
                )}

                {tab === "notifications" && (
                  <div className="rounded-2xl border border-border bg-surface/40 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h2 className="text-base font-semibold flex items-center gap-2"><Bell className="size-4 text-gold" /> Notification Center</h2>
                    <div className="space-y-3">
                      {["emailAlerts", "orderUpdates", "disputeAlerts", "payoutAlerts"].map((id) => (
                        <div key={id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface/20">
                          <span className="text-sm font-medium capitalize">{id.replace(/([A-Z])/g, ' $1')}</span>
                          <button
                            onClick={() => setNotifPreferences(p => ({ ...p, [id]: !p[id as keyof typeof p] }))}
                            className={`w-10 h-5 rounded-full relative transition-colors ${notifPreferences[id as keyof typeof notifPreferences] ? "bg-gold" : "bg-muted"}`}
                          >
                            <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${notifPreferences[id as keyof typeof notifPreferences] ? "left-5.5" : "left-0.5"}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleNotificationSave} className="h-11 px-6 rounded-xl bg-gold text-black text-sm font-bold hover:brightness-110">Save Preferences</button>
                  </div>
                )}

                {tab === "orders" && (
                   <div className="rounded-2xl border border-border bg-surface/40 p-12 text-center space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <ShoppingBag className="size-12 text-muted-foreground mx-auto" />
                    <div>
                      <h2 className="font-semibold text-lg">Order History</h2>
                      <p className="text-sm text-muted-foreground mt-1">Track your purchases and downloads.</p>
                    </div>
                    <Link to="/orders" className="h-11 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:brightness-110 inline-flex items-center gap-2">View Orders <ArrowRight className="size-4" /></Link>
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
