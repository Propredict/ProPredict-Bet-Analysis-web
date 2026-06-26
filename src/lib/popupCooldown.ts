// Global popup cooldown so multiple promo modals never overlap on the same visit.
// Each call to markPopupShown() records "now". canShowPopup(minGapMs) returns false
// if another popup was shown more recently than minGapMs.

const KEY = "propredict:last_popup_shown_at";

export function canShowPopup(minGapMs = 60_000): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= minGapMs;
  } catch {
    return true;
  }
}

export function markPopupShown(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function msUntilNextPopup(minGapMs = 60_000): number {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return 0;
    const last = parseInt(raw, 10);
    if (!Number.isFinite(last)) return 0;
    return Math.max(0, minGapMs - (Date.now() - last));
  } catch {
    return 0;
  }
}