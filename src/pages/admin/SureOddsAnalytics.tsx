import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MousePointerClick, ShoppingCart, Unlock, TrendingUp } from "lucide-react";

type EventType = "cta_click" | "checkout_started" | "unlocked";

interface EventRow {
  event_type: EventType;
  source: string | null;
  platform: string | null;
  event_date: string;
  user_id: string | null;
}

const RANGE_DAYS = 30;

export default function SureOddsAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sure-odds-analytics"],
    queryFn: async (): Promise<EventRow[]> => {
      const since = new Date(Date.now() - RANGE_DAYS * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("sure_odds_events")
        .select("event_type, source, platform, event_date, user_id")
        .gte("event_date", since)
        .order("event_date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    const count = (t: EventType) => rows.filter((r) => r.event_type === t).length;
    const clicks = count("cta_click");
    const checkouts = count("checkout_started");
    const unlocks = count("unlocked");

    const bySource = new Map<string, { clicks: number; checkouts: number; unlocks: number }>();
    const byDay = new Map<string, { clicks: number; checkouts: number; unlocks: number }>();

    for (const r of rows) {
      const s = r.source ?? "unknown";
      const entry = bySource.get(s) ?? { clicks: 0, checkouts: 0, unlocks: 0 };
      const day = byDay.get(r.event_date) ?? { clicks: 0, checkouts: 0, unlocks: 0 };
      const key =
        r.event_type === "cta_click" ? "clicks" : r.event_type === "checkout_started" ? "checkouts" : "unlocks";
      entry[key as "clicks"]++;
      day[key as "clicks"]++;
      bySource.set(s, entry);
      byDay.set(r.event_date, day);
    }

    return {
      clicks,
      checkouts,
      unlocks,
      conversion: clicks ? Math.round((unlocks / clicks) * 1000) / 10 : 0,
      bySource: [...bySource.entries()].sort((a, b) => b[1].clicks - a[1].clicks),
      byDay: [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "CTA Clicks", value: stats.clicks, icon: MousePointerClick, hint: "Sure Odds 2+ button clicks" },
    { label: "Checkouts Started", value: stats.checkouts, icon: ShoppingCart, hint: "Play / Stripe opened" },
    { label: "Unlocked", value: stats.unlocks, icon: Unlock, hint: "Ticket unlocked after purchase" },
    { label: "Click → Unlock", value: `${stats.conversion}%`, icon: TrendingUp, hint: "Conversion rate" },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="text-xl font-bold">Sure Odds 2+ Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Clicks, started purchases and unlocks (last {RANGE_DAYS} days)
        </p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive">
          Tracking table is not available yet: {(error as Error).message}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="text-[10px] text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">By source</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-2">Source</th>
                <th>Clicks</th>
                <th>Checkouts</th>
                <th>Unlocks</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySource.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground">No events yet</td></tr>
              )}
              {stats.bySource.map(([source, s]) => (
                <tr key={source} className="border-t border-border/40">
                  <td className="py-2 font-medium">{source}</td>
                  <td>{s.clicks}</td>
                  <td>{s.checkouts}</td>
                  <td>{s.unlocks}</td>
                  <td>{s.clicks ? Math.round((s.unlocks / s.clicks) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Daily breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-2">Date</th>
                <th>Clicks</th>
                <th>Checkouts</th>
                <th>Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {stats.byDay.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-muted-foreground">No events yet</td></tr>
              )}
              {stats.byDay.map(([day, s]) => (
                <tr key={day} className="border-t border-border/40">
                  <td className="py-2 font-medium">{day}</td>
                  <td>{s.clicks}</td>
                  <td>{s.checkouts}</td>
                  <td>{s.unlocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
