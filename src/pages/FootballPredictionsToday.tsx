import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Users, Eye, Clock, ChevronRight, Lock, CheckCircle, Download, X, Trophy, Zap, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

interface MatchPick {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string | null;
  league: string | null;
  prediction: string;
  confidence: number;
}

// ── Unlock Popup ──
function UnlockPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/80 backdrop-blur-sm animate-fade-in sm:items-center" onClick={onClose}>
      <div className="relative mx-4 mb-4 w-full max-w-md space-y-5 rounded-2xl border border-primary/25 bg-card p-6 shadow-2xl shadow-primary/20 animate-scale-in sm:mb-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:bg-primary/10 hover:text-primary"><X className="h-5 w-5" /></Button>
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground">Unlock Full Predictions</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">See all predictions, confidence levels and today's best matches inside the app.</p>
        </div>
        <div className="space-y-2.5 rounded-xl border border-primary/10 bg-secondary/60 p-4">
          {["Multiple picks per match", "Daily updated predictions", "AI insights & combos"].map(t => (
            <div key={t} className="flex items-center gap-2.5 text-sm text-foreground"><CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />{t}</div>
          ))}
        </div>
        <Button asChild size="lg" className="h-12 w-full bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"><a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Download App Now</a></Button>
        <p className="text-center text-[10px] text-muted-foreground">Free access available inside app</p>
      </div>
    </div>
  );
}

// ── Match Card with blur ──
function MatchCard({ match, onClick }: { match: MatchPick; onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="group h-auto w-full flex-col items-stretch space-y-3 rounded-xl border border-primary/10 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{match.league || "League"}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{match.match_time || "TBD"}</span>
      </div>
      <div className="text-sm font-bold text-foreground">{match.home_team} vs {match.away_team}</div>
      <div className="text-xs font-semibold text-primary">{match.prediction} — {match.confidence}%</div>
      <div className="relative rounded-xl overflow-hidden mt-1">
        <div className="blur-[6px] select-none pointer-events-none space-y-1.5 py-2">
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors group-hover:bg-primary/90">
            <Lock className="h-3.5 w-3.5" />🔓 Unlock full prediction in app
          </span>
        </div>
      </div>
    </Button>
  );
}

// ── Live Counter ──
function useLiveCount(base: number, variance: number) {
  const [count, setCount] = useState(base);
  useEffect(() => {
    const iv = setInterval(() => setCount(base + Math.floor(Math.random() * variance * 2) - variance), 7000);
    return () => clearInterval(iv);
  }, [base, variance]);
  return count;
}

