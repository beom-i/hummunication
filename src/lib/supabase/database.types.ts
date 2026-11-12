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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      family: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          leader_answer: string
          leader_name: string
          members: Json
          name: string
          photo_edit: Json | null
          photo_id: string | null
          position: number
          updated_at: string
          updated_by: string | null
          weekly_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          leader_answer?: string
          leader_name?: string
          members?: Json
          name?: string
          photo_edit?: Json | null
          photo_id?: string | null
          position?: number
          updated_at?: string
          updated_by?: string | null
          weekly_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          leader_answer?: string
          leader_name?: string
          members?: Json
          name?: string
          photo_edit?: Json | null
          photo_id?: string | null
          position?: number
          updated_at?: string
          updated_by?: string | null
          weekly_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_weekly_id_fkey"
            columns: ["weekly_id"]
            isOneToOne: false
            referencedRelation: "weekly"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          path: string
          purged_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          path: string
          purged_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          path?: string
          purged_at?: string | null
        }
        Relationships: []
      }
      sender: {
        Row: {
          created_at: string
          date: string | null
          deleted_at: string | null
          generation: string
          group_name: string
          id: string
          name: string
          position: number
          prayer: string
          updated_at: string
          updated_by: string | null
          weekly_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          generation?: string
          group_name?: string
          id?: string
          name?: string
          position: number
          prayer?: string
          updated_at?: string
          updated_by?: string | null
          weekly_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          generation?: string
          group_name?: string
          id?: string
          name?: string
          position?: number
          prayer?: string
          updated_at?: string
          updated_by?: string | null
          weekly_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sender_weekly_id_fkey"
            columns: ["weekly_id"]
            isOneToOne: false
            referencedRelation: "weekly"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon: {
        Row: {
          bible: string
          content: Json
          created_at: string
          date: string | null
          deleted_at: string | null
          id: string
          speaker: string
          thumbnail_id: string | null
          thumbnail_edit: Json | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bible?: string
          content?: Json
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          speaker?: string
          thumbnail_id?: string | null
          thumbnail_edit?: Json | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bible?: string
          content?: Json
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          speaker?: string
          thumbnail_id?: string | null
          thumbnail_edit?: Json | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermon_thumbnail_id_fkey"
            columns: ["thumbnail_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          sections: string[]
          sermon_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          sections?: string[]
          sermon_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          sections?: string[]
          sermon_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: true
            referencedRelation: "sermon"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_photo_cleanup: { Args: Record<PropertyKey, never>; Returns: { id: string; path: string }[] }
      finish_photo_cleanup: { Args: { p_ids: string[] }; Returns: undefined }
      delete_family: { Args: { p_id: string }; Returns: undefined }
      delete_file: { Args: { p_id: string }; Returns: undefined }
      delete_sender: { Args: { p_id: string }; Returns: undefined }
      delete_sermon: { Args: { p_id: string }; Returns: undefined }
      delete_weekly: { Args: { p_id: string }; Returns: undefined }
      get_family: { Args: { p_id: string }; Returns: Json }
      get_sender: { Args: { p_id: string }; Returns: Json }
      get_sermon: { Args: { p_id: string }; Returns: Json }
      get_weekly: { Args: { p_date: string }; Returns: Json }
      register_file: { Args: { p_path: string }; Returns: string }
      save_family: { Args: { p_id?: string; p_values?: Json }; Returns: string }
      save_sender: { Args: { p_id?: string; p_values?: Json }; Returns: string }
      save_sermon: { Args: { p_id?: string; p_values?: Json }; Returns: string }
      save_weekly: {
        Args: {
          p_date?: string
          p_families?: Json
          p_id?: string
          p_sections?: string[]
          p_senders?: Json
          p_sermon?: Json
        }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
