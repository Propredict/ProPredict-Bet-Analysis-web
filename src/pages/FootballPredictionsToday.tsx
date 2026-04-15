import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { confirmWebUsage } from "@/hooks/useWebGate";
import { TrendingUp, Users, Eye, Clock, ChevronRight, Lock, CheckCircle, Download, X, Trophy, Zap, BarChart3, Globe } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#111] border border-emerald-500/30 p-6 space-y-5 animate-scale-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Unlock Full Predictions</h3>
          <p className="text-sm text-gray-400 leading-relaxed">See all predictions, confidence levels and today's best matches inside the app.</p>
        </div>
        <div className="space-y-2.5 bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
          {["Multiple picks per match", "Daily updated predictions", "AI insights & combos"].map(t => (
            <div key={t} className="flex items-center gap-2.5 text-sm text-gray-300"><CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />{t}</div>
          ))}
        </div>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base transition-colors shadow-lg shadow-emerald-500/20">
          Download App Now
        </a>
        <p className="text-[10px] text-gray-600 text-center">Free access available inside app</p>
      </div>
    </div>
  );
}

// ── Match Card with blur ──
function MatchCard({ match, onClick }: { match: MatchPick; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl border border-gray-800 bg-[#0d0d0d] hover:border-emerald-500/40 transition-all p-4 space-y-3 group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{match.league || "League"}</span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{match.match_time || "TBD"}</span>
      </div>
      <div className="text-sm font-semibold text-white">{match.home_team} vs {match.away_team}</div>
      <div className="text-xs text-emerald-400 font-medium">{match.prediction} — {match.confidence}%</div>
      <div className="relative rounded-xl overflow-hidden mt-1">
        <div className="blur-[6px] select-none pointer-events-none space-y-1.5 py-2">
          <div className="h-3 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-700" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 text-xs font-semibold text-black bg-emerald-500 px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-400 transition-colors">
            <Lock className="h-3.5 w-3.5" />🔓 Unlock full prediction in app
          </span>
        </div>
      </div>
    </button>
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
    confirmWebUsage();
    navigate("/");
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

      <div className="min-h-screen bg-[#0a0a0a] text-white">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden px-4 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_60%)]" />
          <div className="relative max-w-xl mx-auto text-center space-y-5">
            {/* Personalized greeting for logged-in users */}
            {user && (
              <p className="text-sm text-emerald-400 font-medium animate-fade-in">Welcome back 👋</p>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Check Today's Football<br />Predictions ⚽
            </h1>
            <p className="text-sm text-amber-400/90 font-medium">Limited daily picks • Updated every day</p>
            <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
              Check today's matches, probabilities and key insights.<br />
              Unlock full predictions inside the app.
            </p>
            <div className="flex items-center justify-center gap-5 text-xs sm:text-sm text-gray-400 font-medium">
              <span className="flex items-center gap-1.5">🔥 {checkedToday.toLocaleString()} users checked today</span>
              <span className="flex items-center gap-1.5">👁 {viewingNow} viewing now</span>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-95">
                <Download className="h-5 w-5" />Download App
              </a>
              <button
                onClick={handleContinueWeb}
                className="px-6 py-2.5 rounded-xl border border-gray-600 hover:border-emerald-500/50 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Continue on Web →
              </button>
            </div>
            <p className="text-[10px] text-gray-600">Free access • No signup required</p>
          </div>
        </section>

        {/* ═══ TRUST ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h2 className="text-lg sm:text-xl font-bold">Trusted by football fans worldwide</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, text: "Daily updated predictions" },
                { icon: BarChart3, text: "Real match data" },
                { icon: Zap, text: "Fast & simple insights" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#111] border border-gray-800">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <span className="text-[11px] text-gray-400 text-center leading-tight">{text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-400 font-semibold">🔥 124K+ users already using ProPredict</p>
          </div>
        </section>

        {/* ═══ TODAY'S TOP 3 ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg sm:text-xl font-bold flex items-center justify-center gap-2"><Trophy className="h-5 w-5 text-emerald-400" />High Confidence Picks Today</h2>
              <p className="text-xs text-gray-500">Preview of today's matches. Full insights available in app.</p>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map(m => <MatchCard key={m.id} match={m} onClick={() => setPopup(true)} />)}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">Predictions update daily — check back soon.</div>
            )}
            <p className="text-[10px] text-gray-600 text-center">Some matches may be removed after kick-off</p>
          </div>
        </section>

        {/* ═══ WHY USERS USE THIS ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-center">Why Users Use ProPredict</h2>
            <div className="grid grid-cols-2 gap-3">
              {["Smart match insights", "Over/Under & BTTS analysis", "Daily updated predictions", "Multiple options per match"].map(t => (
                <div key={t} className="flex items-start gap-2 p-3 rounded-xl bg-[#111] border border-gray-800">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-300">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-400 font-semibold text-center">🔥 {joinedThisWeek}+ users joined this week</p>
          </div>
        </section>

        {/* ═══ URGENCY ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50 bg-gradient-to-b from-[#0a0a0a] to-[#0f1a14]">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <h2 className="text-lg sm:text-xl font-bold">Don't Miss Today's Matches</h2>
            <p className="text-sm text-gray-400">Predictions update daily. Matches start soon.</p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">⚡ Matches starting soon</span>
              <span className="flex items-center gap-1">⏳ 5 games in next hours</span>
            </div>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20">
              <Download className="h-4 w-4" />Download App Now
            </a>
          </div>
        </section>

        {/* ═══ WORLD CUP ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <Globe className="h-8 w-8 text-emerald-400 mx-auto" />
            <h2 className="text-lg sm:text-xl font-bold">World Cup 2026 is coming</h2>
            <p className="text-sm text-gray-400">Track teams, stats and predictions in one place.</p>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm font-medium transition-colors">
              View in App <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="px-4 py-16 border-t border-gray-800/50 bg-gradient-to-b from-[#0a0a0a] to-[#060d09]">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Get Today's Predictions Now</h2>
            <p className="text-sm text-gray-400">Fast. Simple. Updated daily.</p>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base transition-all shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-95">
              <Download className="h-5 w-5" />Download App
            </a>
          </div>
        </section>

        {/* ═══ DISCLAIMER ═══ */}
        <div className="px-4 py-6 border-t border-gray-800/50">
          <p className="text-[9px] text-gray-600 text-center max-w-md mx-auto">
            Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
          </p>
        </div>

        {/* ═══ STICKY BOTTOM CTA ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-gray-800">
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full max-w-md mx-auto py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20">
            <Download className="h-4 w-4" />Download App
          </a>
        </div>
        <div className="h-16" />
      </div>

      <UnlockPopup open={popup} onClose={() => setPopup(false)} />
    </>
  );
}
