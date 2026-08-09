import { type AncTier, type AudioCodec, type ConnectionType, type Headphone, type HeadphoneFilters, type HeadphoneForm, type HeadphonePerformanceScores, type HeadphoneSpecs, type UseCaseRating, type HeadphoneBrand, type Model3DParams, type ProductSortOption } from "@/lib/types";
import { buildReviews } from "./index";

/* -------------------------------------------------------------------------- */
/* Scoring tables                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The wireless fidelity ceiling. A set is scored on the best codec it supports,
 * because that is what it will negotiate with a phone that also supports it.
 */
const CODEC_SCORES: Record<AudioCodec, number> = {
  SBC: 20,
  AAC: 36,
  aptX: 52,
  "aptX HD": 68,
  "aptX Adaptive": 78,
  LHDC: 88,
  LDAC: 92,
};

const ANC_SCORES: Record<AncTier, number> = {
  None: 0,
  Passive: 18,
  "Basic ANC": 45,
  "Adaptive ANC": 74,
  "Industry-leading ANC": 96,
};

/**
 * Driver size only means something within a form factor — a 12mm in-ear driver
 * is large, a 12mm over-ear driver would be absurd — so each form gets its own
 * anchor and span.
 */
const DRIVER_ANCHOR: Record<HeadphoneForm, { anchor: number; span: number }> = {
  "Over-ear": { anchor: 40, span: 12 },
  "On-ear": { anchor: 36, span: 10 },
  "In-ear": { anchor: 10, span: 4 },
  "Open-ear": { anchor: 16, span: 6 },
};

/** Base comfort by form, before weight and clamp are taken off. */
const FORM_COMFORT: Record<HeadphoneForm, number> = {
  "Over-ear": 82,
  "On-ear": 62,
  "In-ear": 76,
  "Open-ear": 90,
};

const COLOR_HEX: Record<string, string> = {
  Black: "#17181B",
  "Midnight Black": "#141518",
  Graphite: "#3A3B3F",
  Silver: "#CFD3D8",
  White: "#EFEFF1",
  Cream: "#E8E0D2",
  Sand: "#D8C9B0",
  Blue: "#2E5F8A",
  "Midnight Blue": "#1E3A5F",
  Navy: "#22304A",
  Green: "#2C4A3A",
  Red: "#C0392B",
  Beige: "#DCD3C3",
  Smoke: "#5A5D63",
};

const clamp = (value: number, min = 1, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))));
const round10 = (value: number) => Math.round(value * 10) / 10;

/* -------------------------------------------------------------------------- */
/* Derived scores                                                             */
/* -------------------------------------------------------------------------- */

function driverScore(driver: HeadphoneSpecs["driver"], form: HeadphoneForm): number {
  const { anchor, span } = DRIVER_ANCHOR[form];
  // A deliberately shallow slope. Driver diameter is only weakly predictive
  // within a form factor — Sony's 30mm WH-1000XM5 driver is a design choice,
  // not a deficiency — so size nudges the score rather than dominating it.
  const size = clamp(55 + ((driver.size - anchor) / span) * 25, 35, 90);

  // Planar and balanced-armature designs resolve detail a dynamic driver of the
  // same size does not; exotic diaphragm materials help a little.
  const technology = /planar/i.test(driver.type)
    ? 16
    : /balanced armature|hybrid/i.test(driver.type)
      ? 10
      : /beryllium|ceramic|carbon fibre|carbon fiber/i.test(driver.type)
        ? 6
        : 0;
  return clamp(size + technology);
}

/** Octave span of the quoted frequency response, e.g. "4Hz - 40kHz". */
function frequencyWidth(response: string): number {
  const parts = response.match(/([\d.]+)\s*(k?)Hz/gi);
  if (!parts || parts.length < 2) return 40;

  const toHz = (part: string) => {
    const value = Number(part.match(/[\d.]+/)?.[0] ?? 0);
    return /k/i.test(part) ? value * 1000 : value;
  };

  const low = toHz(parts[0]);
  const high = toHz(parts[1]);
  if (low <= 0 || high <= low) return 40;

  // 20Hz-20kHz is ~10 octaves and unremarkable; 4Hz-40kHz is ~13.3 and is the
  // kind of range only a serious transducer quotes.
  return clamp(((Math.log2(high / low) - 9.5) / 4) * 100, 0, 100);
}

