import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function calcOddsAccuracy(preds: any[]) {
  const g = { low: [0, 0], mid: [0, 0], high: [0, 0] };

  preds.forEach((p) => {
    if (!p.odds || p.status === "pending") return;

    let key = "mid";
    if (p.odds < 1.7) key = "low";
    if (p.odds > 2.5) key = "high";

    g[key][1]++;
    if (p.status === "won") g[key][0]++;
  });

  return {
    low: g.low[1] ? Math.round((g.low[0] / g.low[1]) * 100) : 0,
    medium: g.mid[1] ? Math.round((g.mid[0] / g.mid[1]) * 100) : 0,
    high: g.high[1] ? Math.round((g.high[0] / g.high[1]) * 100) : 0,
  };
}

export function useAIPredictions() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [oddsAccuracy, setOddsAccuracy] = useState<any>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("ai_predictions").select("*");
      setPredictions(data || []);
      setOddsAccuracy(calcOddsAccuracy(data || []));
      setLoading(false);
    }
    load();
  }, []);

  return { predictions, loading, oddsAccuracy };
}
