import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const accuracyTrendData = [
  { month: "Aug", accuracy: 54 },
  { month: "Sep", accuracy: 56 },
  { month: "Oct", accuracy: 58 },
  { month: "Nov", accuracy: 55 },
  { month: "Dec", accuracy: 60 },
  { month: "Jan", accuracy: 62 },
  { month: "Feb", accuracy: 61 },
];

const probabilityDistData = [
  { range: "0-20%", matches: 12 },
  { range: "21-40%", matches: 28 },
  { range: "41-60%", matches: 45 },
  { range: "61-80%", matches: 38 },
  { range: "81-100%", matches: 15 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-2.5 py-1.5 shadow-lg">
        <p className="text-[10px] font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-primary">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const DistTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-2.5 py-1.5 shadow-lg">
        <p className="text-[10px] font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-primary">{payload[0].value} matches</p>
      </div>
    );
  }
  return null;
};

export const ModelAccuracyTrendChart = () => (
  <Card className="bg-card border-border">
    <CardContent className="p-3 md:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/20">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-xs md:text-sm font-semibold text-foreground">Model Accuracy Trend</h3>
          <p className="text-[9px] text-muted-foreground">Monthly prediction accuracy over recent seasons</p>
        </div>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={accuracyTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(171, 77%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(171, 77%, 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 10%, 18%)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(160, 12%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 70]} tick={{ fontSize: 10, fill: "hsl(160, 12%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="accuracy" stroke="hsl(171, 77%, 36%)" strokeWidth={2} fill="url(#accuracyGradient)" dot={{ r: 3, fill: "hsl(171, 77%, 36%)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 italic">
        * Accuracy = confirmed predictions / total resolved predictions. Updated daily.
      </p>
    </CardContent>
  </Card>
);

export const AIAdoptionChart = () => (
  <Card className="bg-card border-border">
    <CardContent className="p-3 md:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-accent/20">
          <BarChart3 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-xs md:text-sm font-semibold text-foreground">AI Adoption in Sports Analytics</h3>
          <p className="text-[9px] text-muted-foreground">How users and industries embrace AI-driven insights</p>
        </div>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={[
              { category: "Trust AI Analysis", percentage: 72 },
              { category: "Use AI Daily", percentage: 65 },
              { category: "Prefer Data > Opinion", percentage: 81 },
              { category: "AI Improves Decisions", percentage: 68 },
              { category: "Want More AI Tools", percentage: 74 },
            ]}
            margin={{ top: 5, right: 15, left: 5, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 10%, 18%)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(160, 12%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: "hsl(160, 12%, 55%)" }} axisLine={false} tickLine={false} width={110} />
            <Tooltip
              content={({ active, payload, label }: any) => active && payload?.length ? (
                <div className="bg-card border border-border rounded-md px-2.5 py-1.5 shadow-lg">
                  <p className="text-[10px] font-semibold text-foreground">{label}</p>
                  <p className="text-[10px] text-accent">{payload[0].value}% of users</p>
                </div>
              ) : null}
            />
            <Bar dataKey="percentage" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 italic">
        * Based on industry surveys and global AI adoption research (2025–2026).
      </p>
    </CardContent>
  </Card>
);
