import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { getSupabase } from "@/lib/supabase-client";
import { primaryCategories } from "@/lib/marketplace-data";
import { toast } from "sonner";
import { Database, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Platform Overview - HUXZAIN Admin" }] }),
  component: Page,
});

type Counts = {
  users: number;
  listings: number;
  orders: number;
  categories: number;
  payments: number;
};

function Page() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [counts, setCounts] = useState<Counts>({
    users: 0,
    listings: 0,
    orders: 0,
    categories: 0,
    payments: 0,
  });

  async function loadCounts() {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [profiles, listings, orders, categories, payments] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase.from("payment_verifications").select("id", { count: "exact", head: true }),
    ]);
    setCounts({
      users: profiles.count ?? 0,
      listings: listings.count ?? 0,
      orders: orders.count ?? 0,
      categories: categories.count ?? 0,
      payments: payments.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    void loadCounts();
  }, []);

  async function seedCategories() {
    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    setSeeding(true);
    const rows = primaryCategories.map((c, index) => ({
      title: c.title,
      slug: c.slug,
      sort: (index + 1) * 10,
    }));
    const { error } = await supabase.from("categories").upsert(rows, { onConflict: "slug" });
    setSeeding(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Default categories synced.");
      await loadCounts();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage live users, listings, orders, payments, and categories.
          </p>
        </div>
        <button
          onClick={loadCounts}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ["Users", counts.users],
          ["Listings", counts.listings],
          ["Orders", counts.orders],
          ["Categories", counts.categories],
          ["Payments", counts.payments],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-surface/40 p-5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-display text-2xl font-bold mt-2 text-gold">
              {loading ? "..." : value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PanelCard title="Platform Setup">
          <div className="flex items-start gap-3">
            <Database className="size-5 text-gold mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Default categories</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sync the standard HUXZAIN category slugs used by homepage and navigation.
              </p>
              <button
                onClick={seedCategories}
                disabled={seeding}
                className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gold text-black text-sm font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {seeding && <Loader2 className="size-4 animate-spin" />}
                Sync Categories
              </button>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Listings", to: "/admin/listings" },
          { label: "Categories", to: "/admin/categories" },
          { label: "Users", to: "/admin/users" },
          { label: "Payments", to: "/admin/payments" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to as any}
            className="p-3 rounded-xl border border-border hover:border-gold/30 bg-surface/30 hover:bg-surface/60 text-sm font-medium text-center"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
