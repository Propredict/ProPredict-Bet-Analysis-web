export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          analysis: string | null
          away_team: string
          away_win: number
          confidence: number
          created_at: string | null
          draw: number
          home_team: string
          home_win: number
          id: string
          is_live: boolean | null
          is_locked: boolean | null
          is_premium: boolean | null
          key_factors: string[] | null
          last_away_goals: number | null
          last_home_goals: number | null
          league: string | null
          match_date: string | null
          match_day: string | null
          match_id: string
          match_time: string | null
          match_timestamp: string | null
          predicted_score: string | null
          prediction: string
          result_status: string | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          analysis?: string | null
          away_team: string
          away_win: number
          confidence: number
          created_at?: string | null
          draw: number
          home_team: string
          home_win: number
          id?: string
          is_live?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          key_factors?: string[] | null
          last_away_goals?: number | null
          last_home_goals?: number | null
          league?: string | null
          match_date?: string | null
          match_day?: string | null
          match_id: string
          match_time?: string | null
          match_timestamp?: string | null
          predicted_score?: string | null
          prediction: string
          result_status?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis?: string | null
          away_team?: string
          away_win?: number
          confidence?: number
          created_at?: string | null
          draw?: number
          home_team?: string
          home_win?: number
          id?: string
          is_live?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          key_factors?: string[] | null
          last_away_goals?: number | null
          last_home_goals?: number | null
          league?: string | null
          match_date?: string | null
          match_day?: string | null
          match_id?: string
          match_time?: string | null
          match_timestamp?: string | null
          predicted_score?: string | null
          prediction?: string
          result_status?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      arena_notifications: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      arena_predictions: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          prediction: string
          season_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          prediction: string
          season_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          prediction?: string
          season_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_predictions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "active_arena_season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_predictions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "arena_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_seasons: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          season_key: string
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          season_key: string
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          season_key?: string
          starts_at?: string
        }
        Relationships: []
      }
      arena_user_stats: {
        Row: {
          current_streak: number
          id: string
          losses: number
          points: number
          reward_granted: boolean
          season_id: string
          updated_at: string | null
          user_id: string
          wins: number
        }
        Insert: {
          current_streak?: number
          id?: string
          losses?: number
          points?: number
          reward_granted?: boolean
          season_id: string
          updated_at?: string | null
          user_id: string
          wins?: number
        }
        Update: {
          current_streak?: number
          id?: string
          losses?: number
          points?: number
          reward_granted?: boolean
          season_id?: string
          updated_at?: string | null
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_user_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "active_arena_season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_user_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "arena_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: []
      }
      match_alert_events: {
        Row: {
          away_score: number
          created_at: string
          event_type: string
          home_score: number
          id: string
          match_id: string
          minute: number | null
        }
        Insert: {
          away_score?: number
          created_at?: string
          event_type: string
          home_score?: number
          id?: string
          match_id: string
          minute?: number | null
        }
        Update: {
          away_score?: number
          created_at?: string
          event_type?: string
          home_score?: number
          id?: string
          match_id?: string
          minute?: number | null
        }
        Relationships: []
      }
      match_alerts: {
        Row: {
          created_at: string
          id: string
          match_id: string
          notify_goals: boolean
          notify_red_cards: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          notify_goals?: boolean
          notify_red_cards?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          notify_goals?: boolean
          notify_red_cards?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      ticket_matches: {
        Row: {
          away_team: string | null
          created_at: string
          home_team: string | null
          id: string
          league: string | null
          match_date: string | null
          match_name: string
          odds: number
          prediction: string
          sort_order: number | null
          ticket_id: string
        }
        Insert: {
          away_team?: string | null
          created_at?: string
          home_team?: string | null
          id?: string
          league?: string | null
          match_date?: string | null
          match_name: string
          odds?: number
          prediction: string
          sort_order?: number | null
          ticket_id: string
        }
        Update: {
          away_team?: string | null
          created_at?: string
          home_team?: string | null
          id?: string
          league?: string | null
          match_date?: string | null
          match_name?: string
          odds?: number
          prediction?: string
          sort_order?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_matches_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_analysis: string | null
          created_at_ts: string
          created_by: string | null
          description: string | null
          id: string
          result: Database["public"]["Enums"]["ticket_result"]
          status: Database["public"]["Enums"]["content_status"]
          ticket_date: string | null
          tier: Database["public"]["Enums"]["content_tier"]
          title: string
          total_odds: number | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at_ts?: string
          created_by?: string | null
          description?: string | null
          id?: string
          result?: Database["public"]["Enums"]["ticket_result"]
          status?: Database["public"]["Enums"]["content_status"]
          ticket_date?: string | null
          tier?: Database["public"]["Enums"]["content_tier"]
          title: string
          total_odds?: number | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: string | null
          created_at_ts?: string
          created_by?: string | null
          description?: string | null
          id?: string
          result?: Database["public"]["Enums"]["ticket_result"]
          status?: Database["public"]["Enums"]["content_status"]
          ticket_date?: string | null
          tier?: Database["public"]["Enums"]["content_tier"]
          title?: string
          total_odds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          ai_prediction: string | null
          away_team: string
          confidence: number | null
          created_at_ts: string
          created_by: string | null
          home_team: string
          id: string
          league: string
          odds: number
          prediction: string
          result: Database["public"]["Enums"]["ticket_result"] | null
          status: Database["public"]["Enums"]["content_status"]
          tier: Database["public"]["Enums"]["content_tier"]
          tip_date: string | null
          updated_at: string
        }
        Insert: {
          ai_prediction?: string | null
          away_team: string
          confidence?: number | null
          created_at_ts?: string
          created_by?: string | null
          home_team: string
          id?: string
          league: string
          odds?: number
          prediction: string
          result?: Database["public"]["Enums"]["ticket_result"] | null
          status?: Database["public"]["Enums"]["content_status"]
          tier?: Database["public"]["Enums"]["content_tier"]
          tip_date?: string | null
          updated_at?: string
        }
        Update: {
          ai_prediction?: string | null
          away_team?: string
          confidence?: number | null
          created_at_ts?: string
          created_by?: string | null
          home_team?: string
          id?: string
          league?: string
          odds?: number
          prediction?: string
          result?: Database["public"]["Enums"]["ticket_result"] | null
          status?: Database["public"]["Enums"]["content_status"]
          tier?: Database["public"]["Enums"]["content_tier"]
          tip_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_favorite_leagues: {
        Row: {
          created_at: string | null
          id: string
          league: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          league: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          league?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_unlocks: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          unlocked_date: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          unlocked_date?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          unlocked_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_arena_season: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string | null
          season_key: string | null
          starts_at: string | null
        }
        Relationships: []
      }
      ai_prediction_leagues: {
        Row: {
          league: string | null
          matches_count: number | null
        }
        Relationships: []
      }
      ai_prediction_stats: {
        Row: {
          lost: number | null
          pending: number | null
          won: number | null
        }
        Relationships: []
      }
      ai_predictions_yesterday: {
        Row: {
          analysis: string | null
          away_team: string | null
          away_win: number | null
          confidence: number | null
          created_at: string | null
          draw: number | null
          home_team: string | null
          home_win: number | null
          id: string | null
          is_live: boolean | null
          is_locked: boolean | null
          is_premium: boolean | null
          key_factors: string[] | null
          league: string | null
          match_date: string | null
          match_day: string | null
          match_id: string | null
          match_time: string | null
          match_timestamp: string | null
          predicted_score: string | null
          prediction: string | null
          result_status: string | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          analysis?: string | null
          away_team?: string | null
          away_win?: number | null
          confidence?: number | null
          created_at?: string | null
          draw?: number | null
          home_team?: string | null
          home_win?: number | null
          id?: string | null
          is_live?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          key_factors?: string[] | null
          league?: string | null
          match_date?: string | null
          match_day?: string | null
          match_id?: string | null
          match_time?: string | null
          match_timestamp?: string | null
          predicted_score?: string | null
          prediction?: string | null
          result_status?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis?: string | null
          away_team?: string | null
          away_win?: number | null
          confidence?: number | null
          created_at?: string | null
          draw?: number | null
          home_team?: string | null
          home_win?: number | null
          id?: string | null
          is_live?: boolean | null
          is_locked?: boolean | null
          is_premium?: boolean | null
          key_factors?: string[] | null
          league?: string | null
          match_date?: string | null
          match_day?: string | null
          match_id?: string | null
          match_time?: string | null
          match_timestamp?: string | null
          predicted_score?: string | null
          prediction?: string | null
          result_status?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_results: {
        Row: {
          created_at: string | null
          id: string | null
          result: Database["public"]["Enums"]["ticket_result"] | null
          source: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          tier: Database["public"]["Enums"]["content_tier"] | null
        }
        Relationships: []
      }
      stats_by_tier: {
        Row: {
          accuracy: number | null
          tier: Database["public"]["Enums"]["content_tier"] | null
        }
        Relationships: []
      }
      stats_global: {
        Row: {
          win_rate: number | null
        }
        Relationships: []
      }
      ticket_accuracy_by_tier: {
        Row: {
          accuracy: number | null
          tier: Database["public"]["Enums"]["content_tier"] | null
        }
        Relationships: []
      }
      tip_accuracy_by_tier: {
        Row: {
          accuracy: number | null
          tier: Database["public"]["Enums"]["content_tier"] | null
        }
        Relationships: []
      }
      tip_count_by_tier: {
        Row: {
          tier: Database["public"]["Enums"]["content_tier"] | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_arena_user_stats: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_arena_prediction: {
        Args: { p_market_type: string; p_match_id: string; p_selection: string }
        Returns: undefined
      }
      resolve_arena_match: { Args: { p_match_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_status: "draft" | "published"
      content_tier: "free" | "daily" | "exclusive" | "premium"
      ticket_result: "pending" | "won" | "lost"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      content_status: ["draft", "published"],
      content_tier: ["free", "daily", "exclusive", "premium"],
      ticket_result: ["pending", "won", "lost"],
    },
  },
} as const
