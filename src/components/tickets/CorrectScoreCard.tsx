import { Lock, Crown, Share2 } from "lucide-react";
import { shareContent } from "@/lib/shareContent";
import { getFlagUrl } from "@/lib/countryFlags";
import type { CSTicket } from "@/hooks/useCorrectScoreTickets";

function TeamName({ name }: { name: string }) {
  const flag = getFlagUrl(name, 40);
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-1.5">
      {flag && (
        <img
          src={flag}
          alt=""
          loading="lazy"
          className="h-4 w-6 shrink-0 rounded-sm border border-slate-900/40 object-cover shadow-sm sm:h-5 sm:w-7"
        />
      )}
      <span className="max-w-full truncate text-center text-sm font-black uppercase text-slate-900 sm:text-base">{name}</span>
    </span>
  );
}

interface Props {
  ticket: CSTicket;
  locked?: boolean;
  onUnlock?: () => void;
}

export function CorrectScoreCard({ ticket, locked, onUnlock }: Props) {
  const date = ticket.ticket_date
    ? new Date(ticket.ticket_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "";

  const handleShare = () => {
    const matches = ticket.matches.map((m) => `${m.home_team} vs ${m.away_team}`).join(", ");
    shareContent(
      "ProPredict Correct Score",
      `Correct Score picks ${date}: ${matches}`,
      "https://propredict.me/correct-score"
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-slate-900/80 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-3 shadow-[0_14px_40px_-16px_rgba(15,23,42,0.65)] ring-1 ring-inset ring-amber-100/50 sm:p-5">
      <button
        onClick={handleShare}
        aria-label="Share / Podeli"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-amber-300 shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Share2 className="h-4 w-4" />
      </button>
      <div className="mb-3 flex flex-col items-center gap-1">
        <p className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          propredict<span className="text-primary">.me</span>
        </p>
        <div className="flex items-center gap-2">
          {date && <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold text-amber-50">{date}</span>}
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${ticket.tier === "premium" ? "bg-fuchsia-600 text-white" : "bg-slate-900/80 text-amber-50"}`}>
            {ticket.tier === "premium" ? "Premium" : "Free"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {ticket.matches.map((m, i) => (
          <div key={i} className="rounded-xl border-2 border-slate-900/30 bg-amber-200/60 p-3 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <TeamName name={m.home_team} />
              <span className="text-lg font-black italic text-amber-700">VS</span>
              <TeamName name={m.away_team} />
            </div>
            <div className="my-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-900/60" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900">Correct Score</span>
              <div className="h-px flex-1 bg-slate-900/60" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {m.scores.map((s, j) => (
                <div key={j} className="relative rounded-lg border-2 border-slate-900 bg-white pb-1.5 pt-3 text-center">
                  <span className="absolute -top-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-slate-900 bg-amber-400 text-[10px] font-black text-slate-900">
                    {j + 1}
                  </span>
                  <span className={`text-2xl font-black text-slate-900 sm:text-3xl ${locked ? "select-none blur-md" : ""}`}>
                    {locked ? "?-?" : s || "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
          <button
            onClick={onUnlock}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-primary px-5 py-3 text-sm font-extrabold text-white shadow-xl"
          >
            <Lock className="h-4 w-4" /> <Crown className="h-4 w-4 text-amber-300" /> Get Premium / Postani Premium
          </button>
        </div>
      )}
    </div>
  );
}
