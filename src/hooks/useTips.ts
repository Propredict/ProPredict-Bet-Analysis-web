import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tip } from "@/types/admin";
import type { Database } from "@/integrations/supabase/types";

/* =======================
   Database Types
======================= */

type TipInsert = Database["public"]["Tables"]["tips"]["Insert"];
type TipUpdate = Database["public"]["Tables"]["tips"]["Update"];

/* =======================
   Utils
======================= */

// Današnji datum po Europe/Belgrade (YYYY-MM-DD)
function getTodayBelgradeDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
}

/* =======================
   Hook
======================= */

export function useTips(includeAll = false) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  /* ---------- FETCH ---------- */

  const {
    data: tips = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tips", includeAll, userId],
    queryFn: async () => {
      const isAuthenticated = Boolean(userId);
      const table = includeAll || isAuthenticated ? "tips" : "tips_public";

      let query = supabase
        .from(table as any)
        .select("*")
        .order("created_at_ts", { ascending: false });

      if (!includeAll) {
        const today = getTodayBelgradeDate();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });

        query = query
          .lte("tip_date", today)
          .gte("tip_date", thirtyDaysAgoStr);

        if (table === "tips") {
          query = query.eq("status", "published");
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as unknown as Tip[];
    },
  });

  /* ---------- CREATE ---------- */

  const createTip = useMutation({
    mutationFn: async (tip: Omit<TipInsert, "created_by">) => {
      const { data, error } = await supabase
        .from("tips")
        .insert({
          ...tip,
          created_by: session?.user?.id ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      queryClient.invalidateQueries({ queryKey: ["tip-accuracy"] });
      queryClient.invalidateQueries({ queryKey: ["tip-counts"] });
      queryClient.invalidateQueries({ queryKey: ["global-win-rate"] });
    },
  });

  /* ---------- UPDATE ---------- */

  const updateTip = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TipUpdate }) => {
      const { data, error } = await supabase
        .from("tips")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      queryClient.invalidateQueries({ queryKey: ["tip-accuracy"] });
      queryClient.invalidateQueries({ queryKey: ["tip-counts"] });
      queryClient.invalidateQueries({ queryKey: ["global-win-rate"] });
    },
  });

  /* ---------- DELETE ---------- */

  const deleteTip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      queryClient.invalidateQueries({ queryKey: ["tip-accuracy"] });
      queryClient.invalidateQueries({ queryKey: ["tip-counts"] });
      queryClient.invalidateQueries({ queryKey: ["global-win-rate"] });
    },
  });

  return {
    tips,
    isLoading,
    error,
    refetch,
    createTip,
    updateTip,
    deleteTip,
  };
}
