export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          slug: string;
          name: string;
          whatsapp_number: string | null;
          whatsapp_verification_status: "unverified" | "verified";
          whatsapp_verified_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      store_memberships: {
        Row: {
          id: string;
          store_id: string;
          auth_user_id: string;
          role: "store_admin";
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          auth_user_id: string;
          role?: "store_admin";
          created_at?: string;
        };
        Update: never;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
