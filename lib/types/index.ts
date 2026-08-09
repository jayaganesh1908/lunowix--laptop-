export type CompatibilityStatus =
  | "Runs Smoothly"
  | "Runs Fine"
  | "Limited"
  | "Not Recommended";

export type SoftwareCategory =
  | "Development"
  | "Design"
  | "Video"
  | "3D & CAD"
  | "Engineering";

export interface Software {
  id: string;
  name: string;
  category: SoftwareCategory;
  vendor: string;
  /** Emoji stand-in for the app icon. */
  icon: string;
  /** Scores/GB needed for a comfortable "Runs Fine" experience. */
  requirement: {
    cpu: number;
    gpu: number;
    ram: number;
  };
}

/** Keyed by `Software["name"]` so it renders directly in tables. */
export type SoftwareCompatibilityMap = Record<string, CompatibilityStatus>;

export type GraphicsPreset = "Low" | "Medium" | "High" | "Ultra";

export type GamePerformanceTier =
  | "Flawless"
  | "Excellent"
  | "Playable"
  | "Struggles";

export interface Game {
  id: string;
  name: string;
  genre: string;
  releaseYear: number;
  /** Emoji stand-in for cover art so the demo ships without external assets. */
  icon: string;
  /**
   * GPU score required to hold ~60fps at the High preset. Used by the
   * benchmark model in `lib/data/laptops.ts`.
   */
  demand: number;
  /** Some engines are notably CPU bound; raises the CPU weight of the model. */
  cpuBound: boolean;
}

export interface GameBenchmark {
  id: string;
  name: string;
  icon: string;
  fps: number;
  graphics: GraphicsPreset;
  tier: GamePerformanceTier;
}

/**
 * The category-agnostic layer.
 *
 * Laptops came first and their types live below. Phones and headphones
 * were added on top of the same contract rather than beside it, so shared UI
 * (cards, search, compare, the 3D viewer) can take a `Product` and stay honest
 * about what it does not know — a headphone has no GPU and a phone has no
 * keyboard, and the union makes the compiler say so.
 */

export type ProductCategory = "laptop" | "phone" | "headphone";

export type LaptopBrand =
  | "Lenovo"
  | "HP"
  | "Dell"
  | "ASUS"
  | "Acer"
  | "MSI"
  | "Samsung";

export type PhoneBrand =
  | "Apple"
  | "Samsung"
  | "OnePlus"
  | "Google"
  | "Xiaomi"
  | "Nothing"
  | "iQOO"
  | "Motorola"
  | "Realme"
  | "Vivo";

export type HeadphoneBrand =
  | "Sony"
  | "Bose"
  | "Apple"
  | "Sennheiser"
  | "JBL"
  | "Nothing"
  | "Samsung"
  | "Soundcore"
  | "Marshall"
  | "boAt"
  | "OnePlus"
  | "Realme";

export type ProductBrand = LaptopBrand | PhoneBrand | HeadphoneBrand;

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
}

/* -------------------------------------------------------------------------- */
/* Parametric 3D                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Drives the 3D viewer. Every field here is **derived from the product's own
 * specs** in the category's data module — never hand-authored — so a 16-inch
 * gaming laptop renders thick with deep vents while a 13-inch ultrabook renders
 * thin, from one archetype mesh. Three Blender-authored meshes therefore cover
 * the whole catalogue without a per-product asset download.
 */
export interface Model3DParams {
  /** Which archetype mesh to load out of `/models`. */
  archetype: ProductCategory;
  /**
   * True-to-life size of the longest dimension in cm. The viewer normalises
   * against it, so a 6.1-inch phone really does look smaller than a 16-inch
   * laptop when the two sit in one scene on the compare page.
   */
  span: number;
  /** Body finish, sampled from the product's real colourway. */
  bodyColor: string;
  /** Trim, vents, logo and port detailing. */
  accentColor: string;
  /**
   * 0-1 chassis heft. Driven by weight-per-span for laptops, by thickness for
   * phones, by cup depth for headphones. Feeds the mesh's thickness morph.
   */
  bulk: number;
  /**
   * 0-1 panel emission. OLED and high-nit panels genuinely glow more in the
   * viewer, which is the cheapest honest way to show display quality in 3D.
   * Headphones have no panel and sit at 0.
   */
  screenGlow: number;
}

