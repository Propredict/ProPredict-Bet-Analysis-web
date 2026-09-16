import { BarChart3, Clock, Target, Users } from "lucide-react";

const stats = [
  { icon: BarChart3, value: "1000+", label: "Daily Matches Analyzed" },
  { icon: Target, value: "85%", label: "Average Accuracy (Premium)" },
  { icon: Users, value: "50K+", label: "Active Users" },
  { icon: Clock, value: "24/7", label: "Live Updates" },
];

export function DashboardStatsStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-2xl border-2 border-primary/25 bg-card px-3 py-4 shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <s.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-primary">{s.value}</p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DashboardStatsStrip;
