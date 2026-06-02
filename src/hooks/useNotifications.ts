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

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
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

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