// ── Page ──
export default function FootballPredictionsToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchPick[]>([]);
  const [popup, setPopup] = useState(false);
  const viewingNow = useLiveCount(640, 80);
  const checkedToday = useLiveCount(17420, 800);
  const joinedThisWeek = useLiveCount(2100, 300);

  const handleContinueWeb = () => {
    navigate(user ? "/" : "/login");
  };

  useEffect(() => {
    const fetchMatches = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("ai_predictions")
        .select("id, home_team, away_team, match_time, league, prediction, confidence")
        .eq("match_date", today)
        .eq("result_status", "pending")
        .gte("confidence", 65)
        .lte("confidence", 80)
        .order("confidence", { ascending: false })
        .limit(3);
      if (data && data.length > 0) setMatches(data as MatchPick[]);
    };
    fetchMatches();
    // Re-fetch every 5 minutes to drop finished matches
    const iv = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <Helmet>
        <title>Football Predictions Today | BTTS &amp; Over 2.5 Tips</title>
        <meta name="description" content="Check today's football predictions, BTTS tips and Over 2.5 insights. Unlock full match analysis in the app." />
        <meta name="keywords" content="football predictions today, btts tips, over 2.5 predictions, soccer predictions" />
        <link rel="canonical" href="https://propredict.me/football-predictions-today" />
        <meta property="og:title" content="Football Predictions Today | BTTS & Over 2.5 Tips" />
        <meta property="og:description" content="Check today's football predictions, BTTS tips and Over 2.5 insights." />
        <meta property="og:url" content="https://propredict.me/football-predictions-today" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sidebar via-primary to-sidebar px-4 pb-16 pt-14 text-sidebar-foreground sm:pb-24 sm:pt-20">
          <div className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full border-[48px] border-sidebar-foreground/10" />
          <div className="relative mx-auto max-w-2xl space-y-5 text-center">
            {/* Personalized greeting for logged-in users */}
            {user && (
              <p className="text-sm font-medium text-sidebar-foreground/80 animate-fade-in">Welcome back 👋</p>
            )}
            <h1 className="text-3xl font-extrabold leading-[1.15] sm:text-4xl md:text-5xl">
              Check Today's Football<br />Predictions ⚽
            </h1>
            <p className="text-sm font-semibold text-sidebar-foreground/85">Limited daily picks • Updated every day</p>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-sidebar-foreground/70 sm:text-base">
              Check today's matches, probabilities and key insights.<br />
              Unlock full predictions inside the app.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-sidebar-foreground/75 sm:gap-5 sm:text-sm">
              <span className="flex items-center gap-1.5">🔥 {checkedToday.toLocaleString()} users checked today</span>
              <span className="flex items-center gap-1.5">👁 {viewingNow} viewing now</span>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-xl bg-sidebar-foreground px-8 py-4 text-base font-bold text-primary shadow-xl transition-all hover:bg-sidebar-foreground/90 hover:scale-[1.02] active:scale-95">
                <Download className="h-5 w-5" />Download App
              </a>
              <Button
                variant="outline"
                onClick={handleContinueWeb}
                className="border-sidebar-foreground/40 bg-sidebar/20 px-6 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              >
                {user ? "Open Dashboard →" : "Sign In →"}
              </Button>
            </div>
            <p className="text-[10px] text-sidebar-foreground/50">Free access • No signup required</p>
          </div>
        </section>

        {/* ═══ TRUST ═══ */}
        <section className="border-t border-primary/10 bg-card px-4 py-12">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h2 className="text-lg sm:text-xl font-bold">Trusted by football fans worldwide</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, text: "Daily updated predictions" },
                { icon: BarChart3, text: "Real match data" },
                { icon: Zap, text: "Fast & simple insights" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2 rounded-xl border border-primary/10 bg-secondary/60 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-center text-[11px] leading-tight text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-primary">🔥 124K+ users already using ProPredict</p>
          </div>
        </section>

        {/* ═══ TODAY'S TOP 3 ═══ */}
        <section className="border-t border-primary/10 bg-background px-4 py-12">
          <div className="max-w-xl mx-auto space-y-5">
            <div className="text-center space-y-1">
              <h2 className="flex items-center justify-center gap-2 text-lg font-bold sm:text-xl"><Trophy className="h-5 w-5 text-primary" />High Confidence Picks Today</h2>
              <p className="text-xs text-muted-foreground">Preview of today's matches. Full insights available in app.</p>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map(m => <MatchCard key={m.id} match={m} onClick={() => setPopup(true)} />)}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">Predictions update daily — check back soon.</div>
            )}
            <p className="text-center text-[10px] text-muted-foreground">Some matches may be removed after kick-off</p>
          </div>
        </section>

        {/* ═══ WHY USERS USE THIS ═══ */}
        <section className="border-t border-primary/10 bg-card px-4 py-12">
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-center">Why Users Use ProPredict</h2>
            <div className="grid grid-cols-2 gap-3">
              {["Smart match insights", "Over/Under & BTTS analysis", "Daily updated predictions", "Multiple options per match"].map(t => (
                <div key={t} className="flex items-start gap-2 rounded-xl border border-primary/10 bg-secondary/60 p-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-xs text-foreground">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-primary">🔥 {joinedThisWeek}+ users joined this week</p>
          </div>
        </section>

        {/* ═══ URGENCY ═══ */}
        <section className="border-t border-primary/10 bg-gradient-to-b from-background to-secondary px-4 py-12">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <h2 className="text-lg sm:text-xl font-bold">Don't Miss Today's Matches</h2>
            <p className="text-sm text-muted-foreground">Predictions update daily. Matches start soon.</p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">⚡ Matches starting soon</span>
              <span className="flex items-center gap-1">⏳ 5 games in next hours</span>
            </div>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90">
              <Download className="h-4 w-4" />Download App Now
            </a>
          </div>
        </section>

        {/* ═══ WORLD CUP ═══ */}
        <section className="border-t border-primary/10 bg-card px-4 py-12">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <Globe className="mx-auto h-8 w-8 text-primary" />
            <h2 className="text-lg sm:text-xl font-bold">World Cup 2026 is coming</h2>
            <p className="text-sm text-muted-foreground">Track teams, stats and predictions in one place.</p>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
              View in App <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="border-t border-primary/10 bg-sidebar px-4 py-16 text-sidebar-foreground">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Get Today's Predictions Now</h2>
            <p className="text-sm text-sidebar-foreground/70">Fast. Simple. Updated daily.</p>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95">
              <Download className="h-5 w-5" />Download App
            </a>
          </div>
        </section>

        {/* ═══ DISCLAIMER ═══ */}
        <div className="border-t border-primary/10 bg-sidebar px-4 py-6">
          <p className="mx-auto max-w-md text-center text-[9px] text-sidebar-foreground/45">
            Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
          </p>
        </div>

        {/* ═══ STICKY BOTTOM CTA ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/15 bg-card/95 p-3 backdrop-blur-md">
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90">
            <Download className="h-4 w-4" />Download App
          </a>
        </div>
        <div className="h-16" />
      </div>

      <UnlockPopup open={popup} onClose={() => setPopup(false)} />
    </>
  );
}
