export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      assets: {
        Row: {
          byte_size: number;
          content_type: string;
          created_at: string;
          height: number | null;
          id: string;
          storage_path: string;
          store_id: string;
          width: number | null;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path: string;
          store_id: string;
          width?: number | null;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path?: string;
          store_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assets_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_banners: {
        Row: {
          accessible_description: string;
          created_at: string;
          id: string;
          image_asset_id: string;
          is_active: boolean;
          position: number;
          store_id: string;
          text: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          accessible_description: string;
          created_at?: string;
          id?: string;
          image_asset_id: string;
          is_active?: boolean;
          position: number;
          store_id: string;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          accessible_description?: string;
          created_at?: string;
          id?: string;
          image_asset_id?: string;
          is_active?: boolean;
          position?: number;
          store_id?: string;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hero_banners_image_asset_id_fkey";
            columns: ["image_asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hero_banners_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          image_asset_id: string;
          is_active: boolean;
          is_orderable: boolean;
          is_visible: boolean;
          name: string;
          quantity_available: number;
          sku: string | null;
          store_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          image_asset_id: string;
          is_active?: boolean;
          is_orderable?: boolean;
          is_visible?: boolean;
          name: string;
          quantity_available?: number;
          sku?: string | null;
          store_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          image_asset_id?: string;
          is_active?: boolean;
          is_orderable?: boolean;
          is_visible?: boolean;
          name?: string;
          quantity_available?: number;
          sku?: string | null;
          store_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_image_asset_id_fkey";
            columns: ["image_asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      store_memberships: {
        Row: {
          auth_user_id: string;
          created_at: string;
          id: string;
          role: string;
          store_id: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          id?: string;
          role?: string;
          store_id: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          store_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_memberships_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
          whatsapp_number: string | null;
          whatsapp_verification_status: string;
          whatsapp_verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
          whatsapp_number?: string | null;
          whatsapp_verification_status?: string;
          whatsapp_verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
          whatsapp_number?: string | null;
          whatsapp_verification_status?: string;
          whatsapp_verified_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_store_whatsapp_verification: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
          whatsapp_number: string | null;
          whatsapp_verification_status: string;
          whatsapp_verified_at: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "stores";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      list_public_hero_banners: {
        Args: { p_storage_base_url: string; p_store_slug: string };
        Returns: {
          accessible_description: string;
          banner_text: string;
          id: string;
          image_url: string;
          position: number;
          title: string;
        }[];
      };
      list_public_products: {
        Args: { p_storage_base_url: string; p_store_slug: string };
        Returns: {
          description: string;
          id: string;
          image_url: string;
          is_orderable: boolean;
          name: string;
          quantity_available: number;
          sku: string;
        }[];
      };
      resolve_public_store: {
        Args: { p_slug: string };
        Returns: {
          name: string;
          slug: string;
          whatsapp_available: boolean;
          whatsapp_number: string;
        }[];
      };
      update_store_whatsapp_number: {
        Args: { p_whatsapp_number: string };
        Returns: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
          whatsapp_number: string | null;
          whatsapp_verification_status: string;
          whatsapp_verified_at: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "stores";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
