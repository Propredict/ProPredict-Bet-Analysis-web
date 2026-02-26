import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

/**
 * Favorites hook — depends ONLY on userId + Supabase backend.
 * No push notification or entitlement logic.
 */
export function useFavorites() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const isMounted = useRef(true);

  const fetchFavoritesByUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("match_id")
        .eq("user_id", userId);

      if (error) throw error;

      if (isMounted.current) {
        const favoriteIds = new Set<string>(
          (data as { match_id: string }[] | null)?.map((f) => f.match_id) || [],
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
    if (user?.id) return user.id;

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    return currentUser?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    isMounted.current = true;

    if (authLoading) {
      setIsLoading(true);
      return () => {
        isMounted.current = false;
      };
    }

    const userId = user?.id ?? null;

    if (userId) {
      setIsLoading(true);
      void fetchFavoritesByUser(userId);
    } else {
      setFavorites(new Set());
      setIsLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
  }, [authLoading, user?.id, fetchFavoritesByUser]);

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
          const { error } = await supabase.from("favorites").insert({ user_id: userId, match_id: matchId });

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
    [favorites, getCurrentUserId],
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

