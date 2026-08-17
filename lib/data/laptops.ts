import { games } from "./games";
import { softwareCatalog } from "./software";
import type {
  Brand,
  BudgetBand,
  Laptop,
  LaptopFilters,
  OperatingSystem,
  PerformanceScores,
  Review,
  SortOption,
} from "@/lib/types/laptop";
import type { GameBenchmark, GamePerformanceTier, GraphicsPreset } from "@/lib/types/game";
import type { CompatibilityStatus, SoftwareCompatibilityMap } from "@/lib/types/software";

/* -------------------------------------------------------------------------- */
/* Scoring tables                                                             */
/* -------------------------------------------------------------------------- */

/** Relative multi-core/single-core blend, normalised to 0-100. */
const CPU_SCORES: Record<string, { score: number; cores: number }> = {
  "AMD Ryzen 3 7320U": { score: 30, cores: 4 },
  "Intel Core i3-1215U": { score: 34, cores: 6 },
  "Intel Core i3-1315U": { score: 38, cores: 6 },
  "Intel Core i5-1235U": { score: 42, cores: 10 },
  "AMD Ryzen 5 7530U": { score: 45, cores: 6 },
  "Intel Core i5-1335U": { score: 48, cores: 10 },
  "Intel Core i5-12450H": { score: 52, cores: 8 },
  "AMD Ryzen 5 7535HS": { score: 56, cores: 6 },
  "Intel Core i5-13420H": { score: 58, cores: 8 },
  "AMD Ryzen 7 7730U": { score: 60, cores: 8 },
  "Intel Core i5-13500H": { score: 64, cores: 12 },
  "AMD Ryzen 7 7735HS": { score: 68, cores: 8 },
  "Intel Core i7-13620H": { score: 72, cores: 10 },
  "Intel Core i7-13700H": { score: 76, cores: 14 },
  "Intel Core Ultra 7 155H": { score: 78, cores: 16 },
  "AMD Ryzen 7 8845HS": { score: 80, cores: 8 },
  "Intel Core i7-13650HX": { score: 82, cores: 14 },
  "AMD Ryzen 9 7940HS": { score: 84, cores: 8 },
  "Intel Core Ultra 9 185H": { score: 87, cores: 16 },
  "AMD Ryzen 9 8945HS": { score: 89, cores: 8 },
  "Intel Core i9-14900HX": { score: 97, cores: 24 },
};

/** 1080p raster performance, normalised so RTX 4090 mobile = 100. */
const GPU_SCORES: Record<string, { score: number; vram: number }> = {
  "AMD Radeon 610M": { score: 9, vram: 0 },
  "Intel UHD Graphics": { score: 10, vram: 0 },
  "AMD Radeon 660M": { score: 14, vram: 0 },
  "Intel Iris Xe Graphics": { score: 16, vram: 0 },
  "NVIDIA GeForce MX550": { score: 19, vram: 2 },
  "Intel Arc Graphics": { score: 23, vram: 0 },
  "AMD Radeon 780M": { score: 26, vram: 0 },
  "NVIDIA GeForce RTX 2050": { score: 28, vram: 4 },
  "NVIDIA GeForce RTX 3050": { score: 34, vram: 6 },
  "NVIDIA GeForce RTX 4050": { score: 46, vram: 6 },
  "NVIDIA GeForce RTX 4060": { score: 58, vram: 8 },
  "NVIDIA GeForce RTX 4070": { score: 71, vram: 8 },
  "NVIDIA GeForce RTX 4080": { score: 86, vram: 12 },
  "NVIDIA GeForce RTX 4090": { score: 100, vram: 16 },
};

const clamp = (value: number, min = 1, max = 100) =>
  Math.max(min, Math.min(max, value));

const round = (value: number) => Math.round(value);

/* -------------------------------------------------------------------------- */
/* Derived scores                                                             */
/* -------------------------------------------------------------------------- */

function pixelCount(resolution: string) {
  const [w, h] = resolution.split("x").map((part) => Number(part.trim()));
  return (w || 1920) * (h || 1080);
}

function resolutionScore(resolution: string) {
  // FHD (2.07MP) anchors at 35; 2.8K (5.18MP) lands near 92.
  return clamp(35 + ((pixelCount(resolution) - 2_073_600) / 3_000_000) * 55, 20, 100);
}

function ramScore(ram: number) {
  return clamp(30 + ram * 3.5);
}

function storageScore(storage: number) {
  return clamp(45 + (storage / 1024) * 28);
}

function panelBonus(panel: string, touch: boolean) {
  const oled = /oled/i.test(panel) ? 12 : /mini ?led/i.test(panel) ? 8 : 2;
  return oled + (touch ? 2 : 0);
}

interface ScoreInputs {
  cpu: number;
  gpu: number;
  vram: number;
  ram: number;
  storage: number;
  battery: number;
  refreshRate: number;
  resolution: string;
  panel: string;
  touch: boolean;
}

function buildPerformance(input: ScoreInputs): PerformanceScores {
  const rs = ramScore(input.ram);
  const ss = storageScore(input.storage);
  const refresh = clamp((input.refreshRate / 240) * 100, 10, 100);
  const res = resolutionScore(input.resolution);

  const coding = clamp(0.6 * input.cpu + 0.28 * rs + 0.12 * ss);
  const gaming = clamp(0.72 * input.gpu + 0.18 * input.cpu + 0.1 * refresh);
  const editing = clamp(0.4 * input.cpu + 0.3 * input.gpu + 0.2 * rs + 0.1 * ss);
  const battery = clamp((input.battery - 3.5) * 11 + 10, 5, 99);
  const display = clamp(0.5 * res + 0.3 * refresh + panelBonus(input.panel, input.touch) + 25);

  // Local model work is VRAM-bound first, then raw GPU throughput.
  const vramScore = clamp(Math.max(input.vram * 11, input.gpu * 0.5), 1, 100);
  const aiDevelopment = clamp(
    0.45 * vramScore + 0.3 * input.gpu + 0.15 * input.cpu + 0.1 * rs,
  );

  const overall = clamp(
    0.22 * coding +
      0.24 * gaming +
      0.2 * editing +
      0.12 * battery +
      0.12 * display +
      0.1 * aiDevelopment,
  );

  return {
    coding: round(coding),
    gaming: round(gaming),
    editing: round(editing),
    battery: round(battery),
    display: round(display),
    aiDevelopment: round(aiDevelopment),
    overall: round(overall),
  };
}

