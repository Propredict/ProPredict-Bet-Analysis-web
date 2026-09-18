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
  if (t) {
    // match_time is entered by admin as the real local kickoff time.
    // Show it EXACTLY as entered — no timezone conversion.
    time = t.length >= 5 ? t.slice(0, 5) : t;
  }
  // NOTE: We intentionally do NOT fall back to created_at_ts (`fallbackTs`).
  // That timestamp is when the tip row was created, not the actual match
  // kickoff. Showing it produced wrong "kickoff" times for manually-created
  // tips that have NULL match_date/match_time.
  return { date, time };
}
