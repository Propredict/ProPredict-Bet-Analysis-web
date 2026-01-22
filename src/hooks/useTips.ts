import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tip, TipInsert, TipUpdate } from "@/types/admin";
import { toast } from "sonner";

// Mock tips data for development (until Supabase tables are created)
const mockTips: Tip[] = [
  {
    id: "tip-1",
    home_team: "Manchester United",
    away_team: "Liverpool",
    league: "Premier League",
    prediction: "Over 2.5 Goals",
    odds: 1.85,
    confidence: 85,
    kickoff: "15:00",
    tier: "daily",
    status: "published",
    ai_prediction: "Both teams have scored in their last 5 meetings. Expect goals.",
  },
  {
    id: "tip-2",
    home_team: "Barcelona",
    away_team: "Real Madrid",
    league: "La Liga",
    prediction: "BTTS Yes",
    odds: 1.72,
    confidence: 78,
    kickoff: "20:00",
    tier: "daily",
    status: "published",
    ai_prediction: "El Clasico always delivers goals from both sides.",
  },
  {
    id: "tip-3",
    home_team: "Bayern Munich",
    away_team: "Dortmund",
    league: "Bundesliga",
    prediction: "Bayern Win",
    odds: 1.65,
    confidence: 82,
    kickoff: "17:30",
    tier: "exclusive",
    status: "published",
    ai_prediction: "Bayern's home record is exceptional this season.",
  },
  {
    id: "tip-4",
    home_team: "PSG",
    away_team: "Marseille",
    league: "Ligue 1",
    prediction: "PSG -1.5",
    odds: 2.10,
    confidence: 75,
    kickoff: "21:00",
    tier: "exclusive",
    status: "published",
    ai_prediction: "PSG dominates this fixture historically.",
  },
  {
    id: "tip-5",
    home_team: "Juventus",
    away_team: "Inter Milan",
    league: "Serie A",
    prediction: "Under 2.5 Goals",
    odds: 1.90,
    confidence: 80,
    kickoff: "18:00",
    tier: "premium",
    status: "published",
    ai_prediction: "Derby d'Italia tends to be tactically tight.",
  },
  {
    id: "tip-6",
    home_team: "Chelsea",
    away_team: "Arsenal",
    league: "Premier League",
    prediction: "Draw",
    odds: 3.40,
    confidence: 65,
    kickoff: "16:30",
    tier: "premium",
    status: "published",
    ai_prediction: "London derbies often end in stalemates.",
  },
];

export function useTips(adminView = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tips", adminView],
    queryFn: async () => {
      // Try to fetch from Supabase first
      try {
        let query = (supabase as any).from("tips").select("*");
        
        // For public view, only show published tips from today
        if (!adminView) {
          const today = new Date().toISOString().split("T")[0];
          query = query.eq("status", "published").eq("created_at", today);
        }
        
        const { data, error } = await query.order("created_at_ts", { ascending: false });
        
        if (error) throw error;
        
        // If we have data from Supabase, use it
        if (data && data.length > 0) {
          return data as Tip[];
        }
      } catch (e) {
        // Supabase table doesn't exist yet, use mock data
        console.log("Using mock tips data");
      }
      
      // Return mock data for development
      if (!adminView) {
        return mockTips.filter(t => t.status === "published");
      }
      return mockTips;
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
