import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Match } from "@/hooks/useLiveScores";

/**
 * Subscribes to Supabase Realtime on match_scores_cache.
 * When check-goals detects a goal, it upserts into match_scores_cache.
 * This hook picks up that change and patches the React Query cache
 * so the match card updates instantly (0s delay instead of 30s polling).
 */
export function useRealtimeScoreSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-score-sync")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT or UPDATE
          schema: "public",
          table: "match_scores_cache",
        },
        (payload) => {
          const row = payload.new as {
            match_id: string;
            home_score: number | null;
            away_score: number | null;
          };

          if (!row?.match_id) return;

          console.log(
            `[ScoreSync] Realtime score update: match ${row.match_id} → ${row.home_score}-${row.away_score}`
          );

          // Update all live-scores query caches (today, yesterday, tomorrow, live)
          const queryCache = queryClient.getQueryCache();
          const queries = queryCache.findAll({
            queryKey: ["live-scores"],
          });

          queries.forEach((query) => {
            queryClient.setQueryData<Match[]>(query.queryKey, (old) => {
              if (!old) return old;
              return old.map((match) =>
                match.id === row.match_id
                  ? {
                      ...match,
                      homeScore: row.home_score ?? match.homeScore,
                      awayScore: row.away_score ?? match.awayScore,
                    }
                  : match
              );
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