function tierFor(fps: number, preset: GraphicsPreset): GamePerformanceTier {
  if (fps >= 120 && (preset === "High" || preset === "Ultra")) return "Flawless";
  if (fps >= 75) return "Excellent";
  if (fps >= 45) return "Playable";
  return "Struggles";
}

/**
 * Frame-rate model: a machine whose effective GPU score equals the game's
 * `demand` holds ~60fps on High. From that anchor we step the preset up while
 * there is headroom, or down while there is not, mirroring how presets trade
 * roughly 35-45% of the frame time each step.
 */
function buildGameBenchmarks(gpu: number, cpu: number): GameBenchmark[] {
  return games.map((game) => {
    const effective = game.cpuBound
      ? gpu * 0.55 + cpu * 0.45
      : gpu * 0.85 + cpu * 0.15;

    const highFps = 60 * Math.pow(effective / game.demand, 0.8);

    let graphics: GraphicsPreset = "High";
    let fps = highFps;

    if (highFps >= 95) {
      graphics = "Ultra";
      fps = highFps * 0.72;
    } else if (highFps < 45) {
      graphics = "Medium";
      fps = highFps * 1.35;
      if (fps < 45) {
        graphics = "Low";
        fps = highFps * 1.85;
      }
    }

    const capped = Math.round(clamp(fps, 12, game.cpuBound ? 420 : 260));

    return {
      id: game.id,
      name: game.name,
      icon: game.icon,
      fps: capped,
      graphics,
      tier: tierFor(capped, graphics),
    };
  });
}

/**
 * Compatibility is the weakest of the CPU / GPU / RAM headroom ratios, so a
 * machine with a strong CPU but 8GB of RAM is still flagged for Premiere Pro.
 */
function buildSoftwareCompatibility(
  cpu: number,
  gpu: number,
  ram: number,
): SoftwareCompatibilityMap {
  const map: SoftwareCompatibilityMap = {};

  for (const app of softwareCatalog) {
    const ratios = [
      cpu / app.requirement.cpu,
      app.requirement.gpu > 0 ? gpu / app.requirement.gpu : 2,
      ram / app.requirement.ram,
    ];
    const headroom = Math.min(...ratios);

    let status: CompatibilityStatus;
    if (headroom >= 1.35) status = "Runs Smoothly";
    else if (headroom >= 1) status = "Runs Fine";
    else if (headroom >= 0.7) status = "Limited";
    else status = "Not Recommended";

    map[app.name] = status;
  }

  return map;
}

/* -------------------------------------------------------------------------- */
/* Demo reviews                                                               */
/* -------------------------------------------------------------------------- */

const REVIEW_AUTHORS = [
  "Aarav Menon",
  "Priya Nair",
  "Rohit Bansal",
  "Sneha Kulkarni",
  "Imran Qureshi",
  "Divya Raghavan",
  "Karthik Iyer",
  "Meera Joshi",
  "Aditya Rane",
  "Fatima Sheikh",
  "Nikhil Verma",
  "Tanvi Deshmukh",
];

const REVIEW_BODIES: { title: string; comment: string; rating: number }[] = [
  {
    title: "Exactly what the spec sheet promised",
    comment:
      "Thermals stay sensible under a two-hour compile, and the keyboard is comfortable for long sessions. Fan noise is audible on the performance profile but never shrill.",
    rating: 5,
  },
  {
    title: "Great value for the money",
    comment:
      "Boots in under ten seconds and handles my usual twenty-tab workflow with a VM in the background. Screen could be brighter outdoors, but indoors it is lovely.",
    rating: 4,
  },
  {
    title: "Solid daily driver",
    comment:
      "Build quality feels a step above the price bracket. Battery lands close to the rated figure on the balanced profile, less so once the discrete GPU kicks in.",
    rating: 4,
  },
  {
    title: "Punches above its weight in games",
    comment:
      "Comfortably holds the refresh-rate target at the recommended preset. Undervolting shaved another six degrees off the package temperature.",
    rating: 5,
  },
  {
    title: "Good, with one caveat",
    comment:
      "No complaints about performance. The port layout puts the power connector awkwardly close to the mouse hand, which took a week to get used to.",
    rating: 4,
  },
  {
    title: "Perfect for my coursework",
    comment:
      "Runs my IDE, an emulator and a browser without stutter. Speakers are average, so headphones are worth budgeting for alongside it.",
    rating: 4,
  },
];

