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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      games: {
        Row: {
          created_at: string
          field_condition: Database["public"]["Enums"]["field_condition"] | null
          final_score_opponent: number | null
          final_score_us: number | null
          game_date: string
          id: string
          is_home_game: boolean
          opponent_name: string
          team_id: string
          temperature: number | null
          updated_at: string
          weather_condition:
            | Database["public"]["Enums"]["weather_condition"]
            | null
        }
        Insert: {
          created_at?: string
          field_condition?:
            | Database["public"]["Enums"]["field_condition"]
            | null
          final_score_opponent?: number | null
          final_score_us?: number | null
          game_date: string
          id?: string
          is_home_game?: boolean
          opponent_name: string
          team_id: string
          temperature?: number | null
          updated_at?: string
          weather_condition?:
            | Database["public"]["Enums"]["weather_condition"]
            | null
        }
        Update: {
          created_at?: string
          field_condition?:
            | Database["public"]["Enums"]["field_condition"]
            | null
          final_score_opponent?: number | null
          final_score_us?: number | null
          game_date?: string
          id?: string
          is_home_game?: boolean
          opponent_name?: string
          team_id?: string
          temperature?: number | null
          updated_at?: string
          weather_condition?:
            | Database["public"]["Enums"]["weather_condition"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string | null
          invited_by: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string | null
          invited_by: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string | null
          invited_by?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invitations_invited_by"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_invitations_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          created_at: string
          id: string
          play_id: string
          player_id: string
          stat_type: string
          stat_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          play_id: string
          player_id: string
          stat_type: string
          stat_value?: number
        }
        Update: {
          created_at?: string
          id?: string
          play_id?: string
          player_id?: string
          stat_type?: string
          stat_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_play_id_fkey"
            columns: ["play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          first_name: string
          grade_level: number | null
          height: number | null
          id: string
          jersey_number: number
          last_name: string
          nickname: string | null
          positions: string[] | null
          team_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          first_name: string
          grade_level?: number | null
          height?: number | null
          id?: string
          jersey_number: number
          last_name: string
          nickname?: string | null
          positions?: string[] | null
          team_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          first_name?: string
          grade_level?: number | null
          height?: number | null
          id?: string
          jersey_number?: number
          last_name?: string
          nickname?: string | null
          positions?: string[] | null
          team_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      plays: {
        Row: {
          created_at: string
          distance: number
          down: number
          game_id: string
          id: string
          is_first_down: boolean
          is_touchdown: boolean
          is_turnover: boolean
          penalty_player: string | null
          penalty_team: string | null
          penalty_type: string | null
          penalty_yards: number | null
          play_description: string | null
          play_type: Database["public"]["Enums"]["play_type"]
          quarter: number
          updated_at: string
          yard_line: number
          yards_gained: number
        }
        Insert: {
          created_at?: string
          distance: number
          down: number
          game_id: string
          id?: string
          is_first_down?: boolean
          is_touchdown?: boolean
          is_turnover?: boolean
          penalty_player?: string | null
          penalty_team?: string | null
          penalty_type?: string | null
          penalty_yards?: number | null
          play_description?: string | null
          play_type: Database["public"]["Enums"]["play_type"]
          quarter: number
          updated_at?: string
          yard_line: number
          yards_gained?: number
        }
        Update: {
          created_at?: string
          distance?: number
          down?: number
          game_id?: string
          id?: string
          is_first_down?: boolean
          is_touchdown?: boolean
          is_turnover?: boolean
          penalty_player?: string | null
          penalty_team?: string | null
          penalty_type?: string | null
          penalty_yards?: number | null
          play_description?: string | null
          play_type?: Database["public"]["Enums"]["play_type"]
          quarter?: number
          updated_at?: string
          yard_line?: number
          yards_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "plays_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          season_year: number
          team_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          season_year: number
          team_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          season_year?: number
          team_code?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_id: string }
        Returns: boolean
      }
      accept_invitation_by_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      can_join_team_by_code: {
        Args: { code: string }
        Returns: boolean
      }
      create_team_invitation: {
        Args: { p_email: string; p_invited_by: string; p_team_id: string }
        Returns: {
          expires_at: string
          invitation_token: string
        }[]
      }
      get_my_full_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_invitation_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          expires_at: string
          id: string
          status: string
          team_name: string
        }[]
      }
      get_my_public_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_team_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          season_year: number
          team_code: string
        }[]
      }
      get_my_team_member_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          first_name: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_team_invitation_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          accepted_count: number
          expired_count: number
          pending_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_team: {
        Args: { _user_id: string }
        Returns: string
      }
      join_team_by_code: {
        Args: { code: string }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          team_id: string
        }[]
      }
    }
    Enums: {
      field_condition: "dry" | "wet" | "muddy" | "frozen"
      play_type:
        | "run"
        | "pass"
        | "punt"
        | "field_goal"
        | "kickoff"
        | "extra_point"
      user_role: "head_coach" | "assistant_coach" | "parent"
      weather_condition: "clear" | "rain" | "snow" | "wind" | "fog"
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
      field_condition: ["dry", "wet", "muddy", "frozen"],
      play_type: [
        "run",
        "pass",
        "punt",
        "field_goal",
        "kickoff",
        "extra_point",
      ],
      user_role: ["head_coach", "assistant_coach", "parent"],
      weather_condition: ["clear", "rain", "snow", "wind", "fog"],
    },
  },
} as const
