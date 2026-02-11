import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Subscribes to Supabase Realtime on tips & tickets tables.
 * Shows a sonner toast when new content is published.
 */
export function useRealtimeNotifications() {
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel("web-publish-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tips",
          filter: "status=eq.published",
        },
        (payload) => {
          const rec = payload.new as any;
          // Only fire when status just changed to published
          if (payload.old && (payload.old as any).status !== "published") {
            toast("⚽ New Tip Available!", {
              description: `${rec.home_team} vs ${rec.away_team}`,
              action: {
                label: "View",
                onClick: () => navigate("/daily-tips"),
              },
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: "status=eq.published",
        },
        (payload) => {
          const rec = payload.new as any;
          if (payload.old && (payload.old as any).status !== "published") {
            toast("🎫 New Ticket Available!", {
              description: rec.title || "A new betting ticket is ready!",
              action: {
                label: "View",
                onClick: () => navigate("/daily-tickets"),
              },
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tips",
          filter: "status=eq.published",
        },
        (payload) => {
          const rec = payload.new as any;
          toast("⚽ New Tip Available!", {
            description: `${rec.home_team} vs ${rec.away_team}`,
            action: {
              label: "View",
              onClick: () => navigate("/daily-tips"),
            },
            duration: 8000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: "status=eq.published",
        },
        (payload) => {
          const rec = payload.new as any;
          toast("🎫 New Ticket Available!", {
            description: rec.title || "A new betting ticket is ready!",
            action: {
              label: "View",
              onClick: () => navigate("/daily-tickets"),
            },
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}
