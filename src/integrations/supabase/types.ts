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
      community_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_hidden: boolean
          is_pinned: boolean
          likes_count: number
          post_type: Database["public"]["Enums"]["community_post_type"]
          recipe_data: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          post_type?: Database["public"]["Enums"]["community_post_type"]
          recipe_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          post_type?: Database["public"]["Enums"]["community_post_type"]
          recipe_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          admin_notes: string | null
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string | null
          recipe_snapshot: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id?: string | null
          recipe_snapshot?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string | null
          recipe_snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ingredients_catalog: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean
          post_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          post_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          post_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      pages_content: {
        Row: {
          content_ar: Json
          content_en: Json
          id: string
          page_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_ar?: Json
          content_en?: Json
          id?: string
          page_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_ar?: Json
          content_en?: Json
          id?: string
          page_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_cuisines: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          cuisine: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          estimated_time_minutes: number | null
          id: string
          image_url: string | null
          ingredients: Json
          is_published: boolean
          language: string
          missing_ingredients: Json
          steps: Json
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cuisine?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          estimated_time_minutes?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_published?: boolean
          language?: string
          missing_ingredients?: Json
          steps?: Json
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cuisine?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          estimated_time_minutes?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          is_published?: boolean
          language?: string
          missing_ingredients?: Json
          steps?: Json
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          description_ar: string | null
          description_en: string | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          keywords_ar: string | null
          keywords_en: string | null
          logo_url: string | null
          og_image_url: string | null
          primary_color: string | null
          singleton: boolean
          site_name_ar: string
          site_name_en: string
          site_url: string | null
          tagline_ar: string | null
          tagline_en: string | null
          telegram_url: string | null
          tiktok_url: string | null
          twitter_handle: string | null
          twitter_url: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_url: string | null
        }
        Insert: {
          contact_email?: string | null
          description_ar?: string | null
          description_en?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          keywords_ar?: string | null
          keywords_en?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          singleton?: boolean
          site_name_ar?: string
          site_name_en?: string
          site_url?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_handle?: string | null
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          contact_email?: string | null
          description_ar?: string | null
          description_en?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          keywords_ar?: string | null
          keywords_en?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          primary_color?: string | null
          singleton?: boolean
          site_name_ar?: string
          site_name_en?: string
          site_url?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_handle?: string | null
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          daily_limit: number
          day: string
          feature: string
          id: string
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          daily_limit?: number
          day?: string
          feature: string
          id?: string
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          daily_limit?: number
          day?: string
          feature?: string
          id?: string
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          fridge_limit: number
          fridge_today: number
          id: string
          is_active: boolean
          is_admin: boolean
          recipes_limit: number
          recipes_today: number
        }[]
      }
      admin_set_user_limit: {
        Args: { _feature: string; _new_limit: number; _user_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: { _is_active: boolean; _user_id: string }
        Returns: undefined
      }
      check_and_increment_usage: {
        Args: { _default_limit?: number; _feature: string; _user_id: string }
        Returns: Json
      }
      get_top_creators: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          followers_count: number
          id: string
          likes_count: number
          posts_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_banned: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      community_post_type: "recipe" | "post"
      difficulty_level: "easy" | "medium" | "hard"
      message_status: "new" | "read" | "replied" | "archived"
      notification_type: "like" | "comment" | "follow"
      report_status: "pending" | "reviewed" | "dismissed" | "actioned"
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
      app_role: ["admin", "user"],
      community_post_type: ["recipe", "post"],
      difficulty_level: ["easy", "medium", "hard"],
      message_status: ["new", "read", "replied", "archived"],
      notification_type: ["like", "comment", "follow"],
      report_status: ["pending", "reviewed", "dismissed", "actioned"],
    },
  },
} as const
