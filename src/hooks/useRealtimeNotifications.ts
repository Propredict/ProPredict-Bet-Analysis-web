import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/** Map content tier to the correct route */
function getTierRoute(type: "tip" | "ticket", tier: string): string {
  const routes: Record<string, Record<string, string>> = {
    tip: {
      premium: "/premium-analysis",
      exclusive: "/pro-analysis",
      daily: "/daily-analysis",
      free: "/daily-analysis",
    },
    ticket: {
      premium: "/premium-predictions",
      exclusive: "/pro-predictions",
      daily: "/daily-predictions",
      free: "/daily-predictions",
    },
  };
  return routes[type]?.[tier] ?? routes[type].daily;
}

function getCategoryLabel(category: string | null): string | null {
  if (category === "diamond_pick") return "💎 Diamond Pick Just Dropped!";
  if (category === "risk_of_the_day") return "🔥 Risk of the Day is LIVE!";
  if (category === "multi_risk") return "🎯 Multi Risk Matches are LIVE!";
  return null;
}

function getTierLabel(type: "tip" | "ticket", tier: string, category?: string | null): string {
  const special = getCategoryLabel(category ?? null);
  if (special) return special;
  if (tier === "premium") return type === "tip" ? "👑 Premium AI Pick Available!" : "👑 Premium AI Combo Available!";
  if (tier === "exclusive") return type === "tip" ? "🔥 Pro AI Pick Available!" : "🔥 Pro AI Combo Available!";
  return type === "tip" ? "⚽ New AI Pick Available!" : "🎫 New AI Combo Available!";
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
            toast(getTierLabel("tip", tier, rec.category), {
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
            toast(getTierLabel("ticket", tier, rec.category), {
              description: rec.title || "A new AI Combo is available!",
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
          toast(getTierLabel("tip", tier, rec.category), {
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
          toast(getTierLabel("ticket", tier, rec.category), {
            description: rec.title || "A new AI Combo is available!",
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
            toast("⚽ AI Pick Confirmed!", {
              description: `${matchLabel} — prediction confirmed!`,
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
            toast("🎫 AI Combo Confirmed!", {
              description: rec.title || "An AI Combo prediction confirmed!",
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
