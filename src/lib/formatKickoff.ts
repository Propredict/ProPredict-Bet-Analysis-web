// Format match kickoff for tip cards: "Sun, May 9 · 18:00"
// Falls back to created_at_ts date when match_date/time are missing.
export function formatKickoff(
  matchDate?: string | null,
  matchTime?: string | null,
  fallbackTs?: string | null,
): string {
  if (matchDate) {
    const d = new Date(matchDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timePart = matchTime?.trim();
      return timePart ? `${datePart} · ${timePart}` : datePart;
    }
  }
  if (fallbackTs) {
    return new Date(fallbackTs).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return "";
}