/* -------------------------------------------------------------------------- */
/* Shared shape                                                               */
/* -------------------------------------------------------------------------- */

/** Everything every product carries, whatever it is. */
export interface ProductBase {
  id: string;
  category: ProductCategory;
  name: string;
  brand: ProductBrand;
  /** Street price in ₹. */
  price: number;
  /** List price in ₹, used to derive the discount badge. */
  mrp: number;
  summary: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  reviewList: Review[];
  bestseller: boolean;
  releaseYear: number;
  /** Drives the admin "most viewed" ranking. */
  views: number;
  tags: string[];
  /** Placeholder for a future affiliate integration. */
  affiliateUrl: string;
  inStock: boolean;
  model3d: Model3DParams;
}

export type Product = Laptop | Phone | Headphone;

/* -------------------------------------------------------------------------- */
/* Category metadata                                                          */
/* -------------------------------------------------------------------------- */

/**
 * One row per category, consumed by the nav, the home page and the generic
 * browser. Scoring axes differ per category, so the axis list travels with the
 * category rather than being hardcoded into the meter component.
 */
export interface CategoryMeta {
  slug: ProductCategory;
  /** URL segment — pluralised. */
  route: "laptops" | "phones" | "headphones";
  label: string;
  pluralLabel: string;
  tagline: string;
  /** Emoji stand-in, consistent with how games and software are iconified. */
  icon: string;
  /** Ordered score axes shown on cards, detail pages and the compare table. */
  axes: { key: string; label: string; hint: string }[];
}

