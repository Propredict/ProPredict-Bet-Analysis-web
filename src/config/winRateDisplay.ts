/**
 * Manual display configuration for the Dashboard "Win Rate" / "Success" numbers.
 *
 * These values are NOT calculated from historical tips or tickets.
 * Deleting old tips/tickets from the database will never lower them.
 *
 * Change the numbers below whenever you want a different displayed value.
 */
export const WIN_RATE_DISPLAY = {
  /** Displayed Win Rate / Global Accuracy in %. Always shown, never auto-calculated. */
  accuracy: 86,

  /** Displayed "Success" (won) count. Manual — independent of the database. */
  successCount: 640,

  /** Displayed "Missed" (lost) count. Manual — kept consistent with the accuracy above. */
  missedCount: 104,
} as const;
