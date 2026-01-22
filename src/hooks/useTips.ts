import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tip, TipInsert, TipUpdate } from "@/types/admin";
import { toast } from "sonner";

export function useTips(adminView = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tips", adminView],
    queryFn: async () => {
      const db = supabase as any;
      let q = db.from("tips").select("*");
      
      // For public view, only show published tips from today
      if (!adminView) {
        const today = new Date().toISOString().split("T")[0];
        q = q.eq("status", "published").eq("created_at", today);
      }
      
      const { data, error } = await q.order("created_at_ts", { ascending: false });
      
      if (error) throw error;
      
      return (data || []) as Tip[];
    },
  });

  const createTip = useMutation({
    mutationFn: async (tip: TipInsert) => {
      const { data, error } = await (supabase as any)
        .from("tips")
        .insert({ ...tip, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Tip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      toast.success("Tip created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tip: ${error.message}`);
    },
  });

  const updateTip = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TipUpdate }) => {
      const { data, error } = await (supabase as any)
        .from("tips")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Tip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      toast.success("Tip updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tip: ${error.message}`);
    },
  });

  const deleteTip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("tips")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips"] });
      toast.success("Tip deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tip: ${error.message}`);
    },
  });

  return {
    tips: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTip,
    updateTip,
    deleteTip,
    refetch: query.refetch,
  };
}