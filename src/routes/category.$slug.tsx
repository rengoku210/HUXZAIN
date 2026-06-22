import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { primaryCategories, getDbSlugFromUiSlug, getUiSlugFromDbSlug } from "@/lib/marketplace-data";
import { ChevronRight, PackageOpen, ShoppingBag } from "lucide-react";
import type { Category } from "@/lib/marketplace/categoryService";
import type { ListingLike } from "@/lib/marketplace/listing-adapter";
import { CategoryHeroBanner } from "@/components/category/CategoryHeroBanner";
import { CategoryFilters } from "@/components/category/CategoryFilters";
import { CategoryEmptyState } from "@/components/category/CategoryEmptyState";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }: { params: { slug: string } }) => {
    const slug = params?.slug ?? "";
    const title = slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${title} — HUXZAIN Marketplace` },
        {
          name: "description",
          content: `Browse ${title} listings on HUXZAIN — India's secure digital marketplace with verified sellers and escrow protection.`,
        },
        { property: "og:title", content: `${title} — HUXZAIN` },
        {
          property: "og:description",
          content: `Find the best ${title} deals on HUXZAIN with buyer protection and verified sellers.`,
        },
        { property: "og:image", content: "https://huxzain.shop/og-image.png" },
      ],
    };
  },
  component: CategoryPage,
});

function Breadcrumb({ paths }: { paths: { name: string; slug: string }[] }) {
  return (
    <nav
      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6"
      aria-label="breadcrumb"
    >
      <Link to="/" className="hover:text-foreground">
        Home
      </Link>
      {paths.map((p) => (
        <span key={p.slug} className="flex items-center gap-1.5">
          <ChevronRight className="size-3" />
          <Link
            to="/category/$slug"
            params={{ slug: p.slug }}
            className="hover:text-gold transition-colors"
          >
            {p.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function CategoryPage() {
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const staticMeta = primaryCategories.find((c) => c.slug === slug);
  const [category, setCategory] = useState<Category | null>(
    staticMeta ? { id: slug, name: staticMeta.title, slug } : null,
  );
  const [children, setChildren] = useState<Category[]>([]);
  const [listings, setListings] = useState<ListingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);
      const supabase = getSupabase();

      if (!supabase) {
        if (!staticMeta) setNotFound(true);
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: allCats } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");
      const categories = (allCats ?? []) as Category[];
      const dbSlug = getDbSlugFromUiSlug(slug);
      const dbCat = categories.find((c) => c.slug === dbSlug) ?? null;
      const resolved = dbCat ?? (staticMeta ? { id: slug, name: staticMeta.title, slug } : null);

      if (!active) return;
      if (!resolved) {
        setNotFound(true);
        setCategory(null);
        setChildren([]);
        setListings([]);
        setAllCategories(categories);
        setLoading(false);
        return;
      }

      setCategory(resolved);
      setAllCategories(categories);
      setChildren(dbCat ? categories.filter((c) => c.parent_id === dbCat.id) : []);

      let query = supabase
        .from("listings")
        .select("*, profiles(id, display_name, username, subscription_tier, is_verified)")
        .eq("status", "active")
        .order("boost_score", { ascending: false })
        .order("created_at", { ascending: false });

      if (dbCat) query = query.eq("category_id", dbCat.id);
      else query = query.limit(0);


      const { data: listData } = await query;
      if (!active) return;

      let fetchedListings = (listData ?? []) as ListingLike[];
      try {
        const { data: pushBoosts } = await supabase
          .from("listing_boosts")
          .select("listing_id")
          .eq("boost_type", "push_to_top")
          .eq("status", "active")
          .gt("ends_at", new Date().toISOString());

        const boostedIds = pushBoosts ? pushBoosts.map((b: any) => b.listing_id) : [];
        if (boostedIds.length > 0) {
          fetchedListings = fetchedListings.map(l => {
            if (boostedIds.includes(l.id)) {
              return { ...l, badge: "Sponsored" };
            }
            return l;
          });

          // Sort boosted listings to the top
          fetchedListings.sort((a, b) => {
            const aBoosted = boostedIds.includes(a.id);
            const bBoosted = boostedIds.includes(b.id);
            if (aBoosted && !bBoosted) return -1;
            if (!aBoosted && bBoosted) return 1;
            return 0;
          });
        }
      } catch (err) {
        console.error("Failed to apply category listing prioritization boosts:", err);
      }

      setListings(fetchedListings);
      setLoading(false);
    };

    void fetchData();
    return () => {
      active = false;
    };
  }, [slug, staticMeta]);

  const breadcrumb: { name: string; slug: string }[] = [];
  if (category && allCategories.length) {
    let cur: Category | undefined = allCategories.find((c) => c.id === category.id) ?? category;
    while (cur) {
      breadcrumb.unshift({ name: cur.name, slug: cur.slug });
      cur = allCategories.find((c) => c.id === cur?.parent_id);
    }
  } else if (category) {
    breadcrumb.push({ name: category.name, slug: category.slug });
  }

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
            <p className="text-muted-foreground mt-2 text-sm">
              Choose one of the active marketplace categories below.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            {primaryCategories.map((c) => (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-gold/40 bg-surface/40"
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

        {category && (
          <CategoryHeroBanner category={category} staticMeta={staticMeta} />
        )}

        {children.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Subcategories</h2>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {children.map((c) => (
                <li
                  key={c.id}
                  className="border border-border rounded-xl p-4 hover:bg-surface/60 hover:border-gold/30 cursor-pointer"
                  onClick={() => navigate({ to: "/category/$slug", params: { slug: getUiSlugFromDbSlug(c.slug) } })}
                >
                  <p className="font-medium text-gold">{c.name}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Listings</h2>
          </div>
          <CategoryFilters categorySlug={slug} />
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface/40 h-64 animate-pulse"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <CategoryEmptyState category={category} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => (
                <ListingCard key={l.id} l={l} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
