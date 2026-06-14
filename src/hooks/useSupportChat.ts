import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface SupportMessage {
  id: string;
  conversation_user_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  content: string;
  read_by_user: boolean;
  read_by_admin: boolean;
  created_at: string;
}

/**
 * useSupportChat - end-user side. Loads the current user's own conversation
 * with the admin team and lets them post new messages.
 */
export function useSupportChat(enabled: boolean) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await db
        .from("support_messages")
        .select("*")
        .eq("conversation_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (err) throw err;
      setMessages((data ?? []) as SupportMessage[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!enabled || !user) return;
    hydrate();
  }, [enabled, user, hydrate]);

  // Realtime
  useEffect(() => {
    if (!enabled || !user) return;
    const channel = supabase
      .channel(`support-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `conversation_user_id=eq.${user.id}`,
        },
        () => hydrate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user, hydrate]);

  const send = useCallback(
    async (content: string) => {
      if (!user) throw new Error("not_authenticated");
      const clean = content.trim().slice(0, 2000);
      if (!clean) return;
      const { error: err } = await db.from("support_messages").insert({
        conversation_user_id: user.id,
        sender_id: user.id,
        sender_role: "user",
        content: clean,
        read_by_user: true,
      });
      if (err) throw err;
    },
    [user]
  );

  const markRead = useCallback(async () => {
    if (!user) return;
    await db
      .from("support_messages")
      .update({ read_by_user: true })
      .eq("conversation_user_id", user.id)
      .eq("sender_role", "admin")
      .eq("read_by_user", false);
  }, [user]);

  const unreadCount = messages.filter(
    (m) => m.sender_role === "admin" && !m.read_by_user
  ).length;

  return { messages, loading, error, send, refetch: hydrate, markRead, unreadCount };
}

/**
 * useSupportUnreadBadge - lightweight unread count for end user, used for the
 * floating button badge without opening the panel.
 */
export function useSupportUnreadBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: c } = await db
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_user_id", user.id)
      .eq("sender_role", "admin")
      .eq("read_by_user", false);
    setCount(c ?? 0);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`support-badge-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `conversation_user_id=eq.${user.id}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return count;
}