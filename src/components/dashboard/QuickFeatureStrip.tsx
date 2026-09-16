import { Link } from "react-router-dom";
import { CalendarDays, Crosshair, Lightbulb, Ticket, Crown, Target } from "lucide-react";

const items = [
  { title: "Live Scores", subtitle: "Real-time updates", icon: CalendarDays, to: "/live-scores" },
  { title: "Sure Odds 2+", subtitle: "Safe daily ticket", icon: Crosshair, to: "/sure-odds" },
  { title: "Free Tips", subtitle: "Selected by experts", icon: Lightbulb, to: "/single-tips" },
  { title: "Tiket / Bet Slip", subtitle: "Ready to play", icon: Ticket, to: "/tickets" },
  { title: "Premium Picks", subtitle: "High confidence", icon: Crown, to: "/premium-tickets" },
  { title: "League Stats", subtitle: "Numbers that matter", icon: Target, to: "/league-statistics" },
];

export function QuickFeatureStrip() {
  return (
    <nav aria-label="Quick links" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
      {items.map((item) => (
        <Link
          key={item.title}
          to={item.to}
          className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-primary/25 bg-card px-2 py-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <item.icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-extrabold leading-tight text-sidebar sm:text-sm">{item.title}</span>
          <span className="text-[10px] leading-tight text-muted-foreground">{item.subtitle}</span>
        </Link>
      ))}
    </nav>
  );
}

export default QuickFeatureStrip;
