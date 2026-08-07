import type { GraphicsPreset, GamePerformanceTier } from "./game";
import type { CompatibilityStatus } from "./software";
import type { LaptopSpecs, PerformanceScores } from "./laptop";

export type UserRole = "member" | "editor" | "admin";

type Timestamps = "created_at" | "updated_at";

/**
 * Hand-maintained schema types.
 *
 * The shape matters as much as the fields: `supabase-js` resolves query results
 * through generics that expect `Row` / `Insert` / `Update` / `Relationships` on
 * every table plus `Views`, `Functions`, `Enums` and `CompositeTypes` on the
 * schema. Omit any of them and every `.select()` silently resolves to `never`
 * rather than failing loudly.
 *
 * Regenerate from the live project once it exists:
 *   npx supabase gen types typescript --project-id <id> > lib/types/database.ts
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          welcome_email_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          welcome_email_sent_at?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          welcome_email_sent_at?: string | null;
        };
        Relationships: [];
      };
      laptops: {
        Row: {
          id: string;
          name: string;
          brand: string;
          price: number;
          mrp: number;
          summary: string;
          specs: LaptopSpecs;
          performance: PerformanceScores;
          image: string;
          images: string[];
          rating: number;
          reviews_count: number;
          bestseller: boolean;
          release_year: number;
          views: number;
          tags: string[];
          affiliate_url: string | null;
          in_stock: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["laptops"]["Row"], Timestamps>;
        Update: Partial<Omit<Database["public"]["Tables"]["laptops"]["Row"], Timestamps>>;
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          name: string;
          genre: string;
          release_year: number;
          icon: string;
          demand: number;
          cpu_bound: boolean;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["games"]["Row"];
        Update: Partial<Database["public"]["Tables"]["games"]["Row"]>;
        Relationships: [];
      };
      software: {
        Row: {
          id: string;
          name: string;
          category: string;
          vendor: string;
          icon: string;
          req_cpu: number;
          req_gpu: number;
          req_ram: number;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["software"]["Row"];
        Update: Partial<Database["public"]["Tables"]["software"]["Row"]>;
        Relationships: [];
      };
      laptop_games: {
        Row: {
          laptop_id: string;
          game_id: string;
          fps: number;
          graphics: GraphicsPreset;
          tier: GamePerformanceTier;
        };
        Insert: Database["public"]["Tables"]["laptop_games"]["Row"];
        Update: Partial<Database["public"]["Tables"]["laptop_games"]["Row"]>;
        Relationships: [];
      };
      laptop_software: {
        Row: {
          laptop_id: string;
          software_id: string;
          status: CompatibilityStatus;
        };
        Insert: Database["public"]["Tables"]["laptop_software"]["Row"];
        Update: Partial<Database["public"]["Tables"]["laptop_software"]["Row"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          laptop_id: string;
          author_id: string | null;
          author_name: string;
          rating: number;
          title: string;
          comment: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          laptop_id: string;
          author_id: string | null;
          author_name: string;
          rating: number;
          title: string;
          comment: string;
          verified?: boolean;
        };
        Update: {
          rating?: number;
          title?: string;
          comment?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      wishlists: {
        Row: { user_id: string; laptop_id: string; created_at: string };
        Insert: { user_id: string; laptop_id: string };
        Update: { user_id?: string; laptop_id?: string };
        Relationships: [];
      };
      comparisons: {
        Row: {
          id: string;
          user_id: string;
          laptop_a: string;
          laptop_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          laptop_a: string;
          laptop_b: string;
        };
        Update: {
          laptop_a?: string;
          laptop_b?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_laptop_views: {
        Args: { p_laptop_id: string };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      graphics_preset: GraphicsPreset;
      game_tier: GamePerformanceTier;
      compat_status: CompatibilityStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type LaptopRow = Database["public"]["Tables"]["laptops"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
