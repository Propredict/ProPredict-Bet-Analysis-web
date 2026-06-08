import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Tables are new; types will regenerate after the migration runs.
const db = supabase as any;

export interface MatchComment {
  id: string;
  match_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProfileMini {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export function useMatchComments(matchId: string | null, enabled: boolean) {
  const { user } = useAuth();
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await db
        .from("match_comments")
        .select("id, match_id, user_id, content, created_at, updated_at, edited")
        .eq("match_id", matchId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (err) throw err;
      const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string)));
      let profiles: ProfileMini[] = [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, avatar_url")
          .in("user_id", userIds);
        profiles = profs ?? [];
      }
      const pmap = new Map(profiles.map((p) => [p.user_id, p]));
      setComments(
        (rows ?? []).map((r: any) => ({
          ...r,
          username: pmap.get(r.user_id)?.username ?? null,
          full_name: pmap.get(r.user_id)?.full_name ?? null,
          avatar_url: pmap.get(r.user_id)?.avatar_url ?? null,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!enabled || !matchId) return;
    hydrate();
  }, [enabled, matchId, hydrate]);

  // Realtime — refetch on any insert/update/delete for this match
  useEffect(() => {
    if (!enabled || !matchId) return;
      const channel = supabase
      .channel(`match-comments-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_comments", filter: `match_id=eq.${matchId}` },
        () => hydrate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, matchId, hydrate]);

  const post = useCallback(
    async (content: string) => {
      if (!user || !matchId) throw new Error("not_authenticated");
      const clean = content.trim().slice(0, 500);
      if (!clean) return;
      const { error: err } = await db
        .from("match_comments")
        .insert({ match_id: matchId, user_id: user.id, content: clean });
      if (err) throw err;
    },
    [user, matchId]
  );

  const edit = useCallback(
    async (id: string, content: string) => {
      if (!user) throw new Error("not_authenticated");
      const clean = content.trim().slice(0, 500);
      if (!clean) return;
      const { error: err } = await db
        .from("match_comments")
        .update({ content: clean })
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw err;
    },
    [user]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) throw new Error("not_authenticated");
      const { error: err } = await db.from("match_comments").delete().eq("id", id);
      if (err) throw err;
    },
    [user]
  );

  const report = useCallback(
    async (id: string, reason?: string) => {
      if (!user) throw new Error("not_authenticated");
      const { error: err } = await db
        .from("match_comment_reports")
        .insert({ comment_id: id, reporter_id: user.id, reason: reason ?? null });
      if (err && !err.message.toLowerCase().includes("duplicate")) throw err;
    },
    [user]
  );

  return { comments, loading, error, refetch: hydrate, post, edit, remove, report };
}