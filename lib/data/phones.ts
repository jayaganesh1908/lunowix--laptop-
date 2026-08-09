import { type CameraSpec, type MobileGameBenchmark, type MobileOS, type Phone, type PhoneCameraSystem, type PhoneFilters, type PhonePerformanceScores, type PhoneSpecs, type Model3DParams, type PhoneBrand, type ProductSortOption } from "@/lib/types";
import { buildReviews } from "./index";

/* -------------------------------------------------------------------------- */
/* Scoring tables                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Sustained multi-core throughput blended with single-core, normalised so the
 * fastest shipping mobile silicon sits at 100. `gpu` is a separate axis because
 * mobile SoCs trade CPU and GPU very differently — Tensor is a clear example.
 * `process` is the fab node in nm, which is the honest proxy for how long a
 * chip holds its peak clocks before throttling.
 */
const SOC_SCORES: Record<
  string,
  { score: number; gpu: number; gpuName: string; cores: number; process: number }
> = {
  "MediaTek Helio G85": { score: 12, gpu: 9, gpuName: "Mali-G52 MC2", cores: 8, process: 12 },
  "Qualcomm Snapdragon 680": { score: 15, gpu: 12, gpuName: "Adreno 610", cores: 8, process: 6 },
  "MediaTek Dimensity 6100+": { score: 20, gpu: 16, gpuName: "Mali-G57 MC2", cores: 8, process: 6 },
  "Qualcomm Snapdragon 4 Gen 2": { score: 23, gpu: 18, gpuName: "Adreno 613", cores: 8, process: 4 },
  "MediaTek Dimensity 7025": { score: 26, gpu: 21, gpuName: "Mali-G610 MC2", cores: 8, process: 6 },
  "Qualcomm Snapdragon 695": { score: 27, gpu: 23, gpuName: "Adreno 619", cores: 8, process: 6 },
  "MediaTek Dimensity 7050": { score: 33, gpu: 29, gpuName: "Mali-G68 MC4", cores: 8, process: 6 },
  "Qualcomm Snapdragon 6 Gen 1": { score: 35, gpu: 30, gpuName: "Adreno 710", cores: 8, process: 4 },
  "MediaTek Dimensity 7200": { score: 39, gpu: 35, gpuName: "Mali-G610 MC4", cores: 8, process: 4 },
  "Samsung Exynos 1380": { score: 41, gpu: 34, gpuName: "Mali-G68 MP5", cores: 8, process: 5 },
  "Qualcomm Snapdragon 7s Gen 2": { score: 43, gpu: 37, gpuName: "Adreno 710", cores: 8, process: 4 },
  "Qualcomm Snapdragon 782G": { score: 47, gpu: 43, gpuName: "Adreno 642L", cores: 8, process: 6 },
  "MediaTek Dimensity 8200": { score: 53, gpu: 52, gpuName: "Mali-G610 MC6", cores: 8, process: 4 },
  "Qualcomm Snapdragon 7+ Gen 2": { score: 59, gpu: 56, gpuName: "Adreno 725", cores: 8, process: 4 },
  "Google Tensor G3": { score: 62, gpu: 54, gpuName: "Immortalis-G715s MC10", cores: 9, process: 4 },
  "MediaTek Dimensity 8300 Ultra": { score: 65, gpu: 62, gpuName: "Mali-G615 MC6", cores: 8, process: 4 },
  "Samsung Exynos 2400": { score: 73, gpu: 71, gpuName: "Xclipse 940", cores: 10, process: 4 },
  "Qualcomm Snapdragon 8s Gen 3": { score: 75, gpu: 72, gpuName: "Adreno 735", cores: 8, process: 4 },
  "Qualcomm Snapdragon 8 Gen 2": { score: 81, gpu: 79, gpuName: "Adreno 740", cores: 8, process: 4 },
  "Apple A16 Bionic": { score: 83, gpu: 76, gpuName: "Apple 5-core GPU", cores: 6, process: 4 },
  "MediaTek Dimensity 9300": { score: 88, gpu: 89, gpuName: "Immortalis-G720 MC12", cores: 8, process: 4 },
  "Qualcomm Snapdragon 8 Gen 3": { score: 91, gpu: 90, gpuName: "Adreno 750", cores: 8, process: 4 },
  "Apple A17 Pro": { score: 93, gpu: 86, gpuName: "Apple 6-core GPU", cores: 6, process: 3 },
  "Apple A18 Pro": { score: 99, gpu: 95, gpuName: "Apple 6-core GPU", cores: 6, process: 3 },
  "Qualcomm Snapdragon 8 Elite": { score: 100, gpu: 100, gpuName: "Adreno 830", cores: 8, process: 3 },
};

/** Marketing colour name to the finish the 3D viewer should render. */
const COLOR_HEX: Record<string, string> = {
  "Midnight Black": "#141518",
  "Phantom Black": "#17181B",
  "Obsidian": "#1B1C20",
  "Titanium Grey": "#6E6B66",
  "Natural Titanium": "#8A8378",
  "Desert Titanium": "#A08C6E",
  "Graphite": "#3A3B3F",
  "Silver": "#CFD3D8",
  "Moonlight Silver": "#D3D7DC",
  "Glacier Blue": "#9EC3D8",
  "Ocean Blue": "#2E5F8A",
  "Marble Blue": "#4A76A8",
  "Cobalt Violet": "#8B7BC4",
  "Lavender": "#C3B4E0",
  "Emerald Green": "#1F6E52",
  "Forest Green": "#2C4A3A",
  "Sunset Gold": "#D9AE72",
  "Cream": "#E8E0D2",
  "Coral Red": "#D9503F",
  "Peach Fuzz": "#E8B49C",
  "White": "#EDEDEF",
  "Nebula Purple": "#5B4B8A",
};

const clamp = (value: number, min = 1, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))));
const round10 = (value: number) => Math.round(value * 10) / 10;

function pixelCount(resolution: string) {
  const [w, h] = resolution.split("x").map((part) => Number(part.trim()));
  return (w || 1080) * (h || 2400);
}

