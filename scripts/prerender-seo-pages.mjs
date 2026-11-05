/**
 * Post-build prerender for the public SEO landing pages.
 *
 * Runs after `vite build` and writes one static HTML file per route:
 *   dist/football-predictions-today/index.html
 *   dist/btts-predictions-today/index.html
 *   dist/over-2-5-goals-predictions/index.html
 *
 * Each file is the built index.html with route-specific <title>, meta
 * description, canonical, og:* / twitter:* tags, FAQ JSON-LD and a static
 * intro text inside #root — so Google sees unique content on first load
 * instead of a copy of the homepage. React (createRoot) replaces the static
 * #root content when the app boots, so visitors get the full live page.
 *
 * IMPORTANT: keep this copy in sync with COPY in
 * src/pages/SeoPredictionsPage.tsx.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = join(root, "dist", "index.html");

const SITE = "https://propredict.me";

const PAGES = [
  {
    path: "/football-predictions-today",
    title: "Football Predictions Today – AI 1X2, BTTS & Over 2.5 | ProPredict",
    description:
      "Today's AI football predictions for top leagues: 1X2, BTTS and Over/Under 2.5 with real probabilities from match data. Updated daily.",
    h1: "Football Predictions Today",
    intro:
      "Today's AI football predictions from ProPredict. Every pick comes from real match data — expected goals (xG), recent form, home and away records — and only matches with at least 65% probability are published.",
    how: "Our AI analyses each fixture with an expected-goals model and turns it into probabilities for 1X2, both teams to score and Over/Under 2.5. The strongest market becomes the main pick. Nations League and top European leagues come first.",
    faq: [
      { q: "How often are the predictions updated?", a: "Predictions are generated every day for that day's fixtures and refreshed before kick-off when new data arrives." },
      { q: "Are the predictions free?", a: "The 3 strongest predictions of the day are free for everyone, no sign-in needed. Pro and Premium members see all published picks." },
      { q: "What does the percentage mean?", a: "It is the AI's probability for that outcome, based on xG, form and home/away data. Higher means the model is more confident." },
    ],
  },
  {
    path: "/btts-predictions-today",
    title: "BTTS Predictions Today – Both Teams To Score AI Picks | ProPredict",
    description:
      "Today's BTTS predictions: matches where our AI gives both teams to score a probability of 65% or more, based on xG and recent form.",
    h1: "BTTS Predictions Today",
    intro:
      "Both teams to score (BTTS) predictions for today's matches. This page lists only fixtures where our AI gives \"BTTS Yes\" a probability of 65% or more.",
    how: "BTTS probability comes from each team's expected goals for and against, adjusted for recent form and home/away performance. Two attacking sides with leaky defences produce the highest BTTS numbers.",
    faq: [
      { q: "What does BTTS mean?", a: "BTTS stands for \"both teams to score\" — the prediction is correct when each team scores at least one goal." },
      { q: "Why are there only a few matches?", a: "We only show matches where BTTS Yes reaches at least 65%. On some days only a handful of fixtures qualify." },
      { q: "Is BTTS the same as Over 2.5?", a: "No. A 1-1 result is BTTS Yes but Under 2.5, and 3-0 is Over 2.5 but BTTS No. See our Over 2.5 goals page for that market." },
    ],
  },
  {
    path: "/over-2-5-goals-predictions",
    title: "Over 2.5 Goals Predictions Today – AI Picks | ProPredict",
    description:
      "Today's Over 2.5 goals predictions: matches where our AI expects 3 or more goals with at least 65% probability, from xG and form data.",
    h1: "Over 2.5 Goals Predictions",
    intro:
      "Over 2.5 goals predictions for today's matches. This page lists only fixtures where our AI gives 3 or more goals a probability of 65% or more.",
    how: "The AI adds both teams' expected goals and builds a full score probability grid. Over 2.5 is the share of all scorelines with three or more goals.",
    faq: [
      { q: "What does Over 2.5 goals mean?", a: "The prediction is correct when the match ends with 3 or more goals in total, for example 2-1, 3-0 or 2-2." },
      { q: "Which leagues have the most Over 2.5 matches?", a: "It changes every week. High-scoring leagues and matches between attacking teams appear here most often." },
      { q: "How is this different from BTTS?", a: "Over 2.5 only counts total goals. A 3-0 win is Over 2.5 even though only one team scored. See our BTTS page for that market." },
    ],
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function staticBody(page) {
  const faqHtml = page.faq
    .map((f) => `<h2 style="font-size:16px;margin:16px 0 4px;color:#e8eef5;">${esc(f.q)}</h2><p style="margin:0;color:#9fb3c8;">${esc(f.a)}</p>`)
    .join("");
  return `<main style="max-width:720px;margin:0 auto;padding:24px 16px;font-family:Figtree,system-ui,sans-serif;background:#062B4F;min-height:100vh;">
  <h1 style="font-size:28px;margin:0 0 12px;color:#ffffff;">${esc(page.h1)}</h1>
  <p style="margin:0 0 12px;color:#c8d6e5;">${esc(page.intro)}</p>
  <p style="margin:0 0 8px;color:#9fb3c8;">${esc(page.how)}</p>
  ${faqHtml}
</main>`;
}

function faqJsonLd(page) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}

function renderPage(template, page) {
  const url = `${SITE}${page.path}`;
  let html = template;

  // Title + description
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`);
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*("\s*\/>)/,
    `$1${esc(page.description)}$2`,
  );

  // Canonical (index.html has none — insert after the description meta)
  html = html.replace(
    /(<meta\s+name="description"[^>]*\/>)/,
    `$1\n    <link rel="canonical" href="${url}" />`,
  );

  // Open Graph + Twitter
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${esc(page.title)}$2`);
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(page.description)}$2`);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${esc(page.title)}$2`);
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${esc(page.description)}$2`);

  // FAQ structured data
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json">${faqJsonLd(page)}</script>\n  </head>`,
  );

  // Static first-load content (React replaces it when the app boots)
  html = html.replace('<div id="root"></div>', `<div id="root">${staticBody(page)}</div>`);

  return html;
}

const template = readFileSync(distIndex, "utf8");

for (const page of PAGES) {
  const outDir = join(root, "dist", page.path.slice(1));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), renderPage(template, page));
  console.log(`[prerender] ${page.path} -> dist${page.path}/index.html`);
}
