import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, Plus, Save, Trash, Loader2, Edit2, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase-client";
import { savePageSeo } from "@/lib/seo.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({ meta: [{ title: "SEO Management Desk — HUXZAIN Admin" }] }),
  component: SeoDesk,
});

type SeoPage = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  og_image_url: string;
  schema_json: any;
};

function SeoDesk() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  // Form State
  const [path, setPath] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSeoPages() {
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("seo_pages")
        .select("*")
        .order("path", { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (e: any) {
      toast.error("Failed to load SEO configs: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!path.startsWith("/")) {
      toast.error("Path must start with a slash (e.g. '/about')");
      return;
    }

    setSaving(true);
    try {
      let schemaJson = null;
      if (schemaText.trim()) {
        try {
          schemaJson = JSON.parse(schemaText);
        } catch (err) {
          toast.error("Invalid Schema JSON markup");
          setSaving(false);
          return;
        }
      }

      const res = await savePageSeo({
        data: {
          path,
          title,
          description,
          keywords: keywords || undefined,
          ogImageUrl: ogImageUrl || undefined,
          schemaJson: schemaJson || undefined
        }
      });

      if (res.error) throw new Error(res.error);

      toast.success("Page SEO configured successfully!");
      setEditMode(false);
      resetForm();
      loadSeoPages();
    } catch (e: any) {
      toast.error("Failed to save SEO config: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetPath: string) {
    if (!confirm(`Are you sure you want to delete SEO settings for '${targetPath}'?`)) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from("seo_pages")
        .delete()
        .eq("path", targetPath);

      if (error) throw error;
      toast.success("SEO settings deleted.");
      loadSeoPages();
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    }
  }

  function handleEdit(page: SeoPage) {
    setPath(page.path);
    setTitle(page.title || "");
    setDescription(page.description || "");
    setKeywords(page.keywords || "");
    setOgImageUrl(page.og_image_url || "");
    setSchemaText(page.schema_json ? JSON.stringify(page.schema_json, null, 2) : "");
    setEditMode(true);
  }

  function resetForm() {
    setPath("");
    setTitle("");
    setDescription("");
    setKeywords("");
    setOgImageUrl("");
    setSchemaText("");
  }

  useEffect(() => {
    loadSeoPages();
  }, []);

  const filtered = pages.filter(p => 
    p.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Globe className="text-gold" size={24} /> Platform SEO Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure custom search engine tags, canonical links, and schema scripts for core paths.
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => {
              resetForm();
              setEditMode(true);
            }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-gold/5"
          >
            <Plus size={14} /> New Path Config
          </button>
        )}
      </div>

      {editMode ? (
        <div className="rounded-2xl border border-border bg-surface/30 p-6 max-w-2xl">
          <h3 className="font-display font-bold text-white mb-4">
            {path ? `Configure SEO for "${path}"` : "New Path SEO Config"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Route Path</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /about"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  disabled={!!pages.find(p => p.path === path)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Meta Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. digital, escrow, licenses"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Meta Title</label>
              <input
                type="text"
                required
                placeholder="Page title displayed in search tabs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Meta Description</label>
              <textarea
                required
                placeholder="Provide a search-friendly listing/page snippet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 p-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">OG Image URL (Optional)</label>
              <input
                type="text"
                placeholder="https://huxzain.shop/assets/social-og.jpg"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Schema JSON-LD Markup (Optional)</label>
              <textarea
                placeholder='{ "@context": "https://schema.org", "@type": "WebSite", ... }'
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                className="w-full h-28 p-3 rounded-lg bg-background border border-border text-xs font-mono focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="h-9 px-4 rounded-lg border border-border hover:bg-surface text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-gold text-black text-xs font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                <Save size={12} /> Save SEO Settings
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search paths or titles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-background border border-border text-xs focus:ring-1 focus:ring-gold/30 outline-hidden text-foreground"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
              Retrieving SEO configs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-sm text-muted-foreground bg-surface/10">
              <Globe size={32} className="mx-auto text-gold mb-3" />
              <div className="font-semibold text-white">No Custom Page SEO Configured</div>
              <p className="text-xs text-muted-foreground mt-1">Default meta tags will apply until custom settings are added.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-surface/20 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/40 text-muted-foreground font-semibold">
                    <th className="p-3.5">Path</th>
                    <th className="p-3.5">Meta Title</th>
                    <th className="p-3.5">Description Summary</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map(p => (
                    <tr key={p.path} className="hover:bg-surface/10 text-white font-medium">
                      <td className="p-3.5 text-gold font-bold">{p.path}</td>
                      <td className="p-3.5 truncate max-w-[180px]">{p.title}</td>
                      <td className="p-3.5 text-muted-foreground truncate max-w-[240px]">{p.description}</td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-border hover:border-gold/40 text-muted-foreground hover:text-gold cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.path)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-border hover:border-destructive text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
