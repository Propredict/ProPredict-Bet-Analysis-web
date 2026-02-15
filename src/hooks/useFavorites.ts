import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Favorite {
  id: string;
  match_id: string;
  created_at: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const isMounted = useRef(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMounted.current) {
          setFavorites(new Set());
          setIsLoading(false);
        }
        return;
      }

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
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchFavorites();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchFavorites();
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (matchId: string, navigate?: ReturnType<typeof useNavigate>) => {
    console.log("[Favorites] toggleFavorite called for matchId:", matchId);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("[Favorites] Auth check - user:", user?.id, "error:", authError?.message);

    if (!user) {
      console.warn("[Favorites] No user session, redirecting to login");
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
      });
      if (navigate) {
        navigate("/login");
      }
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

        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            match_id: matchId,
          });

        if (error) throw error;

        setFavorites((prev) => new Set(prev).add(matchId));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
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

  const isFavorite = useCallback((matchId: string) => favorites.has(matchId), [favorites]);
  const isSaving = useCallback((matchId: string) => savingIds.has(matchId), [savingIds]);

  return {
    favorites,
    isFavorite,
    isSaving,
    isLoading,
    toggleFavorite,
    refetch: fetchFavorites,
  };
}
