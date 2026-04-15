const WEB_CONFIRM_KEY = "propredict:web_confirmed_at";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Check if the user has confirmed "Continue on Web" within the last 24h.
 */
export function hasWebConfirmation(): boolean {
  try {
    const ts = localStorage.getItem(WEB_CONFIRM_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < TWENTY_FOUR_HOURS;
  } catch {
    return false;
  }
}

/**
 * Store "Continue on Web" confirmation (valid 24h).
 */
export function confirmWebUsage(): void {
  try {
    localStorage.setItem(WEB_CONFIRM_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}