/**
 * Acoustic design, from facts a datasheet actually commits to.
 *
 * This deliberately replaces an earlier proxy that scored EQ apps and spatial
 * processing as though they were fidelity. They are features, not sound — and
 * treating them as sound ranked a ₹45,000 reference open-back below ₹8,000
 * buds. Open-back construction, an impedance that demands an amplifier, and a
 * genuinely wide response are the verifiable signals of a set built to be
 * listened to rather than to be impressive in a shop.
 */
function acousticScore(specs: HeadphoneSpecs): number {
  const openBack = /open.?back/i.test(specs.driver.type) ? 22 : 0;
  const impedance =
    specs.driver.impedance >= 250 ? 18 : specs.driver.impedance >= 100 ? 10 : 0;
  const range = frequencyWidth(specs.driver.frequencyResponse) * 0.25;
  return clamp(45 + openBack + impedance + range);
}

function bestCodec(codecs: AudioCodec[]): number {
  return Math.max(...codecs.map((codec) => CODEC_SCORES[codec]));
}

/**
 * Wired sets are not penalised for codecs they cannot use — a cable has no
 * codec ceiling — so they are scored at the top of the range instead.
 */
function codecCeiling(specs: HeadphoneSpecs): number {
  if (specs.connection === "Wired") return 100;
  const wireless = bestCodec(specs.codecs);
  return specs.connection === "Hybrid" ? clamp(wireless + 8) : wireless;
}

function soundScore(specs: HeadphoneSpecs): number {
  return clamp(
    0.45 * driverScore(specs.driver, specs.form) +
      0.25 * codecCeiling(specs) +
      0.3 * acousticScore(specs),
  );
}

/**
 * ANC depth is set by the algorithm generation, but it is delivered by the
 * feedforward/feedback mic array — a good algorithm with two mics per side
 * cannot match the same algorithm with four.
 */
function ancScore(specs: HeadphoneSpecs): number {
  const tier = ANC_SCORES[specs.anc];
  if (tier === 0) return round(clamp(specs.form === "In-ear" ? 22 : 14, 1, 100));
  const array = clamp(35 + specs.micCount * 11);
  return clamp(0.5 * tier + 0.5 * array);
}

/**
 * Total time away from a wall socket. In-ears are scored on buds plus case,
 * because the case is genuinely part of the product; over-ears have no case
 * reserve and are scored on the single figure they actually deliver.
 */
function batteryScore(specs: HeadphoneSpecs): number {
  if (specs.connection === "Wired") return 0;

  // A compressive curve rather than a line: the step from 10 to 20 hours changes
  // how you live with a set, the step from 60 to 70 does not. A linear scale put
  // a perfectly serviceable 20-hour over-ear at 4/100.
  const total = specs.batteryHours + specs.caseHours;
  const base =
    specs.form === "In-ear"
      ? clamp(Math.pow(total / 45, 0.62) * 100)
      : clamp(Math.pow(specs.batteryHours / 70, 0.62) * 100);

  const quick = /\d/.test(specs.quickCharge) ? 6 : 0;
  return clamp(base + quick);
}

/**
 * The hour-three question. Clamp force is the strongest predictor: too little
 * and the set slides, too much and it aches, with the sweet spot near 4.5N.
 */
function comfortScore(specs: HeadphoneSpecs): number {
  const base = FORM_COMFORT[specs.form];

  const weightPenalty =
    specs.form === "In-ear"
      ? Math.max(0, specs.weight - 5.5) * 6
      : Math.max(0, specs.weight - 250) * 0.16;

  const clampPenalty = Math.abs(specs.clampForce - 4.5) * 7;

  return clamp(base - weightPenalty - clampPenalty);
}

function micScore(specs: HeadphoneSpecs): number {
  const array = clamp(30 + specs.micCount * 12);
  const processing = specs.envNoiseCancelling ? 88 : 46;
  return clamp(0.6 * array + 0.4 * processing);
}

function buildHeadphonePerformance(specs: HeadphoneSpecs): HeadphonePerformanceScores {
  const sound = soundScore(specs);
  const noiseCancelling = ancScore(specs);
  const battery = batteryScore(specs);
  const comfort = comfortScore(specs);
  const mic = micScore(specs);

  // A wired set has no battery and usually no microphone. Scoring it as though
  // it failed at both would rank a reference open-back below a ₹1,300 bud,
  // which is nonsense — so those weights are redistributed onto the axes that
  // do apply rather than counted as zeros.
  const overall =
    specs.connection === "Wired"
      ? clamp(0.55 * sound + 0.1 * noiseCancelling + 0.35 * comfort)
      : clamp(0.32 * sound + 0.24 * noiseCancelling + 0.16 * battery + 0.18 * comfort + 0.1 * mic);

  return {
    sound: round(sound),
    noiseCancelling: round(noiseCancelling),
    battery: round(battery),
    comfort: round(comfort),
    mic: round(mic),
    overall: round(overall),
  };
}