/* -------------------------------------------------------------------------- */
/* Derived scores                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Sensor quality. Megapixels are logarithmic — a 200MP sensor is not sixteen
 * times a 12MP one, it bins down to roughly the same output — so resolution is
 * scored on a log2 curve and aperture and stabilisation carry real weight.
 */
function sensorScore(cam: CameraSpec | undefined, weight = 1): number {
  if (!cam) return 0;
  const mp = clamp(30 + Math.log2(cam.mp / 12) * 17, 8, 92);
  const aperture = (2.2 - cam.aperture) * 24;
  const stabilised = cam.ois ? 12 : 0;
  return clamp(mp + aperture + stabilised) * weight;
}

function videoScore(maxVideo: string): number {
  if (/8K/i.test(maxVideo)) return 100;
  if (/4K.*(60|120)/i.test(maxVideo)) return 86;
  if (/4K/i.test(maxVideo)) return 70;
  if (/1080p.*(60|120)/i.test(maxVideo)) return 48;
  return 32;
}

function cameraScore(camera: PhoneCameraSystem): number {
  const main = sensorScore(camera.main);
  const ultrawide = sensorScore(camera.ultrawide);
  // No telephoto means digital crop only, which is worth roughly a third of a
  // real periscope — not zero, but not close either.
  const tele = camera.telephoto
    ? clamp(sensorScore(camera.telephoto) + (camera.opticalZoom - 2) * 6)
    : 22;

  return clamp(0.55 * main + 0.15 * ultrawide + 0.2 * tele + 0.1 * videoScore(camera.maxVideo));
}

/**
 * Endurance, not capacity. A 5000mAh cell behind a 6.8-inch 120Hz QHD panel
 * lasts noticeably less than the same cell behind a 6.1-inch 60Hz FHD one, so
 * capacity is divided by a modelled draw index before it is scored.
 *
 * Four corrections keep this honest, and each one changes the ranking:
 *
 * - **LTPO** panels vary refresh from 1Hz upward, so their nominal 120Hz costs
 *   far less than a fixed 120Hz panel's. Without this a QHD flagship scores
 *   near zero, which is plainly wrong.
 * - **Resolution** is a weak power term, not a linear one — the panel is lit
 *   either way. It enters on a fourth root.
 * - **Process node** stands in for SoC efficiency; a 3nm part genuinely sips.
 * - **iOS** delivers materially more screen time per mAh, which is why a
 *   3582mAh iPhone competes with a 5000mAh Android.
 */
function batteryScore(
  capacity: number,
  display: PhoneSpecs["display"],
  charging: number,
  process: number,
  os: MobileOS,
): number {
  const ltpo = /ltpo/i.test(display.panel);

  const drawIndex =
    Math.pow(display.size / 6.4, 0.7) *
    (1 + (display.refreshRate - 60) / 600) *
    (ltpo ? 0.82 : 1) *
    Math.pow(pixelCount(display.resolution) / 2_400_000, 0.25) *
    (1 + (process - 3) * 0.04) *
    (os === "iOS" ? 0.78 : 1);

  const endurance = capacity / drawIndex;
  const base = clamp((endurance - 3300) / 22);

  // Fast charging does not extend a day, but it does change how a flat phone
  // feels, so it contributes a capped bonus rather than joining the main model.
  const chargeBonus = clamp(charging / 12, 0, 9);

  return clamp(base + chargeBonus);
}

function displayScore(display: PhoneSpecs["display"]): number {
  // 1080x2400 (2.59MP) anchors at 45; 1440x3200 (4.6MP) lands near 92.
  const resolution = clamp(45 + ((pixelCount(display.resolution) - 2_592_000) / 2_000_000) * 47, 25, 100);
  const refresh = clamp(((display.refreshRate - 60) / 60) * 70 + 30, 25, 100);
  const brightness = clamp((display.brightness / 3000) * 100, 20, 100);
  const panel = /ltpo/i.test(display.panel) ? 100 : /amoled|oled/i.test(display.panel) ? 78 : 40;

  return clamp(0.4 * resolution + 0.25 * refresh + 0.25 * brightness + 0.1 * panel);
}

interface PhoneScoreInputs {
  soc: number;
  gpu: number;
  process: number;
  ram: number;
  storageType: string;
  display: PhoneSpecs["display"];
  battery: number;
  charging: number;
  camera: PhoneCameraSystem;
  os: MobileOS;
}

function buildPhonePerformance(input: PhoneScoreInputs): PhonePerformanceScores {
  const ramScore = clamp(24 + input.ram * 6);
  const storageScore = /ufs 4/i.test(input.storageType)
    ? 100
    : /ufs 3/i.test(input.storageType)
      ? 72
      : /nvme/i.test(input.storageType)
        ? 88
        : 40;

  const performance = clamp(0.7 * input.soc + 0.2 * ramScore + 0.1 * storageScore);
  const camera = cameraScore(input.camera);
  const battery = batteryScore(
    input.battery,
    input.display,
    input.charging,
    input.process,
    input.os,
  );
  const display = displayScore(input.display);

  // A smaller node sheds heat better, which is what separates a phone that
  // holds 60fps for an hour from one that only benchmarks well.
  const thermals = clamp(100 - (input.process - 3) * 17, 20, 100);
  const refresh = clamp(((input.display.refreshRate - 60) / 60) * 70 + 30, 25, 100);
  const gaming = clamp(0.65 * input.gpu + 0.25 * thermals + 0.1 * refresh);

  const overall = clamp(
    0.26 * performance + 0.24 * camera + 0.2 * battery + 0.16 * display + 0.14 * gaming,
  );

  return {
    performance: round(performance),
    camera: round(camera),
    battery: round(battery),
    display: round(display),
    gaming: round(gaming),
    overall: round(overall),
  };
}

/* -------------------------------------------------------------------------- */
/* Mobile game benchmarks                                                     */
/* -------------------------------------------------------------------------- */

