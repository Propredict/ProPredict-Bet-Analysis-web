/**
 * API-Football uses the STARTING year of a season.
 * e.g. 2026 = 2026/2027 season.
 * European seasons start in July/August, so from July onwards we use the
 * current calendar year, otherwise the previous one.
 */
export function getCurrentSeason(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January
  return String(month >= 6 ? year : year - 1);
}
