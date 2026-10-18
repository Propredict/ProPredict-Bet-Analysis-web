export function correctScoreDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function activeCorrectScoreTickets<T extends { ticket_date: string | null }>(
  tickets: T[],
  today = correctScoreDate(),
): T[] {
  return tickets.filter((ticket) => Boolean(ticket.ticket_date && ticket.ticket_date >= today));
}