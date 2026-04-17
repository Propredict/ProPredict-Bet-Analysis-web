import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Target, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PredictionRow {
  id: string;
  league: string | null;
  prediction: string;
  confidence: number;
  risk_level: string | null;
  result_status: string | null;
  is_value_bet: boolean | null;
  market_trend: string | null;
  match_date: string | null;
}

interface BucketStats {
  label: string;
  total: number;
  won: number;
  lost: number;
  pending: number;
  accuracy: number;
}

const RANGE_DAYS = [7, 14, 30, 60];

function bucketize<T>(items: T[], keyFn: (item: T) => string | null | undefined, statusFn: (item: T) => string | null): BucketStats[] {
  const map = new Map<string, { won: number; lost: number; pending: number }>();
  items.forEach(item => {
    const key = keyFn(item);
    if (!key) return;
    const status = (statusFn(item) || "pending").toLowerCase();
    if (!map.has(key)) map.set(key, { won: 0, lost: 0, pending: 0 });
    const b = map.get(key)!;
    if (status === "won") b.won++;
    else if (status === "lost") b.lost++;
    else b.pending++;
  });
  return Array.from(map.entries())
    .map(([label, b]) => {
      const resolved = b.won + b.lost;
      return {
        label,
        total: b.won + b.lost + b.pending,
        won: b.won,
        lost: b.lost,
        pending: b.pending,
        accuracy: resolved > 0 ? Math.round((b.won / resolved) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function getConfidenceBucket(c: number): string {
  if (c >= 90) return "90%+";
  if (c >= 80) return "80–89%";
  if (c >= 70) return "70–79%";
  if (c >= 60) return "60–69%";
  return "<60%";
}

function getMarketBucket(p: string): string {
  const pred = (p || "").toLowerCase();
  if (pred.includes("over") || pred.includes("under")) return "Over/Under";
  if (pred.includes("btts") || pred.includes("both teams")) return "BTTS";
  if (pred.includes("draw")) return "1X2 — Draw";
  if (pred.includes("home") || pred === "1") return "1X2 — Home";
  if (pred.includes("away") || pred === "2") return "1X2 — Away";
  return "Other";
}

const COLORS = {
  good: "hsl(171, 77%, 36%)",
  warn: "hsl(38, 92%, 50%)",
  bad: "hsl(0, 84%, 60%)",
};

function colorForAccuracy(acc: number) {
  if (acc >= 60) return COLORS.good;
  if (acc >= 50) return COLORS.warn;
  return COLORS.bad;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as BucketStats;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary">Accuracy: {d.accuracy}%</p>
      <p className="text-muted-foreground">Won: {d.won} / Lost: {d.lost} / Pending: {d.pending}</p>
      <p className="text-muted-foreground">Total: {d.total}</p>
    </div>
  );
};

function BucketChart({ data, title, subtitle }: { data: BucketStats[]; title: string; subtitle?: string }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">No data yet</p></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 40, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 10%, 18%)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(160, 12%, 55%)" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "hsl(160, 12%, 55%)" }} width={130} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((d, i) => <Cell key={i} fill={colorForAccuracy(d.accuracy)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BacktestDashboard() {
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("ai_predictions")
        .select("id, league, prediction, confidence, risk_level, result_status, is_value_bet, market_trend, match_date")
        .gte("match_date", since.toISOString().split("T")[0])
        .order("match_date", { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error) {
        console.error("[Backtest] load error:", error);
        setRows([]);
      } else {
        setRows((data || []) as PredictionRow[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [days]);

  const summary = useMemo(() => {
    const won = rows.filter(r => r.result_status === "won").length;
    const lost = rows.filter(r => r.result_status === "lost").length;
    const pending = rows.length - won - lost;
    const resolved = won + lost;
    const acc = resolved > 0 ? Math.round((won / resolved) * 1000) / 10 : 0;
    return { won, lost, pending, total: rows.length, accuracy: acc };
  }, [rows]);

  const byLeague = useMemo(() => bucketize(rows, r => r.league, r => r.result_status).slice(0, 15), [rows]);
  const byMarket = useMemo(() => bucketize(rows, r => getMarketBucket(r.prediction), r => r.result_status), [rows]);
  const byConfidence = useMemo(() => {
    const order = ["<60%", "60–69%", "70–79%", "80–89%", "90%+"];
    return bucketize(rows, r => getConfidenceBucket(r.confidence), r => r.result_status)
      .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }, [rows]);
  const byRisk = useMemo(() => {
    const order = ["low", "medium", "high"];
    return bucketize(rows, r => (r.risk_level || "unknown").toLowerCase(), r => r.result_status)
      .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }, [rows]);
  const byValueBet = useMemo(() => bucketize(rows, r => r.is_value_bet ? "Value Bet" : "Standard", r => r.result_status), [rows]);
  const byTrend = useMemo(() => bucketize(rows, r => r.market_trend || "no signal", r => r.result_status), [rows]);

  // Find biggest loss leaders
  const worstLeagues = useMemo(() =>
    byLeague.filter(b => (b.won + b.lost) >= 5).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3),
  [byLeague]);
  const bestLeagues = useMemo(() =>
    byLeague.filter(b => (b.won + b.lost) >= 5).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3),
  [byLeague]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Backtest Dashboard</h1>
          <p className="text-sm text-muted-foreground">Where the model wins and where it loses</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-md p-1 self-start">
          {RANGE_DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded ${days === d ? "bg-background shadow font-semibold" : "text-muted-foreground"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Overall Accuracy</span></div>
            <div className="text-2xl font-bold" style={{ color: colorForAccuracy(summary.accuracy) }}>{summary.accuracy}%</div>
            <p className="text-[10px] text-muted-foreground">{summary.won} won / {summary.lost} lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Won</span></div>
            <div className="text-2xl font-bold text-primary">{summary.won}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Lost</span></div>
            <div className="text-2xl font-bold text-destructive">{summary.lost}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Pending / Total</span></div>
            <div className="text-2xl font-bold">{summary.pending}<span className="text-sm text-muted-foreground"> / {summary.total}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {(worstLeagues.length > 0 || bestLeagues.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bestLeagues.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Top Performing Leagues</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {bestLeagues.map(l => (
                  <div key={l.label} className="flex justify-between items-center text-xs">
                    <span className="truncate">{l.label}</span>
                    <span className="font-bold text-primary">{l.accuracy}% <span className="text-muted-foreground font-normal">({l.won}/{l.won + l.lost})</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {worstLeagues.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" />Where Model Loses Most</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {worstLeagues.map(l => (
                  <div key={l.label} className="flex justify-between items-center text-xs">
                    <span className="truncate">{l.label}</span>
                    <span className="font-bold text-destructive">{l.accuracy}% <span className="text-muted-foreground font-normal">({l.won}/{l.won + l.lost})</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="confidence">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full h-auto">
          <TabsTrigger value="confidence" className="text-xs">Confidence</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
          <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
          <TabsTrigger value="league" className="text-xs">League</TabsTrigger>
          <TabsTrigger value="value" className="text-xs">Value Bet</TabsTrigger>
          <TabsTrigger value="trend" className="text-xs">Odds Trend</TabsTrigger>
        </TabsList>
        <TabsContent value="confidence" className="mt-3">
          <BucketChart data={byConfidence} title="Accuracy by Confidence Bucket" subtitle="Higher confidence should yield higher accuracy" />
        </TabsContent>
        <TabsContent value="risk" className="mt-3">
          <BucketChart data={byRisk} title="Accuracy by Risk Level" subtitle="Low risk should be safer than high risk" />
        </TabsContent>
        <TabsContent value="market" className="mt-3">
          <BucketChart data={byMarket} title="Accuracy by Market Type" subtitle="Identifies markets where model excels or struggles" />
        </TabsContent>
        <TabsContent value="league" className="mt-3">
          <BucketChart data={byLeague} title="Accuracy by League (Top 15)" subtitle="Sorted by total predictions" />
        </TabsContent>
        <TabsContent value="value" className="mt-3">
          <BucketChart data={byValueBet} title="Accuracy: Value Bets vs Standard" subtitle="Value bets should outperform" />
        </TabsContent>
        <TabsContent value="trend" className="mt-3">
          <BucketChart data={byTrend} title="Accuracy by Odds Movement Signal" subtitle="Sharp money signals should add edge" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
