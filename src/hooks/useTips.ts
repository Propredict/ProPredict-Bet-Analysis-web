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

  /* ---------- FETCH ---------- */

  const {
    data: tips = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tips", includeAll],
    queryFn: async () => {
      // Admin → base table (all statuses); Public → secure view (masked premium data)
      const table = includeAll ? "tips" : "tips_public";

      let query = supabase
        .from(table as any)
        .select("*")
        .order("created_at_ts", { ascending: false });

      if (!includeAll) {
        const today = getTodayBelgradeDate();
        // View already filters status=published, just filter by date
        query = query.lte("tip_date", today);
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
          // tip_date se setuje u DB (Belgrade)
        })
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
        .update(updates)
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
