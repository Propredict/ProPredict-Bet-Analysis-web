import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Favorites hook — depends ONLY on userId + Supabase backend.
 * No push notification or subscription/entitlement logic here.
 *
 * Race-condition guard: during app reload the auth state may briefly
 * be null while rehydrating. We track `hasEverHadUser` so we never
 * wipe an existing favourites set just because getUser() temporarily
 * returns null.
 */

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const isMounted = useRef(true);
  // Guard: once we've seen a real user, don't wipe favorites on transient null
  const hasEverHadUser = useRef(false);

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted.current) {
          // Only clear if we never had a user (true guest / explicit logout).
          // During app reload getUser() may briefly return null — skip clearing.
          if (!hasEverHadUser.current) {
            setFavorites(new Set());
          }
          setIsLoading(false);
        }
        return;
      }

      // We've confirmed a real user exists
      hasEverHadUser.current = true;

      const { data, error } = await supabase
        .from("favorites")
        .select("match_id")
        .eq("user_id", user.id);

      if (error) throw error;

      if (isMounted.current) {
        const favoriteIds = new Set<string>(
          (data as { match_id: string }[] | null)?.map((f) => f.match_id) || []
        );
        setFavorites(favoriteIds);
        console.log("[Favorites] Fetched", favoriteIds.size, "favorites from DB");
      }
    } catch (error) {
      console.error("[Favorites] Error fetching:", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    hasEverHadUser.current = false;
    fetchFavorites();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // On explicit sign-out, reset the guard so favorites clear properly
      if (event === "SIGNED_OUT") {
        hasEverHadUser.current = false;
        setFavorites(new Set());
        setIsLoading(false);
        return;
      }
      // For all other events (SIGNED_IN, TOKEN_REFRESHED, etc.) re-fetch
      fetchFavorites();
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (matchId: string, navigate?: ReturnType<typeof useNavigate>) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
          .eq("user_id", user.id)
          .eq("match_id", matchId);
        if (error) throw error;

        const updated = new Set(favorites);
        updated.delete(matchId);
        setFavorites(updated);
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, match_id: matchId });
        if (error) throw error;

        const updated = new Set(favorites).add(matchId);
        setFavorites(updated);
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
  }, [favorites]);

  const clearAllFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || favorites.size === 0) return;

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;

      setFavorites(new Set());
      toast({ title: "All favorites cleared" });
    } catch (error) {
      console.error("[Favorites] Error clearing:", error);
      toast({ title: "Error", description: "Failed to clear favorites.", variant: "destructive" });
    }
  }, [favorites]);

  const isFavorite = useCallback((matchId: string) => favorites.has(matchId), [favorites]);
  const isSaving = useCallback((matchId: string) => savingIds.has(matchId), [savingIds]);

  return {
    favorites,
    isFavorite,
    isSaving,
    isLoading,
    toggleFavorite,
    clearAllFavorites,
    refetch: fetchFavorites,
  };
}
