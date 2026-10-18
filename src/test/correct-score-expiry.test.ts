import { describe, expect, it } from "vitest";
import { activeCorrectScoreTickets, correctScoreDate } from "@/lib/correctScoreExpiry";

describe("Correct Score expiry", () => {
  it("keeps a ticket dated the 15th on the 15th and removes it at Belgrade midnight on the 16th", () => {
    const tickets = [{ ticket_date: "2026-10-15" }];
    expect(activeCorrectScoreTickets(tickets, correctScoreDate(new Date("2026-10-15T21:59:59Z"))))).toEqual(tickets);
    expect(activeCorrectScoreTickets(tickets, correctScoreDate(new Date("2026-10-15T22:00:00Z"))))).toEqual([]);
  });

  it("does not bring back old tickets when no current tickets exist", () => {
    expect(activeCorrectScoreTickets([{ ticket_date: "2026-10-15" }], "2026-10-18")).toEqual([]);
  });

  it("preserves current and future tickets while excluding undated tickets", () => {
    expect(activeCorrectScoreTickets([
      { ticket_date: null },
      { ticket_date: "2026-10-18" },
      { ticket_date: "2026-10-19" },
    ], "2026-10-18")).toEqual([{ ticket_date: "2026-10-18" }, { ticket_date: "2026-10-19" }]);
  });
});