/** `demand` is the SoC GPU score needed to hold ~60fps at the High preset. */
const MOBILE_GAMES: { id: string; name: string; icon: string; demand: number; cap: number }[] = [
  { id: "bgmi", name: "BGMI", icon: "🔫", demand: 22, cap: 120 },
  { id: "free-fire-max", name: "Free Fire MAX", icon: "🔥", demand: 14, cap: 90 },
  { id: "cod-mobile", name: "Call of Duty: Mobile", icon: "🎖️", demand: 24, cap: 120 },
  { id: "real-cricket-24", name: "Real Cricket 24", icon: "🏏", demand: 16, cap: 60 },
  { id: "asphalt-9", name: "Asphalt 9: Legends", icon: "🏎️", demand: 30, cap: 60 },
  { id: "genshin-impact", name: "Genshin Impact", icon: "⚔️", demand: 62, cap: 60 },
  { id: "honkai-star-rail", name: "Honkai: Star Rail", icon: "🌌", demand: 58, cap: 60 },
  { id: "wuthering-waves", name: "Wuthering Waves", icon: "🌊", demand: 78, cap: 60 },
];

function mobileTier(fps: number, preset: string): MobileGameBenchmark["tier"] {
  if (fps >= 90 && (preset === "High" || preset === "Ultra")) return "Flawless";
  if (fps >= 58) return "Excellent";
  if (fps >= 35) return "Playable";
  return "Struggles";
}

/**
 * Same anchor-and-step model the laptop benchmarks use, with one mobile-specific
 * correction: frame rates are capped by what the title actually offers on
 * Android/iOS, so a flagship shows "60fps locked" on Genshin rather than a
 * fictional 140.
 */
