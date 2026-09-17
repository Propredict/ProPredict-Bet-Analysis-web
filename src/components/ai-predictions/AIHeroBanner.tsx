import { BarChart3, BrainCircuit, CalendarDays, Layers, ShieldCheck } from "lucide-react";
import heroAsset from "@/assets/ai-hero-banner.jpg.asset.json";
import { cn } from "@/lib/utils";

interface AIHeroBannerProps {
  day: "today" | "tomorrow";
  onDayChange: (d: "today" | "tomorrow") => void;
}

/**
 * Reference-style bright blue hero for the AI Predictions page.
 * Pure presentation — no data or business logic.
 */
export function AIHeroBanner({ day, onDayChange }: AIHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary shadow-lg shadow-primary/25">
      {/* Right-side artwork */}
      <img
        src={heroAsset.url}
        alt=""
        aria-hidden="true"
        width={1920}
        height={640}
        loading="lazy"
        className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[55%] object-cover object-right opacity-70 [mask-image:linear-gradient(to_left,black_30%,transparent)] sm:block"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/90 to-transparent" />
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative px-4 py-5 sm:px-6 md:px-8 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground/70 md:text-xs">
              Smart data. Higher probability.
            </p>
            <h1 className="mt-1 text-3xl font-black leading-none tracking-tight text-white sm:text-4xl md:text-5xl">
              <span className="text-primary">AI</span> Predictions
            </h1>
            <p className="mt-1.5 text-sm font-bold text-white/90 md:text-lg">AI-powered match analysis</p>
            <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-white/65 md:text-sm">
              Advanced AI algorithms analyze form, stats, head-to-head, odds and more to give you the most accurate predictions.
            </p>
          </div>

          {/* Day selector */}
          <div className="flex gap-2 shrink-0">
            <DayPill active={day === "today"} onClick={() => onDayChange("today")}>
              <CalendarDays className="h-4 w-4" />
              Today
            </DayPill>
            <DayPill active={day === "tomorrow"} onClick={() => onDayChange("tomorrow")}>
              <CalendarDays className="h-4 w-4" />
              Tomorrow
            </DayPill>
          </div>
        </div>

        {/* Feature chips */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:grid-cols-4 md:gap-3">
          <Chip icon={<BarChart3 className="h-4 w-4" />} title="100+ Matches Daily" sub="Across top leagues" />
          <Chip icon={<BrainCircuit className="h-4 w-4" />} title="AI Analysis" sub="Data driven insights" />
          <Chip icon={<Layers className="h-4 w-4" />} title="Multiple Markets" sub="1X2, Goals, BTTS, DC" />
          <Chip icon={<ShieldCheck className="h-4 w-4" />} title="Higher Confidence" sub="Smarter predictions" />
        </div>
      </div>

      <span className="absolute bottom-2 right-3 text-[9px] text-white/60">18+ · Play responsibly</span>
    </div>
  );
}

function DayPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-extrabold transition-all duration-300 md:h-11 md:px-5 md:text-sm",
        active
          ? "bg-white text-primary shadow-lg"
          : "border border-white/25 bg-white/10 text-white hover:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-sidebar/60 px-3 py-2.5 backdrop-blur-sm">
      <div className="rounded-lg bg-primary/25 p-1.5 text-accent shrink-0">{icon}</div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] font-bold text-white md:text-xs">{title}</p>
        <p className="truncate text-[9px] text-white/60 md:text-[10px]">{sub}</p>
      </div>
    </div>
  );
}

export default AIHeroBanner;
