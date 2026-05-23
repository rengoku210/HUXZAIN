import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { primaryCategories } from "@/lib/marketplace-data";
import { ChevronRight, PackageOpen, ShoppingBag } from "lucide-react";
import type { Category } from "@/lib/marketplace/categoryService";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

// ── Breadcrumb ─────────────────────────────────────────────────────────────
function Breadcrumb({ paths }: { paths: { name: string; slug: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6" aria-label="breadcrumb">
      <Link to="/" className="hover:text-foreground">Home</Link>
      {paths.map((p) => (
        <span key={p.slug} className="flex items-center gap-1.5">
          <ChevronRight className="size-3" />
          <Link to="/category/$slug" params={{ slug: p.slug }} className="hover:text-foreground hover:text-gold transition-colors">
            {p.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

// ── Category page ──────────────────────────────────────────────────────────
function CategoryPage() {
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const supabase = getSupabase();

  // Try to resolve from static data first as a reliable baseline
  const staticMeta = primaryCategories.find((c) => c.slug === slug);

  const [category, setCategory] = useState<Category | null>(
    staticMeta ? { id: slug, name: staticMeta.title, slug } : null
  );
  const [children, setChildren] = useState<Category[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const breadcrumb: { name: string; slug: string }[] = [];
  if (category && allCategories.length) {
    let cur: Category | undefined = category;
    while (cur) {
      breadcrumb.unshift({ name: cur.name, slug: cur.slug });
      cur = allCategories.find((c) => c.id === cur?.parent_id);
    }
  } else if (category) {
    breadcrumb.push({ name: category.name, slug: category.slug });
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);

      if (!supabase) {
        // No Supabase — show static category if known
        if (!staticMeta) setNotFound(true);
        setLoading(false);
        return;
      }

      // 1. Try DB lookup for the category
      const { data: dbCat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (dbCat) {
        // Category exists in DB → fetch its children and listings
        setCategory(dbCat as Category);

        const [{ data: childCats }, { data: listData }, { data: allCats }] = await Promise.all([
          supabase.from("categories").select("*").eq("parent_id", dbCat.id),
          supabase.from("listings").select("*").eq("category_id", dbCat.id),
          supabase.from("categories").select("*"),
        ]);

        setChildren((childCats ?? []) as Category[]);
        setListings((listData ?? []) as any[]);
        setAllCategories((allCats ?? []) as Category[]);
      } else {
        // Category not in DB → fall back to static metadata if we know this slug
        if (staticMeta) {
          setCategory({ id: slug, name: staticMeta.title, slug });
          // Try fetching listings that might reference this slug by category slug column
          const { data: listData } = await supabase
            .from("listings")
            .select("*")
            .eq("category_slug", slug);
          setListings((listData ?? []) as any[]);
        } else {
          // Truly unknown slug
          setNotFound(true);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [slug, supabase]);

  // ── Not found ────────────────────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container-page py-20 flex flex-col items-center justify-center gap-6">
          <div className="size-20 rounded-2xl border border-border bg-surface/40 flex items-center justify-center">
            <PackageOpen className="size-10 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Category not found</h1>
            <p className="text-muted-foreground mt-2 text-sm">There's no category at <code className="text-gold">/{slug}</code>.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="h-10 px-5 rounded-lg border border-border text-sm hover:border-gold/50 transition-colors inline-flex items-center">
              Go Home
            </Link>
            <Link to="/" className="h-10 px-5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center">
              Browse All
            </Link>
          </div>
          {/* Show known categories */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            {primaryCategories.map((c) => (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-gold/40 bg-surface/40 hover:bg-surface/60 transition-colors"
              >
                <c.icon className="size-4 text-gold" />
                <span className="text-sm">{c.title}</span>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const StaticIcon = staticMeta?.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        <Breadcrumb paths={breadcrumb} />

        {/* Category header */}
        <div className="flex items-center gap-4 mb-8">
          {StaticIcon && (
            <div className="size-14 rounded-2xl border border-gold/20 bg-gold/10 flex items-center justify-center shrink-0">
              <StaticIcon className="size-7 text-gold" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold">{category?.name ?? slug}</h1>
            {staticMeta && (
              <p className="text-sm text-muted-foreground mt-0.5">{staticMeta.count}</p>
            )}
          </div>
        </div>

        {/* Subcategories */}
        {children.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Subcategories</h2>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {children.map((c) => (
                <li
                  key={c.id}
                  className="border border-border rounded-xl p-4 hover:bg-surface/60 hover:border-gold/30 cursor-pointer transition-colors"
                  onClick={() => navigate({ to: "/category/$slug", params: { slug: c.slug } })}
                >
                  <p className="font-medium text-gold">{c.name}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Listings */}
        <section>
          <h2 className="text-lg font-semibold mb-6">Listings</h2>

          {loading ? (
            /* Skeleton */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-surface/40 p-5 animate-pulse">
                  <div className="h-36 rounded-xl bg-surface mb-4" />
                  <div className="h-4 rounded bg-surface w-3/4 mb-2" />
                  <div className="h-3 rounded bg-surface w-1/2" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border border-border bg-surface/40 py-20 flex flex-col items-center gap-4">
              <div className="size-16 rounded-2xl border border-border bg-surface flex items-center justify-center">
                <ShoppingBag className="size-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold">No listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to list in this category.</p>
              </div>
              <Link
                to="/seller-panel"
                className="h-10 px-6 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 inline-flex items-center transition-all"
              >
                Start Selling
              </Link>
            </div>
          ) : (
            /* Real listings grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  to="/product/$id"
                  params={{ id: l.id }}
                  className="group rounded-2xl border border-border bg-surface/40 hover:border-gold/30 hover:bg-surface/60 transition-all overflow-hidden"
                >
                  {l.cover_image_url ? (
                    <img src={l.cover_image_url} alt={l.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 flex items-center justify-center">
                      <span className="text-white/60 text-sm font-medium">{l.title?.slice(0, 2)}</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-sm leading-tight group-hover:text-gold transition-colors line-clamp-2">{l.title}</h3>
                    <p className="text-gold font-bold text-sm mt-2">${Number(l.price ?? 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
