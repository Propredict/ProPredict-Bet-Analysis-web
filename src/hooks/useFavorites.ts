import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Favorite {
  id: string;
  match_id: string;
  created_at: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFavorites(new Set());
        setIsLoading(false);
        return;
      }

      // Using type assertion since favorites table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("match_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const favoriteIds = new Set<string>(
        (data as { match_id: string }[] | null)?.map((f) => f.match_id) || []
      );
      setFavorites(favoriteIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchFavorites();
    });

    return () => subscription.unsubscribe();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (matchId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    // Add to saving state
    setSavingIds((prev) => new Set(prev).add(matchId));

    const isFavorite = favorites.has(matchId);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await (supabase as any)
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
        // Add to favorites
        const { error } = await (supabase as any)
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
  }, [favorites, toast]);

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
