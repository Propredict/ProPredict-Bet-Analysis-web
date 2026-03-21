import { useState, useEffect, useRef } from "react";
import { TrendingUp, Target, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useGlobalWinRate } from "@/hooks/useGlobalWinRate";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Skeleton } from "@/components/ui/skeleton";
import { getIsAndroidApp } from "@/hooks/usePlatform";

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0 || started.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function StatCard({ icon: Icon, label, target, suffix = "", accent = false, delay = 0 }: {
  icon: React.ElementType;
  label: string;
  target: number;
  suffix?: string;
  accent?: boolean;
  delay?: number;
}) {
  const { value, ref } = useCountUp(target);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/60 backdrop-blur border border-border/50 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-lg md:text-xl font-bold text-foreground tabular-nums">
        {value}{suffix}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

const features = [
  { icon: "🔹", title: "AI Match Analysis", desc: "We apply machine learning algorithms to evaluate match performance metrics and generate structured probability insights." },
  { icon: "🔹", title: "Statistical Forecasting", desc: "Our models use historical data and regression techniques to estimate potential match outcomes based on measurable indicators." },
  { icon: "🔹", title: "Performance Trend Tracking", desc: "Users can review team trends, recent form patterns, and long-term performance indicators." },
  { icon: "🔹", title: "Data Transparency", desc: "We provide analytical insights based on measurable statistics — not subjective advice." },
];

export function DashboardHero() {
  const { data: winRate, isLoading: winLoading } = useGlobalWinRate();
  const { predictions, loading: predLoading } = useAIPredictions("today");
  const isAndroid = getIsAndroidApp();

  const isLoading = winLoading || predLoading;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-primary/25 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative p-5 md:p-6 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Dashboard Overview</h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={TrendingUp} label="Win Rate" target={winRate?.accuracy ?? 0} suffix="%" accent delay={0} />
          <StatCard icon={Activity} label="Today's Matches" target={predictions.length} delay={100} />
          <StatCard icon={Target} label="AI Accuracy" target={78} suffix="%" accent delay={200} />
          <StatCard icon={Zap} label="Won / Lost" target={winRate?.won ?? 0} suffix={`/${winRate?.lost ?? 0}`} delay={300} />
        </div>

        {/* Features grid – web only */}
        {!isAndroid && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="bg-card/60 backdrop-blur border border-border/50 rounded-lg p-3.5 animate-fade-in" style={{ animationDelay: `${400 + i * 80}ms` }}>
                <h3 className="text-xs font-semibold text-foreground mb-1">{f.icon} {f.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Learn More CTA – web only */}
        {!isAndroid && (
          <div className="text-center pt-1 animate-fade-in" style={{ animationDelay: "700ms" }}>
            <p className="text-[10px] text-muted-foreground mb-2">👉 Read more about our methodology and mission</p>
            <Link
              to="/about-us"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
            >
              Learn More About ProPredict
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
