// src/routes/_authenticated/admin.subscriptions.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { PanelCard, EmptyState } from "@/components/seller/SellerShell";
import { 
  Sparkles, 
  RefreshCw, 
  Search, 
  Settings, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Award,
  User,
  Plus
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions Manager — HUXZAIN Admin" }] }),
  component: SubscriptionsManager,
});

interface SubscriberRecord {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

function SubscriptionsManager() {
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<SubscriberRecord | null>(null);
  
  // Edit plan state
  const [selectedTier, setSelectedTier] = useState("free");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = getSupabase();

  const fetchSubscribers = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Fetch all sellers from profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, username, display_name, email")
        .eq("is_seller", true);

      if (pErr) throw pErr;

      if (profiles && profiles.length > 0) {
        const uids = profiles.map((p) => p.id);
        
        // 2. Fetch their seller_subscriptions details
        const { data: subs, error: sErr } = await supabase
          .from("seller_subscriptions")
          .select("seller_id, plan_name, expiry_date, status, suspension_status")
          .in("seller_id", uids);

        if (sErr) throw sErr;

        // 3. Map together
        const records = profiles.map((p) => {
          const sub = subs?.find((s) => s.seller_id === p.id);
          return {
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            email: p.email,
            subscription_tier: sub ? sub.plan_name.toLowerCase() : "free",
            subscription_expires_at: sub ? sub.expiry_date : null
          };
        });

        setSubscribers(records);
      } else {
        setSubscribers([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to load subscribers list: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const openEditModal = (user: SubscriberRecord) => {
    setEditingUser(user);
    setSelectedTier(user.subscription_tier || "free");
    
    if (user.subscription_expires_at) {
      setSelectedExpiry(new Date(user.subscription_expires_at).toISOString().split("T")[0]);
    } else {
      setSelectedExpiry("");
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editingUser) return;

    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const staffId = authUser.user?.id;

      const expiryIso = selectedExpiry ? new Date(selectedExpiry).toISOString() : null;

      // Get configuration for target plan from configuration table
      const { data: planConfig, error: cfgErr } = await supabase
        .from("subscription_plans_config")
        .select("boost_tokens_per_month")
        .eq("id", selectedTier)
        .single();

      if (cfgErr) throw cfgErr;
      const tokens = planConfig?.boost_tokens_per_month || 0;

      const planNameMap: Record<string, string> = {
        free: "Free",
        verified: "Verified",
        pro: "Pro",
        elite: "Elite",
        enterprise: "Enterprise"
      };
      const planName = planNameMap[selectedTier] || "Free";

      // Profiles tier name matching Tanstack tier context mapping
      let profileTier = "standard";
      if (selectedTier === "pro") profileTier = "pro";
      else if (selectedTier === "elite") profileTier = "elite";
      else if (selectedTier === "enterprise") profileTier = "enterprise";

      // 1. Update profiles table
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          subscription_tier: profileTier,
          subscription_expires_at: expiryIso,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingUser.id);

      if (updErr) throw updErr;

      // 2. Update/Upsert seller_subscriptions table
      const { error: subErr } = await supabase
        .from("seller_subscriptions")
        .upsert({
          seller_id: editingUser.id,
          plan_name: planName,
          start_date: new Date().toISOString(),
          expiry_date: expiryIso,
          status: "Active",
          suspension_status: false,
          boost_tokens_remaining: tokens,
          updated_at: new Date().toISOString()
        }, { onConflict: "seller_id" });

      if (subErr) throw subErr;

      // 3. Log staff action
      if (staffId) {
        await supabase.from("staff_action_logs").insert({
          staff_id: staffId,
          action: "update_seller_subscription",
          target_type: "profile",
          target_id: editingUser.id,
          previous_value: JSON.stringify({
            tier: editingUser.subscription_tier,
            expiry: editingUser.subscription_expires_at
          }),
          new_value: JSON.stringify({
            tier: selectedTier,
            expiry: expiryIso,
            tokens
          }),
          notes: `Manually changed seller subscription plan to ${planName.toUpperCase()} with ${tokens} boost tokens`
        });
      }

      // 4. Notify user
      await supabase.from("notifications").insert({
        user_id: editingUser.id,
        kind: "subscription.updated",
        title: "Subscription Status Changed",
        body: `Your seller subscription plan has been updated to ${planName.toUpperCase()} by the platform administrator.`
      });

      toast.success("Seller subscription tier updated successfully.");
      setEditingUser(null);
      await fetchSubscribers();
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to update subscription: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = subscribers.filter((sub) => {
    const matchesPlan = planFilter === "all" || (sub.subscription_tier || "free") === planFilter;
    
    const name = sub.display_name || sub.username || "";
    const email = sub.email || "";
    
    const matchesSearch =
      sub.id.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
      
    return matchesPlan && matchesSearch;
  });

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case "enterprise":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "elite":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "pro":
        return "text-gold bg-gold/10 border-gold/20";
      case "verified":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "free":
      case null:
      default:
        return "text-muted-foreground bg-surface border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-gold" /> Seller Subscriptions Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track premium subscription tiers, manually override plan structures, and extend active plans.
          </p>
        </div>
        <button
          onClick={fetchSubscribers}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm hover:border-gold/50 cursor-pointer bg-surface/20"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid md:grid-cols-3 gap-3 bg-surface/20 p-4 rounded-2xl border border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Seller ID, Username, Email..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          />
        </div>
        <div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-black outline-none text-xs text-foreground focus:border-gold"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="elite">Elite Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>
        <div className="text-right flex items-center justify-end text-xs text-muted-foreground font-medium">
          Showing {filtered.length} active sellers
        </div>
      </div>

      {/* Subscribers Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No sellers found" desc="No sellers meet the specified subscription filter." />
      ) : (
        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Seller Username</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Plan Tier</th>
                  <th className="px-6 py-4">Plan Expiration</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-surface/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {sub.display_name || sub.username || "Anonymous Seller"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {sub.id}</div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{sub.email || "No email"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getTierColor(sub.subscription_tier)}`}>
                        {sub.subscription_tier ? sub.subscription_tier.toUpperCase() : "FREE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {sub.subscription_expires_at ? (
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-gold" />
                          {new Date(sub.subscription_expires_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">— (No Expiry)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-surface border border-border hover:border-gold/30 text-foreground transition-all cursor-pointer"
                      >
                        <Settings className="size-3.5 mr-1" /> Adjust Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Adjust Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdatePlan} className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-bold text-lg text-gold flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
              <Award className="size-5" /> Adjust Subscription Tier
            </h3>
            
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-surface/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {editingUser.display_name || editingUser.username}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {editingUser.email}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Subscription Plan Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-black focus:border-gold outline-none text-sm text-foreground"
                >
                  <option value="free">Free / Basic Seller</option>
                  <option value="verified">Verified Seller</option>
                  <option value="pro">Pro Seller Plan</option>
                  <option value="elite">Elite Seller Plan</option>
                  <option value="enterprise">Enterprise Partner Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Plan Expiration Date</label>
                <input
                  type="date"
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface/30 focus:border-gold outline-none text-sm text-foreground font-mono"
                />
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">Leave blank for lifetime/no-expiry manual configurations.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="h-10 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-4 rounded-xl bg-gold text-black text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all border-none cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