/* -------------------------------------------------------------------------- */
/* Use cases                                                                  */
/* -------------------------------------------------------------------------- */

function verdictFor(score: number): UseCaseRating["verdict"] {
  if (score >= 80) return "Excellent";
  if (score >= 62) return "Good";
  if (score >= 44) return "Adequate";
  return "Poor";
}

/**
 * Scenario ratings are re-weightings of the same five axes, not new data — a
 * gym set is mostly fit and sweat rating, a flight is mostly ANC and battery.
 */
function buildUseCases(
  specs: HeadphoneSpecs,
  scores: HeadphonePerformanceScores,
): UseCaseRating[] {
  const sweatproof = /IPX?[4-9]/i.test(specs.waterResistance);
  const portable = specs.form === "In-ear" || specs.foldable;

  const raw: { id: string; name: string; icon: string; score: number }[] = [
    {
      id: "commute",
      name: "Daily commute",
      icon: "🚌",
      score: 0.45 * scores.noiseCancelling + 0.25 * scores.comfort + 0.3 * (portable ? 90 : 50),
    },
    {
      id: "flights",
      name: "Long flights",
      icon: "✈️",
      score: 0.45 * scores.noiseCancelling + 0.3 * scores.comfort + 0.25 * scores.battery,
    },
    {
      id: "calls",
      name: "Work calls",
      icon: "💼",
      score: 0.5 * scores.mic + 0.3 * scores.noiseCancelling + 0.2 * (specs.multipoint ? 95 : 40),
    },
    {
      id: "gym",
      name: "Gym & running",
      icon: "🏃",
      score:
        0.4 * (sweatproof ? 92 : 25) +
        0.35 * (specs.form === "In-ear" ? 92 : specs.form === "Open-ear" ? 84 : 34) +
        0.25 * scores.comfort,
    },
    {
      id: "critical",
      name: "Critical listening",
      icon: "🎼",
      // An in-ear seal colours the low end in a way a critical listener notices,
      // so the form factor itself carries a small penalty here.
      score: 0.65 * scores.sound + 0.2 * scores.comfort + 0.15 * (specs.form === "In-ear" ? 60 : 85),
    },
    {
      id: "gaming",
      name: "Gaming",
      icon: "🎮",
      score:
        0.35 * scores.sound +
        0.3 * (specs.connection === "Wired" ? 96 : specs.codecs.includes("aptX Adaptive") ? 76 : 48) +
        0.35 * scores.mic,
    },
  ];

  return raw.map((entry) => {
    const score = round(clamp(entry.score));
    return { ...entry, score, verdict: verdictFor(score) };
  });
}

/* -------------------------------------------------------------------------- */
/* Parametric 3D                                                              */
/* -------------------------------------------------------------------------- */

export function deriveHeadphoneModel(specs: HeadphoneSpecs): Model3DParams {
  // Physical size of the object in cm: an over-ear headband spans roughly 19cm,
  // a bud case about 6cm. Driver size scales it within the form.
  const span =
    specs.form === "In-ear"
      ? round10(5.5 + specs.driver.size * 0.08)
      : round10(17 + (specs.driver.size - 36) * 0.18);

  // Cup depth stands in for heft. Heavier sets read as chunkier in the viewer,
  // which is exactly what the weight spec is telling you.
  const bulk =
    specs.form === "In-ear"
      ? clamp01((specs.weight - 4) / 3.5)
      : clamp01((specs.weight - 190) / 130);

  const bodyColor = COLOR_HEX[specs.colors[0]] ?? "#25272B";
  // Metal-framed sets catch a highlight along the headband and stem; plastic
  // ones do not, so the accent stays close to the body.
  const accentColor = /aluminium|aluminum|steel|metal/i.test(specs.driver.type)
    ? "#B8BCC2"
    : specs.anc === "Industry-leading ANC" || specs.anc === "Adaptive ANC"
      ? "#FF6B00"
      : bodyColor;

  return { archetype: "headphone", span, bulk, screenGlow: 0, bodyColor, accentColor };
}

/* -------------------------------------------------------------------------- */
/* Seeds                                                                      */
/* -------------------------------------------------------------------------- */

