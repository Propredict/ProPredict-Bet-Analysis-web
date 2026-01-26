import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useGlobalWinRate() {
  return useQuery({
    queryKey: ["global-win-rate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_win_rate")
        .select("accuracy")
        .single();

      if (error) throw error;
      return data;
    },
  });
}
