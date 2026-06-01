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
      admin_approvals: {
        Row: {
          approver_id: string
          candidate_id: string
          created_at: string
          id: string
        }
        Insert: {
          approver_id: string
          candidate_id: string
          created_at?: string
          id?: string
        }
        Update: {
          approver_id?: string
          candidate_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          content: string
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          is_active: boolean
          location_lat: number
          location_lng: number
          radius_km: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_lat: number
          location_lng: number
          radius_km?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_lat?: number
          location_lng?: number
          radius_km?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          points_spent: number
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          points_spent: number
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          points_spent?: number
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          item_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          item_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          item_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_jobs: {
        Row: {
          commission_fee: number
          created_at: string
          description: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          pickup_lat: number | null
          pickup_lng: number | null
          price: number
          requester_id: string
          status: Database["public"]["Enums"]["delivery_job_status"]
          title: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          commission_fee?: number
          created_at?: string
          description?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number
          requester_id: string
          status?: Database["public"]["Enums"]["delivery_job_status"]
          title: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          commission_fee?: number
          created_at?: string
          description?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number
          requester_id?: string
          status?: Database["public"]["Enums"]["delivery_job_status"]
          title?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      delivery_requests: {
        Row: {
          courier_id: string | null
          created_at: string
          description: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          fee: number
          id: string
          payment_link: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          requester_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          title: string
          updated_at: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          description?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fee?: number
          id?: string
          payment_link?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          requester_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          title: string
          updated_at?: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          description?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fee?: number
          id?: string
          payment_link?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          requester_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_alerts: {
        Row: {
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          message?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      handshakes: {
        Row: {
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          method: Database["public"]["Enums"]["handshake_method"]
          pair_count: number
          points_awarded: number
          provider_id: string
          requester_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          method?: Database["public"]["Enums"]["handshake_method"]
          pair_count?: number
          points_awarded?: number
          provider_id: string
          requester_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          method?: Database["public"]["Enums"]["handshake_method"]
          pair_count?: number
          points_awarded?: number
          provider_id?: string
          requester_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location_lat: number | null
          location_lng: number | null
          nafath_only: boolean
          owner_id: string
          price_type: Database["public"]["Enums"]["price_type"]
          price_value: number | null
          security_deposit: number | null
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          nafath_only?: boolean
          owner_id: string
          price_type?: Database["public"]["Enums"]["price_type"]
          price_value?: number | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          nafath_only?: boolean
          owner_id?: string
          price_type?: Database["public"]["Enums"]["price_type"]
          price_value?: number | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jeera_box: {
        Row: {
          category: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          description: string | null
          donor_id: string
          id: string
          image_url: string | null
          location_lat: number | null
          location_lng: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          donor_id: string
          id?: string
          image_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          donor_id?: string
          id?: string
          image_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_official: boolean
          title: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_official?: boolean
          title: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_official?: boolean
          title?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      payment_invoices: {
        Row: {
          amount_sar: number
          applied_at: string | null
          created_at: string
          id: string
          np_invoice_id: string | null
          np_payment_id: string | null
          pay_address: string | null
          pay_amount: number | null
          pay_currency: string
          purpose: string
          purpose_payload: Json
          raw_ipn: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_sar: number
          applied_at?: string | null
          created_at?: string
          id?: string
          np_invoice_id?: string | null
          np_payment_id?: string | null
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string
          purpose: string
          purpose_payload?: Json
          raw_ipn?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_sar?: number
          applied_at?: string | null
          created_at?: string
          id?: string
          np_invoice_id?: string | null
          np_payment_id?: string | null
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string
          purpose?: string
          purpose_payload?: Json
          raw_ipn?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_admin: boolean
          is_verified: boolean
          location_lat: number | null
          location_lng: number | null
          photo_slots: number
          points: number
          subscription_expires_at: string | null
          subscription_type: string
          tier: string
          trust_score: number
          updated_at: string
          user_id: string
          username: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          is_verified?: boolean
          location_lat?: number | null
          location_lng?: number | null
          photo_slots?: number
          points?: number
          subscription_expires_at?: string | null
          subscription_type?: string
          tier?: string
          trust_score?: number
          updated_at?: string
          user_id: string
          username: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          is_verified?: boolean
          location_lat?: number | null
          location_lng?: number | null
          photo_slots?: number
          points?: number
          subscription_expires_at?: string | null
          subscription_type?: string
          tier?: string
          trust_score?: number
          updated_at?: string
          user_id?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      requests: {
        Row: {
          courier_id: string | null
          created_at: string
          id: string
          item_id: string
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          resource: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          resource: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          resource?: string
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_decide_candidate: {
        Args: { p_approve: boolean; p_candidate_id: string }
        Returns: Json
      }
      admin_list_profiles: {
        Args: { _limit?: number; _only_pending?: boolean }
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_admin: boolean
          is_verified: boolean
          location_lat: number | null
          location_lng: number | null
          photo_slots: number
          points: number
          subscription_expires_at: string | null
          subscription_type: string
          tier: string
          trust_score: number
          updated_at: string
          user_id: string
          username: string
          wallet_balance: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      boost_target: {
        Args: { p_points: number; p_target_id: string; p_target_type: string }
        Returns: Json
      }
      can_send_emergency: { Args: { p_user_id: string }; Returns: Json }
      check_admin_status: { Args: { p_candidate_id: string }; Returns: Json }
      complete_delivery_job: { Args: { p_job_id: string }; Returns: Json }
      credit_wallet_for_invoice: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_admin: boolean
          is_verified: boolean
          location_lat: number | null
          location_lng: number | null
          photo_slots: number
          points: number
          subscription_expires_at: string | null
          subscription_type: string
          tier: string
          trust_score: number
          updated_at: string
          user_id: string
          username: string
          wallet_balance: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      perform_handshake: {
        Args: {
          _lat?: number
          _lng?: number
          _method: Database["public"]["Enums"]["handshake_method"]
          _provider_id: string
          _requester_id: string
        }
        Returns: Json
      }
      purchase_photo_slots: { Args: { p_slots: number }; Returns: Json }
      purchase_subscription: { Args: { p_plan: string }; Returns: Json }
      redeem_points_for_subscription: { Args: never; Returns: Json }
    }
    Enums: {
      delivery_job_status: "open" | "accepted" | "completed" | "cancelled"
      delivery_status:
        | "open"
        | "accepted"
        | "picked_up"
        | "delivered"
        | "cancelled"
      handshake_method: "qr_code" | "manual"
      item_status: "available" | "busy"
      price_type: "free" | "borrow" | "for_sale"
      request_status: "pending" | "accepted" | "delivered"
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
      delivery_job_status: ["open", "accepted", "completed", "cancelled"],
      delivery_status: [
        "open",
        "accepted",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      handshake_method: ["qr_code", "manual"],
      item_status: ["available", "busy"],
      price_type: ["free", "borrow", "for_sale"],
      request_status: ["pending", "accepted", "delivered"],
    },
  },
} as const
