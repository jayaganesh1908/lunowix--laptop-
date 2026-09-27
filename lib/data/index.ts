import { type Game, type ProductCategory, type Review, type Software } from "@/lib/types";

/**
 * `demand` is the GPU score (0-100, see `GPU_SCORES` in `laptops.ts`) needed to
 * hold roughly 60fps at the High preset in 1080p. The benchmark model scales
 * frame rates around that anchor.
 */
export const games: Game[] = [
  {
    id: "valorant",
    name: "Valorant",
    genre: "Tactical Shooter",
    releaseYear: 2020,
    icon: "🎯",
    demand: 11,
    cpuBound: true,
  },
  {
    id: "cs2",
    name: "Counter-Strike 2",
    genre: "Tactical Shooter",
    releaseYear: 2023,
    icon: "🔫",
    demand: 16,
    cpuBound: true,
  },
  {
    id: "minecraft",
    name: "Minecraft",
    genre: "Sandbox",
    releaseYear: 2011,
    icon: "⛏️",
    demand: 10,
    cpuBound: true,
  },
  {
    id: "fortnite",
    name: "Fortnite",
    genre: "Battle Royale",
    releaseYear: 2017,
    icon: "🏗️",
    demand: 27,
    cpuBound: false,
  },
  {
    id: "apex-legends",
    name: "Apex Legends",
    genre: "Battle Royale",
    releaseYear: 2019,
    icon: "🛰️",
    demand: 31,
    cpuBound: false,
  },
  {
    id: "gta-v",
    name: "GTA V",
    genre: "Open World",
    releaseYear: 2015,
    icon: "🚗",
    demand: 24,
    cpuBound: false,
  },
  {
    id: "ea-fc-25",
    name: "EA Sports FC 25",
    genre: "Sports",
    releaseYear: 2024,
    icon: "⚽",
    demand: 29,
    cpuBound: false,
  },
  {
    id: "forza-horizon-5",
    name: "Forza Horizon 5",
    genre: "Racing",
    releaseYear: 2021,
    icon: "🏁",
    demand: 44,
    cpuBound: false,
  },
  {
    id: "call-of-duty",
    name: "Call of Duty: Warzone",
    genre: "Battle Royale",
    releaseYear: 2023,
    icon: "🎖️",
    demand: 52,
    cpuBound: false,
  },
  {
    id: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    genre: "Action RPG",
    releaseYear: 2020,
    icon: "🌆",
    demand: 70,
    cpuBound: false,
  },
];

export const gamesById = new Map(games.map((game) => [game.id, game]));

export function getGame(id: string) {
  return gamesById.get(id);
}

/**
 * `requirement` holds the CPU score, GPU score and RAM (GB) at which the app is
 * expected to merely "Run Fine". The compatibility model in `laptops.ts`
 * compares a machine's headroom against these anchors.
 */
export const softwareCatalog: Software[] = [
  {
    id: "vs-code",
    name: "Visual Studio Code",
    category: "Development",
    vendor: "Microsoft",
    icon: "🧩",
    requirement: { cpu: 18, gpu: 0, ram: 4 },
  },
  {
    id: "android-studio",
    name: "Android Studio",
    category: "Development",
    vendor: "Google",
    icon: "🤖",
    requirement: { cpu: 46, gpu: 10, ram: 12 },
  },
  {
    id: "intellij-idea",
    name: "IntelliJ IDEA",
    category: "Development",
    vendor: "JetBrains",
    icon: "💡",
    requirement: { cpu: 40, gpu: 6, ram: 8 },
  },
  {
    id: "pycharm",
    name: "PyCharm",
    category: "Development",
    vendor: "JetBrains",
    icon: "🐍",
    requirement: { cpu: 36, gpu: 6, ram: 8 },
  },
  {
    id: "photoshop",
    name: "Adobe Photoshop",
    category: "Design",
    vendor: "Adobe",
    icon: "🖼️",
    requirement: { cpu: 45, gpu: 28, ram: 12 },
  },
  {
    id: "illustrator",
    name: "Adobe Illustrator",
    category: "Design",
    vendor: "Adobe",
    icon: "✒️",
    requirement: { cpu: 42, gpu: 22, ram: 8 },
  },
  {
    id: "premiere-pro",
    name: "Adobe Premiere Pro",
    category: "Video",
    vendor: "Adobe",
    icon: "🎬",
    requirement: { cpu: 60, gpu: 48, ram: 16 },
  },
  {
    id: "davinci-resolve",
    name: "DaVinci Resolve",
    category: "Video",
    vendor: "Blackmagic",
    icon: "🎞️",
    requirement: { cpu: 58, gpu: 54, ram: 16 },
  },
  {
    id: "blender",
    name: "Blender",
    category: "3D & CAD",
    vendor: "Blender Foundation",
    icon: "🌀",
    requirement: { cpu: 62, gpu: 58, ram: 16 },
  },
  {
    id: "autocad",
    name: "AutoCAD",
    category: "3D & CAD",
    vendor: "Autodesk",
    icon: "📐",
    requirement: { cpu: 50, gpu: 34, ram: 12 },
  },
  {
    id: "matlab",
    name: "MATLAB",
    category: "Engineering",
    vendor: "MathWorks",
    icon: "📊",
    requirement: { cpu: 48, gpu: 14, ram: 8 },
  },
];

