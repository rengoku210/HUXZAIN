import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Send, Mail, Users, CheckCircle, Search, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/site/ListingCard";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: AdminNewsletter,
});

function AdminNewsletter() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadFeatured() {
      const sb = getSupabase();
      if (!sb) return;
      setLoading(true);
      
      const { data: boostData } = await sb
        .from("listing_boosts")
        .select("listing_id")
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString());

      let ids = boostData?.map((b: any) => b.listing_id) || [];
      if (ids.length > 0) {
        const { data: listData } = await sb
          .from("listings")
          .select("*")
          .in("id", ids)
          .eq("status", "active");
        
        if (listData) {
          setFeaturedListings(listData);
        }
      }
      setLoading(false);
    }
    loadFeatured();
  }, []);

  const handleSend = async () => {
    if (!subject || !message) {
      toast.error("Please provide a subject and message.");
      return;
    }

    setSending(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Database connection unavailable.");

      const { error } = await sb
        .from("campaigns")
        .insert({
          name: subject,
          subject,
          body: message,
          status: "sent",
          type: "newsletter",
          target_segment: "all_buyers",
          featured_listing_id: selectedListingId || null,
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Newsletter broadcast saved and queued for delivery.");
      setSubject("");
      setMessage("");
      setSelectedListingId(null);
    } catch (err: any) {
      console.error("[Newsletter] Send failed:", err);
      toast.error(`Failed to send newsletter: ${err?.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 border-b border-border/60 pb-5">
        <Mail className="size-6 text-gold" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Featured Newsletter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send promotional emails and feature boosted listings to all registered buyers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface/30 p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. 🔥 Top Picks for this Week!"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Message Body</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your email content..."
                rows={6}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-gold resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full h-12 rounded-xl bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110 flex items-center justify-center gap-2"
          >
            {sending ? "Sending..." : "Send Newsletter Broadcast"} <Send size={16} />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-surface/30 p-5 flex flex-col h-full">
          <label className="text-sm font-semibold mb-3 block">
            Select a Featured Listing (Optional)
          </label>
          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading featured listings...</p>
            ) : featuredListings.length === 0 ? (
              <div className="text-center py-10 bg-surface/50 rounded-xl border border-dashed border-border">
                <AlertCircle className="size-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active boosted listings found.</p>
              </div>
            ) : (
              featuredListings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListingId(listing.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex gap-3 transition-colors ${
                    selectedListingId === listing.id
                      ? "border-gold bg-gold/5"
                      : "border-border bg-background hover:border-gold/30"
                  }`}
                >
                  <div className="size-12 rounded bg-surface shrink-0 overflow-hidden relative">
                    {listing.cover_image_url ? (
                      <img src={listing.cover_image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">₹{listing.price_inr}</p>
                  </div>
                  {selectedListingId === listing.id && (
                    <div className="flex items-center">
                      <CheckCircle className="size-5 text-gold" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
