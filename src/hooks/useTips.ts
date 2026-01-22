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
      let query = supabase.from("tips").select("*").order("created_at_ts", { ascending: false });

      // PUBLIC VIEW → only published tips
      if (!includeAll) {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as Tip[];
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
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
    },
  });

  /* ---------- UPDATE ---------- */

  const updateTip = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TipUpdate }) => {
      const { data, error } = await supabase.from("tips").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
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