interface HeadphoneSeed {
  id: string;
  name: string;
  brand: HeadphoneBrand;
  price: number;
  mrp: number;
  summary: string;
  form: HeadphoneForm;
  connection?: ConnectionType;
  driver: { size: number; type: string; frequencyResponse?: string; impedance?: number };
  codecs: AudioCodec[];
  anc: AncTier;
  transparencyMode?: boolean;
  batteryHours: number;
  caseHours?: number;
  quickCharge?: string;
  wirelessCharging?: boolean;
  micCount: number;
  envNoiseCancelling?: boolean;
  bluetooth?: string;
  multipoint?: boolean;
  weight: number;
  clampForce: number;
  foldable?: boolean;
  waterResistance?: string;
  spatialAudio?: boolean;
  headTracking?: boolean;
  eqApp?: boolean;
  colors: string[];
  rating: number;
  reviews: number;
  bestseller?: boolean;
  releaseYear: number;
  views: number;
  tags: string[];
  warranty?: string;
}

const seeds: HeadphoneSeed[] = [
  /* ------------------------------- Budget ------------------------------ */
  {
    id: "boat-airdopes-141",
    name: "boAt Airdopes 141",
    brand: "boAt",
    price: 1299,
    mrp: 4490,
    summary:
      "The default first pair of wireless buds in India. Loud, cheerful and disposable — expect no isolation whatsoever.",
    form: "In-ear",
    driver: { size: 8, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC"],
    anc: "None",
    batteryHours: 6,
    caseHours: 36,
    quickCharge: "5 min for 90 min",
    micCount: 1,
    weight: 4.1,
    clampForce: 3.2,
    waterResistance: "IPX4",
    colors: ["Black", "White"],
    rating: 3.9,
    reviews: 8420,
    bestseller: true,
    releaseYear: 2023,
    views: 31200,
    tags: ["Budget", "TWS", "Everyday"],
  },
  {
    id: "oneplus-bullets-wireless-z2",
    name: "OnePlus Bullets Wireless Z2",
    brand: "OnePlus",
    price: 1799,
    mrp: 2299,
    summary:
      "A neckband, which is unfashionable and extremely practical. Thirty hours a charge and it never falls out on a bike.",
    form: "In-ear",
    driver: { size: 12.4, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC"],
    anc: "Passive",
    batteryHours: 30,
    caseHours: 0,
    quickCharge: "10 min for 20 hours",
    micCount: 1,
    bluetooth: "Bluetooth 5.0",
    weight: 5.0,
    clampForce: 3.8,
    waterResistance: "IP55",
    colors: ["Black", "Blue"],
    rating: 4.2,
    reviews: 5640,
    releaseYear: 2023,
    views: 18900,
    tags: ["Budget", "Neckband", "Long battery"],
  },
  {
    id: "realme-buds-air-6",
    name: "Realme Buds Air 6",
    brand: "Realme",
    price: 2699,
    mrp: 3999,
    summary:
      "Real ANC under ₹3,000, which was not true two years ago. It will not silence a plane, but it takes the edge off a bus.",
    form: "In-ear",
    driver: { size: 11, type: "Dynamic", frequencyResponse: "20Hz - 40kHz", impedance: 32 },
    codecs: ["SBC", "AAC"],
    anc: "Basic ANC",
    transparencyMode: true,
    batteryHours: 8,
    caseHours: 32,
    quickCharge: "10 min for 7 hours",
    micCount: 2,
    envNoiseCancelling: true,
    weight: 4.2,
    clampForce: 3.5,
    waterResistance: "IP55",
    eqApp: true,
    colors: ["White", "Green"],
    rating: 4.1,
    reviews: 3210,
    releaseYear: 2024,
    views: 16400,
    tags: ["Budget", "ANC", "TWS"],
  },
  {
    id: "boat-rockerz-550",
    name: "boAt Rockerz 550",
    brand: "boAt",
    price: 1799,
    mrp: 4990,
    summary:
      "Big 50mm drivers and twenty hours of playback for less than two thousand rupees. Bass-forward and proud of it.",
    form: "Over-ear",
    driver: { size: 50, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC"],
    anc: "Passive",
    batteryHours: 20,
    micCount: 1,
    weight: 245,
    clampForce: 5.2,
    foldable: true,
    colors: ["Black", "Blue"],
    rating: 4.0,
    reviews: 6180,
    releaseYear: 2023,
    views: 21300,
    tags: ["Budget", "Over-ear", "Bass"],
  },
  /* ------------------------------ Mid-range ---------------------------- */
  {
    id: "nothing-ear-a",
    name: "Nothing Ear (a)",
    brand: "Nothing",
    price: 7999,
    mrp: 8999,
    summary:
      "LDAC and genuinely good ANC at half the flagship price, in the most recognisable case on the shelf.",
    form: "In-ear",
    driver: { size: 11, type: "Dynamic (PMI diaphragm)", frequencyResponse: "20Hz - 40kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "LDAC"],
    anc: "Adaptive ANC",
    transparencyMode: true,
    batteryHours: 9.5,
    caseHours: 33,
    quickCharge: "10 min for 10 hours",
    micCount: 3,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 4.8,
    clampForce: 3.9,
    waterResistance: "IP54",
    eqApp: true,
    colors: ["Black", "White"],
    rating: 4.4,
    reviews: 2840,
    bestseller: true,
    releaseYear: 2024,
    views: 34600,
    tags: ["ANC", "LDAC", "Design", "TWS"],
  },
  {
    id: "soundcore-space-one",
    name: "Soundcore Space One",
    brand: "Soundcore",
    price: 8999,
    mrp: 10999,
    summary:
      "The value pick for over-ear ANC. Forty hours with cancellation on and a clamp light enough for a working day.",
    form: "Over-ear",
    driver: { size: 40, type: "Dynamic", frequencyResponse: "16Hz - 40kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "LDAC"],
    anc: "Adaptive ANC",
    transparencyMode: true,
    batteryHours: 40,
    quickCharge: "5 min for 4 hours",
    micCount: 4,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 265,
    clampForce: 4.3,
    foldable: true,
    eqApp: true,
    colors: ["Black", "Cream"],
    rating: 4.4,
    reviews: 1920,
    bestseller: true,
    releaseYear: 2024,
    views: 27800,
    tags: ["ANC", "Value", "Over-ear", "Long battery"],
  },
  {
    id: "jbl-tune-770nc",
    name: "JBL Tune 770NC",
    brand: "JBL",
    price: 7499,
    mrp: 9999,
    summary:
      "Seventy hours without ANC, which is a genuinely absurd figure. Sound is the usual JBL bass tilt.",
    form: "Over-ear",
    driver: { size: 40, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC"],
    anc: "Basic ANC",
    transparencyMode: true,
    batteryHours: 44,
    quickCharge: "5 min for 3 hours",
    micCount: 4,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 220,
    clampForce: 4.6,
    foldable: true,
    eqApp: true,
    colors: ["Black", "White", "Blue"],
    rating: 4.2,
    reviews: 2460,
    releaseYear: 2024,
    views: 22100,
    tags: ["ANC", "Long battery", "Over-ear"],
  },
  {
    id: "samsung-galaxy-buds3-pro",
    name: "Samsung Galaxy Buds3 Pro",
    brand: "Samsung",
    price: 19999,
    mrp: 24999,
    summary:
      "Planar drivers and 24-bit audio inside Samsung's ecosystem. Outside it, you lose the codec that makes it special.",
    form: "In-ear",
    driver: { size: 10.5, type: "Hybrid (planar tweeter + dynamic)", frequencyResponse: "20Hz - 40kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "LHDC"],
    anc: "Adaptive ANC",
    transparencyMode: true,
    batteryHours: 6,
    caseHours: 20,
    quickCharge: "5 min for 1 hour",
    wirelessCharging: true,
    micCount: 3,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.4",
    multipoint: true,
    weight: 5.4,
    clampForce: 4.0,
    waterResistance: "IP57",
    spatialAudio: true,
    headTracking: true,
    eqApp: true,
    colors: ["Silver", "White"],
    rating: 4.3,
    reviews: 1580,
    releaseYear: 2024,
    views: 29400,
    tags: ["ANC", "Spatial audio", "TWS"],
  },
  {
    id: "marshall-major-v",
    name: "Marshall Major V",
    brand: "Marshall",
    price: 14999,
    mrp: 17999,
    summary:
      "A hundred hours a charge and the only on-ear here worth recommending. No ANC — this is a set for listening, not hiding.",
    form: "On-ear",
    driver: { size: 40, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC"],
    anc: "Passive",
    batteryHours: 100,
    quickCharge: "15 min for 15 hours",
    wirelessCharging: true,
    micCount: 2,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 186,
    clampForce: 5.0,
    foldable: true,
    eqApp: true,
    colors: ["Black", "Cream"],
    rating: 4.3,
    reviews: 940,
    releaseYear: 2024,
    views: 19700,
    tags: ["Design", "Long battery", "On-ear"],
  },
  /* ------------------------------ Premium ------------------------------ */
  {
    id: "sony-wh-1000xm5",
    name: "Sony WH-1000XM5",
    brand: "Sony",
    price: 26990,
    mrp: 34990,
    summary:
      "Still the benchmark for noise cancellation on a plane. Eight mics, LDAC, and the lightest clamp of any flagship here.",
    form: "Over-ear",
    driver: { size: 30, type: "Dynamic (carbon fibre composite)", frequencyResponse: "4Hz - 40kHz", impedance: 48 },
    codecs: ["SBC", "AAC", "LDAC"],
    anc: "Industry-leading ANC",
    transparencyMode: true,
    batteryHours: 30,
    quickCharge: "3 min for 3 hours",
    micCount: 8,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.2",
    multipoint: true,
    weight: 250,
    clampForce: 4.2,
    foldable: false,
    spatialAudio: true,
    headTracking: true,
    eqApp: true,
    colors: ["Black", "Silver", "Midnight Blue"],
    rating: 4.7,
    reviews: 4120,
    bestseller: true,
    releaseYear: 2023,
    views: 61200,
    tags: ["ANC", "Flagship", "Travel", "LDAC"],
  },
  {
    id: "bose-quietcomfort-ultra",
    name: "Bose QuietComfort Ultra Headphones",
    brand: "Bose",
    price: 29900,
    mrp: 35900,
    summary:
      "The most comfortable set on this page, and the best immersive-audio implementation. No LDAC, which purists will mind.",
    form: "Over-ear",
    driver: { size: 35, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "aptX Adaptive"],
    anc: "Industry-leading ANC",
    transparencyMode: true,
    batteryHours: 24,
    quickCharge: "15 min for 2.5 hours",
    micCount: 8,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 254,
    clampForce: 4.4,
    foldable: true,
    spatialAudio: true,
    headTracking: true,
    eqApp: true,
    colors: ["Black", "White", "Sand"],
    rating: 4.6,
    reviews: 2280,
    releaseYear: 2024,
    views: 48300,
    tags: ["ANC", "Comfort", "Flagship", "Travel"],
  },
  {
    id: "sennheiser-momentum-4",
    name: "Sennheiser Momentum 4 Wireless",
    brand: "Sennheiser",
    price: 24990,
    mrp: 34990,
    summary:
      "Sixty hours a charge and the most neutral tuning of the flagships. ANC is a step behind Sony and Bose.",
    form: "Over-ear",
    driver: { size: 42, type: "Dynamic", frequencyResponse: "6Hz - 22kHz", impedance: 470 },
    codecs: ["SBC", "AAC", "aptX", "aptX Adaptive"],
    anc: "Adaptive ANC",
    transparencyMode: true,
    batteryHours: 60,
    quickCharge: "10 min for 6 hours",
    micCount: 4,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.2",
    multipoint: true,
    weight: 293,
    clampForce: 4.1,
    foldable: true,
    eqApp: true,
    colors: ["Black", "White", "Graphite"],
    rating: 4.5,
    reviews: 1640,
    releaseYear: 2023,
    views: 33800,
    tags: ["Long battery", "Neutral", "Over-ear"],
  },
  {
    id: "apple-airpods-pro-2",
    name: "Apple AirPods Pro (2nd gen, USB-C)",
    brand: "Apple",
    price: 21900,
    mrp: 24900,
    summary:
      "The best ANC in a bud, and effortless inside Apple's ecosystem. AAC only, so Android users lose most of the advantage.",
    form: "In-ear",
    driver: { size: 11, type: "Dynamic (custom Apple)", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC"],
    anc: "Industry-leading ANC",
    transparencyMode: true,
    batteryHours: 6,
    caseHours: 24,
    quickCharge: "5 min for 1 hour",
    wirelessCharging: true,
    micCount: 3,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 5.3,
    clampForce: 4.1,
    waterResistance: "IP54",
    spatialAudio: true,
    headTracking: true,
    eqApp: false,
    colors: ["White"],
    rating: 4.6,
    reviews: 5840,
    bestseller: true,
    releaseYear: 2023,
    views: 68400,
    tags: ["ANC", "TWS", "Spatial audio", "Apple"],
  },
  {
    id: "sony-wf-1000xm5",
    name: "Sony WF-1000XM5",
    brand: "Sony",
    price: 19990,
    mrp: 24990,
    summary:
      "Flagship cancellation in something that fits in a coin pocket, with LDAC intact. Battery is the price you pay.",
    form: "In-ear",
    driver: { size: 8.4, type: "Dynamic X (carbon fibre)", frequencyResponse: "20Hz - 40kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "LDAC"],
    anc: "Industry-leading ANC",
    transparencyMode: true,
    batteryHours: 8,
    caseHours: 16,
    quickCharge: "3 min for 1 hour",
    wirelessCharging: true,
    micCount: 6,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 5.9,
    clampForce: 4.3,
    waterResistance: "IPX4",
    spatialAudio: true,
    headTracking: true,
    eqApp: true,
    colors: ["Black", "Silver"],
    rating: 4.5,
    reviews: 2140,
    releaseYear: 2023,
    views: 44700,
    tags: ["ANC", "TWS", "LDAC", "Travel"],
  },
  {
    id: "sennheiser-hd-660s2",
    name: "Sennheiser HD 660S2",
    brand: "Sennheiser",
    price: 44990,
    mrp: 51990,
    summary:
      "Open-back, wired, and not remotely portable. On a desk with a decent amp it outclasses everything else on this page.",
    form: "Over-ear",
    connection: "Wired",
    driver: { size: 42, type: "Dynamic (transducer, open-back)", frequencyResponse: "8Hz - 41.5kHz", impedance: 300 },
    codecs: ["SBC"],
    anc: "None",
    batteryHours: 0,
    micCount: 0,
    weight: 260,
    clampForce: 4.6,
    colors: ["Black"],
    rating: 4.7,
    reviews: 420,
    releaseYear: 2023,
    views: 17600,
    tags: ["Audiophile", "Wired", "Critical listening", "Open-back"],
  },
  {
    id: "bose-quietcomfort-earbuds-ultra",
    name: "Bose QuietComfort Earbuds Ultra",
    brand: "Bose",
    price: 25900,
    mrp: 29900,
    summary:
      "The deepest cancellation of any bud, with Immersive Audio that genuinely widens the stage. Battery is merely fine.",
    form: "In-ear",
    driver: { size: 9.3, type: "Dynamic", frequencyResponse: "20Hz - 20kHz", impedance: 32 },
    codecs: ["SBC", "AAC", "aptX Adaptive"],
    anc: "Industry-leading ANC",
    transparencyMode: true,
    batteryHours: 6,
    caseHours: 18,
    quickCharge: "20 min for 2 hours",
    micCount: 4,
    envNoiseCancelling: true,
    bluetooth: "Bluetooth 5.3",
    multipoint: true,
    weight: 6.2,
    clampForce: 4.4,
    waterResistance: "IPX4",
    spatialAudio: true,
    headTracking: true,
    eqApp: true,
    colors: ["Black", "White"],
    rating: 4.4,
    reviews: 1260,
    releaseYear: 2024,
    views: 31900,
    tags: ["ANC", "TWS", "Spatial audio"],
  },
];

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

function buildHeadphone(seed: HeadphoneSeed): Headphone {
  const specs: HeadphoneSpecs = {
    form: seed.form,
    connection: seed.connection ?? "Wireless",
    driver: {
      size: seed.driver.size,
      type: seed.driver.type,
      frequencyResponse: seed.driver.frequencyResponse ?? "20Hz - 20kHz",
      impedance: seed.driver.impedance ?? 32,
    },
    codecs: seed.codecs,
    anc: seed.anc,
    transparencyMode: seed.transparencyMode ?? false,
    batteryHours: seed.batteryHours,
    caseHours: seed.caseHours ?? 0,
    quickCharge: seed.quickCharge ?? "Not supported",
    wirelessCharging: seed.wirelessCharging ?? false,
    micCount: seed.micCount,
    envNoiseCancelling: seed.envNoiseCancelling ?? false,
    bluetooth: seed.bluetooth ?? (seed.connection === "Wired" ? "Not applicable" : "Bluetooth 5.2"),
    multipoint: seed.multipoint ?? false,
    weight: seed.weight,
    clampForce: seed.clampForce,
    foldable: seed.foldable ?? false,
    waterResistance: seed.waterResistance ?? "Not rated",
    spatialAudio: seed.spatialAudio ?? false,
    headTracking: seed.headTracking ?? false,
    eqApp: seed.eqApp ?? false,
    colors: seed.colors,
    warranty: seed.warranty ?? "1 Year Manufacturer Warranty",
  };

  const performance = buildHeadphonePerformance(specs);
  const images = [1, 2, 3].map((n) => `/headphone-images/${seed.id}-${n}.svg`);

  return {
    id: seed.id,
    category: "headphone",
    name: seed.name,
    brand: seed.brand,
    price: seed.price,
    mrp: seed.mrp,
    summary: seed.summary,
    model3d: deriveHeadphoneModel(specs),
    specs,
    performance,
    useCases: buildUseCases(specs, performance),
    image: images[0],
    images,
    rating: seed.rating,
    reviews: seed.reviews,
    reviewList: buildReviews(seed.id, seed.releaseYear, "headphone"),
    bestseller: seed.bestseller ?? false,
    releaseYear: seed.releaseYear,
    views: seed.views,
    tags: seed.tags,
    affiliateUrl: `https://example.com/buy/${seed.id}`,
    inStock: true,
  };
}

export const headphones: Headphone[] = seeds.map(buildHeadphone);

export const headphonesById = new Map(headphones.map((h) => [h.id, h]));

export function getHeadphoneById(id: string) {
  return headphonesById.get(id);
}

/* -------------------------------------------------------------------------- */
/* Facets, filtering, sorting, search                                         */
/* -------------------------------------------------------------------------- */

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const headphoneFacets = {
  brands: unique(headphones.map((h) => h.brand)).sort() as HeadphoneBrand[],
  forms: unique(headphones.map((h) => h.specs.form)) as HeadphoneForm[],
  anc: unique(headphones.map((h) => h.specs.anc)) as AncTier[],
  codecs: unique(headphones.flatMap((h) => h.specs.codecs)) as AudioCodec[],
  connection: unique(headphones.map((h) => h.specs.connection)) as ConnectionType[],
  minPrice: Math.min(...headphones.map((h) => h.price)),
  maxPrice: Math.max(...headphones.map((h) => h.price)),
};

export const defaultHeadphoneFilters: HeadphoneFilters = {
  brands: [],
  forms: [],
  anc: [],
  codecs: [],
  connection: [],
  minBattery: 0,
  minPrice: headphoneFacets.minPrice,
  maxPrice: headphoneFacets.maxPrice,
  query: "",
};

/**
 * Only scenarios the set is actually good at are indexed, mirroring the laptop
 * and phone haystacks: every pair carries all six use cases, so indexing them
 * unconditionally would make a search for "gym" return the catalogue.
 */
function searchHaystack(headphone: Headphone) {
  return [
    headphone.name,
    headphone.brand,
    headphone.specs.form,
    headphone.specs.anc,
    headphone.specs.driver.type,
    headphone.summary,
    ...headphone.tags,
    ...headphone.specs.codecs,
    ...headphone.specs.colors,
    ...headphone.useCases
      .filter((useCase) => useCase.verdict === "Excellent" || useCase.verdict === "Good")
      .map((useCase) => useCase.name),
  ]
    .join(" ")
    .toLowerCase();
}

const haystacks = new Map(headphones.map((h) => [h.id, searchHaystack(h)]));

export function searchHeadphones(query: string, pool: Headphone[] = headphones) {
  const needle = query.trim().toLowerCase();
  if (!needle) return pool;
  const terms = needle.split(/\s+/);
  return pool.filter((headphone) => {
    const haystack = haystacks.get(headphone.id) ?? "";
    return terms.every((term) => haystack.includes(term));
  });
}

export function filterHeadphones(filters: HeadphoneFilters, pool: Headphone[] = headphones) {
  const matched = pool.filter((headphone) => {
    if (filters.brands.length && !filters.brands.includes(headphone.brand)) return false;
    if (filters.forms.length && !filters.forms.includes(headphone.specs.form)) return false;
    if (filters.anc.length && !filters.anc.includes(headphone.specs.anc)) return false;
    if (
      filters.codecs.length &&
      !filters.codecs.some((codec) => headphone.specs.codecs.includes(codec))
    ) {
      return false;
    }
    if (filters.connection.length && !filters.connection.includes(headphone.specs.connection)) {
      return false;
    }
    if (headphone.specs.batteryHours < filters.minBattery) return false;
    if (headphone.price < filters.minPrice || headphone.price > filters.maxPrice) return false;
    return true;
  });

  return searchHeadphones(filters.query, matched);
}

export function sortHeadphones(pool: Headphone[], sort: ProductSortOption) {
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

export const featuredHeadphones = headphones
  .filter((headphone) => headphone.bestseller)
  .sort((a, b) => b.performance.overall - a.performance.overall)
  .slice(0, 4);

export function relatedHeadphones(
  headphone: Headphone,
  count = 4,
  pool: Headphone[] = headphones,
) {
  return pool
    .filter((candidate) => candidate.id !== headphone.id)
    .map((candidate) => ({
      candidate,
      distance:
        Math.abs(candidate.price - headphone.price) / 1000 +
        Math.abs(candidate.performance.overall - headphone.performance.overall) +
        (candidate.specs.form === headphone.specs.form ? 0 : 15),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.candidate);
}
