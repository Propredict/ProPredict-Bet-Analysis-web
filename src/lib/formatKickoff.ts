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
    // match_time is stored as UTC ("HH:mm[:ss]"). Convert to user's local time.
    const hhmm = t.length >= 5 ? t.slice(0, 5) : t;
    if (matchDate) {
      const d = new Date(`${matchDate}T${hhmm}:00Z`);
      if (!isNaN(d.getTime())) {
        time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
    }
    if (!time && fallbackTs) {
      const d = new Date(fallbackTs);
      if (!isNaN(d.getTime())) {
        time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
    }
    if (!time) time = hhmm;
  } else if (fallbackTs) {
    const d = new Date(fallbackTs);
    if (!isNaN(d.getTime())) {
      time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  if (!date && fallbackTs) {
    date = new Date(fallbackTs).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return { date, time };
}
