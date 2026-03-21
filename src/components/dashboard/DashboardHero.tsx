import { useState, useEffect, useRef } from "react";
import { TrendingUp, Target, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
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

function StatCard({ icon: Icon, label, target, suffix = "", delay = 0 }: {
  icon: React.ElementType;
  label: string;
  target: number;
  suffix?: string;
  delay?: number;
}) {
  const { value, ref } = useCountUp(target);

  return (
    <Card
      ref={ref}
      className="text-center py-3 px-1.5 bg-gradient-to-b from-primary/10 via-card to-card border-primary/20 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-center mb-1">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-base sm:text-xl font-bold text-primary tabular-nums">
        {value}{suffix}
      </span>
      <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </Card>
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
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Dashboard Overview</h2>
      </div>

      {/* Stats grid – same style as Social Proof stats */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <StatCard icon={TrendingUp} label="Win Rate" target={winRate?.accuracy ?? 0} suffix="%" delay={0} />
        <StatCard icon={Activity} label="Today's Matches" target={predictions.length} delay={100} />
        <StatCard icon={Target} label="AI Accuracy" target={78} suffix="%" delay={200} />
        <StatCard icon={Zap} label="Won / Lost" target={winRate?.won ?? 0} suffix={`/${winRate?.lost ?? 0}`} delay={300} />
      </div>

      {/* Features grid – web only */}
      {!isAndroid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3">
          {features.map((f, i) => (
            <Card
              key={i}
              className="p-3.5 bg-gradient-to-b from-card to-card/80 border-border/50 animate-fade-in"
              style={{ animationDelay: `${400 + i * 80}ms` }}
            >
              <h3 className="text-xs font-semibold text-foreground mb-1">{f.icon} {f.title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Learn More CTA – web only */}
      {!isAndroid && (
        <Card className="p-4 bg-gradient-to-b from-card to-card/80 border-border/50 text-center animate-fade-in" style={{ animationDelay: "700ms" }}>
          <p className="text-[10px] text-muted-foreground mb-2">👉 Read more about our methodology and mission</p>
          <Link
            to="/about-us"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
          >
            Learn More About ProPredict
          </Link>
        </Card>
      )}
    </section>
  );
}
