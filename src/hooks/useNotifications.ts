import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth/auth-context";

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  // HX-001 schema additions (optional for back-compat with legacy rows).
  link?: string | null;
  category?: string | null;
  priority?: string | null;
  event_key?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const fetchInitial = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setNotifications(data as Notification[]);
      }
      setLoading(false);
    };

    fetchInitial();

    const channelId = `notifications_hook_${user.id}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes", 
        { 
          event: "INSERT", 
          schema: "public", 
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  // Unread "new order" notifications, used for the seller Orders badge.
  const unreadOrderCount = notifications.filter(
    (n) => !n.read_at && (n.kind?.toLowerCase().startsWith("order") ?? false),
  ).length;

  const markAsRead = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    
    if (!error) {
      setNotifications((prev) => 
        prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    
    if (!error) {
      setNotifications((prev) => 
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    }
  };

  return { notifications, unreadCount, unreadOrderCount, loading, markAsRead, markAllAsRead };
}
