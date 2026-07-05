import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ListingCard } from "@/components/site/ListingCard";
import { primaryCategories, getDbSlugFromUiSlug, getUiSlugFromDbSlug } from "@/lib/marketplace-data";
import { 
  ChevronRight, 
  PackageOpen, 
  ShoppingBag,
  Search,
  ShieldCheck,
  BadgeCheck,
  Lock,
  Headphones,
  X,
  LayoutGrid,
  ArrowRight,
  TrendingUp
} from "lucide-react";
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

  // Subcategory pathway states
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [showAllSubs, setShowAllSubs] = useState(false);

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
      const childCats = dbCat ? categories.filter((c) => c.parent_id === dbCat.id) : [];
      setChildren(childCats);

      // Build listing query targeting parent, subcategories, and grandchildren
      let targetIds = [resolved.id];
      if (dbCat) {
        const subIds = childCats.map(c => c.id);
        targetIds = [...targetIds, ...subIds];
        const grandIds = categories.filter((c) => subIds.includes(c.parent_id ?? "")).map(c => c.id);
        targetIds = [...targetIds, ...grandIds];
      }

      let query = supabase
        .from("listings")
        .select("*, profiles(id, display_name, username, subscription_tier, is_verified)")
        .eq("status", "active")
        .in("category_id", targetIds)
        .order("boost_score", { ascending: false })
        .order("created_at", { ascending: false });

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
        console.error("Failed to apply category listing boosts:", err);
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

  const isParentPage = children.length > 0;

  // Helper getters for children layout cards
  const getSubtags = (c: Category) => {
    const subChildren = allCategories.filter(x => x.parent_id === c.id);
    if (subChildren.length > 0) {
      return subChildren.slice(0, 3).map(x => x.name).join(" • ");
    }
    return `Explore ${c.name} assets`;
  };

  const getListingCountVal = (c: Category) => {
    const subChildren = allCategories.filter(x => x.parent_id === c.id);
    const ids = [c.id, ...subChildren.map(x => x.id)];
    return listings.filter(l => ids.includes((l as any).category_id)).length;
  };

  const getSubcategoryIcon = (slugName: string) => {
    const map: Record<string, any> = {
      "ai-tools": ShieldCheck,
      "microsoft": LayoutGrid,
      "adobe": BadgeCheck,
      "developer-tools": Lock,
      "operating-systems": ShieldCheck,
      "antivirus-security": ShieldCheck,
      "vpn-services": Lock,
      "cloud-storage": Headphones,
    };
    return map[slugName] || ShieldCheck;
  };

  const filteredChildren = children.filter((c) =>
    c.name.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  const displayLimit = 11;
  const showViewAllCard = filteredChildren.length > displayLimit;
  const displayedChildren = showViewAllCard
    ? filteredChildren.slice(0, displayLimit)
    : filteredChildren;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-10">
        <Breadcrumb paths={breadcrumb} />

        {category && (
          <CategoryHeroBanner category={category} staticMeta={staticMeta} />
        )}

        {isParentPage ? (
          <div className="space-y-10">
            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: "Escrow Protected", desc: "Funds held safely", icon: ShieldCheck, color: "text-emerald-400" },
                { title: "Verified Sellers", desc: "Strict verification", icon: BadgeCheck, color: "text-gold" },
                { title: "License Protection", desc: "Genuine keys & items", icon: Lock, color: "text-blue-400" },
                { title: "Dedicated Support", desc: "24/7 assistance team", icon: Headphones, color: "text-rose-400" }
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-[#0a0b0d]/50 border border-white/5 shadow-sm text-left">
                  <div className={`p-2.5 rounded-xl bg-surface-elevated border border-white/5 ${badge.color}`}>
                    <badge.icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white leading-normal">{badge.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{badge.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Search Box & Featured Collection filter tags */}
            <div className="space-y-4">
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  placeholder={
                    category?.slug === "gaming-accounts"
                      ? "Search a game..."
                      : category?.slug === "software-tools"
                      ? "Search software..."
                      : `Search inside ${category?.name || "category"}...`
                  }
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-surface border border-border focus:border-gold/50 outline-none text-sm transition-colors text-white"
                />
              </div>

              {/* Horizontal Scroll Pill Filters */}
              {children.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar justify-start md:justify-center">
                  {children.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate({ to: "/category/$slug", params: { slug: getUiSlugFromDbSlug(c.slug) } })}
                      className="px-4 py-1.5 rounded-full border border-white/5 bg-[#0a0b0d]/50 hover:border-gold/30 text-xs font-semibold text-muted-foreground hover:text-white transition-all whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subcategories Selector Grid */}
            <section className="text-left">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-white">
                  {category?.slug === "gaming-accounts" ? "All Games" : `All ${category?.name} Categories`}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    ({children.length}+ items)
                  </span>
                </h3>
                <button
                  onClick={() => setShowAllSubs(true)}
                  className="text-xs text-gold font-bold hover:underline bg-transparent border-none cursor-pointer"
                >
                  View All ({children.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedChildren.map((c) => {
                  const IconComponent = getSubcategoryIcon(c.slug);
                  const listCount = getListingCountVal(c);
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate({ to: "/category/$slug", params: { slug: getUiSlugFromDbSlug(c.slug) } })}
                      className="group p-5 rounded-2xl border border-white/5 bg-[#0d0e11]/80 hover:bg-surface-elevated/70 hover:border-gold/20 transition-all flex items-center justify-between cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:bg-gold/20 transition-all shrink-0">
                          <IconComponent className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white group-hover:text-gold transition-colors truncate">
                            {c.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {getSubtags(c)}
                          </p>
                          <p className="text-[9px] font-mono text-gold mt-1 font-bold">
                            {listCount.toLocaleString()} {listCount === 1 ? "Listing" : "Listings"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  );
                })}

                {/* View All Grid Card in the bottom-right slot */}
                {showViewAllCard && (
                  <div
                    onClick={() => setShowAllSubs(true)}
                    className="group p-5 rounded-2xl border border-gold/20 bg-gold/[0.02] hover:bg-gold/[0.05] transition-all flex items-center justify-center cursor-pointer text-center relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <LayoutGrid className="size-6 text-gold group-hover:scale-105 transition-all" />
                      <div className="font-bold text-sm text-gold">
                        View All {children.length}+ {category?.slug === "gaming-accounts" ? "Games" : "Categories"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Click to browse full marketplace catalogue</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Trending Listings Section */}
            {listings.length > 0 && (
              <section className="text-left pt-4">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-lg text-white">Trending Marketplace Listings</h3>
                  <button
                    onClick={() => {
                      // Trigger normal category view by setting children to empty temporarily
                      setChildren([]);
                    }}
                    className="text-xs text-gold font-bold hover:underline bg-transparent border-none cursor-pointer"
                  >
                    View All listings
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {listings.slice(0, 5).map((l) => (
                    <ListingCard key={l.id} l={l} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-2 text-left">
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
        )}
      </main>
      <Footer />

      {/* View All Categories / Games alphabetized modal list */}
      {showAllSubs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 text-left">
          <div className="bg-surface border border-border/80 w-full max-w-2xl rounded-3xl p-6 relative shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <button
              onClick={() => setShowAllSubs(false)}
              className="absolute top-4 right-4 size-8 rounded-full hover:bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <LayoutGrid className="text-gold size-5" />
                Browse All {category?.slug === "gaming-accounts" ? "Games" : "Categories"} ({children.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Click any of the options below to view its specific active listings.
              </p>
            </div>

            {/* Quick Filter in Modal */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                placeholder="Type to filter full catalogue..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-elevated border border-border focus:border-gold/50 outline-none text-xs text-white"
              />
            </div>

            {/* Alphabetical list content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 scrollbar-thin">
              {Object.entries(
                filteredChildren.reduce<Record<string, Category[]>>((groups, c) => {
                  const firstLetter = c.name.charAt(0).toUpperCase();
                  if (!groups[firstLetter]) groups[firstLetter] = [];
                  groups[firstLetter].push(c);
                  return groups;
                }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([letter, groupCats]) => (
                  <div key={letter} className="space-y-1.5">
                    <div className="text-xs font-bold text-gold border-b border-white/5 pb-1 font-mono">
                      {letter}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {groupCats
                        .sort((x, y) => x.name.localeCompare(y.name))
                        .map((c) => {
                          const listCount = getListingCountVal(c);
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setShowAllSubs(false);
                                navigate({ to: "/category/$slug", params: { slug: getUiSlugFromDbSlug(c.slug) } });
                              }}
                              className="p-2.5 rounded-xl border border-white/5 bg-[#0a0b0d]/50 hover:bg-surface-elevated hover:border-gold/20 transition-all text-xs font-medium text-white hover:text-gold cursor-pointer truncate flex items-center justify-between"
                            >
                              <span className="truncate">{c.name}</span>
                              <span className="text-[8px] font-mono text-muted-foreground/60 shrink-0 ml-1">
                                ({listCount})
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              
              {filteredChildren.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <PackageOpen className="size-10 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No matches found for your search query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

