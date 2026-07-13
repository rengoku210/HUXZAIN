import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PanelCard } from "@/components/seller/SellerShell";
import { Inbox, Star, Calendar, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seller/reviews")({
  head: () => ({ meta: [{ title: "Reviews — HUXZAIN Seller" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: revs, error } = await supabase
        .from("reviews")
        .select("*, listings:listing_id(title)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (revs && revs.length > 0) {
        const buyerIds = Array.from(new Set(revs.map((r) => r.buyer_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", buyerIds);

        const profilesMap = new Map((profs ?? []).map((p) => [p.id, p]));
        const mapped = revs.map((r) => ({
          ...r,
          buyer: profilesMap.get(r.buyer_id) || { display_name: "Verified Buyer", username: "buyer" },
        }));

        setReviews(mapped);
      } else {
        setReviews([]);
      }
    } catch (e: any) {
      toast.error("Failed to load reviews: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [user?.id]);

  function renderStars(rating: number) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`size-3.5 ${s <= rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buyer feedback shapes your seller score and credibility.
          </p>
        </div>
        <button
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-surface text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 text-gold animate-spin" />
          <span className="text-xs text-muted-foreground">Aggregating reviews score...</span>
        </div>
      ) : (
        <PanelCard title={`Buyer reviews (${reviews.length})`}>
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox size={40} className="text-muted-foreground mb-4 opacity-75" />
              <h2 className="text-base font-semibold">No reviews yet</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Once buyers rate their completed orders, their ratings and reviews will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-border/40">
              {reviews.map((r, idx) => (
                <div key={r.id} className={`pt-4 first:pt-0 flex flex-col gap-2.5`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[10px] font-bold text-gold">
                        {(r.buyer?.display_name || "B").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {r.buyer?.display_name || r.buyer?.username || "Verified Buyer"}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="size-3" />
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {renderStars(r.rating)}
                      <div className="text-[10px] text-gold font-medium truncate max-w-[200px]">
                        Item: {r.listings?.title || "Marketplace listing"}
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <div className="rounded-xl border border-border/50 bg-surface/20 p-3 text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
                      <MessageSquare className="size-3.5 text-gold/60 shrink-0 mt-0.5" />
                      <span>{r.comment}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      )}
    </div>
  );
}