export const categories: CategoryMeta[] = [
  {
    slug: "laptop",
    route: "laptops",
    label: "Laptop",
    pluralLabel: "Laptops",
    tagline: "Matched to what you compile, play and edit — not to a spec sheet.",
    icon: "💻",
    axes: [
      { key: "coding", label: "Coding", hint: "CPU 60%, RAM 28%, storage 12%" },
      { key: "gaming", label: "Gaming", hint: "GPU 72%, CPU 18%, refresh 10%" },
      { key: "editing", label: "Editing", hint: "CPU 40%, GPU 30%, RAM 20%, storage 10%" },
      { key: "battery", label: "Battery", hint: "Rated runtime, scaled" },
      { key: "display", label: "Display", hint: "Resolution 50%, refresh 30%, panel bonus" },
      { key: "aiDevelopment", label: "AI / ML", hint: "VRAM 45%, GPU 30%, CPU 15%, RAM 10%" },
    ],
  },
  {
    slug: "phone",
    route: "phones",
    label: "Phone",
    pluralLabel: "Phones",
    tagline: "Ranked on the camera you actually use and the battery you actually get.",
    icon: "📱",
    axes: [
      { key: "performance", label: "Performance", hint: "SoC 70%, RAM 20%, storage speed 10%" },
      { key: "camera", label: "Camera", hint: "Main sensor 55%, ultrawide 15%, tele 20%, video 10%" },
      { key: "battery", label: "Battery", hint: "Capacity vs. panel draw, then charging speed" },
      { key: "display", label: "Display", hint: "Resolution 40%, refresh 25%, brightness 25%, panel 10%" },
      { key: "gaming", label: "Gaming", hint: "GPU 65%, sustained thermals 25%, refresh 10%" },
    ],
  },
  {
    slug: "headphone",
    route: "headphones",
    label: "Headphones",
    pluralLabel: "Headphones",
    tagline: "Judged on isolation, comfort and codecs — the things you notice by hour three.",
    icon: "🎧",
    axes: [
      { key: "sound", label: "Sound", hint: "Driver 45%, codec ceiling 30%, tuning 25%" },
      { key: "noiseCancelling", label: "ANC", hint: "Mic array 50%, ANC generation 50%" },
      { key: "battery", label: "Battery", hint: "Rated hours with ANC on, plus case reserve" },
      { key: "comfort", label: "Comfort", hint: "Clamp and weight, by form factor" },
      { key: "mic", label: "Call mic", hint: "Mic count 60%, wind/ENC processing 40%" },
    ],
  },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
export const categoryByRoute = new Map(categories.map((c) => [c.route, c]));

export function categoryFor(product: Pick<ProductBase, "category">) {
  // Non-null: the map is built from the same union that types the field.
  return categoryBySlug.get(product.category)!;
}

/** Canonical detail-page path for any product. */
export function productHref(product: Pick<ProductBase, "category" | "id">) {
  return `/${categoryBySlug.get(product.category)!.route}/${product.id}`;
}

/* -------------------------------------------------------------------------- */
/* Cross-category helpers                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The one score every category defines, so mixed-category surfaces (search,
 * wishlist, "most viewed") can rank without knowing what they are holding.
 */
export function overallScore(product: Product): number {
  return product.performance.overall;
}

export type ProductSortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "performance";

/** Laptop brands. Aliased so the many existing `Brand` imports keep working. */
export type Brand = LaptopBrand;

export type OperatingSystem = "Windows" | "macOS" | "Linux";

export type BudgetSlug =
  | "under-30k"
  | "30k-40k"
  | "40k-50k"
  | "50k-70k"
  | "70k-1l"
  | "above-1l";

export interface BudgetBand {
  slug: BudgetSlug;
  label: string;
  shortLabel: string;
  min: number;
  /** Exclusive upper bound; `Infinity` for the open-ended top band. */
  max: number;
  description: string;
}

export interface DisplaySpec {
  size: number;
  resolution: string;
  refreshRate: number;
  panel: string;
  touch: boolean;
}

export interface LaptopSpecs {
  processor: string;
  cores: number;
  ram: number;
  ramType: string;
  storage: number;
  storageType: string;
  gpu: string;
  gpuVram: number;
  display: DisplaySpec;
  battery: number;
  weight: number;
  ports: string[];
  keyboard: string;
  wifi: string;
  bluetooth: string;
  webcam: string;
  warranty: string;
  os: OperatingSystem;
}

export interface PerformanceScores {
  coding: number;
  gaming: number;
  editing: number;
  battery: number;
  display: number;
  aiDevelopment: number;
  overall: number;
}

export type PerformanceMetric = keyof PerformanceScores;

export interface Laptop extends ProductBase {
  category: "laptop";
  brand: Brand;
  specs: LaptopSpecs;
  performance: PerformanceScores;
  games: GameBenchmark[];
  software: SoftwareCompatibilityMap;
  model3d: Model3DParams;
}

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "performance";

export interface LaptopFilters {
  brands: Brand[];
  processors: string[];
  gpus: string[];
  ram: number[];
  storage: number[];
  displaySizes: number[];
  refreshRates: number[];
  os: OperatingSystem[];
  minPrice: number;
  maxPrice: number;
  query: string;
}

export type MobileOS = "Android" | "iOS";

export interface PhoneDisplaySpec {
  size: number;
  resolution: string;
  refreshRate: number;
  panel: string;
  /** Peak HDR brightness in nits — the figure that decides outdoor legibility. */
  brightness: number;
  protection: string;
}

export interface CameraSpec {
  /** Megapixels. */
  mp: number;
  /** Widest aperture, e.g. 1.8 for f/1.8. Lower gathers more light. */
  aperture: number;
  /** Optical image stabilisation. Absent on most ultrawides and budget teles. */
  ois: boolean;
  label: string;
}

export interface PhoneCameraSystem {
  main: CameraSpec;
  ultrawide?: CameraSpec;
  telephoto?: CameraSpec;
  /** Optical zoom factor; 1 when there is no dedicated telephoto. */
  opticalZoom: number;
  front: CameraSpec;
  /** Best rear video mode, e.g. "4K 60fps". */
  maxVideo: string;
}

export interface PhoneSpecs {
  chipset: string;
  /** Fabrication node in nm — smaller runs cooler at the same clock. */
  process: number;
  cores: number;
  gpu: string;
  ram: number;
  storage: number;
  storageType: string;
  display: PhoneDisplaySpec;
  /** Capacity in mAh. */
  battery: number;
  /** Wired charging in watts. */
  charging: number;
  wirelessCharging: number;
  camera: PhoneCameraSystem;
  /** Grams. */
  weight: number;
  /** Millimetres. */
  thickness: number;
  build: string;
  /** Ingress rating, e.g. "IP68". */
  waterResistance: string;
  os: MobileOS;
  osVersion: string;
  /** Promised major OS upgrades — increasingly the real longevity spec. */
  osUpdates: number;
  sim: string;
  fiveG: boolean;
  headphoneJack: boolean;
  expandableStorage: boolean;
  colors: string[];
  warranty: string;
}

export interface PhonePerformanceScores {
  performance: number;
  camera: number;
  battery: number;
  display: number;
  gaming: number;
  overall: number;
}

export type PhoneMetric = keyof PhonePerformanceScores;

/** How a phone handles a named title, mirroring the laptop game benchmarks. */
export interface MobileGameBenchmark {
  id: string;
  name: string;
  icon: string;
  fps: number;
  graphics: string;
  tier: "Flawless" | "Excellent" | "Playable" | "Struggles";
}

export interface Phone extends ProductBase {
  category: "phone";
  brand: PhoneBrand;
  specs: PhoneSpecs;
  performance: PhonePerformanceScores;
  games: MobileGameBenchmark[];
  model3d: Model3DParams;
}

export interface PhoneFilters {
  brands: PhoneBrand[];
  chipsets: string[];
  ram: number[];
  storage: number[];
  displaySizes: number[];
  refreshRates: number[];
  os: MobileOS[];
  fiveG: boolean | null;
  minPrice: number;
  maxPrice: number;
  query: string;
}

export type HeadphoneForm = "Over-ear" | "On-ear" | "In-ear" | "Open-ear";

export type ConnectionType = "Wireless" | "Wired" | "Hybrid";

/**
 * Codec support is the ceiling on wireless fidelity, so it is modelled as an
 * ordered tier rather than a free string.
 */
export type AudioCodec = "SBC" | "AAC" | "aptX" | "aptX HD" | "aptX Adaptive" | "LDAC" | "LHDC";

export type AncTier = "None" | "Passive" | "Basic ANC" | "Adaptive ANC" | "Industry-leading ANC";

export interface DriverSpec {
  /** Diameter in mm. */
  size: number;
  type: string;
  /** Frequency response, e.g. "4Hz - 40kHz". */
  frequencyResponse: string;
  impedance: number;
}

export interface HeadphoneSpecs {
  form: HeadphoneForm;
  connection: ConnectionType;
  driver: DriverSpec;
  codecs: AudioCodec[];
  anc: AncTier;
  transparencyMode: boolean;
  /** Rated playback hours with ANC on — the number people actually live with. */
  batteryHours: number;
  /** Extra hours held by the charging case; 0 for over-ears. */
  caseHours: number;
  /** Minutes of charge for the advertised quick-charge top-up. */
  quickCharge: string;
  wirelessCharging: boolean;
  /** Microphones per side, driving both ANC and call quality. */
  micCount: number;
  /** Environmental noise cancellation for the call mic, not the ears. */
  envNoiseCancelling: boolean;
  bluetooth: string;
  multipoint: boolean;
  /** Grams — per-side for in-ears, total for over-ears. */
  weight: number;
  /** Clamping force in newtons; the single best predictor of hour-three comfort. */
  clampForce: number;
  foldable: boolean;
  waterResistance: string;
  spatialAudio: boolean;
  headTracking: boolean;
  eqApp: boolean;
  colors: string[];
  warranty: string;
}

export interface HeadphonePerformanceScores {
  sound: number;
  noiseCancelling: number;
  battery: number;
  comfort: number;
  mic: number;
  overall: number;
}

export type HeadphoneMetric = keyof HeadphonePerformanceScores;

/** How the set performs for a named listening scenario. */
export interface UseCaseRating {
  id: string;
  name: string;
  icon: string;
  score: number;
  verdict: "Excellent" | "Good" | "Adequate" | "Poor";
}

export interface Headphone extends ProductBase {
  category: "headphone";
  brand: HeadphoneBrand;
  specs: HeadphoneSpecs;
  performance: HeadphonePerformanceScores;
  useCases: UseCaseRating[];
  model3d: Model3DParams;
}

export interface HeadphoneFilters {
  brands: HeadphoneBrand[];
  forms: HeadphoneForm[];
  anc: AncTier[];
  codecs: AudioCodec[];
  connection: ConnectionType[];
  minBattery: number;
  minPrice: number;
  maxPrice: number;
  query: string;
}

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
