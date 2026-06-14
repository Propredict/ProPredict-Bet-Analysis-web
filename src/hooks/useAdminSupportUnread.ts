import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

/**
 * Global unread badge for admins — counts user-sent messages not yet read by admin
 * across ALL conversations. Subscribes to realtime so new messages bump the count
 * and trigger a toast.
 */
export function useAdminSupportUnread() {
  const { isAdmin } = useAdminAccess();
  const [count, setCount] = useState(0);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      return;
    }
    const { count: c } = await db
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "user")
      .eq("read_by_admin", false);
    setCount(c ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-support-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload: any) => {
          if (payload.new?.sender_role === "user") {
            toast({
              title: "New support message",
              description: String(payload.new.content ?? "").slice(0, 120),
            });
            refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_messages" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh, toast]);

  return count;
}