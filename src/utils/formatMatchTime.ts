/**
 * Format a match's kickoff time in the user's local timezone (e.g. CET/CEST).
 *
 * Prefers an ISO UTC timestamp (`match_timestamp` from ai_predictions) so the
 * time correctly shifts to the user's local time. Falls back to a plain
 * "HH:mm[:ss]" string returned by the API (already local on the source).
 */
export function formatMatchTime(
  matchTimestamp?: string | null,
  matchTime?: string | null,
  matchDate?: string | null,
): string {
  // 1) Preferred: full ISO timestamp (UTC) → convert to user's local time.
  if (matchTimestamp) {
    const d = new Date(matchTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }

  // 2) Try combining match_date (YYYY-MM-DD) + match_time as UTC, then localize.
  if (matchDate && matchTime) {
    const t = matchTime.length >= 5 ? matchTime.slice(0, 5) : matchTime;
    const iso = `${matchDate}T${t}:00Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }

  // 3) Fallback: raw match_time string.
  if (matchTime) {
    return matchTime.length >= 5 ? matchTime.slice(0, 5) : matchTime;
  }

  return "TBD";
}
