import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Manage Categories — HUXZAIN Admin" }] }),
  component: Page,
});

type Category = {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
  icon: string | null;
  sort: number;
  banner_image_url?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
  cta_text?: string | null;
};

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Partial<Category> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !category?.id;
  const [title, setTitle] = useState(category?.title ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [sort, setSort] = useState(String(category?.sort ?? "0"));
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(category?.banner_image_url ?? "");
  const [bannerTitle, setBannerTitle] = useState(category?.banner_title ?? "");
  const [bannerSubtitle, setBannerSubtitle] = useState(category?.banner_subtitle ?? "");
  const [ctaText, setCtaText] = useState(category?.cta_text ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);

    const payload = {
      name: title.trim(),
      slug: slug.trim().toLowerCase(),
      sort_order: parseInt(sort) || 0,
      icon: icon.trim() || null,
      banner_image_url: bannerImageUrl.trim() || null,
      banner_title: bannerTitle.trim() || null,
      banner_subtitle: bannerSubtitle.trim() || null,
      cta_text: ctaText.trim() || null,
    };

    try {
      if (isNew) {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        toast.success("Category created!");
      } else {
        const { error } = await supabase.from("categories").update(payload).eq("id", category!.id!);
        if (error) throw error;
        toast.success("Category updated!");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold">
            {isNew ? "Create Category" : "Edit Category"}
          </h2>
          <button onClick={onClose} className="p-1 hover:text-gold transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Digital Products"
              className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. digital-products"
              className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Sort Order</label>
              <input
                type="number"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Icon (Lucide name)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. Package"
                className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <h3 className="text-sm font-bold text-gold mb-4">Hero Banner Config</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Banner Image URL</label>
                <input
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="e.g. /images/categories/digital-products.jpg"
                  className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Banner Title</label>
                  <input
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="e.g. Digital Products"
                    className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">CTA Text</label>
                  <input
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Browse Products"
                    className="w-full h-10 px-4 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Banner Subtitle</label>
                <textarea
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. Buy Software, Subscriptions, Licenses, and Digital Assets"
                  rows={2}
                  className="w-full p-3 rounded-lg bg-surface/60 border border-border focus:border-gold/50 outline-none text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-lg bg-gold text-black text-sm font-bold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {saving ? "Saving..." : isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Partial<Category> | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchCategories() {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    
    const mapped = (data ?? []).map((c: any) => ({
      ...c,
      title: c.name ?? "",
      sort: c.sort_order ?? 0,
      banner_image_url: c.banner_image_url,
      banner_title: c.banner_title,
      banner_subtitle: c.banner_subtitle,
      cta_text: c.cta_text,
    }));
    setCategories(mapped as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function executeDelete() {
    if (!deleteTarget) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", deleteTarget);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Category deleted successfully.");
        // OPTIMISTIC UPDATE: filter out from state immediately
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget));
        setDeleteTarget(null);
        // Background sync
        fetchCategories();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {editTarget !== undefined && (
        <CategoryModal
          category={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={fetchCategories}
        />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Manage Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize the marketplace by adding or editing categories.
          </p>
        </div>
        <button
          onClick={() => setEditTarget(null)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gold text-black text-sm font-semibold hover:brightness-110"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="mt-6">
        <PanelCard title="All Categories">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 text-gold animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No categories found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-left py-2 pr-4">Slug</th>
                    <th className="text-left py-2 pr-4 text-center">Sort</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-surface/40">
                      <td className="py-3 pr-4 font-medium">{c.title}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{c.slug}</td>
                      <td className="py-3 pr-4 text-center">{c.sort}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setEditTarget(c)}
                            className="p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-gold"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                           <button
                            onClick={() => setDeleteTarget(c.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      </div>

      {/* ─── CUSTOM DELETE CONFIRMATION MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-1.5 text-red-400">
              <AlertCircle size={18} /> Confirm Category Deletion
            </h3>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Are you sure you want to delete this category? This action cannot be undone and will permanently remove this category from the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl border border-border text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white hover:brightness-110 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer border-none"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
