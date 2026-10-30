import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Brain, CalendarDays, ChevronRight, Clock, Lock, LogIn, Sparkles } from "lucide-react";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { formatMatchTime } from "@/utils/formatMatchTime";
import { selectSeoPredictions, type SeoPageVariant, type SeoPredictionItem } from "@/lib/seoPredictionPages";
import type { Tier } from "@/components/ai-predictions/utils/tierAssignment";
import { cn } from "@/lib/utils";

const SITE = "https://propredict.me";

interface PageCopy {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  how: string;
  faq: { q: string; a: string }[];
}

const COPY: Record<SeoPageVariant, PageCopy> = {
  today: {
    path: "/football-predictions-today",
    title: "Football Predictions Today – AI 1X2, BTTS & Over 2.5 | ProPredict",
    description:
      "Today's AI football predictions for top leagues: 1X2, BTTS and Over/Under 2.5 with real probabilities from match data. Updated daily.",
    h1: "Football Predictions Today",
    intro:
      "Today's AI football predictions from ProPredict. Every pick comes from real match data — expected goals (xG), recent form, home and away records — and only matches with at least 65% probability are published.",
    how:
      "Our AI analyses each fixture with an expected-goals model and turns it into probabilities for 1X2, both teams to score and Over/Under 2.5. The strongest market becomes the main pick. Nations League and top European leagues come first.",
    faq: [
      { q: "How often are the predictions updated?", a: "Predictions are generated every day for that day's fixtures and refreshed before kick-off when new data arrives." },
      { q: "Are the predictions free?", a: "The 3 strongest predictions of the day are free after a quick sign-in. Pro and Premium members see all published picks." },
      { q: "What does the percentage mean?", a: "It is the AI's probability for that outcome, based on xG, form and home/away data. Higher means the model is more confident." },
    ],
  },
  btts: {
    path: "/btts-predictions-today",
    title: "BTTS Predictions Today – Both Teams To Score AI Picks | ProPredict",
    description:
      "Today's BTTS predictions: matches where our AI gives both teams to score a probability of 65% or more, based on xG and recent form.",
    h1: "BTTS Predictions Today",
    intro:
      "Both teams to score (BTTS) predictions for today's matches. This page lists only fixtures where our AI gives \"BTTS Yes\" a probability of 65% or more.",
    how:
      "BTTS probability comes from each team's expected goals for and against, adjusted for recent form and home/away performance. Two attacking sides with leaky defences produce the highest BTTS numbers.",
    faq: [
      { q: "What does BTTS mean?", a: "BTTS stands for \"both teams to score\" — the prediction is correct when each team scores at least one goal." },
      { q: "Why are there only a few matches?", a: "We only show matches where BTTS Yes reaches at least 65%. On some days only a handful of fixtures qualify." },
      { q: "Is BTTS the same as Over 2.5?", a: "No. A 1-1 result is BTTS Yes but Under 2.5, and 3-0 is Over 2.5 but BTTS No. See our Over 2.5 goals page for that market." },
    ],
  },
  over25: {
    path: "/over-2-5-goals-predictions",
    title: "Over 2.5 Goals Predictions Today – AI Picks | ProPredict",
    description:
      "Today's Over 2.5 goals predictions: matches where our AI expects 3 or more goals with at least 65% probability, from xG and form data.",
    h1: "Over 2.5 Goals Predictions",
    intro:
      "Over 2.5 goals predictions for today's matches. This page lists only fixtures where our AI gives 3 or more goals a probability of 65% or more.",
    how:
      "The AI adds both teams' expected goals and builds a full score probability grid. Over 2.5 is the share of all scorelines with three or more goals.",
    faq: [
      { q: "What does Over 2.5 goals mean?", a: "The prediction is correct when the match ends with 3 or more goals in total, for example 2-1, 3-0 or 2-2." },
      { q: "Which leagues have the most Over 2.5 matches?", a: "It changes every week. High-scoring leagues and matches between attacking teams appear here most often." },
      { q: "How is this different from BTTS?", a: "Over 2.5 only counts total goals. A 3-0 win is Over 2.5 even though only one team scored. See our BTTS page for that market." },
    ],
  },
};

const TIER_TO_CONTENT: Record<Tier, ContentTier> = { free: "daily", pro: "exclusive", premium: "premium" };

const TIER_BADGE: Record<Tier, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-primary/10 text-primary border-primary/20" },
  pro: { label: "Pro", className: "bg-warning/15 text-warning border-warning/30" },
  premium: { label: "Premium", className: "bg-stadium text-stadium-foreground border-stadium-line" },
};

