import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/** Map content tier to the correct route */
function getTierRoute(type: "tip" | "ticket", tier: string): string {
  const routes: Record<string, Record<string, string>> = {
    tip: {
      premium: "/premium-tips",
      exclusive: "/exclusive-tips",
      daily: "/daily-tips",
      free: "/daily-tips",
    },
    ticket: {
      premium: "/premium-tickets",
      exclusive: "/exclusive-tickets",
      daily: "/daily-tickets",
      free: "/daily-tickets",
    },
  };
  return routes[type]?.[tier] ?? routes[type].daily;
}

function getTierLabel(type: "tip" | "ticket", tier: string): string {
  if (tier === "premium") return type === "tip" ? "👑 Premium Tip Available!" : "👑 Premium Ticket Available!";
  if (tier === "exclusive") return type === "tip" ? "🔥 Pro Tip Available!" : "🔥 Pro Ticket Available!";
  return type === "tip" ? "⚽ New Tip Available!" : "🎫 New Ticket Available!";
}

/**
 * Subscribes to Supabase Realtime on tips & tickets tables.
 * Shows a sonner toast when new content is published.
 * Routes to the correct tier page with highlight & plan_required params.
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
          if (payload.old && (payload.old as any).status !== "published") {
            const tier = rec.tier ?? "daily";
            const route = getTierRoute("tip", tier);
            toast(getTierLabel("tip", tier), {
              description: `${rec.home_team} vs ${rec.away_team}`,
              action: {
                label: "View",
                onClick: () => navigate(`${route}?highlight=${rec.id}&plan_required=${tier}`),
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
            const tier = rec.tier ?? "daily";
            const route = getTierRoute("ticket", tier);
            toast(getTierLabel("ticket", tier), {
              description: rec.title || "A new betting ticket is ready!",
              action: {
                label: "View",
                onClick: () => navigate(`${route}?highlight=${rec.id}&plan_required=${tier}`),
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
          const tier = rec.tier ?? "daily";
          const route = getTierRoute("tip", tier);
          toast(getTierLabel("tip", tier), {
            description: `${rec.home_team} vs ${rec.away_team}`,
            action: {
              label: "View",
              onClick: () => navigate(`${route}?highlight=${rec.id}&plan_required=${tier}`),
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
          const tier = rec.tier ?? "daily";
          const route = getTierRoute("ticket", tier);
          toast(getTierLabel("ticket", tier), {
            description: rec.title || "A new betting ticket is ready!",
            action: {
              label: "View",
              onClick: () => navigate(`${route}?highlight=${rec.id}&plan_required=${tier}`),
            },
            duration: 8000,
          });
        }
      )
      // ── Won tips ──
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tips",
        },
        (payload) => {
          const rec = payload.new as any;
          const old = payload.old as any;
          if (rec.result === "won" && old?.result !== "won") {
            const tier = rec.tier ?? "daily";
            const route = getTierRoute("tip", tier);
            const home = rec.home_team ?? "";
            const away = rec.away_team ?? "";
            const matchLabel = home && away ? `${home} vs ${away}` : "Today's pick";
            toast("⚽ Tip WON!", {
              description: `${matchLabel} cashed in!`,
              action: {
                label: "View",
                onClick: () => navigate(`${route}?highlight=${rec.id}&result=won`),
              },
              duration: 8000,
            });
          }
        }
      )
      // ── Won tickets ──
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          const rec = payload.new as any;
          const old = payload.old as any;
          if (rec.result === "won" && old?.result !== "won") {
            const tier = rec.tier ?? "daily";
            const route = getTierRoute("ticket", tier);
            toast("🎫 Ticket WON!", {
              description: rec.title || "A ticket just hit!",
              action: {
                label: "View",
                onClick: () => navigate(`${route}?highlight=${rec.id}&result=won`),
              },
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}