/** Deterministic hash so the demo data is stable between server and client. */
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildReviews(id: string, releaseYear: number): Review[] {
  const seed = hash(id);
  return Array.from({ length: 3 }, (_, index) => {
    const body = REVIEW_BODIES[(seed + index * 5) % REVIEW_BODIES.length];
    const author = REVIEW_AUTHORS[(seed + index * 7) % REVIEW_AUTHORS.length];
    const month = ((seed + index * 3) % 12) + 1;
    const day = ((seed + index * 11) % 27) + 1;
    return {
      id: `${id}-review-${index + 1}`,
      author,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
      date: `${releaseYear + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      verified: index !== 2,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Seeds                                                                      */
/* -------------------------------------------------------------------------- */

interface LaptopSeed {
  id: string;
  name: string;
  brand: Brand;
  price: number;
  mrp: number;
  summary: string;
  cpu: keyof typeof CPU_SCORES;
  gpu: keyof typeof GPU_SCORES;
  ram: number;
  ramType: string;
  storage: number;
  storageType?: string;
  display: {
    size: number;
    resolution: string;
    refreshRate: number;
    panel: string;
    touch?: boolean;
  };
  battery: number;
  weight: number;
  os?: OperatingSystem;
  rating: number;
  reviews: number;
  bestseller?: boolean;
  releaseYear: number;
  views: number;
  tags: string[];
  ports?: string[];
  keyboard?: string;
  warranty?: string;
  webcam?: string;
  wifi?: string;
  bluetooth?: string;
}

const GAMING_PORTS = [
  "1x HDMI 2.1",
  "3x USB-A 3.2 Gen 1",
  "1x USB-C 3.2 (DisplayPort 1.4)",
  "1x RJ45 Ethernet",
  "1x 3.5mm Combo Audio",
  "1x DC-in",
];

const THIN_PORTS = [
  "1x HDMI 2.1",
  "2x USB-A 3.2 Gen 1",
  "2x USB-C (Thunderbolt 4 / Power Delivery)",
  "1x 3.5mm Combo Audio",
  "1x microSD Reader",
];

const BUDGET_PORTS = [
  "1x HDMI 1.4",
  "2x USB-A 3.2 Gen 1",
  "1x USB-C 3.2",
  "1x RJ45 Ethernet",
  "1x 3.5mm Combo Audio",
];

const seeds: LaptopSeed[] = [
  /* ---------------------------- Budget: ₹25K-40K --------------------------- */
  {
    id: "lenovo-ideapad-slim-1-14",
    name: "Lenovo IdeaPad Slim 1 14",
    brand: "Lenovo",
    price: 27990,
    mrp: 34990,
    summary:
      "A genuinely light 14-inch shell for note-taking, browsing and streaming. Fine for coursework, not for compiling.",
    cpu: "AMD Ryzen 3 7320U",
    gpu: "AMD Radeon 610M",
    ram: 8,
    ramType: "LPDDR5 4800MHz (soldered)",
    storage: 512,
    display: { size: 14, resolution: "1920 x 1080", refreshRate: 60, panel: "TN" },
    battery: 7,
    weight: 1.37,
    rating: 4,
    reviews: 218,
    releaseYear: 2023,
    views: 8420,
    tags: ["Student", "Lightweight", "Everyday"],
    ports: BUDGET_PORTS,
    keyboard: "Chiclet, non-backlit, 1.4mm travel",
  },
  {
    id: "hp-15s-fq5330tu",
    name: "HP 15s fq5330TU",
    brand: "HP",
    price: 32490,
    mrp: 41999,
    summary:
      "The default office 15-incher. Full-size keypad, plenty of ports and enough headroom for documents and video calls.",
    cpu: "Intel Core i3-1215U",
    gpu: "Intel UHD Graphics",
    ram: 8,
    ramType: "DDR4 3200MHz (1 slot free)",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 60, panel: "IPS" },
    battery: 7.5,
    weight: 1.69,
    rating: 4.1,
    reviews: 341,
    releaseYear: 2023,
    views: 11250,
    tags: ["Office", "Value", "Everyday"],
    ports: BUDGET_PORTS,
  },
  {
    id: "acer-aspire-lite-14",
    name: "Acer Aspire Lite 14",
    brand: "Acer",
    price: 34990,
    mrp: 44999,
    summary:
      "16GB at under ₹35K is the headline here — the single most useful upgrade for anyone living in a browser and an IDE.",
    cpu: "Intel Core i5-1235U",
    gpu: "Intel Iris Xe Graphics",
    ram: 16,
    ramType: "DDR4 3200MHz",
    storage: 512,
    display: { size: 14, resolution: "1920 x 1080", refreshRate: 60, panel: "IPS" },
    battery: 8,
    weight: 1.4,
    rating: 4.2,
    reviews: 289,
    bestseller: true,
    releaseYear: 2024,
    views: 15980,
    tags: ["Student", "Coding", "Value"],
    ports: BUDGET_PORTS,
    keyboard: "Chiclet, backlit, 1.4mm travel",
  },
  {
    id: "asus-vivobook-15-x1502",
    name: "ASUS Vivobook 15 X1502",
    brand: "ASUS",
    price: 37990,
    mrp: 49990,
    summary:
      "An H-series chip in a mainstream chassis. Sustained multi-core is well ahead of the U-series crowd at this price.",
    cpu: "Intel Core i5-12450H",
    gpu: "Intel Iris Xe Graphics",
    ram: 16,
    ramType: "DDR4 3200MHz (1 slot free)",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 60, panel: "IPS" },
    battery: 6.5,
    weight: 1.7,
    rating: 4.3,
    reviews: 402,
    releaseYear: 2024,
    views: 17340,
    tags: ["Coding", "Multitasking", "Value"],
    ports: BUDGET_PORTS,
    keyboard: "Chiclet with numeric keypad, backlit",
  },
  {
    id: "samsung-galaxy-book4-15",
    name: "Samsung Galaxy Book4 15",
    brand: "Samsung",
    price: 39990,
    mrp: 52990,
    summary:
      "The battery pick of the budget tier. Thin, quiet, and comfortably a full working day away from a socket.",
    cpu: "Intel Core i3-1315U",
    gpu: "Intel UHD Graphics",
    ram: 8,
    ramType: "LPDDR4X 4266MHz (soldered)",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 60, panel: "IPS" },
    battery: 9.5,
    weight: 1.55,
    rating: 4.1,
    reviews: 176,
    releaseYear: 2024,
    views: 9640,
    tags: ["Battery", "Portable", "Office"],
    ports: THIN_PORTS,
  },

  /* --------------------------- Mid-range: ₹40K-70K ------------------------- */
  {
    id: "dell-inspiron-15-3530",
    name: "Dell Inspiron 15 3530",
    brand: "Dell",
    price: 49990,
    mrp: 64990,
    summary:
      "A 120Hz panel on a non-gaming machine makes everyday scrolling noticeably smoother than its rivals.",
    cpu: "Intel Core i5-1335U",
    gpu: "Intel Iris Xe Graphics",
    ram: 16,
    ramType: "DDR4 3200MHz (1 slot free)",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 120, panel: "IPS" },
    battery: 8,
    weight: 1.66,
    rating: 4.2,
    reviews: 254,
    releaseYear: 2024,
    views: 12870,
    tags: ["Office", "120Hz", "Multitasking"],
    ports: BUDGET_PORTS,
  },
  {
    id: "msi-thin-15-b12u",
    name: "MSI Thin 15 B12U",
    brand: "MSI",
    price: 52990,
    mrp: 68990,
    summary:
      "The cheapest way onto a 144Hz panel with a discrete GPU. Budget the RAM upgrade in from day one.",
    cpu: "Intel Core i5-12450H",
    gpu: "NVIDIA GeForce RTX 3050",
    ram: 8,
    ramType: "DDR4 3200MHz (1 slot free)",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 4.5,
    weight: 1.86,
    rating: 4,
    reviews: 197,
    releaseYear: 2023,
    views: 13420,
    tags: ["Gaming", "144Hz", "Entry Gaming"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, red accent, 1.7mm travel",
  },
  {
    id: "hp-victus-15-fb",
    name: "HP Victus 15 fb2063AX",
    brand: "HP",
    price: 54990,
    mrp: 69999,
    summary:
      "Restrained styling for a gaming laptop, and one of the better keyboards in the entry-gaming bracket.",
    cpu: "AMD Ryzen 5 7535HS",
    gpu: "NVIDIA GeForce RTX 2050",
    ram: 16,
    ramType: "DDR5 5600MHz",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 5.5,
    weight: 2.29,
    rating: 4.2,
    reviews: 512,
    bestseller: true,
    releaseYear: 2024,
    views: 21430,
    tags: ["Gaming", "144Hz", "Value"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet with numeric keypad, 1.5mm travel",
  },
  {
    id: "lenovo-loq-15-i5",
    name: "Lenovo LOQ 15 (i5)",
    brand: "Lenovo",
    price: 58990,
    mrp: 74990,
    summary:
      "6GB of VRAM at this price is the differentiator — it keeps texture settings usable for longer than a 4GB card.",
    cpu: "Intel Core i5-12450H",
    gpu: "NVIDIA GeForce RTX 3050",
    ram: 16,
    ramType: "DDR5 4800MHz",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 5,
    weight: 2.38,
    rating: 4.3,
    reviews: 634,
    bestseller: true,
    releaseYear: 2024,
    views: 24980,
    tags: ["Gaming", "6GB VRAM", "144Hz"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, white LED, 1.5mm travel",
  },
  {
    id: "acer-nitro-v-15",
    name: "Acer Nitro V 15",
    brand: "Acer",
    price: 61990,
    mrp: 79999,
    summary:
      "Two RAM slots, two M.2 slots and easy panel access — the most upgrade-friendly machine in its bracket.",
    cpu: "Intel Core i5-13420H",
    gpu: "NVIDIA GeForce RTX 3050",
    ram: 16,
    ramType: "DDR5 5200MHz",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 5,
    weight: 2.1,
    rating: 4.2,
    reviews: 388,
    releaseYear: 2024,
    views: 16720,
    tags: ["Gaming", "Upgradeable", "144Hz"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, red accent, 1.6mm travel",
  },
  {
    id: "lenovo-ideapad-slim-5-14",
    name: "Lenovo IdeaPad Slim 5 14",
    brand: "Lenovo",
    price: 64990,
    mrp: 82990,
    summary:
      "An OLED panel and a ten-hour battery in a 1.46kg body. The pick for writers, students and anyone commuting daily.",
    cpu: "AMD Ryzen 7 7730U",
    gpu: "AMD Radeon 660M",
    ram: 16,
    ramType: "LPDDR4X 4266MHz (soldered)",
    storage: 512,
    display: { size: 14, resolution: "1920 x 1200", refreshRate: 60, panel: "OLED" },
    battery: 10,
    weight: 1.46,
    rating: 4.4,
    reviews: 297,
    releaseYear: 2024,
    views: 14260,
    tags: ["OLED", "Battery", "Portable"],
    ports: THIN_PORTS,
    keyboard: "Backlit precision keyboard, 1.5mm travel",
  },
  {
    id: "asus-tuf-gaming-a15",
    name: "ASUS TUF Gaming A15",
    brand: "ASUS",
    price: 67990,
    mrp: 86990,
    summary:
      "MIL-STD chassis, self-cleaning fans and an RTX 4050 — the durability pick for people who actually travel with a gaming laptop.",
    cpu: "AMD Ryzen 7 7735HS",
    gpu: "NVIDIA GeForce RTX 4050",
    ram: 16,
    ramType: "DDR5 4800MHz",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 6,
    weight: 2.2,
    rating: 4.4,
    reviews: 721,
    bestseller: true,
    releaseYear: 2024,
    views: 27650,
    tags: ["Gaming", "RTX 4050", "Durable"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, single-zone RGB, 1.7mm travel",
  },
  {
    id: "hp-pavilion-plus-14",
    name: "HP Pavilion Plus 14",
    brand: "HP",
    price: 69990,
    mrp: 89999,
    summary:
      "A 2.8K 90Hz OLED at well under ₹70K. Colour-accurate enough for photo work, bright enough for a sunny desk.",
    cpu: "Intel Core i5-13500H",
    gpu: "Intel Iris Xe Graphics",
    ram: 16,
    ramType: "LPDDR5 5200MHz (soldered)",
    storage: 1024,
    display: { size: 14, resolution: "2880 x 1800", refreshRate: 90, panel: "OLED" },
    battery: 8,
    weight: 1.4,
    rating: 4.5,
    reviews: 331,
    releaseYear: 2024,
    views: 18990,
    tags: ["OLED", "Creator", "Portable"],
    ports: THIN_PORTS,
    keyboard: "Backlit precision keyboard, 1.5mm travel",
  },

  /* ---------------------------- Premium: ₹70K-1L --------------------------- */
  {
    id: "dell-g15-5530",
    name: "Dell G15 5530",
    brand: "Dell",
    price: 79990,
    mrp: 99990,
    summary:
      "An HX-series chip at ₹80K. Heavy and loud under load, but the raw multi-core throughput is unmatched at the price.",
    cpu: "Intel Core i7-13650HX",
    gpu: "NVIDIA GeForce RTX 4050",
    ram: 16,
    ramType: "DDR5 4800MHz",
    storage: 512,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 165, panel: "IPS" },
    battery: 5,
    weight: 2.65,
    rating: 4.2,
    reviews: 419,
    releaseYear: 2024,
    views: 19870,
    tags: ["Gaming", "HX CPU", "165Hz"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, orange accent, 1.7mm travel",
  },
  {
    id: "msi-katana-a15-ai",
    name: "MSI Katana A15 AI",
    brand: "MSI",
    price: 86990,
    mrp: 109990,
    summary:
      "An RTX 4060 paired with a modern Ryzen NPU part. Strong at 1080p high-refresh gaming and local model inference alike.",
    cpu: "AMD Ryzen 7 8845HS",
    gpu: "NVIDIA GeForce RTX 4060",
    ram: 16,
    ramType: "DDR5 5600MHz",
    storage: 1024,
    display: { size: 15.6, resolution: "1920 x 1080", refreshRate: 144, panel: "IPS" },
    battery: 5.5,
    weight: 2.35,
    rating: 4.3,
    reviews: 268,
    releaseYear: 2024,
    views: 15340,
    tags: ["Gaming", "RTX 4060", "AI Ready"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, single-zone RGB, 1.7mm travel",
  },
  {
    id: "asus-vivobook-pro-15-oled",
    name: "ASUS Vivobook Pro 15 OLED",
    brand: "ASUS",
    price: 89990,
    mrp: 114990,
    summary:
      "A creator machine first: 2.8K 120Hz OLED, a Ryzen 9 and an RTX 4050 for GPU-accelerated exports.",
    cpu: "AMD Ryzen 9 7940HS",
    gpu: "NVIDIA GeForce RTX 4050",
    ram: 16,
    ramType: "DDR5 4800MHz",
    storage: 1024,
    display: { size: 15.6, resolution: "2880 x 1620", refreshRate: 120, panel: "OLED" },
    battery: 7,
    weight: 1.8,
    rating: 4.5,
    reviews: 356,
    bestseller: true,
    releaseYear: 2024,
    views: 22410,
    tags: ["Creator", "OLED", "Editing"],
    ports: THIN_PORTS,
    keyboard: "Backlit chiclet with numeric keypad, 1.4mm travel",
  },
  {
    id: "dell-xps-13-9340-dev",
    name: "Dell XPS 13 9340 Developer Edition",
    brand: "Dell",
    price: 92990,
    mrp: 115990,
    summary:
      "Ships with Ubuntu and certified drivers. Twelve hours of battery in a 1.19kg body, at the cost of any real GPU.",
    cpu: "Intel Core Ultra 7 155H",
    gpu: "Intel Arc Graphics",
    ram: 16,
    ramType: "LPDDR5x 7467MHz (soldered)",
    storage: 512,
    display: {
      size: 13.4,
      resolution: "1920 x 1200",
      refreshRate: 120,
      panel: "IPS",
      touch: true,
    },
    battery: 12,
    weight: 1.19,
    os: "Linux",
    rating: 4.4,
    reviews: 143,
    releaseYear: 2024,
    views: 13120,
    tags: ["Linux", "Battery", "Ultraportable"],
    ports: [
      "2x USB-C (Thunderbolt 4 / Power Delivery)",
      "1x USB-C 3.2 Gen 2",
      "1x 3.5mm Combo Audio",
    ],
    keyboard: "Zero-lattice backlit keyboard, 1.0mm travel",
    warranty: "1 Year Onsite Warranty + Ubuntu LTS support",
  },
  {
    id: "hp-omen-16",
    name: "HP OMEN 16",
    brand: "HP",
    price: 94990,
    mrp: 119999,
    summary:
      "A 165Hz 16-inch panel and a vapour-chamber-adjacent cooling design that keeps the RTX 4060 near its full power budget.",
    cpu: "Intel Core i7-13620H",
    gpu: "NVIDIA GeForce RTX 4060",
    ram: 16,
    ramType: "DDR5 5600MHz",
    storage: 1024,
    display: { size: 16.1, resolution: "1920 x 1080", refreshRate: 165, panel: "IPS" },
    battery: 5.5,
    weight: 2.35,
    rating: 4.4,
    reviews: 487,
    releaseYear: 2024,
    views: 23760,
    tags: ["Gaming", "RTX 4060", "165Hz"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, 4-zone RGB, 1.5mm travel",
  },
  {
    id: "acer-predator-helios-neo-16",
    name: "Acer Predator Helios Neo 16",
    brand: "Acer",
    price: 97990,
    mrp: 129999,
    summary:
      "A 16:10 WUXGA 165Hz panel and liquid-metal cooling on the CPU. Loud on Turbo, but it holds clocks.",
    cpu: "Intel Core i7-13650HX",
    gpu: "NVIDIA GeForce RTX 4060",
    ram: 16,
    ramType: "DDR5 5600MHz",
    storage: 1024,
    display: { size: 16, resolution: "1920 x 1200", refreshRate: 165, panel: "IPS" },
    battery: 5,
    weight: 2.6,
    rating: 4.4,
    reviews: 402,
    bestseller: true,
    releaseYear: 2024,
    views: 25890,
    tags: ["Gaming", "16:10", "Liquid Metal"],
    ports: GAMING_PORTS,
    keyboard: "Backlit chiclet, 4-zone RGB, 1.6mm travel",
  },
  {
    id: "lenovo-legion-slim-5-16",
    name: "Lenovo Legion Slim 5 16",
    brand: "Lenovo",
    price: 99990,
    mrp: 124990,
    summary:
      "A 165Hz WQXGA panel in a 2kg chassis. The best balance of portability and RTX 4060 performance under ₹1L.",
    cpu: "AMD Ryzen 7 8845HS",
    gpu: "NVIDIA GeForce RTX 4060",
    ram: 16,
    ramType: "DDR5 5600MHz",
    storage: 1024,
    display: { size: 16, resolution: "2560 x 1600", refreshRate: 165, panel: "IPS" },
    battery: 6.5,
    weight: 2.0,
    rating: 4.6,
    reviews: 563,
    bestseller: true,
    releaseYear: 2024,
    views: 31240,
    tags: ["Gaming", "WQXGA", "Portable Gaming"],
    ports: GAMING_PORTS,
    keyboard: "Backlit TrueStrike keyboard, 4-zone RGB, 1.5mm travel",
  },

  /* -------------------------- Ultra-premium: ₹1L+ -------------------------- */
  {
    id: "hp-spectre-x360-14",
    name: "HP Spectre x360 14",
    brand: "HP",
    price: 139990,
    mrp: 164999,
    summary:
      "A convertible with a 2.8K OLED touch panel, 32GB of RAM and eleven hours of real-world battery.",
    cpu: "Intel Core Ultra 7 155H",
    gpu: "Intel Arc Graphics",
    ram: 32,
    ramType: "LPDDR5x 7467MHz (soldered)",
    storage: 1024,
    display: {
      size: 14,
      resolution: "2880 x 1800",
      refreshRate: 120,
      panel: "OLED",
      touch: true,
    },
    battery: 11,
    weight: 1.44,
    rating: 4.6,
    reviews: 211,
    releaseYear: 2024,
    views: 20340,
    tags: ["Convertible", "OLED", "Premium"],
    ports: THIN_PORTS,
    keyboard: "Backlit precision keyboard, 1.3mm travel",
    warranty: "2 Year Onsite Warranty + Premium Support",
    webcam: "9MP IR with auto-framing and presence detection",
  },
  {
    id: "asus-rog-zephyrus-g14",
    name: "ASUS ROG Zephyrus G14",
    brand: "ASUS",
    price: 164990,
    mrp: 189990,
    summary:
      "1.5kg, an RTX 4060 and a 3K 120Hz OLED. Nothing else this light is this fast, and the CNC lid feels the part.",
    cpu: "AMD Ryzen 9 8945HS",
    gpu: "NVIDIA GeForce RTX 4060",
    ram: 16,
    ramType: "LPDDR5x 6400MHz (soldered)",
    storage: 1024,
    display: { size: 14, resolution: "2880 x 1800", refreshRate: 120, panel: "OLED" },
    battery: 8,
    weight: 1.5,
    rating: 4.7,
    reviews: 486,
    bestseller: true,
    releaseYear: 2024,
    views: 34870,
    tags: ["Gaming", "OLED", "Ultraportable Gaming"],
    ports: THIN_PORTS,
    keyboard: "Backlit chiclet, single-zone RGB, 1.7mm travel",
    warranty: "1 Year Onsite Warranty + Accidental Damage Protection",
  },
  {
    id: "samsung-galaxy-book4-ultra",
    name: "Samsung Galaxy Book4 Ultra",
    brand: "Samsung",
    price: 189990,
    mrp: 219990,
    summary:
      "A 16-inch 3K AMOLED with an RTX 4070 behind it, at 1.86kg. The colour-critical creator machine of this list.",
    cpu: "Intel Core Ultra 9 185H",
    gpu: "NVIDIA GeForce RTX 4070",
    ram: 32,
    ramType: "LPDDR5x 7467MHz (soldered)",
    storage: 1024,
    display: { size: 16, resolution: "2880 x 1800", refreshRate: 120, panel: "AMOLED" },
    battery: 9,
    weight: 1.86,
    rating: 4.6,
    reviews: 174,
    releaseYear: 2024,
    views: 21980,
    tags: ["Creator", "AMOLED", "RTX 4070"],
    ports: THIN_PORTS,
    keyboard: "Backlit precision keyboard, 1.4mm travel",
    warranty: "1 Year Onsite Warranty + Premium Support",
  },
  {
    id: "lenovo-legion-pro-7i",
    name: "Lenovo Legion Pro 7i",
    brand: "Lenovo",
    price: 249990,
    mrp: 289990,
    summary:
      "An i9-14900HX and a 175W RTX 4080 under a 240Hz WQXGA panel. Desktop-class, with a power brick to match.",
    cpu: "Intel Core i9-14900HX",
    gpu: "NVIDIA GeForce RTX 4080",
    ram: 32,
    ramType: "DDR5 5600MHz",
    storage: 2048,
    display: { size: 16, resolution: "2560 x 1600", refreshRate: 240, panel: "IPS" },
    battery: 5,
    weight: 2.8,
    rating: 4.7,
    reviews: 229,
    releaseYear: 2024,
    views: 28640,
    tags: ["Flagship", "RTX 4080", "240Hz"],
    ports: GAMING_PORTS,
    keyboard: "Backlit TrueStrike keyboard, per-key RGB, 1.5mm travel",
    warranty: "3 Year Onsite Premium Care",
  },
  {
    id: "msi-raider-ge78-hx",
    name: "MSI Raider GE78 HX",
    brand: "MSI",
    price: 299990,
    mrp: 349990,
    summary:
      "The no-compromise entry: RTX 4090, 2TB of storage and a 17-inch 240Hz QHD+ panel. Portability is not the point.",
    cpu: "Intel Core i9-14900HX",
    gpu: "NVIDIA GeForce RTX 4090",
    ram: 32,
    ramType: "DDR5 5600MHz",
    storage: 2048,
    display: { size: 17, resolution: "2560 x 1600", refreshRate: 240, panel: "Mini LED" },
    battery: 4.5,
    weight: 3.1,
    rating: 4.6,
    reviews: 118,
    releaseYear: 2024,
    views: 26410,
    tags: ["Flagship", "RTX 4090", "Desktop Replacement"],
    ports: GAMING_PORTS,
    keyboard: "SteelSeries per-key RGB, 1.7mm travel",
    warranty: "2 Year Onsite Warranty",
  },
];

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

function buildLaptop(seed: LaptopSeed): Laptop {
  const cpu = CPU_SCORES[seed.cpu];
  const gpu = GPU_SCORES[seed.gpu];
  const discrete = gpu.vram > 0;
  const touch = seed.display.touch ?? false;

  const performance = buildPerformance({
    cpu: cpu.score,
    gpu: gpu.score,
    vram: gpu.vram,
    ram: seed.ram,
    storage: seed.storage,
    battery: seed.battery,
    refreshRate: seed.display.refreshRate,
    resolution: seed.display.resolution,
    panel: seed.display.panel,
    touch,
  });

  const images = [1, 2, 3].map((n) => `/laptop-images/${seed.id}-${n}.svg`);

  return {
    id: seed.id,
    /* Phones and headphones have always stamped this; laptops never did, so
       every cross-category helper that switches on `category` — `productHref`,
       `categoryFor`, the compare gate — silently got `undefined` for a laptop.
       It is also the source of the duplicate-`Laptop` type errors, since
       `lib/types` declares the field and this builder omitted it. */
    category: "laptop",
    name: seed.name,
    brand: seed.brand,
    price: seed.price,
    mrp: seed.mrp,
    summary: seed.summary,
    specs: {
      processor: seed.cpu,
      cores: cpu.cores,
      ram: seed.ram,
      ramType: seed.ramType,
      storage: seed.storage,
      storageType: seed.storageType ?? "NVMe PCIe Gen4 SSD",
      gpu: seed.gpu,
      gpuVram: gpu.vram,
      display: {
        size: seed.display.size,
        resolution: seed.display.resolution,
        refreshRate: seed.display.refreshRate,
        panel: seed.display.panel,
        touch,
      },
      battery: seed.battery,
      weight: seed.weight,
      ports: seed.ports ?? (discrete ? GAMING_PORTS : THIN_PORTS),
      keyboard:
        seed.keyboard ??
        (discrete
          ? "Backlit chiclet, 4-zone RGB, 1.5mm travel"
          : "Backlit chiclet, 1.4mm travel"),
      wifi: seed.wifi ?? (seed.releaseYear >= 2024 ? "Wi-Fi 6E (802.11ax)" : "Wi-Fi 6 (802.11ax)"),
      bluetooth: seed.bluetooth ?? "Bluetooth 5.3",
      webcam: seed.webcam ?? "1080p FHD with privacy shutter",
      warranty: seed.warranty ?? "1 Year Onsite Warranty",
      os: seed.os ?? "Windows",
    },
    performance,
    games: buildGameBenchmarks(gpu.score, cpu.score),
    software: buildSoftwareCompatibility(cpu.score, gpu.score, seed.ram),
    image: images[0],
    images,
    rating: seed.rating,
    reviews: seed.reviews,
    reviewList: buildReviews(seed.id, seed.releaseYear),
    bestseller: seed.bestseller ?? false,
    releaseYear: seed.releaseYear,
    views: seed.views,
    tags: seed.tags,
    affiliateUrl: `https://example.com/buy/${seed.id}`,
    inStock: true,
  };
}

export const laptops: Laptop[] = seeds.map(buildLaptop);

export const laptopsById = new Map(laptops.map((laptop) => [laptop.id, laptop]));

export function getLaptopById(id: string) {
  return laptopsById.get(id);
}

/* -------------------------------------------------------------------------- */
/* Budget bands                                                               */
/* -------------------------------------------------------------------------- */

export const budgetBands: BudgetBand[] = [
  {
    slug: "under-30k",
    label: "Under ₹30,000",
    shortLabel: "Under ₹30K",
    min: 0,
    max: 30000,
    description: "Browsing, documents and streaming without drama.",
  },
  {
    slug: "30k-40k",
    label: "₹30,000 – ₹40,000",
    shortLabel: "₹30K – ₹40K",
    min: 30000,
    max: 40000,
    description: "Student all-rounders with room for 16GB of RAM.",
  },
  {
    slug: "40k-50k",
    label: "₹40,000 – ₹50,000",
    shortLabel: "₹40K – ₹50K",
    min: 40000,
    max: 50000,
    description: "Faster panels and proper multitasking headroom.",
  },
  {
    slug: "50k-70k",
    label: "₹50,000 – ₹70,000",
    shortLabel: "₹50K – ₹70K",
    min: 50000,
    max: 70000,
    description: "Entry gaming GPUs and the first serious OLED panels.",
  },
  {
    slug: "70k-1l",
    label: "₹70,000 – ₹1,00,000",
    shortLabel: "₹70K – ₹1L",
    min: 70000,
    max: 100000,
    description: "RTX 4050/4060 machines and creator-grade colour.",
  },
  {
    slug: "above-1l",
    label: "Above ₹1,00,000",
    shortLabel: "Above ₹1L",
    min: 100000,
    max: Number.POSITIVE_INFINITY,
    description: "Flagship silicon, 240Hz panels, no compromises.",
  },
];

export function getBudgetBand(slug: string) {
  return budgetBands.find((band) => band.slug === slug);
}

export function laptopsInBand(band: BudgetBand) {
  return laptops.filter((laptop) => laptop.price >= band.min && laptop.price < band.max);
}

/* -------------------------------------------------------------------------- */
/* Facets, filtering, sorting, search                                         */
/* -------------------------------------------------------------------------- */

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const facets = {
  brands: unique(laptops.map((l) => l.brand)).sort() as Brand[],
  processors: unique(laptops.map((l) => l.specs.processor)).sort(),
  gpus: unique(laptops.map((l) => l.specs.gpu)).sort(),
  ram: unique(laptops.map((l) => l.specs.ram)).sort((a, b) => a - b),
  storage: unique(laptops.map((l) => l.specs.storage)).sort((a, b) => a - b),
  displaySizes: unique(laptops.map((l) => l.specs.display.size)).sort((a, b) => a - b),
  refreshRates: unique(laptops.map((l) => l.specs.display.refreshRate)).sort(
    (a, b) => a - b,
  ),
  os: unique(laptops.map((l) => l.specs.os)) as OperatingSystem[],
  minPrice: Math.min(...laptops.map((l) => l.price)),
  maxPrice: Math.max(...laptops.map((l) => l.price)),
};

export const defaultFilters: LaptopFilters = {
  brands: [],
  processors: [],
  gpus: [],
  ram: [],
  storage: [],
  displaySizes: [],
  refreshRates: [],
  os: [],
  minPrice: facets.minPrice,
  maxPrice: facets.maxPrice,
  query: "",
};

/**
 * Free-text haystack: name, brand, silicon, tags, plus the games and software a
 * machine can genuinely handle.
 *
 * Every laptop carries an entry for all ten games and all eleven apps, so
 * indexing them unconditionally would make "Cyberpunk" match the entire
 * catalogue. Only titles that clear 60fps and apps rated at least "Runs Fine"
 * are indexed, which makes a search for a game or app answer the question the
 * user is actually asking: which of these can run it?
 */
function searchHaystack(laptop: Laptop) {
  return [
    laptop.name,
    laptop.brand,
    laptop.specs.processor,
    laptop.specs.gpu,
    laptop.specs.os,
    laptop.summary,
    ...laptop.tags,
    ...laptop.games.filter((game) => game.fps >= 60).map((game) => game.name),
    ...Object.entries(laptop.software)
      .filter(([, status]) => status === "Runs Smoothly" || status === "Runs Fine")
      .map(([name]) => name),
  ]
    .join(" ")
    .toLowerCase();
}

const haystacks = new Map(laptops.map((l) => [l.id, searchHaystack(l)]));

export function searchLaptops(query: string, pool: Laptop[] = laptops) {
  const term = query.trim().toLowerCase();
  if (!term) return pool;
  const words = term.split(/\s+/);
  return pool.filter((laptop) => {
    const haystack = haystacks.get(laptop.id) ?? "";
    return words.every((word) => haystack.includes(word));
  });
}

export function filterLaptops(filters: LaptopFilters, pool: Laptop[] = laptops) {
  const matched = pool.filter((laptop) => {
    if (filters.brands.length && !filters.brands.includes(laptop.brand)) return false;
    if (filters.processors.length && !filters.processors.includes(laptop.specs.processor))
      return false;
    if (filters.gpus.length && !filters.gpus.includes(laptop.specs.gpu)) return false;
    if (filters.ram.length && !filters.ram.includes(laptop.specs.ram)) return false;
    if (filters.storage.length && !filters.storage.includes(laptop.specs.storage))
      return false;
    if (
      filters.displaySizes.length &&
      !filters.displaySizes.includes(laptop.specs.display.size)
    )
      return false;
    if (
      filters.refreshRates.length &&
      !filters.refreshRates.includes(laptop.specs.display.refreshRate)
    )
      return false;
    if (filters.os.length && !filters.os.includes(laptop.specs.os)) return false;
    if (laptop.price < filters.minPrice || laptop.price > filters.maxPrice) return false;
    return true;
  });

  return searchLaptops(filters.query, matched);
}

export function sortLaptops(pool: Laptop[], sort: SortOption) {
  const sorted = [...pool];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "performance":
      return sorted.sort((a, b) => b.performance.overall - a.performance.overall);
    case "newest":
    default:
      return sorted.sort(
        (a, b) => b.releaseYear - a.releaseYear || b.views - a.views,
      );
  }
}

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest rated" },
  { value: "performance", label: "Best performance" },
];

/* -------------------------------------------------------------------------- */
/* Curated selections                                                         */
/* -------------------------------------------------------------------------- */

export const featuredLaptops = laptops
  .filter((laptop) => laptop.bestseller)
  .sort((a, b) => b.views - a.views)
  .slice(0, 8);

export const trendingLaptops = [...laptops]
  .sort((a, b) => b.views - a.views)
  .slice(0, 5);

/** Same brand or adjacent price bracket, used on the details page. */
export function relatedLaptops(laptop: Laptop, count = 4, pool: Laptop[] = laptops) {
  return pool
    .filter((other) => other.id !== laptop.id)
    .map((other) => ({
      other,
      score:
        (other.brand === laptop.brand ? 2 : 0) +
        (Math.abs(other.price - laptop.price) < 25000 ? 3 : 0) +
        (Math.abs(other.performance.overall - laptop.performance.overall) < 10 ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.other.views - a.other.views)
    .slice(0, count)
    .map((entry) => entry.other);
}

export const allReviews = laptops.flatMap((laptop) =>
  laptop.reviewList.map((review) => ({ ...review, laptopId: laptop.id, laptopName: laptop.name })),
);
