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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      leaderboard_snapshots: {
        Row: {
          created_at: string | null
          cumulative_pts: number
          match_id: number
          quiniela_id: string
          rank_at_moment: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cumulative_pts?: number
          match_id: number
          quiniela_id: string
          rank_at_moment: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          cumulative_pts?: number
          match_id?: number
          quiniela_id?: string
          rank_at_moment?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_quiniela_id_fkey"
            columns: ["quiniela_id"]
            isOneToOne: false
            referencedRelation: "quinielas"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_code: string | null
          display_date: string | null
          display_time: string | null
          duration: string | null
          group_name: string | null
          home_team_code: string | null
          id: number
          last_synced_at: string | null
          matchday: number | null
          score_away_et: number | null
          score_away_penalties: number | null
          score_away_regular: number | null
          score_home_et: number | null
          score_home_penalties: number | null
          score_home_regular: number | null
          stage: string
          status: string
          utc_date: string
          winner: string | null
        }
        Insert: {
          away_team_code?: string | null
          display_date?: string | null
          display_time?: string | null
          duration?: string | null
          group_name?: string | null
          home_team_code?: string | null
          id: number
          last_synced_at?: string | null
          matchday?: number | null
          score_away_et?: number | null
          score_away_penalties?: number | null
          score_away_regular?: number | null
          score_home_et?: number | null
          score_home_penalties?: number | null
          score_home_regular?: number | null
          stage?: string
          status?: string
          utc_date: string
          winner?: string | null
        }
        Update: {
          away_team_code?: string | null
          display_date?: string | null
          display_time?: string | null
          duration?: string | null
          group_name?: string | null
          home_team_code?: string | null
          id?: number
          last_synced_at?: string | null
          matchday?: number | null
          score_away_et?: number | null
          score_away_penalties?: number | null
          score_away_regular?: number | null
          score_home_et?: number | null
          score_home_penalties?: number | null
          score_home_regular?: number | null
          stage?: string
          status?: string
          utc_date?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_code_fkey"
            columns: ["away_team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "matches_home_team_code_fkey"
            columns: ["home_team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      prediction_submissions: {
        Row: {
          quiniela_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          quiniela_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          quiniela_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_submissions_quiniela_id_fkey"
            columns: ["quiniela_id"]
            isOneToOne: false
            referencedRelation: "quinielas"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          id: string
          match_id: number
          pick_away: number
          pick_home: number
          pick_penalties_winner: string | null
          quiniela_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          match_id: number
          pick_away: number
          pick_home: number
          pick_penalties_winner?: string | null
          quiniela_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          match_id?: number
          pick_away?: number
          pick_home?: number
          pick_penalties_winner?: string | null
          quiniela_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_quiniela_id_fkey"
            columns: ["quiniela_id"]
            isOneToOne: false
            referencedRelation: "quinielas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string | null
          display_name: string
          id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string | null
          display_name: string
          id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      quiniela_members: {
        Row: {
          accuracy: number
          avatar_color: string
          correct_count: number
          display_name: string
          exact_count: number
          id: string
          joined_at: string | null
          prev_rank: number | null
          quiniela_id: string | null
          rank: number | null
          rank_change: number | null
          scored_matches: number
          total_pts: number
          user_id: string | null
          wrong_count: number
        }
        Insert: {
          accuracy?: number
          avatar_color?: string
          correct_count?: number
          display_name: string
          exact_count?: number
          id?: string
          joined_at?: string | null
          prev_rank?: number | null
          quiniela_id?: string | null
          rank?: number | null
          rank_change?: number | null
          scored_matches?: number
          total_pts?: number
          user_id?: string | null
          wrong_count?: number
        }
        Update: {
          accuracy?: number
          avatar_color?: string
          correct_count?: number
          display_name?: string
          exact_count?: number
          id?: string
          joined_at?: string | null
          prev_rank?: number | null
          quiniela_id?: string | null
          rank?: number | null
          rank_change?: number | null
          scored_matches?: number
          total_pts?: number
          user_id?: string | null
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiniela_members_quiniela_id_fkey"
            columns: ["quiniela_id"]
            isOneToOne: false
            referencedRelation: "quinielas"
            referencedColumns: ["id"]
          },
        ]
      }
      quinielas: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          join_code: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          join_code: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          join_code?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          color: string
          fd_id: number | null
          group_id: string
          iso2: string
          name: string
        }
        Insert: {
          code: string
          color: string
          fd_id?: number | null
          group_id: string
          iso2: string
          name: string
        }
        Update: {
          code?: string
          color?: string
          fd_id?: number | null
          group_id?: string
          iso2?: string
          name?: string
        }
        Relationships: []
      }
      top_scorer_predictions: {
        Row: {
          player_name: string
          player_team: string | null
          quiniela_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          player_name: string
          player_team?: string | null
          quiniela_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          player_name?: string
          player_team?: string | null
          quiniela_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_scorer_predictions_player_team_fkey"
            columns: ["player_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "top_scorer_predictions_quiniela_id_fkey"
            columns: ["quiniela_id"]
            isOneToOne: false
            referencedRelation: "quinielas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_quiniela_ids: { Args: never; Returns: string[] }
      prediction_points: {
        Args: {
          p_away_team_code: string
          p_duration: string
          p_home_team_code: string
          p_pick_away: number
          p_pick_home: number
          p_pick_penalties_winner: string
          p_score_away_regular: number
          p_score_home_regular: number
          p_winner: string
        }
        Returns: number
      }
      refresh_quiniela_leaderboard: {
        Args: { p_match_id?: number; p_quiniela_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