function buildMobileBenchmarks(gpu: number, thermals: number): MobileGameBenchmark[] {
  return MOBILE_GAMES.map((game) => {
    const effective = gpu * 0.82 + thermals * 0.18;
    const highFps = 60 * Math.pow(effective / game.demand, 0.75);

    let graphics = "High";
    let fps = highFps;

    if (highFps >= 95) {
      graphics = "Ultra";
      fps = highFps * 0.74;
    } else if (highFps < 45) {
      graphics = "Medium";
      fps = highFps * 1.32;
      if (fps < 40) {
        graphics = "Low";
        fps = highFps * 1.8;
      }
    }

    const capped = Math.round(clamp(fps, 11, game.cap));
    return {
      id: game.id,
      name: game.name,
      icon: game.icon,
      fps: capped,
      graphics,
      tier: mobileTier(capped, graphics),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Parametric 3D                                                              */
/* -------------------------------------------------------------------------- */

export function derivePhoneModel(specs: PhoneSpecs): Model3DParams {
  // Height in cm from the diagonal, at the ~20:9 ratio nearly every modern
  // handset uses.
  const span = round10(specs.display.size * 2.42);

  // 7mm is about as thin as a phone gets; 9.6mm is a big-battery brick.
  const bulk = clamp01((specs.thickness - 7) / 2.6);

  const panel = /ltpo/i.test(specs.display.panel) ? 0.96 : /amoled|oled/i.test(specs.display.panel) ? 0.86 : 0.5;
  const screenGlow = clamp01(panel * (0.6 + (specs.display.brightness / 3000) * 0.4));

  const bodyColor = COLOR_HEX[specs.colors[0]] ?? "#2A2C31";
  // Titanium and aluminium rails catch light differently from plastic, and the
  // rail is most of what you see edge-on in the viewer.
  const accentColor = /titanium/i.test(specs.build)
    ? "#9A948A"
    : /aluminium|aluminum/i.test(specs.build)
      ? "#C2C6CC"
      : bodyColor;

  return { archetype: "phone", span, bulk, screenGlow, bodyColor, accentColor };
}

/* -------------------------------------------------------------------------- */
/* Seeds                                                                      */
/* -------------------------------------------------------------------------- */

interface PhoneSeed {
  id: string;
  name: string;
  brand: PhoneBrand;
  price: number;
  mrp: number;
  summary: string;
  soc: keyof typeof SOC_SCORES;
  ram: number;
  storage: number;
  storageType?: string;
  display: {
    size: number;
    resolution: string;
    refreshRate: number;
    panel: string;
    brightness: number;
    protection?: string;
  };
  battery: number;
  charging: number;
  wirelessCharging?: number;
  camera: {
    main: CameraSpec;
    ultrawide?: CameraSpec;
    telephoto?: CameraSpec;
    opticalZoom?: number;
    front: CameraSpec;
    maxVideo: string;
  };
  weight: number;
  thickness: number;
  build: string;
  waterResistance?: string;
  os?: MobileOS;
  osVersion: string;
  osUpdates: number;
  headphoneJack?: boolean;
  expandableStorage?: boolean;
  colors: string[];
  rating: number;
  reviews: number;
  bestseller?: boolean;
  releaseYear: number;
  views: number;
  tags: string[];
  warranty?: string;
}

const seeds: PhoneSeed[] = [
  /* ------------------------------ Budget ------------------------------- */
  {
    id: "redmi-13c-5g",
    name: "Redmi 13C 5G",
    brand: "Xiaomi",
    price: 10499,
    mrp: 14999,
    summary:
      "The cheapest way onto a 5G network. Fine for calls, UPI and YouTube; it will not pretend to be a gaming phone.",
    soc: "MediaTek Dimensity 6100+",
    ram: 4,
    storage: 128,
    storageType: "UFS 2.2",
    display: { size: 6.74, resolution: "720 x 1600", refreshRate: 90, panel: "IPS LCD", brightness: 600 },
    battery: 5000,
    charging: 18,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: false, label: "Wide" },
      front: { mp: 5, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "1080p 30fps",
    },
    weight: 192,
    thickness: 8.1,
    build: "Polycarbonate frame and back",
    waterResistance: "IP53",
    osVersion: "Android 14, HyperOS",
    osUpdates: 2,
    headphoneJack: true,
    expandableStorage: true,
    colors: ["Midnight Black", "Glacier Blue"],
    rating: 3.9,
    reviews: 1284,
    releaseYear: 2024,
    views: 14200,
    tags: ["Budget", "5G", "Everyday"],
  },
  {
    id: "moto-g64-5g",
    name: "Motorola G64 5G",
    brand: "Motorola",
    price: 14999,
    mrp: 18999,
    summary:
      "Clean near-stock Android and 12GB of RAM at a price where both are rare. The panel is LCD, which is the trade.",
    soc: "MediaTek Dimensity 7025",
    ram: 12,
    storage: 256,
    storageType: "UFS 2.2",
    display: { size: 6.5, resolution: "1080 x 2400", refreshRate: 120, panel: "IPS LCD", brightness: 1000 },
    battery: 6000,
    charging: 33,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: true, label: "Wide" },
      ultrawide: { mp: 8, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 16, aperture: 2.4, ois: false, label: "Selfie" },
      maxVideo: "1080p 60fps",
    },
    weight: 177,
    thickness: 8.9,
    build: "Polycarbonate frame, vegan leather back",
    waterResistance: "IP52",
    osVersion: "Android 14, Hello UI",
    osUpdates: 2,
    headphoneJack: true,
    expandableStorage: true,
    colors: ["Ocean Blue", "Midnight Black"],
    rating: 4.2,
    reviews: 2140,
    bestseller: true,
    releaseYear: 2024,
    views: 22800,
    tags: ["Budget", "Big battery", "Stock Android"],
  },
  {
    id: "realme-narzo-70-turbo",
    name: "Realme Narzo 70 Turbo 5G",
    brand: "Realme",
    price: 17499,
    mrp: 21999,
    summary:
      "A Dimensity 8300 under ₹20K, which is genuinely unusual. Buy it for frame rates, not for the ultrawide.",
    soc: "MediaTek Dimensity 8300 Ultra",
    ram: 8,
    storage: 128,
    storageType: "UFS 3.1",
    display: { size: 6.67, resolution: "1080 x 2400", refreshRate: 120, panel: "AMOLED", brightness: 2000 },
    battery: 5000,
    charging: 45,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: true, label: "Wide" },
      ultrawide: { mp: 2, aperture: 2.4, ois: false, label: "Macro" },
      front: { mp: 16, aperture: 2.5, ois: false, label: "Selfie" },
      maxVideo: "4K 30fps",
    },
    weight: 185,
    thickness: 7.6,
    build: "Polycarbonate frame, glass back",
    waterResistance: "IP65",
    osVersion: "Android 14, Realme UI 5.0",
    osUpdates: 2,
    colors: ["Cobalt Violet", "Midnight Black"],
    rating: 4.3,
    reviews: 1876,
    bestseller: true,
    releaseYear: 2024,
    views: 26400,
    tags: ["Gaming", "Value", "Fast charging"],
  },
  {
    id: "samsung-galaxy-m35-5g",
    name: "Samsung Galaxy M35 5G",
    brand: "Samsung",
    price: 19499,
    mrp: 24999,
    summary:
      "Four OS upgrades and a 6000mAh cell. Slower than its price rivals in benchmarks, ahead of all of them in years of support.",
    soc: "Samsung Exynos 1380",
    ram: 8,
    storage: 128,
    storageType: "UFS 3.1",
    display: { size: 6.6, resolution: "1080 x 2340", refreshRate: 120, panel: "Super AMOLED", brightness: 1000 },
    battery: 6000,
    charging: 25,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: true, label: "Wide" },
      ultrawide: { mp: 8, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 13, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "4K 30fps",
    },
    weight: 222,
    thickness: 9.1,
    build: "Polycarbonate frame, glass back",
    waterResistance: "IP67",
    osVersion: "Android 14, One UI 6.1",
    osUpdates: 4,
    colors: ["Midnight Black", "Marble Blue"],
    rating: 4.2,
    reviews: 3120,
    releaseYear: 2024,
    views: 24100,
    tags: ["Long support", "Big battery", "Everyday"],
  },
  /* ----------------------------- Mid-range ----------------------------- */
  {
    id: "nothing-phone-2a-plus",
    name: "Nothing Phone (2a) Plus",
    brand: "Nothing",
    price: 25999,
    mrp: 29999,
    summary:
      "The most distinctive object on this list. Glyph lighting and a clean OS, on hardware that is merely good rather than fast.",
    soc: "MediaTek Dimensity 7200",
    ram: 8,
    storage: 256,
    storageType: "UFS 3.1",
    display: { size: 6.7, resolution: "1084 x 2412", refreshRate: 120, panel: "AMOLED", brightness: 1300 },
    battery: 5000,
    charging: 50,
    camera: {
      main: { mp: 50, aperture: 1.9, ois: true, label: "Wide" },
      ultrawide: { mp: 50, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 50, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "4K 30fps",
    },
    weight: 190,
    thickness: 8.5,
    build: "Polycarbonate frame, glass back",
    waterResistance: "IP54",
    osVersion: "Android 14, Nothing OS 2.6",
    osUpdates: 3,
    colors: ["Nebula Purple", "White"],
    rating: 4.3,
    reviews: 1520,
    releaseYear: 2024,
    views: 31200,
    tags: ["Design", "Clean OS", "Mid-range"],
  },
  {
    id: "iqoo-neo-9-pro",
    name: "iQOO Neo 9 Pro",
    brand: "iQOO",
    price: 33999,
    mrp: 42999,
    summary:
      "Flagship silicon from last year at half the flagship price. The camera is the compromise that makes the maths work.",
    soc: "Qualcomm Snapdragon 8 Gen 2",
    ram: 12,
    storage: 256,
    storageType: "UFS 4.0",
    display: { size: 6.78, resolution: "1260 x 2800", refreshRate: 144, panel: "LTPO AMOLED", brightness: 3000 },
    battery: 5160,
    charging: 120,
    camera: {
      main: { mp: 50, aperture: 1.9, ois: true, label: "Wide" },
      ultrawide: { mp: 8, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 16, aperture: 2.5, ois: false, label: "Selfie" },
      maxVideo: "4K 60fps",
    },
    weight: 190,
    thickness: 8.0,
    build: "Aluminium frame, glass back",
    waterResistance: "IP54",
    osVersion: "Android 14, Funtouch OS 14",
    osUpdates: 3,
    colors: ["Coral Red", "Phantom Black"],
    rating: 4.4,
    reviews: 2260,
    bestseller: true,
    releaseYear: 2024,
    views: 38600,
    tags: ["Gaming", "Fast charging", "Performance"],
  },
  {
    id: "oneplus-nord-4",
    name: "OnePlus Nord 4",
    brand: "OnePlus",
    price: 32999,
    mrp: 37999,
    summary:
      "A single-piece metal back, which nothing else near the price does. Balanced rather than spiky — nothing here is bad.",
    soc: "Qualcomm Snapdragon 7+ Gen 2",
    ram: 8,
    storage: 256,
    storageType: "UFS 3.1",
    display: { size: 6.74, resolution: "1240 x 2772", refreshRate: 120, panel: "AMOLED", brightness: 2150 },
    battery: 5500,
    charging: 100,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: true, label: "Wide" },
      ultrawide: { mp: 8, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 16, aperture: 2.4, ois: false, label: "Selfie" },
      maxVideo: "4K 60fps",
    },
    weight: 199,
    thickness: 7.99,
    build: "Aluminium unibody",
    waterResistance: "IP65",
    osVersion: "Android 14, OxygenOS 14.1",
    osUpdates: 4,
    colors: ["Silver", "Obsidian"],
    rating: 4.4,
    reviews: 1980,
    releaseYear: 2024,
    views: 34500,
    tags: ["Design", "Fast charging", "Mid-range"],
  },
  {
    id: "google-pixel-8a",
    name: "Google Pixel 8a",
    brand: "Google",
    price: 44999,
    mrp: 52999,
    summary:
      "The best camera you can buy under ₹50K, attached to middling silicon and a small battery. Seven years of updates.",
    soc: "Google Tensor G3",
    ram: 8,
    storage: 128,
    storageType: "UFS 3.1",
    display: { size: 6.1, resolution: "1080 x 2400", refreshRate: 120, panel: "OLED", brightness: 2000 },
    battery: 4492,
    charging: 18,
    wirelessCharging: 7.5,
    camera: {
      main: { mp: 64, aperture: 1.89, ois: true, label: "Wide" },
      ultrawide: { mp: 13, aperture: 2.2, ois: false, label: "Ultrawide" },
      front: { mp: 13, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "4K 60fps",
    },
    weight: 188,
    thickness: 8.9,
    build: "Aluminium frame, glass back",
    waterResistance: "IP67",
    osVersion: "Android 14",
    osUpdates: 7,
    colors: ["Obsidian", "Peach Fuzz"],
    rating: 4.4,
    reviews: 1640,
    releaseYear: 2024,
    views: 41800,
    tags: ["Camera", "Long support", "Compact"],
  },
  {
    id: "samsung-galaxy-s24-fe",
    name: "Samsung Galaxy S24 FE",
    brand: "Samsung",
    price: 49999,
    mrp: 59999,
    summary:
      "A flagship telephoto and seven years of updates, on a chip that runs warm. The cheapest real 3x optical zoom here.",
    soc: "Samsung Exynos 2400",
    ram: 8,
    storage: 128,
    storageType: "UFS 3.1",
    display: { size: 6.7, resolution: "1080 x 2340", refreshRate: 120, panel: "Dynamic AMOLED 2X", brightness: 1900 },
    battery: 4700,
    charging: 25,
    wirelessCharging: 15,
    camera: {
      main: { mp: 50, aperture: 1.8, ois: true, label: "Wide" },
      ultrawide: { mp: 12, aperture: 2.2, ois: false, label: "Ultrawide" },
      telephoto: { mp: 8, aperture: 2.4, ois: true, label: "3x Telephoto" },
      opticalZoom: 3,
      front: { mp: 10, aperture: 2.4, ois: false, label: "Selfie" },
      maxVideo: "8K 30fps",
    },
    weight: 213,
    thickness: 8.0,
    build: "Aluminium frame, glass back",
    waterResistance: "IP68",
    osVersion: "Android 14, One UI 6.1",
    osUpdates: 7,
    colors: ["Graphite", "Glacier Blue"],
    rating: 4.3,
    reviews: 1420,
    releaseYear: 2024,
    views: 36900,
    tags: ["Camera", "Zoom", "Long support"],
  },
  /* ------------------------------ Flagship ----------------------------- */
  {
    id: "oneplus-12",
    name: "OnePlus 12",
    brand: "OnePlus",
    price: 64999,
    mrp: 69999,
    summary:
      "The most complete Android flagship for the money — 100W charging, a real periscope, and a 4500-nit panel.",
    soc: "Qualcomm Snapdragon 8 Gen 3",
    ram: 12,
    storage: 256,
    storageType: "UFS 4.0",
    display: { size: 6.82, resolution: "1440 x 3168", refreshRate: 120, panel: "LTPO AMOLED", brightness: 2600 },
    battery: 5400,
    charging: 100,
    wirelessCharging: 50,
    camera: {
      main: { mp: 50, aperture: 1.6, ois: true, label: "Wide" },
      ultrawide: { mp: 48, aperture: 2.2, ois: false, label: "Ultrawide" },
      telephoto: { mp: 64, aperture: 2.6, ois: true, label: "3x Periscope" },
      opticalZoom: 3,
      front: { mp: 32, aperture: 2.4, ois: false, label: "Selfie" },
      maxVideo: "8K 24fps",
    },
    weight: 220,
    thickness: 9.15,
    build: "Aluminium frame, glass back",
    waterResistance: "IP65",
    osVersion: "Android 14, OxygenOS 14",
    osUpdates: 4,
    colors: ["Emerald Green", "Silver"],
    rating: 4.5,
    reviews: 2840,
    bestseller: true,
    releaseYear: 2024,
    views: 52300,
    tags: ["Flagship", "Fast charging", "Zoom"],
  },
  {
    id: "google-pixel-9-pro",
    name: "Google Pixel 9 Pro",
    brand: "Google",
    price: 109999,
    mrp: 124999,
    summary:
      "Still the reference for computational photography, and now with the hardware to match. Charging remains slow.",
    soc: "Google Tensor G3",
    ram: 16,
    storage: 256,
    storageType: "UFS 3.1",
    display: { size: 6.3, resolution: "1280 x 2856", refreshRate: 120, panel: "LTPO OLED", brightness: 3000 },
    battery: 4700,
    charging: 27,
    wirelessCharging: 21,
    camera: {
      main: { mp: 50, aperture: 1.68, ois: true, label: "Wide" },
      ultrawide: { mp: 48, aperture: 1.7, ois: true, label: "Ultrawide" },
      telephoto: { mp: 48, aperture: 2.8, ois: true, label: "5x Periscope" },
      opticalZoom: 5,
      front: { mp: 42, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "8K 30fps",
    },
    weight: 199,
    thickness: 8.5,
    build: "Aluminium frame, glass back",
    waterResistance: "IP68",
    osVersion: "Android 15",
    osUpdates: 7,
    colors: ["Obsidian", "Cream"],
    rating: 4.6,
    reviews: 1980,
    releaseYear: 2024,
    views: 58700,
    tags: ["Camera", "Flagship", "Long support"],
  },
  {
    id: "samsung-galaxy-s24-ultra",
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    price: 129999,
    mrp: 144999,
    summary:
      "The everything phone — 5x periscope, S Pen, titanium rails and the brightest panel on the market. Priced accordingly.",
    soc: "Qualcomm Snapdragon 8 Gen 3",
    ram: 12,
    storage: 256,
    storageType: "UFS 4.0",
    display: { size: 6.8, resolution: "1440 x 3120", refreshRate: 120, panel: "LTPO AMOLED", brightness: 2600 },
    battery: 5000,
    charging: 45,
    wirelessCharging: 15,
    camera: {
      main: { mp: 200, aperture: 1.7, ois: true, label: "Wide" },
      ultrawide: { mp: 12, aperture: 2.2, ois: false, label: "Ultrawide" },
      telephoto: { mp: 50, aperture: 3.4, ois: true, label: "5x Periscope" },
      opticalZoom: 5,
      front: { mp: 12, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "8K 30fps",
    },
    weight: 232,
    thickness: 8.6,
    build: "Titanium frame, Gorilla Armor glass",
    waterResistance: "IP68",
    osVersion: "Android 14, One UI 6.1",
    osUpdates: 7,
    colors: ["Titanium Grey", "Cobalt Violet"],
    rating: 4.6,
    reviews: 4210,
    bestseller: true,
    releaseYear: 2024,
    views: 71400,
    tags: ["Flagship", "Zoom", "S Pen", "Camera"],
  },
  {
    id: "apple-iphone-15",
    name: "Apple iPhone 15",
    brand: "Apple",
    price: 69999,
    mrp: 79900,
    summary:
      "Last year's Pro chip in this year's standard body, finally with USB-C. A 60Hz panel at ₹70K is the sore point.",
    soc: "Apple A16 Bionic",
    ram: 6,
    storage: 128,
    storageType: "NVMe",
    display: { size: 6.1, resolution: "1179 x 2556", refreshRate: 60, panel: "Super Retina XDR OLED", brightness: 2000 },
    battery: 3349,
    charging: 20,
    wirelessCharging: 15,
    camera: {
      main: { mp: 48, aperture: 1.6, ois: true, label: "Wide" },
      ultrawide: { mp: 12, aperture: 2.4, ois: false, label: "Ultrawide" },
      front: { mp: 12, aperture: 1.9, ois: false, label: "Selfie" },
      maxVideo: "4K 60fps",
    },
    weight: 171,
    thickness: 7.8,
    build: "Aluminium frame, glass back",
    waterResistance: "IP68",
    os: "iOS",
    osVersion: "iOS 18",
    osUpdates: 6,
    colors: ["Midnight Black", "Glacier Blue"],
    rating: 4.5,
    reviews: 5120,
    releaseYear: 2023,
    views: 64200,
    tags: ["iOS", "Compact", "Camera"],
  },
  {
    id: "apple-iphone-16-pro",
    name: "Apple iPhone 16 Pro",
    brand: "Apple",
    price: 119900,
    mrp: 119900,
    summary:
      "The most capable video camera in a phone, and the fastest silicon here. Everything else is iteration.",
    soc: "Apple A18 Pro",
    ram: 8,
    storage: 256,
    storageType: "NVMe",
    display: { size: 6.3, resolution: "1206 x 2622", refreshRate: 120, panel: "LTPO Super Retina XDR", brightness: 2000 },
    battery: 3582,
    charging: 30,
    wirelessCharging: 25,
    camera: {
      main: { mp: 48, aperture: 1.78, ois: true, label: "Fusion" },
      ultrawide: { mp: 48, aperture: 2.2, ois: false, label: "Ultrawide" },
      telephoto: { mp: 12, aperture: 2.8, ois: true, label: "5x Tetraprism" },
      opticalZoom: 5,
      front: { mp: 12, aperture: 1.9, ois: false, label: "Selfie" },
      maxVideo: "4K 120fps",
    },
    weight: 199,
    thickness: 8.25,
    build: "Titanium frame, Ceramic Shield glass",
    waterResistance: "IP68",
    os: "iOS",
    osVersion: "iOS 18",
    osUpdates: 6,
    colors: ["Natural Titanium", "Titanium Grey"],
    rating: 4.7,
    reviews: 3860,
    bestseller: true,
    releaseYear: 2024,
    views: 82600,
    tags: ["Flagship", "iOS", "Video", "Camera"],
  },
  {
    id: "xiaomi-14-ultra",
    name: "Xiaomi 14 Ultra",
    brand: "Xiaomi",
    price: 99999,
    mrp: 109999,
    summary:
      "A one-inch sensor with a variable aperture and Leica tuning. The closest a phone gets to a real camera.",
    soc: "Qualcomm Snapdragon 8 Gen 3",
    ram: 16,
    storage: 512,
    storageType: "UFS 4.0",
    display: { size: 6.73, resolution: "1440 x 3200", refreshRate: 120, panel: "LTPO AMOLED", brightness: 3000 },
    battery: 5300,
    charging: 90,
    wirelessCharging: 80,
    camera: {
      main: { mp: 50, aperture: 1.63, ois: true, label: '1" Wide (variable f/1.63-4.0)' },
      ultrawide: { mp: 50, aperture: 1.8, ois: false, label: "Ultrawide" },
      telephoto: { mp: 50, aperture: 2.5, ois: true, label: "5x Periscope" },
      opticalZoom: 5,
      front: { mp: 32, aperture: 2.0, ois: false, label: "Selfie" },
      maxVideo: "8K 30fps",
    },
    weight: 224,
    thickness: 9.2,
    build: "Titanium frame, ceramic back",
    waterResistance: "IP68",
    osVersion: "Android 14, HyperOS",
    osUpdates: 4,
    colors: ["Phantom Black", "White"],
    rating: 4.5,
    reviews: 1240,
    releaseYear: 2024,
    views: 47300,
    tags: ["Camera", "Flagship", "Fast charging"],
  },
  {
    id: "vivo-x100-pro",
    name: "Vivo X100 Pro",
    brand: "Vivo",
    price: 89999,
    mrp: 99999,
    summary:
      "Zeiss optics and the best portrait rendering on Android. The Dimensity 9300 keeps up with anything Qualcomm ships.",
    soc: "MediaTek Dimensity 9300",
    ram: 16,
    storage: 512,
    storageType: "UFS 4.0",
    display: { size: 6.78, resolution: "1260 x 2800", refreshRate: 120, panel: "LTPO AMOLED", brightness: 3000 },
    battery: 5400,
    charging: 100,
    wirelessCharging: 50,
    camera: {
      main: { mp: 50, aperture: 1.75, ois: true, label: "Zeiss Wide" },
      ultrawide: { mp: 50, aperture: 2.0, ois: false, label: "Ultrawide" },
      telephoto: { mp: 50, aperture: 2.5, ois: true, label: "4.3x APO Periscope" },
      opticalZoom: 4.3,
      front: { mp: 32, aperture: 2.0, ois: false, label: "Selfie" },
      maxVideo: "8K 30fps",
    },
    weight: 225,
    thickness: 8.9,
    build: "Aluminium frame, vegan leather back",
    waterResistance: "IP68",
    osVersion: "Android 14, Funtouch OS 14",
    osUpdates: 3,
    colors: ["Sunset Gold", "Phantom Black"],
    rating: 4.5,
    reviews: 980,
    releaseYear: 2024,
    views: 39200,
    tags: ["Camera", "Flagship", "Portrait"],
  },
  {
    id: "nothing-phone-3a-pro",
    name: "Nothing Phone (3a) Pro",
    brand: "Nothing",
    price: 29999,
    mrp: 32999,
    summary:
      "A periscope telephoto under ₹30K, which nothing else offers. The camera island is divisive; the zoom is not.",
    soc: "Qualcomm Snapdragon 7s Gen 2",
    ram: 8,
    storage: 256,
    storageType: "UFS 3.1",
    display: { size: 6.77, resolution: "1080 x 2392", refreshRate: 120, panel: "AMOLED", brightness: 3000 },
    battery: 5000,
    charging: 50,
    camera: {
      main: { mp: 50, aperture: 1.88, ois: true, label: "Wide" },
      ultrawide: { mp: 8, aperture: 2.2, ois: false, label: "Ultrawide" },
      telephoto: { mp: 50, aperture: 2.55, ois: true, label: "3x Periscope" },
      opticalZoom: 3,
      front: { mp: 50, aperture: 2.2, ois: false, label: "Selfie" },
      maxVideo: "4K 30fps",
    },
    weight: 211,
    thickness: 8.4,
    build: "Polycarbonate frame, glass back",
    waterResistance: "IP64",
    osVersion: "Android 15, Nothing OS 3.1",
    osUpdates: 3,
    colors: ["Graphite", "White"],
    rating: 4.3,
    reviews: 860,
    releaseYear: 2025,
    views: 28400,
    tags: ["Design", "Zoom", "Mid-range"],
  },
  {
    id: "iqoo-13",
    name: "iQOO 13",
    brand: "iQOO",
    price: 59999,
    mrp: 64999,
    summary:
      "The fastest chip here paired with a 144Hz panel and a dedicated gaming coprocessor. Built for one job and good at it.",
    soc: "Qualcomm Snapdragon 8 Elite",
    ram: 12,
    storage: 256,
    storageType: "UFS 4.0",
    display: { size: 6.82, resolution: "1440 x 3168", refreshRate: 144, panel: "LTPO AMOLED", brightness: 3000 },
    battery: 6000,
    charging: 120,
    camera: {
      main: { mp: 50, aperture: 1.88, ois: true, label: "Wide" },
      ultrawide: { mp: 50, aperture: 2.0, ois: false, label: "Ultrawide" },
      telephoto: { mp: 50, aperture: 1.85, ois: true, label: "2x Telephoto" },
      opticalZoom: 2,
      front: { mp: 32, aperture: 2.45, ois: false, label: "Selfie" },
      maxVideo: "4K 60fps",
    },
    weight: 213,
    thickness: 8.1,
    build: "Aluminium frame, glass back",
    waterResistance: "IP68",
    osVersion: "Android 15, Funtouch OS 15",
    osUpdates: 4,
    colors: ["Nebula Purple", "Phantom Black"],
    rating: 4.5,
    reviews: 1420,
    releaseYear: 2025,
    views: 44100,
    tags: ["Gaming", "Flagship", "Fast charging", "Performance"],
  },
];

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

function buildPhone(seed: PhoneSeed): Phone {
  const soc = SOC_SCORES[seed.soc];

  const camera: PhoneCameraSystem = {
    main: seed.camera.main,
    ultrawide: seed.camera.ultrawide,
    telephoto: seed.camera.telephoto,
    opticalZoom: seed.camera.opticalZoom ?? 1,
    front: seed.camera.front,
    maxVideo: seed.camera.maxVideo,
  };

  const specs: PhoneSpecs = {
    chipset: seed.soc,
    process: soc.process,
    cores: soc.cores,
    gpu: soc.gpuName,
    ram: seed.ram,
    storage: seed.storage,
    storageType: seed.storageType ?? "UFS 3.1",
    display: {
      size: seed.display.size,
      resolution: seed.display.resolution,
      refreshRate: seed.display.refreshRate,
      panel: seed.display.panel,
      brightness: seed.display.brightness,
      protection: seed.display.protection ?? "Corning Gorilla Glass 5",
    },
    battery: seed.battery,
    charging: seed.charging,
    wirelessCharging: seed.wirelessCharging ?? 0,
    camera,
    weight: seed.weight,
    thickness: seed.thickness,
    build: seed.build,
    waterResistance: seed.waterResistance ?? "IP54",
    os: seed.os ?? "Android",
    osVersion: seed.osVersion,
    osUpdates: seed.osUpdates,
    sim: "Dual SIM (nano + eSIM)",
    fiveG: true,
    headphoneJack: seed.headphoneJack ?? false,
    expandableStorage: seed.expandableStorage ?? false,
    colors: seed.colors,
    warranty: seed.warranty ?? "1 Year Manufacturer Warranty",
  };

  const performance = buildPhonePerformance({
    soc: soc.score,
    gpu: soc.gpu,
    process: soc.process,
    ram: seed.ram,
    storageType: specs.storageType,
    display: specs.display,
    battery: seed.battery,
    charging: seed.charging,
    camera,
    os: specs.os,
  });

  const thermals = clamp(100 - (soc.process - 3) * 17, 20, 100);
  const images = [1, 2, 3].map((n) => `/phone-images/${seed.id}-${n}.svg`);

  return {
    id: seed.id,
    category: "phone",
    name: seed.name,
    brand: seed.brand,
    price: seed.price,
    mrp: seed.mrp,
    summary: seed.summary,
    model3d: derivePhoneModel(specs),
    specs,
    performance,
    games: buildMobileBenchmarks(soc.gpu, thermals),
    image: images[0],
    images,
    rating: seed.rating,
    reviews: seed.reviews,
    reviewList: buildReviews(seed.id, seed.releaseYear, "phone"),
    bestseller: seed.bestseller ?? false,
    releaseYear: seed.releaseYear,
    views: seed.views,
    tags: seed.tags,
    affiliateUrl: `https://example.com/buy/${seed.id}`,
    inStock: true,
  };
}

export const phones: Phone[] = seeds.map(buildPhone);

export const phonesById = new Map(phones.map((phone) => [phone.id, phone]));

export function getPhoneById(id: string) {
  return phonesById.get(id);
}

/* -------------------------------------------------------------------------- */
/* Facets, filtering, sorting, search                                         */
/* -------------------------------------------------------------------------- */

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const phoneFacets = {
  brands: unique(phones.map((p) => p.brand)).sort() as PhoneBrand[],
  chipsets: unique(phones.map((p) => p.specs.chipset)).sort(),
  ram: unique(phones.map((p) => p.specs.ram)).sort((a, b) => a - b),
  storage: unique(phones.map((p) => p.specs.storage)).sort((a, b) => a - b),
  displaySizes: unique(phones.map((p) => p.specs.display.size)).sort((a, b) => a - b),
  refreshRates: unique(phones.map((p) => p.specs.display.refreshRate)).sort((a, b) => a - b),
  os: unique(phones.map((p) => p.specs.os)) as MobileOS[],
  minPrice: Math.min(...phones.map((p) => p.price)),
  maxPrice: Math.max(...phones.map((p) => p.price)),
};

export const defaultPhoneFilters: PhoneFilters = {
  brands: [],
  chipsets: [],
  ram: [],
  storage: [],
  displaySizes: [],
  refreshRates: [],
  os: [],
  fiveG: null,
  minPrice: phoneFacets.minPrice,
  maxPrice: phoneFacets.maxPrice,
  query: "",
};

/**
 * Only titles the phone genuinely holds at 60fps are indexed, for the same
 * reason the laptop haystack filters its games: every phone carries an entry
 * for all eight, so indexing them all would make "Genshin" match everything.
 */
function searchHaystack(phone: Phone) {
  return [
    phone.name,
    phone.brand,
    phone.specs.chipset,
    phone.specs.gpu,
    phone.specs.os,
    phone.summary,
    ...phone.tags,
    ...phone.specs.colors,
    ...phone.games.filter((game) => game.fps >= 58).map((game) => game.name),
  ]
    .join(" ")
    .toLowerCase();
}

const haystacks = new Map(phones.map((p) => [p.id, searchHaystack(p)]));

export function searchPhones(query: string, pool: Phone[] = phones) {
  const needle = query.trim().toLowerCase();
  if (!needle) return pool;
  const terms = needle.split(/\s+/);
  return pool.filter((phone) => {
    const haystack = haystacks.get(phone.id) ?? "";
    return terms.every((term) => haystack.includes(term));
  });
}

export function filterPhones(filters: PhoneFilters, pool: Phone[] = phones) {
  const matched = pool.filter((phone) => {
    if (filters.brands.length && !filters.brands.includes(phone.brand)) return false;
    if (filters.chipsets.length && !filters.chipsets.includes(phone.specs.chipset)) return false;
    if (filters.ram.length && !filters.ram.includes(phone.specs.ram)) return false;
    if (filters.storage.length && !filters.storage.includes(phone.specs.storage)) return false;
    if (filters.displaySizes.length && !filters.displaySizes.includes(phone.specs.display.size)) {
      return false;
    }
    if (
      filters.refreshRates.length &&
      !filters.refreshRates.includes(phone.specs.display.refreshRate)
    ) {
      return false;
    }
    if (filters.os.length && !filters.os.includes(phone.specs.os)) return false;
    if (filters.fiveG !== null && phone.specs.fiveG !== filters.fiveG) return false;
    if (phone.price < filters.minPrice || phone.price > filters.maxPrice) return false;
    return true;
  });

  return searchPhones(filters.query, matched);
}

export function sortPhones(pool: Phone[], sort: ProductSortOption) {
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
      return sorted.sort((a, b) => b.releaseYear - a.releaseYear || b.views - a.views);
  }
}

export const featuredPhones = phones
  .filter((phone) => phone.bestseller)
  .sort((a, b) => b.performance.overall - a.performance.overall)
  .slice(0, 4);

export function relatedPhones(phone: Phone, count = 4, pool: Phone[] = phones) {
  return pool
    .filter((candidate) => candidate.id !== phone.id)
    .map((candidate) => ({
      candidate,
      // Closest on price first, then on overall capability.
      distance:
        Math.abs(candidate.price - phone.price) / 1000 +
        Math.abs(candidate.performance.overall - phone.performance.overall),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.candidate);
}
