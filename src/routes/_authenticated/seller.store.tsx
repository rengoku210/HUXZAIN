import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { Palette, Image as ImageIcon, Sparkles, Upload, ShieldAlert, RefreshCw } from "lucide-react";
import { useSellerTier, tierAtLeast } from "@/lib/seller/tier-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/store")({
  head: () => ({ meta: [{ title: "Store Customization — HUXZAIN Seller" }] }),
  component: Page,
});

const themes = [
  { id: "midnight", name: "Midnight Gold", bg: "#0e0e12", surface: "#1a1a22", text: "#d4b46a" },
  { id: "noir", name: "Noir Ember", bg: "#0a0a0a", surface: "#2d2d2d", text: "#e85d3a" },
  { id: "indigo", name: "Indigo Royal", bg: "#0a0a1a", surface: "#1e1e5a", text: "#4f46e5", min: "pro" },
  { id: "platinum", name: "Platinum", bg: "#1a1a1a", surface: "#d1d5db", text: "#fafafa", min: "elite" },
  { id: "violet", name: "Violet Suite", bg: "#1a0e2e", surface: "#5b21b6", text: "#c4b5fd", min: "enterprise" },
];

function Page() {
  const { user, profile } = useAuth();
  const { tier } = useSellerTier();
  const isPro = tierAtLeast(tier, "pro");

  // Customization States
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("midnight");
  const [accentColor, setAccentColor] = useState("#d4b46a");
  const [bannerCustomText, setBannerCustomText] = useState("");
  const [themeEnabled, setThemeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  async function loadCustomizations() {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("seller_customizations")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setLogo(data.logo_url || "");
          setBanner(data.banner_url || "");
          setSelectedTheme(data.theme_color || "midnight");
          setAccentColor(data.accent_color || "#d4b46a");
          setBannerCustomText(data.storefront_banner_customization || "");
          setThemeEnabled(data.theme_enabled !== false);
        }

      }
    } catch (e: any) {
      console.warn("Failed to load store customizations:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomizations();
  }, [user]);

  async function handleFileRead(file: File, type: "logo" | "banner") {
    if (!isPro) {
      toast.error("Standard plan has limited customizations. Upgrade to Pro to unlock custom logo and banner!");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") setLogo(reader.result as string);
        else setBanner(reader.result as string);
        toast.success(`${type === "logo" ? "Store logo" : "Store banner"} uploaded! Make sure to click Save Changes.`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Parsing failed: " + err.message);
    }
  }

  async function handleSave() {
    if (!user) return;
    if (!isPro) {
      toast.error("Standard plan has limited customizations. Upgrade to Pro to customize store branding!");
      return;
    }

    try {
      setSaving(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      const { error } = await supabase
        .from("seller_customizations")
        .upsert({
          id: user.id,
          logo_url: logo || null,
          banner_url: banner || null,
          theme_color: selectedTheme,
          accent_color: accentColor,
          storefront_banner_customization: bannerCustomText || null,
          theme_enabled: themeEnabled,
          updated_at: new Date().toISOString()
        });


      if (error) throw error;
      toast.success("Store customizations saved and applied live!");
    } catch (err: any) {
      toast.error("Failed to save customizations: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Store Customization</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Make your storefront stand out with custom banners, logo assets, and color accents.
          </p>
        </div>
        <button
          onClick={loadCustomizations}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {!isPro && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 flex gap-4 items-center animate-in fade-in duration-200">
          <ShieldAlert className="size-8 text-gold shrink-0 animate-pulse" />
          <div className="text-sm">
            <p className="font-bold text-foreground">Standard Plan Customization Limit</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Standard sellers cannot edit custom banners, logos, or store themes. Enjoy full branding features immediately by upgrading to the{" "}
              <Link to="/seller/subscription" className="text-gold font-bold hover:underline">
                Pro Plan
              </Link>!
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
          Hydrating branding presets...
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <PanelCard title="Storefront banner" className="lg:col-span-2 relative">
              {!isPro && <div className="absolute inset-0 bg-background/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl"><span className="text-xs bg-gold/10 border border-gold/20 text-gold px-3 py-1.5 rounded-xl font-bold uppercase"><Sparkles className="inline size-3 mr-1" /> Pro Feature</span></div>}
              {banner ? (
                <div className="relative rounded-xl overflow-hidden h-44 border border-border">
                  <img src={banner} className="w-full h-full object-cover" alt="Store banner" />
                  <button
                    onClick={() => setBanner("")}
                    className="absolute top-2 right-2 bg-black/60 text-white hover:text-destructive text-xs font-semibold px-2 py-1 rounded"
                  >
                    Delete Banner
                  </button>
                </div>
              ) : (
                <label className="rounded-xl border border-dashed border-border h-44 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-surface/20 transition-all">
                  <ImageIcon size={24} className="text-gold" />
                  <div className="text-xs mt-2">Click to upload banner image · 1600×400 recommended</div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isPro}
                    onChange={(e) => handleFileRead(e.target.files?.[0] as File, "banner")}
                    className="hidden"
                  />
                </label>
              )}
            </PanelCard>

            <PanelCard title="Store logo" className="relative">
              {!isPro && <div className="absolute inset-0 bg-background/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl"><span className="text-xs bg-gold/10 border border-gold/20 text-gold px-3 py-1.5 rounded-xl font-bold uppercase"><Sparkles className="inline size-3 mr-1" /> Pro Feature</span></div>}
              <div className="flex flex-col items-center justify-center h-44">
                {logo ? (
                  <div className="relative size-20 rounded-full border border-border overflow-hidden bg-background">
                    <img src={logo} className="w-full h-full object-cover" alt="Store logo" />
                    <button
                      onClick={() => setLogo("")}
                      className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity text-white flex items-center justify-center text-[10px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="size-16 rounded-full border border-border bg-background/60 grid place-items-center text-gold font-display text-xl font-bold">
                    {profile?.display_name?.[0]?.toUpperCase() || "H"}
                  </div>
                )}
                <label className="mt-3 h-9 px-4 rounded-lg border border-border hover:bg-surface text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload size={12} /> Replace logo
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isPro}
                    onChange={(e) => handleFileRead(e.target.files?.[0] as File, "logo")}
                    className="hidden"
                  />
                </label>
              </div>
            </PanelCard>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2">
              <PanelCard title="Theme Palette" action={<Palette size={14} className="text-gold" />}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {themes.map((t) => {
                    const locked = !!(t.min && !tierAtLeast(tier, t.min as any));
                    const active = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={locked || !isPro}
                        onClick={() => setSelectedTheme(t.id)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${active ? "border-gold ring-1 ring-gold/20 bg-gold/5" : "border-border/60 hover:border-gold/30"} ${(locked || !isPro) ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex gap-1 h-10 rounded-lg overflow-hidden border border-border/40">
                          <div className="flex-1" style={{ background: t.bg }} />
                          <div className="flex-1" style={{ background: t.surface }} />
                          <div className="flex-1" style={{ background: t.text }} />
                        </div>
                        <div className="mt-2 text-xs font-semibold truncate flex items-center gap-1">
                          {t.name}
                          {locked && <Sparkles size={10} className="text-gold shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PanelCard>
            </div>

            <div>
              <PanelCard title="Branding Slogan & Visibility">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Banner Customized Tagline</span>
                    <input
                      type="text"
                      placeholder="e.g. Premium accounts delivered in minutes!"
                      disabled={!isPro}
                      value={bannerCustomText}
                      onChange={(e) => setBannerCustomText(e.target.value)}
                      className="mt-1.5 w-full h-10 px-3 rounded-lg bg-background border border-border text-xs"
                    />
                  </div>
                  <div className="border-t border-border/40 pt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!isPro}
                        checked={themeEnabled}
                        onChange={(e) => setThemeEnabled(e.target.checked)}
                        className="rounded border-border bg-background text-gold focus:ring-gold size-4 accent-gold cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-semibold text-foreground">Enable custom theme</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          If disabled, public visitors see the default theme.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </PanelCard>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !isPro}
              className="h-10 px-6 rounded-lg bg-gold text-black text-sm font-bold hover:bg-gold/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving changes..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
