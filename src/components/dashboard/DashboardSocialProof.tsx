import { useState, useEffect } from "react";
import { Star, Quote, Crown, Users, Target, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const testimonials = [
  { name: "Luka87", badge: "Analyst", rating: 5, comment: "The AI predictions are incredibly accurate. I've been using ProPredict for 3 months and the insights have been game-changing." },
  { name: "MilanTips", badge: "Premium", rating: 5, comment: "Best sports analysis platform I've found. The premium combos alone are worth the subscription." },
  { name: "ProAnalyst", badge: "Expert", rating: 4, comment: "Solid AI analysis with great accuracy. The match previews give me an edge every matchday." },
  { name: "StefanBet", badge: "Premium", rating: 5, comment: "Upgraded to Premium last month — the VIP insights are next level. Highly recommend!" },
  { name: "GoalMaster99", badge: "Analyst", rating: 5, comment: "I love how the AI breaks down every match. The confidence ratings are surprisingly reliable." },
  { name: "TipsterKing", badge: "Expert", rating: 4, comment: "Clean interface, accurate predictions, and great value for money. What more could you ask for?" },
];

const stats = [
  { value: "92%", label: "Prediction Accuracy", icon: Target },
  { value: "10K+", label: "Active Users", icon: Users },
  { value: "500+", label: "Daily Analyses", icon: BarChart3 },
  { value: "4.9", label: "User Rating", icon: Star, isStar: true },
];

export function DashboardSocialProof() {
  const [current, setCurrent] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const navigate = useNavigate();

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
    ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
    : t.badge === "Expert"
    ? "bg-warning/20 text-warning border-warning/40"
    : "bg-primary/20 text-primary border-primary/40";

  return (
    <section className="space-y-3">
      {/* Animated headline */}
      <p className="text-center text-[10px] sm:text-xs text-primary/90 font-medium animate-fade-in">
        Join 10,000+ smart users improving their prediction accuracy daily.
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`text-center py-3 px-1.5 bg-gradient-to-b from-primary/10 via-card to-card border-primary/20 shadow-[0_0_12px_rgba(15,155,142,0.08)] ${
              stat.isStar ? "ring-1 ring-warning/30 shadow-[0_0_18px_rgba(245,196,81,0.12)]" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-base sm:text-xl font-bold text-primary">{stat.value}</span>
              {stat.isStar && <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning fill-warning" />}
            </div>
            <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Testimonial Slider - slides right to left */}
      <Card className="p-3 sm:p-4 bg-gradient-to-b from-card to-card/80 border-border/50 relative overflow-hidden">
        <div
          className={`flex items-start gap-3 transition-all duration-300 ease-in-out ${
            isSliding
              ? "opacity-0 -translate-x-8"
              : "opacity-100 translate-x-0"
          }`}
        >
          <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-primary/40 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">{t.name}</span>
              <Badge variant="outline" className={`text-[8px] sm:text-[9px] px-1.5 py-0 border ${badgeColor}`}>
                {t.badge}
              </Badge>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-warning fill-warning" />
                ))}
                {Array.from({ length: 5 - t.rating }).map((_, i) => (
                  <Star key={`e-${i}`} className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground/30" />
                ))}
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed italic">
              "{t.comment}"
            </p>
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1 mt-2.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsSliding(true); setTimeout(() => { setCurrent(i); setIsSliding(false); }, 300); }}
              className={`h-1 rounded-full transition-all ${
                i === current ? "w-3 bg-primary" : "w-1 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </Card>

      {/* Urgency + CTA */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-[9px] sm:text-[10px] text-warning/80 font-medium">
          🔥 Over 247 users upgraded to Premium this month.
        </p>
        <Button
          size="sm"
          className="h-7 text-[10px] sm:text-xs bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          onClick={() => navigate("/get-premium")}
        >
          <Crown className="h-3 w-3 mr-1" />
          Explore Premium
        </Button>
      </div>
    </section>
  );
}
