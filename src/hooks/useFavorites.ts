import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Favorites hook — depends ONLY on userId + Supabase backend.
 * No push notification or entitlement logic.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const isMounted = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchFavoritesByUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("match_id")
        .eq("user_id", userId);

      if (error) throw error;

      if (isMounted.current) {
        const favoriteIds = new Set<string>(
          (data as { match_id: string }[] | null)?.map((f) => f.match_id) || []
        );
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error("[Favorites] Error fetching:", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    // Prefer session (local, hydration-safe), fallback to getUser when needed
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) return session.user.id;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted.current) return;

      const userId = session?.user?.id ?? null;
      lastUserIdRef.current = userId;

      if (userId) {
        await fetchFavoritesByUser(userId);
      } else {
        setFavorites(new Set());
        setIsLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;

      if (!isMounted.current) return;

      if (event === "SIGNED_OUT") {
        lastUserIdRef.current = null;
        setFavorites(new Set());
        setIsLoading(false);
        return;
      }

      // Guard against transient null during hydration/token transitions.
      if (!nextUserId && lastUserIdRef.current) {
        return;
      }

      if (nextUserId) {
        lastUserIdRef.current = nextUserId;
        setIsLoading(true);
        void fetchFavoritesByUser(nextUserId);
      } else {
        lastUserIdRef.current = null;
        setFavorites(new Set());
        setIsLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchFavoritesByUser]);

  const toggleFavorite = useCallback(
    async (matchId: string, navigate?: ReturnType<typeof useNavigate>) => {
      const userId = await getCurrentUserId();

      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save favorites.",
        });
        if (navigate) navigate("/login");
        return;
      }

      setSavingIds((prev) => new Set(prev).add(matchId));
      const isFavoriteNow = favorites.has(matchId);

      try {
        if (isFavoriteNow) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("match_id", matchId);

          if (error) throw error;

          setFavorites((prev) => {
            const updated = new Set(prev);
            updated.delete(matchId);
            return updated;
          });
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: userId, match_id: matchId });

          if (error) throw error;

          setFavorites((prev) => new Set(prev).add(matchId));
        }
      } catch (error) {
        console.error("[Favorites] Error toggling:", error);
        toast({
          title: "Error",
          description: "Failed to update favorite. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      }
    },
    [favorites, getCurrentUserId]
  );

  const clearAllFavorites = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId || favorites.size === 0) return;

    try {
      const { error } = await supabase.from("favorites").delete().eq("user_id", userId);

      if (error) throw error;

      setFavorites(new Set());
      toast({ title: "All favorites cleared" });
    } catch (error) {
      console.error("[Favorites] Error clearing:", error);
      toast({ title: "Error", description: "Failed to clear favorites.", variant: "destructive" });
    }
  }, [favorites, getCurrentUserId]);

  const isFavorite = useCallback((matchId: string) => favorites.has(matchId), [favorites]);
  const isSaving = useCallback((matchId: string) => savingIds.has(matchId), [savingIds]);

  return {
    favorites,
    isFavorite,
    isSaving,
    isLoading,
    toggleFavorite,
    clearAllFavorites,
    refetch: async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;
      await fetchFavoritesByUser(userId);
    },
  };
}
