import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/settings")({
  head: () => ({ meta: [{ title: "Settings — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("India");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setCountry(profile.country || "India");
      setBio(profile.bio || "");
    }
  }, [profile]);

  async function handleSave() {
    try {
      setSaving(true);
      await updateProfile({
        display_name: displayName,
        username: username,
        country: country,
        bio: bio,
      });
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profile display settings and seller preferences.
        </p>
      </div>

      <PanelCard title="Store Profile Info">
        <div className="space-y-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Public Handle / Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Public Bio / Description</span>
              <input
                type="text"
                value={bio}
                placeholder="Brief slogan or store description"
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Country</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