function PredictionRow({ item, unlocked, lockedTo, lockedText }: { item: SeoPredictionItem; unlocked: boolean; lockedTo: string; lockedText: string }) {
  const p = item.prediction;
  const badge = TIER_BADGE[item.tier];
  const time = formatMatchTime((p as any).match_timestamp ?? null, p.match_time, p.match_date);

  const body = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", badge.className)}>{badge.label}</span>
          <span className="truncate font-medium uppercase">{p.league || "Football"}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
        </div>
        <p className="break-words text-sm font-bold text-foreground sm:text-base">
          {p.home_team} <span className="font-medium text-muted-foreground">vs</span> {p.away_team}
        </p>
      </div>
      {unlocked ? (
        <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 sm:self-auto">
          <span className="text-sm font-bold text-foreground">{item.label}</span>
          <span className="text-base font-extrabold text-primary">{item.pct}%</span>
        </div>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground sm:self-auto">
          <Lock className="h-3.5 w-3.5" />{lockedText}
        </span>
      )}
    </div>
  );

  const cls = "block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors";
  return unlocked ? (
    <li className={cls}>{body}</li>
  ) : (
    <li>
      <Link to={lockedTo} className={cn(cls, "hover:border-primary/50")}>{body}</Link>
    </li>
  );
}

export default function SeoPredictionsPage({ variant }: { variant: SeoPageVariant }) {
  const copy = COPY[variant];
  const { predictions, loading } = useAIPredictions("today");
  const { canAccess, isAuthenticated, isLoading: planLoading } = useUserPlan();
  const { isAndroidApp } = usePlatform();

  const items = useMemo(() => selectSeoPredictions(predictions, variant), [predictions, variant]);

  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const url = `${SITE}${copy.path}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const lockedTarget = (tier: Tier) => {
    if (!isAuthenticated) return { to: "/login", text: "Sign in to see" };
    if (isAndroidApp) return { to: "/ai-predictions", text: "Unlock in AI Predictions" };
    return { to: "/get-premium", text: tier === "pro" ? "Pro pick" : "Premium pick" };
  };

  const otherPages = (Object.keys(COPY) as SeoPageVariant[]).filter((v) => v !== variant);

  return (
    <>
      <Helmet>
        <title>{copy.title}</title>
        <meta name="description" content={copy.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={copy.title} />
        <meta property="og:description" content={copy.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={copy.title} />
        <meta name="twitter:description" content={copy.description} />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-4 sm:px-4 sm:py-6">
        {/* Header */}
        <header className="overflow-hidden rounded-2xl border border-stadium-line bg-stadium p-5 text-stadium-foreground sm:p-7">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stadium-muted">
            <CalendarDays className="h-3.5 w-3.5" />{dateLabel}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{copy.h1}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stadium-muted sm:text-base">{copy.intro}</p>
          <nav aria-label="Other prediction pages" className="mt-4 flex flex-wrap gap-2">
            {otherPages.map((v) => (
              <Link key={v} to={COPY[v].path} className="rounded-full border border-stadium-line bg-stadium-raised px-3 py-1.5 text-xs font-semibold text-stadium-foreground transition-colors hover:border-stadium-blue">
                {COPY[v].h1}
              </Link>
            ))}
            <Link to="/ai-predictions" className="rounded-full border border-stadium-line bg-stadium-raised px-3 py-1.5 text-xs font-semibold text-stadium-foreground transition-colors hover:border-stadium-blue">
              All AI Predictions
            </Link>
          </nav>
        </header>

        {/* Guest prompt */}
        {!planLoading && !isAuthenticated && (
          <Link to="/login" className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-secondary p-4 transition-colors hover:border-primary">
            <LogIn className="h-5 w-5 shrink-0 text-primary" />
            <span className="flex-1 text-sm font-semibold text-foreground">
              Sign in for free to see today's free picks / Uloguj se besplatno da vidiš današnje besplatne predikcije
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
          </Link>
        )}

        {/* List */}
        <section aria-labelledby="list-heading" className="space-y-3">
          <h2 id="list-heading" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            {loading ? "Loading today's matches…" : `${items.length} ${items.length === 1 ? "match" : "matches"} today`}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item) => {
                const unlocked = canAccess(TIER_TO_CONTENT[item.tier], "tip", item.prediction.id);
                const target = lockedTarget(item.tier);
                return <PredictionRow key={item.prediction.id} item={item} unlocked={unlocked} lockedTo={target.to} lockedText={target.text} />;
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No matches qualify right now. Today's matches may already be finished — check tomorrow's picks in AI Predictions.
              </p>
              <Link to="/ai-predictions" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Open AI Predictions <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
            <Brain className="h-5 w-5 text-primary" />How we make these predictions
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.how}</p>
          <Link to="/how-ai-works" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            How our AI works <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        {/* FAQ */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold text-foreground">Frequently asked questions</h2>
          <dl className="space-y-3">
            {copy.faq.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          18+ · AI predictions are for information and entertainment only.
        </p>
      </div>
    </>
  );
}