export const softwareById = new Map(softwareCatalog.map((item) => [item.id, item]));

export const softwareByName = new Map(
  softwareCatalog.map((item) => [item.name, item]),
);

export const softwareCategories = Array.from(
  new Set(softwareCatalog.map((item) => item.category)),
);

/**
 * Demo review generation, shared by all three catalogues.
 *
 * Bodies are keyed by category because a review that mentions compile times
 * under a laptop reads as nonsense under a pair of headphones. The output is
 * deterministic — see `hash` — so server and client render the same text and
 * React does not complain about a hydration mismatch.
 */

const AUTHORS = [
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

interface ReviewBody {
  title: string;
  comment: string;
  rating: number;
}

const LAPTOP_BODIES: ReviewBody[] = [
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

const PHONE_BODIES: ReviewBody[] = [
  {
    title: "Comfortably lasts a full day",
    comment:
      "Off the charger at seven, still around thirty percent by midnight with a couple of hours of screen time and navigation on the commute. Charging speed is the real luxury.",
    rating: 5,
  },
  {
    title: "The camera is the reason to buy it",
    comment:
      "Main sensor is excellent in daylight and holds up surprisingly well indoors. The ultrawide is clearly a step down once the light drops, which is normal at this price.",
    rating: 4,
  },
  {
    title: "Fast, but it does get warm",
    comment:
      "Nothing stutters, and heavy titles hold their frame rate for the first half hour. After that it throttles and the back gets noticeably warm near the camera island.",
    rating: 4,
  },
  {
    title: "Software makes the difference",
    comment:
      "Clean, no duplicate apps, and updates have actually arrived on schedule. That matters more to me two years in than any benchmark number.",
    rating: 5,
  },
  {
    title: "Good phone, awkward size",
    comment:
      "Performance and screen are both excellent. It is genuinely hard to use one-handed though, and it is heavy enough to notice in a shirt pocket.",
    rating: 4,
  },
  {
    title: "Sensible upgrade from my old one",
    comment:
      "Everything is quicker and the panel is far brighter outdoors. Wish it had kept the headphone jack, but the battery life more than makes up for it.",
    rating: 4,
  },
];

const HEADPHONE_BODIES: ReviewBody[] = [
  {
    title: "The noise cancelling is the real deal",
    comment:
      "Engine drone on a flight essentially disappears, and office chatter drops to a murmur. Transparency mode is natural enough that I leave it on for conversations.",
    rating: 5,
  },
  {
    title: "Comfortable for a full working day",
    comment:
      "Clamp is light enough that I forget they are on after an hour. The pads do warm up in summer, which is unavoidable with over-ears.",
    rating: 4,
  },
  {
    title: "Excellent sound, app is fiddly",
    comment:
      "Detail and separation are well beyond what I expected at this price, especially over LDAC. The companion app takes some patience to get the EQ where you want it.",
    rating: 4,
  },
  {
    title: "Battery outlasts my week",
    comment:
      "A single charge covers five days of commuting with ANC on. The quick-charge top-up before heading out has saved me more than once.",
    rating: 5,
  },
  {
    title: "Great music, average calls",
    comment:
      "For listening these are hard to fault. On calls the mic picks up more wind and background than I would like, so I switch to the phone outdoors.",
    rating: 4,
  },
  {
    title: "Worth it for the isolation alone",
    comment:
      "Fit is secure enough for the gym and they have not fallen out once. Multipoint between laptop and phone works reliably, which was the deciding factor for me.",
    rating: 4,
  },
];

const BODIES: Record<ProductCategory, ReviewBody[]> = {
  laptop: LAPTOP_BODIES,
  phone: PHONE_BODIES,
  headphone: HEADPHONE_BODIES,
};

/** Deterministic hash so the demo data is stable between server and client. */
export function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function buildReviews(
  id: string,
  releaseYear: number,
  category: ProductCategory = "laptop",
): Review[] {
  const bodies = BODIES[category];
  const seed = hash(id);

  return Array.from({ length: 3 }, (_, index) => {
    const body = bodies[(seed + index * 5) % bodies.length];
    const author = AUTHORS[(seed + index * 7) % AUTHORS.length];
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

/*
 * `UserRole`, `DemoUser`, `demoUsers` and `totalUsers` used to be declared
 * here as well, byte-identical to the copies in `lib/data/users.ts`. The admin
 * dashboard reads that file, so this copy was the unread one — and a second
 * `UserRole` reachable as `@/lib/data` also collided in meaning with the
 * `UserRole` in `@/lib/types`, which spells its members in lower case
 * ("admin") rather than title case ("Admin").
 *
 * They live in `./users` now, once. Import from there.
 */
export type { DemoUser, UserRole } from "./users";
export { demoUsers, totalUsers } from "./users";
