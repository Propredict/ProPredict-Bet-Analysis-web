import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Star, Quote, Users, Target, BarChart3, Crown, Smartphone, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


const testimonials = [
  { name: "Luka87", badge: "Analyst", rating: 5, comment: "The AI predictions are incredibly accurate. I've been using ProPredict for 3 months and the insights have been game-changing." },
  { name: "MilanTips", badge: "Premium", rating: 5, comment: "Best sports analysis platform I've found. The premium predictions alone are worth the subscription." },
  { name: "ProAnalyst", badge: "Expert", rating: 4, comment: "Solid AI analysis with great accuracy. The match previews give me an edge every matchday." },
  { name: "StefanPro", badge: "Premium", rating: 5, comment: "Upgraded to Premium last month — the VIP insights are next level. Highly recommend!" },
  { name: "GoalMaster99", badge: "Analyst", rating: 5, comment: "I love how the AI breaks down every match. The confidence ratings are surprisingly reliable." },
  { name: "DataKing", badge: "Expert", rating: 4, comment: "Clean interface, accurate predictions, and outstanding value. What more could you ask for?" },
];

const stats = [
  { value: "92%", label: "Prediction Accuracy", sub: "Top Rated", icon: Target, color: "primary" },
  { value: "10K+", label: "Active Users", sub: "Growing Daily", icon: Users, color: "primary" },
  { value: "500+", label: "Daily Analyses", sub: "AI Powered", icon: BarChart3, color: "primary" },
  { value: "4.9", label: "User Rating", sub: "Loved by Users", icon: Star, isStar: true, color: "amber" },
];

export function DashboardSocialProof() {
  const [current, setCurrent] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsSliding(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length);
        setIsSliding(false);
      }, 300);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[current];
  const badgeColor = t.badge === "Premium"
    ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
    : t.badge === "Expert"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-primary/15 text-primary border-primary/30";

  return (
    <section className="space-y-4">
      {/* Animated headline */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-primary/90 font-medium">
        <Users className="h-4 w-4" />
        <span>Join 10,000+ smart users improving their prediction accuracy daily.</span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isAmber = stat.color === "amber";
          return (
            <Card
              key={index}
              className={`relative overflow-hidden p-3 sm:p-4 bg-card/80 border-border/60 hover:border-primary/30 transition-colors group`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border ${
                  isAmber
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-primary/10 border-primary/30 text-primary"
                }`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-lg sm:text-2xl font-bold ${isAmber ? "text-amber-400" : "text-primary"}`}>
                      {stat.value}
                    </span>
                    {stat.isStar && <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 fill-amber-400" />}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                </div>
              </div>
              <div className="mt-2.5">
                <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isAmber
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-primary/10 border-primary/30 text-primary"
                }`}>
                  {isAmber ? <Star className="h-3 w-3 fill-current" /> : <Crown className="h-3 w-3" />}
                  {stat.sub}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Testimonial Slider */}
      <Card className="p-4 sm:p-5 bg-card/80 border-border/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/40 to-transparent" />
        <div
          className={`flex items-start gap-3 sm:gap-4 transition-all duration-300 ease-in-out ${
            isSliding
              ? "opacity-0 -translate-x-4"
              : "opacity-100 translate-x-0"
          }`}
        >
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base">
            {t.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-foreground">{t.name}</span>
              <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0 border ${badgeColor}`}>
                {t.badge}
              </Badge>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                      i < t.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-primary/30 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "{t.comment}"
              </p>
            </div>
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsSliding(true); setTimeout(() => { setCurrent(i); setIsSliding(false); }, 300); }}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}
