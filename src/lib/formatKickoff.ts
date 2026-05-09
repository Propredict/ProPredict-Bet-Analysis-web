// Format match kickoff for tip cards.
// Returns combined "Sat, May 9 · 17:00 CET" (used as fallback)
// plus separate date and time parts for header layouts.
export function formatKickoff(
  matchDate?: string | null,
  matchTime?: string | null,
  fallbackTs?: string | null,
): string {
  const parts = formatKickoffParts(matchDate, matchTime, fallbackTs);
  if (parts.date && parts.time) return `${parts.date} · ${parts.time}`;
  return parts.date || parts.time || "";
}

export function formatKickoffParts(
  matchDate?: string | null,
  matchTime?: string | null,
  fallbackTs?: string | null,
): { date: string; time: string } {
  let date = "";
  let time = "";
  if (matchDate) {
    const d = new Date(matchDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      date = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  }
  const t = matchTime?.trim();
  if (t) time = `${t.slice(0, 5)} CET`;
  if (!date && fallbackTs) {
    date = new Date(fallbackTs).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return { date, time };
}
