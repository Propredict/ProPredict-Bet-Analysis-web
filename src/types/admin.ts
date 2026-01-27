export type TicketResult = "pending" | "won" | "lost";
export type TipResult = "pending" | "won" | "lost";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentStatus = "draft" | "published";

export interface Tip {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  prediction: string;
  odds: number;
  confidence?: number | null;
  ai_prediction?: string | null;
  tier: ContentTier;
  status: ContentStatus;
  result?: TipResult | null;
  tip_date?: string | null;
  created_at?: string;
  created_at_ts?: string;
  updated_at?: string;
  created_by?: string | null;
}

// Match stored in ticket_matches table
// Currently uses match_name, but structured to support home_team/away_team when DB is updated
export interface TicketMatch {
  id: string;
  ticket_id: string;
  match_name: string; // Current: "Home vs Away - League" format
  prediction: string;
  odds: number;
  sort_order: number;
  created_at?: string;
  // Future fields (add to DB to enable):
  // home_team?: string;
  // away_team?: string;
  // league?: string;
  // match_date?: string;
}

export interface Ticket {
  id: string;
  title: string;
  prediction?: string;
  total_odds: number;
  tier: ContentTier;
  status: ContentStatus;
  result?: TicketResult;
  description?: string | null;
  ai_analysis?: string | null;
  ticket_date?: string | null;
  created_at?: string;
  created_at_ts?: string;
  updated_at?: string;
  created_by?: string;
  matches?: TicketMatch[];
}

export type TipInsert = Omit<Tip, "id" | "created_at" | "created_at_ts" | "updated_at" | "created_by">;
export type TipUpdate = Partial<TipInsert>;

export type TicketInsert = Omit<Ticket, "id" | "created_at_ts" | "updated_at" | "created_by" | "matches">;
export type TicketUpdate = Partial<TicketInsert>;

export type TicketMatchInsert = Omit<TicketMatch, "id" | "created_at" | "sort_order">;

// Helper to parse match_name into components
export function parseMatchName(matchName: string | undefined | null): { homeTeam: string; awayTeam: string; league?: string } {
  // Handle undefined/null input gracefully
  if (!matchName) {
    return { homeTeam: "Unknown", awayTeam: "Unknown", league: undefined };
  }
  // Expected format: "Home vs Away - League" or "Home vs Away"
  const parts = matchName.split(" - ");
  const teamsAndRest = parts[0];
  const league = parts.length > 1 ? parts.slice(1).join(" - ") : undefined;
  
  const teamParts = teamsAndRest.split(" vs ");
  return {
    homeTeam: teamParts[0]?.trim() || "Unknown",
    awayTeam: teamParts[1]?.trim() || "Unknown",
    league: league?.trim(),
  };
}

// Helper to create match_name from components
export function createMatchName(homeTeam: string, awayTeam: string, league?: string): string {
  const matchPart = `${homeTeam} vs ${awayTeam}`;
  return league ? `${matchPart} - ${league}` : matchPart;
}
