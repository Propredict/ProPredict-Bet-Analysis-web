import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ArenaNotification {
  id: string;
  type: string; // 'ft' | 'win' | 'loss'
  title: string;
  message: string;
  match_id: string | null;
  read: boolean;
  created_at: string;
}

export function useArenaNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ArenaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data } = await (supabase as any)
        .from("arena_notifications")
        .select("id, type, title, message, match_id, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      const items: ArenaNotification[] = data || [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to fetch arena notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    await (supabase as any)
      .from("arena_notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await (supabase as any)
      .from("arena_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
