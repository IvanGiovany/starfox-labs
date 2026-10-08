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
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          badges: string[]
          card_size: string
          created_at: string
          finished_on: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          isbn: string | null
          note: string | null
          open_library_key: string | null
          page_count: number | null
          post_id: string | null
          published_year: number | null
          rating: number | null
          reading_status: string
          show_on_home: boolean
          sort_order: number
          started_on: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string | null
          badges?: string[]
          card_size?: string
          created_at?: string
          finished_on?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          isbn?: string | null
          note?: string | null
          open_library_key?: string | null
          page_count?: number | null
          post_id?: string | null
          published_year?: number | null
          rating?: number | null
          reading_status?: string
          show_on_home?: boolean
          sort_order?: number
          started_on?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string | null
          badges?: string[]
          card_size?: string
          created_at?: string
          finished_on?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          isbn?: string | null
          note?: string | null
          open_library_key?: string | null
          page_count?: number | null
          post_id?: string | null
          published_year?: number | null
          rating?: number | null
          reading_status?: string
          show_on_home?: boolean
          sort_order?: number
          started_on?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          by_admin: boolean
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          by_admin?: boolean
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          by_admin?: boolean
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          badges: string[]
          card_size: string
          created_at: string
          finished_on: string | null
          hours_played: number | null
          id: string
          image_alt: string | null
          image_path: string | null
          platform: string | null
          play_status: string
          post_id: string | null
          rating: number | null
          show_on_home: boolean
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          badges?: string[]
          card_size?: string
          created_at?: string
          finished_on?: string | null
          hours_played?: number | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          platform?: string | null
          play_status?: string
          post_id?: string | null
          rating?: number | null
          show_on_home?: boolean
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          badges?: string[]
          card_size?: string
          created_at?: string
          finished_on?: string | null
          hours_played?: number | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          platform?: string | null
          play_status?: string
          post_id?: string | null
          rating?: number | null
          show_on_home?: boolean
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      hobby_items: {
        Row: {
          badges: string[]
          caption: string | null
          card_size: string
          category: string | null
          created_at: string
          id: string
          image_alt: string | null
          image_path: string | null
          image_style: string
          note: string | null
          post_id: string | null
          show_on_home: boolean
          sort_order: number
          status: string
          subtitle: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          badges?: string[]
          caption?: string | null
          card_size?: string
          category?: string | null
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          image_style?: string
          note?: string | null
          post_id?: string | null
          show_on_home?: boolean
          sort_order?: number
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          badges?: string[]
          caption?: string | null
          card_size?: string
          category?: string | null
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          image_style?: string
          note?: string | null
          post_id?: string | null
          show_on_home?: boolean
          sort_order?: number
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hobby_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body_md: string
          cover_image_url: string | null
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          body_md?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          body_md?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          badges: string[]
          card_size: string
          created_at: string
          id: string
          image_alt: string | null
          image_path: string | null
          post_id: string | null
          repo_url: string | null
          show_on_home: boolean
          sort_order: number
          stack: string[]
          started_on: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          badges?: string[]
          card_size?: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          post_id?: string | null
          repo_url?: string | null
          show_on_home?: boolean
          sort_order?: number
          stack?: string[]
          started_on?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          badges?: string[]
          card_size?: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          post_id?: string | null
          repo_url?: string | null
          show_on_home?: boolean
          sort_order?: number
          stack?: string[]
          started_on?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          badges: string[]
          card_size: string
          created_at: string
          full_track_url: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          in_progress: boolean
          links: Json
          note: string | null
          post_id: string | null
          released_on: string | null
          show_on_home: boolean
          snippet_path: string | null
          snippet_seconds: number | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          badges?: string[]
          card_size?: string
          created_at?: string
          full_track_url?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          in_progress?: boolean
          links?: Json
          note?: string | null
          post_id?: string | null
          released_on?: string | null
          show_on_home?: boolean
          snippet_path?: string | null
          snippet_seconds?: number | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          badges?: string[]
          card_size?: string
          created_at?: string
          full_track_url?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          in_progress?: boolean
          links?: Json
          note?: string | null
          post_id?: string | null
          released_on?: string | null
          show_on_home?: boolean
          snippet_path?: string | null
          snippet_seconds?: number | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      post_items: {
        Row: {
          details: Json | null
          image_alt: string | null
          image_path: string | null
          item_id: string | null
          post_id: string | null
          section: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_comment: { Args: { comment_id: string }; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_account: { Args: never; Returns: boolean }
      is_reserved_name: { Args: { name: string }; Returns: boolean }
      next_username_change: { Args: never; Returns: string }
      reorder_items: {
        Args: { ids: string[]; section: string }
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
