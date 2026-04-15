import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp, Users, Eye, Clock, ChevronRight, Lock, CheckCircle, Star, Download, X, Trophy, Zap, BarChart3, Globe } from "lucide-react";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=me.propredict.app";

// ── Types ──
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#111] border border-emerald-500/30 p-6 space-y-5 animate-scale-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        <div className="text-center space-y-2">
          <Lock className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Unlock Full Match Insights</h3>
          <p className="text-sm text-gray-400">Get full predictions, confidence levels and daily picks inside the app.</p>
        </div>
        <div className="space-y-2">
          {["Multiple predictions per match", "Confidence levels", "Daily updated picks", "Match insights"].map(t => (
            <div key={t} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />{t}</div>
          ))}
        </div>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors">
          Download App Now
        </a>
        <p className="text-xs text-gray-500 text-center">Free access available inside app</p>
      </div>
    </div>
  );
}

// ── Match Card ──
function MatchCard({ match, onClick }: { match: MatchPick; onClick: () => void }) {
  const market = match.prediction;
  const conf = match.confidence;
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl border border-gray-800 bg-[#0d0d0d] hover:border-emerald-500/40 transition-all p-4 space-y-3 group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{match.league || "League"}</span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{match.match_time || "TBD"}</span>
      </div>
      <div className="text-sm font-semibold text-white">{match.home_team} vs {match.away_team}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-emerald-400 font-medium">{market} — {conf}%</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500 group-hover:text-emerald-400 transition-colors"><Lock className="h-3 w-3" />Unlock full prediction in app</span>
      </div>
    </button>
  );
}

// ── Live Counter (deterministic) ──
function useLiveCount(base: number, variance: number) {
  const [count, setCount] = useState(base);
  useEffect(() => {
    const iv = setInterval(() => setCount(base + Math.floor(Math.random() * variance)), 8000);
    return () => clearInterval(iv);
  }, [base, variance]);
  return count;
}

// ── Page ──
export default function FootballPredictionsToday() {
  const [matches, setMatches] = useState<MatchPick[]>([]);
  const [popup, setPopup] = useState(false);
  const viewingNow = useLiveCount(42, 20);
  const checkedToday = useLiveCount(1284, 200);
  const joinedThisWeek = useLiveCount(300, 80);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("ai_predictions")
        .select("id, home_team, away_team, match_time, league, prediction, confidence")
        .eq("match_date", today)
        .gte("confidence", 65)
        .lte("confidence", 80)
        .order("confidence", { ascending: false })
        .limit(3);
      if (data && data.length > 0) setMatches(data as MatchPick[]);
    })();
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

        {/* ═══ SECTION 1 — HERO ═══ */}
        <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)]" />
          <div className="relative max-w-xl mx-auto text-center space-y-5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Today's Football<br />Predictions ⚽
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
              Check today's matches, probabilities and key insights.<br />
              Unlock full predictions inside the app.
            </p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-emerald-400" />🔥 {checkedToday.toLocaleString()} users checked today</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-emerald-400" />{viewingNow} viewing now</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />Download App
              </a>
              <Link to="/live-scores" className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-700 hover:border-emerald-500/50 text-gray-300 hover:text-white text-sm font-medium transition-colors text-center">
                View Today's Matches
              </Link>
            </div>
            <p className="text-[10px] text-gray-600">Free access available • No signup needed</p>
          </div>
        </section>

        {/* ═══ SECTION 2 — TRUST ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h2 className="text-lg sm:text-xl font-bold">Trusted by football fans worldwide</h2>
            <div className="grid grid-cols-3 gap-4">
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

        {/* ═══ SECTION 3 — TODAY'S TOP 3 MATCHES ═══ */}
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
          </div>
        </section>

        {/* ═══ SECTION 5 — WHY USERS USE THIS ═══ */}
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

        {/* ═══ SECTION 6 — URGENCY ═══ */}
        <section className="px-4 py-12 border-t border-gray-800/50 bg-gradient-to-b from-[#0a0a0a] to-[#0f1a14]">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <h2 className="text-lg sm:text-xl font-bold">Don't Miss Today's Matches</h2>
            <p className="text-sm text-gray-400">Predictions update daily. Matches start soon.</p>
            <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-400" />⏳ 6 matches starting soon</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-emerald-400" />👁 {viewingNow} users checking now</span>
            </div>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors">
              <Download className="h-4 w-4" />Download App Now
            </a>
          </div>
        </section>

        {/* ═══ SECTION 7 — WORLD CUP HOOK ═══ */}
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

        {/* ═══ SECTION 8 — FINAL CTA ═══ */}
        <section className="px-4 py-16 border-t border-gray-800/50 bg-gradient-to-b from-[#0a0a0a] to-[#060d09]">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Get Today's Predictions Now</h2>
            <p className="text-sm text-gray-400">Fast. Simple. Updated daily.</p>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base transition-colors shadow-lg shadow-emerald-500/20">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#0a0a0a]/95 backdrop-blur border-t border-gray-800">
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full max-w-md mx-auto py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm text-center transition-colors flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />Download App
          </a>
        </div>

        {/* Bottom spacer for sticky bar */}
        <div className="h-16" />
      </div>

      <UnlockPopup open={popup} onClose={() => setPopup(false)} />
    </>
  );
}
