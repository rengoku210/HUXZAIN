import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { PanelCard } from "@/components/admin/PanelCard";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { categoryService, type Category } from "@/lib/marketplace/categoryService";
import { useFetchData } from "@/lib/hooks/useFetchData";
import { getSupabase } from "@/lib/supabase-client";
import { primaryCategories } from "@/lib/marketplace-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const navigate = useNavigate();
  const { data: categories, loading, error, refetch } = useFetchData<Category>("categories");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [parentId, setParentId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSlug("");
    setParentId(null);
    setEditCategory(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parent_id ?? null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCategory) {
        await categoryService.update(editCategory.id, { name, slug, parent_id: parentId });
      } else {
        await categoryService.create({ name, slug, parent_id: parentId });
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      console.error("Category operation failed", err);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (confirm(`Delete category "${cat.name}"? This cannot be undone.`)) {
      try {
        await categoryService.delete(cat.id);
        toast.success(`Category "${cat.name}" deleted.`);
        refetch();
      } catch (err: any) {
        toast.error(`Delete failed: ${err.message}`);
      }
    }
  };

  const seedCategories = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const rows = primaryCategories.map((c) => ({ name: c.title, slug: c.slug }));
    const { error } = await supabase.from("categories").upsert(rows, { onConflict: ["slug"] });
    if (error) toast.error(`Seed failed: ${error.message}`);
    else { toast.success("8 default categories seeded!"); refetch(); }
  };

  return (
    <>
      <Header />
      <main className="flex-1 container-page py-12">
        <PanelCard title="Category Management" action={
          <div className="flex gap-2">
            <button onClick={seedCategories} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 transition-colors">
              Seed Defaults
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gold text-black font-semibold hover:bg-gold/90">
              + New Category
            </button>
          </div>
        }>
          {loading && <p className="text-muted-foreground">Loading categories…</p>}
          {error && <p className="text-red-500">Error loading categories: {error}</p>}
          {!loading && categories && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Slug</th>
                  <th className="text-left py-2">Parent</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/30 hover:bg-surface/40">
                    <td className="py-2">{cat.name}</td>
                    <td className="py-2">{cat.slug}</td>
                    <td className="py-2">{cat.parent_id ? categories.find(p => p.id === cat.parent_id)?.name ?? "—" : "—"}</td>
                    <td className="py-2 text-right space-x-2">
                      <button onClick={() => openEdit(cat)} className="text-gold hover:underline">Edit</button>
                      <button onClick={() => handleDelete(cat)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PanelCard>
      </main>
      <Footer />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md p-6">
            <h2 className="font-display text-xl font-bold mb-4">{editCategory ? "Edit" : "Create"} Category</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full h-9 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-gold/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="slug">Slug</label>
                <input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full h-9 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-gold/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="parent">Parent Category (optional)</label>
                <select id="parent" value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || null)} className="w-full h-9 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-gold/40">
                  <option value="">— None —</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 h-9 rounded-lg border border-border text-sm hover:bg-surface/60">Cancel</button>
                <button type="submit" className="px-4 h-9 rounded-lg bg-gold text-black font-semibold hover:bg-gold/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
