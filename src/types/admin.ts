export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentStatus = "draft" | "published";
export type TicketResult = "pending" | "won" | "lost";

// =====================
// TIPS
// =====================
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
  created_at?: string;
  created_at_ts?: string;
  updated_at?: string;
  created_by?: string | null;
}

// =====================
// TICKETS
// =====================
export interface TicketMatch {
  id: string;
  ticket_id: string;
  match_name: string;
  prediction: string;
  odds: number;
  sort_order: number;
  created_at?: string;
}

export interface Ticket {
  id: string;
  title: string;
  total_odds: number;
  tier: ContentTier;
  status: ContentStatus;
  result: TicketResult;
  created_at?: string;
  created_at_ts?: string;
  updated_at?: string;
  created_by?: string;
  matches?: TicketMatch[];
}

// =====================
// INSERT / UPDATE
// =====================
export type TipInsert = Omit<Tip, "id" | "created_at" | "created_at_ts" | "updated_at" | "created_by">;

export type TipUpdate = Partial<TipInsert>;

export type TicketInsert = Omit<Ticket, "id" | "created_at_ts" | "updated_at" | "created_by" | "matches">;

export type TicketUpdate = Partial<TicketInsert>;

export type TicketMatchInsert = Omit<TicketMatch, "id" | "created_at" | "sort_order">;
