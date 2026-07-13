import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { primaryCategories, getDbSlugFromUiSlug } from "@/lib/marketplace-data";
import { ChevronRight, PackageOpen, Search } from "lucide-react";
import type { Category } from "@/lib/marketplace/categoryService";
import type { ListingLike } from "@/lib/marketplace/listing-adapter";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string; category?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search Marketplace — HUXZAIN" },
      {
        name: "description",
        content: "Search the HUXZAIN marketplace for accounts, currency, boosting, gift cards, subscriptions, hosting, design, programming and more.",
      },
      {
        name: "robots",
        content: "noindex, follow",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "", category = "" } = Route.useSearch();
  const navigate = useNavigate();

  const [listings, setListings] = useState<ListingLike[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatSlug, setSelectedCatSlug] = useState(category || "all");
  const [searchVal, setSearchVal] = useState(q);

  useEffect(() => {
    setSearchVal(q);
  }, [q]);

  useEffect(() => {
    setSelectedCatSlug(category || "all");
  }, [category]);

  useEffect(() => {
    let active = true;
    async function executeSearch() {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setListings([]);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch categories
        const { data: allCats } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order")
          .order("name");
        const cats = (allCats ?? []) as Category[];
        if (active) setCategories(cats);

        // 2. Pre-resolve category search
        let matchedCatIds: string[] = [];
        if (q) {
          const categoryMatches = cats.filter(c => 
            c.name.toLowerCase().includes(q.toLowerCase()) || 
            c.slug.toLowerCase().includes(q.toLowerCase())
          );
          matchedCatIds = categoryMatches.map(c => c.id);
        }

        // 3. Filter by category parameter if chosen
        let filterCatId: string | null = null;
        if (selectedCatSlug && selectedCatSlug !== "all") {
          const mappedDbSlug = getDbSlugFromUiSlug(selectedCatSlug);
          const matched = cats.find(c => c.slug === mappedDbSlug);
          if (matched) {
            filterCatId = matched.id;
          }
        }

        // 4. Build listing query
        let query = supabase
          .from("listings")
          .select("*, profiles(id, display_name, username, subscription_tier, is_verified), categories:category_id(id, name, slug)")
          .eq("status", "active")
          .or("expiry_date.is.null,expiry_date.gt." + new Date().toISOString())
          .order("boost_score", { ascending: false })
          .order("created_at", { ascending: false });

        if (filterCatId) {
          query = query.eq("category_id", filterCatId);
        }

        if (q) {
          let orFilter = `title.ilike.%${q}%,description.ilike.%${q}%,seo_keywords.ilike.%${q}%,tags.cs.["${q}"]`;
          // If we also resolved category IDs, include them in the OR
          if (matchedCatIds.length > 0 && !filterCatId) {
            orFilter += `,category_id.in.(${matchedCatIds.join(",")})`;
          }
          query = query.or(orFilter);
        }

        const { data: listData } = await query;
        if (!active) return;

        let fetchedListings = (listData ?? []) as ListingLike[];

        // Apply Sponsor/Boost badges
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
          }

          // Sort out-of-stock listings to the bottom, and sponsored first
          fetchedListings.sort((a, b) => {
            const aStock = a.stock ?? 1;
            const bStock = b.stock ?? 1;
            if (aStock === 0 && bStock !== 0) return 1;
            if (aStock !== 0 && bStock === 0) return -1;

            const aBoosted = boostedIds.includes(a.id);
            const bBoosted = boostedIds.includes(b.id);
            if (aBoosted && !bBoosted) return -1;
            if (!aBoosted && bBoosted) return 1;
            return 0;
          });
        } catch (err) {
          console.error("Failed to apply search priority boosts:", err);
          // Fallback stock sorting if boosts check fails
          fetchedListings.sort((a, b) => {
            const aStock = a.stock ?? 1;
            const bStock = b.stock ?? 1;
            if (aStock === 0 && bStock !== 0) return 1;
            if (aStock !== 0 && bStock === 0) return -1;
            return 0;
          });
        }

        setListings(fetchedListings);
      } catch (err) {
        console.error("Search execution failed:", err);
        setListings([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void executeSearch();
    return () => {
      active = false;
    };
  }, [q, selectedCatSlug]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/search",
      search: {
        q: searchVal || undefined,
        category: selectedCatSlug === "all" ? undefined : selectedCatSlug,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060709]">
      <Header />
      <main className="flex-1 container-page py-10">
        
        {/* Search Header Controls */}
        <div className="mb-10 p-6 rounded-2xl border border-border bg-surface/30 backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search for digital accounts, items, services..."
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface/50 border border-border focus:border-gold/50 outline-none text-sm transition-colors text-white"
              />
            </div>
            
            <div className="w-full md:w-64">
              <select
                value={selectedCatSlug}
                onChange={(e) => setSelectedCatSlug(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface/50 border border-border focus:border-gold/50 outline-none text-sm text-white"
              >
                <option value="all">All Categories</option>
                {primaryCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              className="h-12 px-8 rounded-xl bg-gold text-primary-foreground font-bold hover:brightness-110 active:scale-95 transition-all text-sm shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results Listings */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-display font-bold">
              {q || (selectedCatSlug !== "all") 
                ? `Results for "${q || selectedCatSlug.replace(/-/g, " ")}"` 
                : "All Listings"} 
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({listings.length} matches)
              </span>
            </h1>
          </div>

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
            <div className="py-20 flex flex-col items-center justify-center gap-6">
              <div className="size-20 rounded-2xl border border-border bg-surface/40 flex items-center justify-center">
                <PackageOpen className="size-10 text-muted-foreground" />
              </div>
              <div className="text-center max-w-sm">
                <h2 className="font-display text-xl font-bold">No listings found</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  We couldn't find any active listings matching your query. Try broadening your keywords or changing the category.
                </p>
              </div>
            </div>
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
