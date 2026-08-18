"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";

/*
 * Upstream is a full-page piece: `min-h-screen` on a hardcoded `#FAFAFA`
 * ground. Two adaptations, and nothing else about the keyboard itself changed:
 *
 *  - `fullBleed` is opt-in. Off, the component fills its container instead of
 *    the viewport, so it can sit in a column beside a form.
 *  - The ground follows the theme, and so does the board: every colour it
 *    paints with comes from `PALETTES`, picked by the `.dark` class on <html>.
 *    Dark mode is an unlit walnut case with charcoal caps and pale legends, not
 *    a greyed-out copy of the light one.
 *
 * The upstream audio engine is NOT included: a ~10KB inline base64 sample and
 * a per-keystroke click on a sign-in page is a lot of intrusion for decoration.
 * Say the word and it goes back in.
 *
 * `mirrorTyping` decides what happens while a field has focus. Off (default),
 * the global listener bails on any field. On, the board mirrors the form under
 * one rule: IT NEVER SHOWS MORE THAN THE FIELD ITSELF IS SHOWING.
 *
 *   ordinary field      keys light, and the readout spells the word out
 *   password, masked    one dot per character, and no key lights up — the lit
 *                       cap would spell out what the dots are there to hide
 *   password, revealed  the field is printing the characters itself, so the
 *                       board may too
 *
 * One-time codes and card numbers stay masked whatever their input type says:
 * there is no reveal toggle behind them, so there is no user intent to read.
 */

interface KeyConfig {
  id: string;
  label: string;
  shiftLabel?: string;
  width?: number;
  muted?: boolean;
  align?: "left" | "center";
  small?: boolean;
}

type KeyRow = KeyConfig[];
type KeyTrigger = { press: () => void; release: () => void };

const ROWS: KeyRow[] = [
  [
    { id: "esc", label: "Esc", small: true, align: "left" },
    { id: "1", label: "1", shiftLabel: "!" },
    { id: "2", label: "2", shiftLabel: "@" },
    { id: "3", label: "3", shiftLabel: "#" },
    { id: "4", label: "4", shiftLabel: "$" },
    { id: "5", label: "5", shiftLabel: "%" },
    { id: "6", label: "6", shiftLabel: "^" },
    { id: "7", label: "7", shiftLabel: "&" },
    { id: "8", label: "8", shiftLabel: "*" },
    { id: "9", label: "9", shiftLabel: "(" },
    { id: "0", label: "0", shiftLabel: ")" },
    { id: "minus", label: "-", shiftLabel: "_" },
    { id: "equal", label: "=", shiftLabel: "+" },
    { id: "backspace", label: "Backspace", width: 2, small: true, align: "left" },
  ],
  [
    { id: "tab", label: "Tab", width: 1.5, align: "left", small: true },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", label: "[", shiftLabel: "{" },
    { id: "rbracket", label: "]", shiftLabel: "}" },
    { id: "backslash", label: "\\", shiftLabel: "|", width: 1.5 },
  ],
  [
    { id: "caps", label: "CapsLock", width: 1.75, align: "left", small: true },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F" },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J" },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", label: ";", shiftLabel: ":" },
    { id: "quote", label: "'", shiftLabel: '"' },
    { id: "enter", label: "Enter", width: 2.25, align: "left", small: true },
  ],
  [
    { id: "lshift", label: "Shift", width: 2.25, align: "left", small: true },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", label: ",", shiftLabel: "<" },
    { id: "period", label: ".", shiftLabel: ">" },
    { id: "slash", label: "/", shiftLabel: "?" },
    { id: "rshift", label: "Shift", width: 2.75, align: "left", small: true },
  ],
  [
    { id: "lctrl", label: "Ctrl", width: 1.25, small: true, muted: true, align: "left" },
    { id: "lwin", label: "Win", width: 1.25, small: true, muted: true, align: "left" },
    { id: "lalt", label: "Alt", width: 1.25, small: true, muted: true, align: "left" },
    { id: "space", label: "", width: 6.25 },
    { id: "ralt", label: "Alt", width: 1.25, small: true, muted: true, align: "left" },
    { id: "rwin", label: "Win", width: 1.25, small: true, muted: true, align: "left" },
    { id: "fn", label: "Fn", width: 1.25, small: true, muted: true, align: "left" },
  ],
];

const ALL_KEYS_BY_ID: Record<string, KeyConfig> = (() => {
  const map: Record<string, KeyConfig> = {};
  for (const row of ROWS) for (const key of row) map[key.id] = key;
  return map;
})();

const MODIFIER_DISPLAY_ORDER = ["Ctrl", "Shift", "Alt", "Win", "Fn"];

function getKeyDisplayLabel(id: string): string {
  if (id === "space") return "Space";
  return ALL_KEYS_BY_ID[id]?.label || id;
}

function getActiveKeyParts(ids: string[]): string[] | null {
  if (ids.length === 0) return null;
  const labels = Array.from(new Set(ids.map(getKeyDisplayLabel)));
  const modifiers = MODIFIER_DISPLAY_ORDER.filter((m) => labels.includes(m));
  const others = labels.filter((l) => !MODIFIER_DISPLAY_ORDER.includes(l));
  return [...modifiers, ...others];
}

function shiftLightness(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const adj = amount * 2.2;
  return `rgb(${clamp(((n >> 16) & 255) + adj)}, ${clamp(((n >> 8) & 255) + adj)}, ${clamp((n & 255) + adj)})`;
}

function hashKeyId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

interface KeyVariance {
  hueShift: number;
  lightnessShift: number;
  specularShiftX: number;
  specularShiftY: number;
  wearAmount: number;
  microTilt: number;
  rimBias: number;
}

function getKeyVariance(id: string, small?: boolean): KeyVariance {
  const a = hashKeyId(id);
  const b = hashKeyId(id + "_b");
  const c = hashKeyId(id + "_c");
  const d = hashKeyId(id + "_d");
  const e = hashKeyId(id + "_e");
  return {
    hueShift: (a - 0.5) * 3,
    lightnessShift: (b - 0.5) * 4,
    specularShiftX: (c - 0.5) * 16,
    specularShiftY: (a * c - 0.5) * 12,
    wearAmount: small ? 0.08 + c * 0.06 : 0.1 + d * 0.1,
    microTilt: (e - 0.5) * 0.32,
    rimBias: 0.85 + e * 0.25,
  };
}

const CODE_TO_KEY_ID: Record<string, string> = {
  Escape: "esc", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4",
  Digit5: "5", Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9",
  Digit0: "0", Minus: "minus", Equal: "equal", Backspace: "backspace",
  Tab: "tab", KeyQ: "q", KeyW: "w", KeyE: "e", KeyR: "r", KeyT: "t",
  KeyY: "y", KeyU: "u", KeyI: "i", KeyO: "o", KeyP: "p",
  BracketLeft: "lbracket", BracketRight: "rbracket", Backslash: "backslash",
  CapsLock: "caps", KeyA: "a", KeyS: "s", KeyD: "d", KeyF: "f", KeyG: "g",
  KeyH: "h", KeyJ: "j", KeyK: "k", KeyL: "l", Semicolon: "semicolon",
  Quote: "quote", Enter: "enter", ShiftLeft: "lshift", KeyZ: "z", KeyX: "x",
  KeyC: "c", KeyV: "v", KeyB: "b", KeyN: "n", KeyM: "m", Comma: "comma",
  Period: "period", Slash: "slash", ShiftRight: "rshift", ControlLeft: "lctrl",
  MetaLeft: "lwin", AltLeft: "lalt", Space: "space", AltRight: "ralt",
  MetaRight: "rwin",
};

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const WOOD_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='460' height='460'>
  <filter id='g'>
    <feTurbulence type='fractalNoise' baseFrequency='0.14 0.0032' numOctaves='6' seed='23' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 0 0.065  0 0 0 1.0 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#g)'/>
</svg>`);

const WOOD_GRAIN_FINE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
  <filter id='gf'>
    <feTurbulence type='fractalNoise' baseFrequency='0.28 0.01' numOctaves='4' seed='71' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.35  0 0 0 0 0.21  0 0 0 0 0.1  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#gf)'/>
</svg>`);

const WOOD_TONE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'>
  <filter id='t'>
    <feTurbulence type='fractalNoise' baseFrequency='0.0045' numOctaves='2' seed='11' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.22  0 0 0 0 0.115  0 0 0 0 0.045  0 0 0 0.5 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#t)'/>
</svg>`);

const PBT_NOISE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`);

const END_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
  <filter id='e'>
    <feTurbulence type='turbulence' baseFrequency='0.24' numOctaves='3' seed='2' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0 0.026  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#e)'/>
</svg>`);

const WOOD_PORE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
  <filter id='p'>
    <feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='31' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.05  0 0 0 0 0.025  0 0 0 0 0.008  0 0 0 0.075 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#p)'/>
</svg>`);

const WOOD_MICROSCRATCH_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='620' height='420'>
  <filter id='s'>
    <feTurbulence type='fractalNoise' baseFrequency='0.012 0.09' numOctaves='2' seed='58' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 0 0.035 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#s)'/>
</svg>`);

/*
 * Two palettes rather than one. Everything the board paints with lives here, so
 * dark mode is a lookup and not a second set of hardcoded literals scattered
 * through the layer stack. The wood keeps its identity in both themes — it just
 * moves from sunlit oak to an unlit walnut instead of turning grey.
 */
interface KeyboardPalette {
  keycapBase: string;
  /** Five stops of the keycap wall, light → dark. */
  wallStops: [string, string, string, string, string];
  legendInk: string;
  legendInkSoft: string;
  /** Emboss under the legends: white in light, black in dark. */
  legendShadow: string;
  legendShadowSoft: string;
  capRimStroke: string;
  capTopSpecular: string;
  caseGradient: string;
  bezelGradient: string;
  /** Scales the wood texture layers — the dark case needs less multiply. */
  textureScale: number;
  groundShadow: string;
}

const PALETTES: Record<"light" | "dark", KeyboardPalette> = {
  light: {
    keycapBase: "#DFD2C3",
    wallStops: ["#f0e4d1", "#e0cead", "#c8b394", "#a68e70", "#8c7458"],
    legendInk: "#413e38",
    legendInkSoft: "#726d64",
    legendShadow: "0 0.4px 0 rgba(255,255,255,0.28), 0 0 0.35px rgba(30,24,16,0.35)",
    legendShadowSoft: "0 0.4px 0 rgba(255,255,255,0.32), 0 0 0.3px rgba(35,28,18,0.3)",
    capRimStroke: "rgba(96,70,42,0.28)",
    capTopSpecular: "rgba(255,252,244,0.28)",
    caseGradient: `
      linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 9%),
      repeating-linear-gradient(180deg, rgba(70,42,16,0.08) 0px, transparent 2px, transparent 6px, rgba(70,42,16,0.055) 8px, transparent 13px),
      linear-gradient(178deg, #ad7440 0%, #9d6636 26%, #895128 55%, #764a24 78%, #63391a 100%)
    `,
    bezelGradient: "linear-gradient(155deg, #15120e 0%, #0e0c08 50%, #0a0805 100%)",
    textureScale: 1,
    groundShadow: "rgba(15,10,6,0.2)",
  },
  dark: {
    keycapBase: "#2C2621",
    wallStops: ["#4c443b", "#413931", "#332c26", "#26201b", "#1a1613"],
    legendInk: "#EFE6D8",
    legendInkSoft: "#A99D8C",
    legendShadow: "0 0.5px 0 rgba(0,0,0,0.5), 0 0 0.35px rgba(0,0,0,0.4)",
    legendShadowSoft: "0 0.5px 0 rgba(0,0,0,0.45), 0 0 0.3px rgba(0,0,0,0.35)",
    capRimStroke: "rgba(0,0,0,0.5)",
    capTopSpecular: "rgba(255,240,215,0.1)",
    caseGradient: `
      linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 9%),
      repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0px, transparent 2px, transparent 6px, rgba(0,0,0,0.12) 8px, transparent 13px),
      linear-gradient(178deg, #4f3218 0%, #452b14 26%, #392210 55%, #2d1a0c 78%, #221308 100%)
    `,
    bezelGradient: "linear-gradient(155deg, #0c0a07 0%, #070604 50%, #050403 100%)",
    textureScale: 0.55,
    groundShadow: "rgba(0,0,0,0.45)",
  },
};

/**
 * The theme provider toggles `.dark` on `<html>`, and none of these colours can
 * come from CSS custom properties: they are fed to `shiftLightness`, which does
 * arithmetic on the hex. So the class is observed directly.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

type DeviceTier = "mobile" | "tablet" | "desktop";

const MOBILE_BREAKPOINT = "(max-width: 639px)";
const TABLET_BREAKPOINT = "(max-width: 1023px)";

function resolveTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(MOBILE_BREAKPOINT).matches) return "mobile";
  if (window.matchMedia(TABLET_BREAKPOINT).matches) return "tablet";
  return "desktop";
}

function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("desktop");
  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const tabletQuery = window.matchMedia(TABLET_BREAKPOINT);
    const update = () => setTier(resolveTier());
    update();
    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);
  return tier;
}

const RADIUS_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 8, top: 6.5 },
  tablet: { wall: 7, top: 5.5 },
  mobile: { wall: 5.5, top: 4 },
};

const NOISE_OPACITY_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 0.05, top: 0.06 },
  tablet: { wall: 0.05, top: 0.06 },
  mobile: { wall: 0.045, top: 0.05 },
};

const NOISE_SIZE_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 90, top: 40 },
  tablet: { wall: 68, top: 30 },
  mobile: { wall: 48, top: 22 },
};

interface RowSculpt {
  insetTop: number;
  insetSide: number;
  insetBottom: number;
}

const ROW_SCULPT_TIERS: Record<DeviceTier, RowSculpt[]> = {
  desktop: [
    { insetTop: 4, insetSide: 4.5, insetBottom: 11 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 8.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9 },
    { insetTop: 3.5, insetSide: 4, insetBottom: 7 },
  ],
  tablet: [
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 8.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.6 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 6.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.2 },
    { insetTop: 2.8, insetSide: 3.2, insetBottom: 5.6 },
  ],
  mobile: [
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5.8 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.4 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.7 },
    { insetTop: 2, insetSide: 2.2, insetBottom: 3.6 },
  ],
};

const LEGEND_SHARED = {
  shiftTopOffset: "13%",
  shiftLeftOffset: "18%",
  primaryBottomOffset: "14.5%",
  primaryLeftOffset: "0.85em",
  opticalCenterShift: "1.4%",
  shiftOpacity: 0.66,
  primaryOpacity: 0.96,
} as const;

const LEGEND_FONT_TIERS: Record<DeviceTier, { shift: string; normal: string; small: string }> = {
  desktop: {
    shift: "clamp(0.46rem, 0.74vw, 0.58rem)",
    normal: "clamp(0.74rem, 1.38vw, 0.95rem)",
    small: "clamp(0.56rem, 1.02vw, 0.7rem)",
  },
  tablet: {
    shift: "clamp(0.48rem, 1.12vw, 0.58rem)",
    normal: "clamp(0.7rem, 2.05vw, 0.86rem)",
    small: "clamp(0.55rem, 1.58vw, 0.68rem)",
  },
  mobile: {
    shift: "clamp(0.43rem, 2.05vw, 0.51rem)",
    normal: "clamp(0.62rem, 3.65vw, 0.78rem)",
    small: "clamp(0.51rem, 2.85vw, 0.63rem)",
  },
};

const CONTACT_SHADOW_TIERS: Record<DeviceTier, string> = {
  desktop:
    "0 0.5px 0.5px rgba(12,8,4,0.14), 0 2px 3px rgba(12,8,4,0.1), 0 5px 9px rgba(12,8,4,0.07), 0 10px 16px rgba(12,8,4,0.045)",
  tablet:
    "0 0.4px 0.4px rgba(12,8,4,0.14), 0 1.5px 2.2px rgba(12,8,4,0.1), 0 3.5px 6px rgba(12,8,4,0.07), 0 6.5px 10px rgba(12,8,4,0.04)",
  mobile:
    "0 0.3px 0.3px rgba(12,8,4,0.13), 0 1px 1.6px rgba(12,8,4,0.1), 0 2.2px 4px rgba(12,8,4,0.06)",
};

const KEY_HEIGHT_TIERS: Record<DeviceTier, string> = {
  desktop: "clamp(2.15rem, min(4.15vw, 7.5vh), 2.95rem)",
  tablet: "clamp(1.95rem, min(5.4vw, 7vh), 2.6rem)",
  mobile: "clamp(1.75rem, min(8vw, 6vh), 2.2rem)",
};

const KEY_GAP_TIERS: Record<DeviceTier, string> = {
  desktop: "3px",
  tablet: "2.5px",
  mobile: "2px",
};

const CASE_TIERS: Record<
  DeviceTier,
  { caseRadius: string; bezelRadius: string; casePadding: string; bezelPadding: string }
> = {
  desktop: { caseRadius: "0.32rem", bezelRadius: "0.24rem", casePadding: "1.15% 1.3%", bezelPadding: "0.28%" },
  tablet: { caseRadius: "0.3rem", bezelRadius: "0.22rem", casePadding: "1.3% 1.5%", bezelPadding: "0.32%" },
  mobile: { caseRadius: "0.26rem", bezelRadius: "0.2rem", casePadding: "1.6% 1.9%", bezelPadding: "0.4%" },
};

const MOBILE_LABEL_OVERRIDES: Record<string, string> = {
  backspace: "⌫",
  caps: "Caps",
};

const KEY_STYLE_TAG = `
.kb-key {
  --tilt: 0deg;
  will-change: transform;
  contain: layout style paint;
  backface-visibility: hidden;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transform: translateY(0) scale(1) rotate(var(--tilt));
  transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.kb-key[data-pressed="true"] {
  transform: translateY(4.5px) scale(0.975) rotate(calc(var(--tilt) * 0.3));
  transition: transform 15ms linear;
}
`;

const MIN_VISIBLE_PRESS_MS = 55;

/**
 * Silence that ends a word, and how long the finished word then stays up.
 *
 * Both are deliberately short. The settle has to outlast the gap between two
 * keystrokes of ordinary typing or the word would publish itself mid-thought —
 * a fast typist runs about 150ms between keys, so 260ms clears it with room —
 * and the hold only needs to be long enough to read a word already sitting in
 * front of you in the field you typed it into.
 */
const WORD_SETTLE_MS = 260;
const WORD_HOLD_MS = 900;
/** Long enough for an email address; past that the tail is what matters. */
const WORD_MAX_CHARS = 28;

function usePressState(): [boolean, () => void, () => void] {
  const [pressed, setPressed] = useState(false);
  const pressedAtRef = useRef(0);
  const releaseTimeoutRef = useRef<number | null>(null);

  const clearPendingRelease = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  const press = useCallback(() => {
    clearPendingRelease();
    pressedAtRef.current = performance.now();
    setPressed(true);
  }, [clearPendingRelease]);

  const release = useCallback(() => {
    const remaining = MIN_VISIBLE_PRESS_MS - (performance.now() - pressedAtRef.current);
    if (remaining > 0) {
      clearPendingRelease();
      releaseTimeoutRef.current = window.setTimeout(() => {
        releaseTimeoutRef.current = null;
        setPressed(false);
      }, remaining);
    } else {
      setPressed(false);
    }
  }, [clearPendingRelease]);

  useEffect(() => clearPendingRelease, [clearPendingRelease]);
  return [pressed, press, release];
}

const Key = memo(function Key({
  config,
  rowIndex,
  tier,
  palette,
  registerTrigger,
  onActivate,
  onDeactivate,
}: {
  config: KeyConfig;
  rowIndex: number;
  tier: DeviceTier;
  palette: KeyboardPalette;
  registerTrigger: (id: string, trigger: KeyTrigger) => () => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const { id, label, shiftLabel, width = 1, align = "center", small } = config;
  const [pointerPressed, pressPointer, releasePointer] = usePressState();
  const [physicallyPressed, pressPhysical, releasePhysical] = usePressState();
  const sculptRows = ROW_SCULPT_TIERS[tier];
  const sculpt = sculptRows[rowIndex] ?? sculptRows[1];
  const radius = RADIUS_TIERS[tier];
  const noiseOpacity = NOISE_OPACITY_TIERS[tier];
  const noiseSize = NOISE_SIZE_TIERS[tier];
  const legendFont = LEGEND_FONT_TIERS[tier];
  const contactShadow = CONTACT_SHADOW_TIERS[tier];
  const keyHeight = KEY_HEIGHT_TIERS[tier];
  const displayLabel = tier === "mobile" ? (MOBILE_LABEL_OVERRIDES[id] ?? label) : label;
  const pressed = pointerPressed || physicallyPressed;
  const variance = useMemo(() => getKeyVariance(id, small), [id, small]);

  useEffect(
    () => registerTrigger(id, { press: pressPhysical, release: releasePhysical }),
    [id, registerTrigger, pressPhysical, releasePhysical],
  );

  const layers = useMemo(() => {
    const insetTRBL = `${sculpt.insetTop}px ${sculpt.insetSide}px ${sculpt.insetBottom}px ${sculpt.insetSide}px`;
    const [w0, w1, w2, w3, w4] = palette.wallStops;
    return {
      insetTRBL,
      wallGradient: `linear-gradient(180deg, ${shiftLightness(w0, variance.lightnessShift)} 0%, ${shiftLightness(w1, variance.lightnessShift)} 18%, ${shiftLightness(w2, variance.lightnessShift)} 46%, ${shiftLightness(w3, variance.lightnessShift * 0.7)} 78%, ${shiftLightness(w4, variance.lightnessShift * 0.5)} 100%)`,
      wallFilter: `hue-rotate(${variance.hueShift}deg)`,
      wallNoisePosition: `${variance.specularShiftX}px ${variance.specularShiftY}px`,
      wallShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0.6px 0.4px 0 rgba(255,255,255,0.14), inset 0 -1.5px 2px rgba(15,9,4,0.16), inset 0 0 0 0.5px rgba(15,9,4,0.06)`,
      topGradient: `radial-gradient(115% 125% at ${23 + variance.specularShiftX * 0.4}% 9%, rgba(255,255,255,${0.4 - variance.wearAmount * 0.06}), rgba(255,255,255,0) 44%), radial-gradient(150% 120% at 50% 118%, rgba(15,9,4,${0.07 + variance.wearAmount * 0.02}), transparent 60%), ${shiftLightness(palette.keycapBase, variance.lightnessShift * 0.6)}`,
      topFilter: `hue-rotate(${variance.hueShift * 0.4}deg)`,
      topNoisePosition: `${variance.specularShiftY}px ${variance.specularShiftX}px`,
      topShadow: `inset 0 0 0 0.75px ${palette.capRimStroke}, inset 0 0.6px 0 rgba(255,250,238,0.4), inset 0 -0.8px 1.2px rgba(15,9,4,0.04)`,
      topShadowPressed: `inset 0 0 0 0.75px ${palette.capRimStroke}, inset 0 0.5px 0 rgba(255,250,238,0.22), inset 0 1px 2px rgba(15,10,5,0.1)`,
      rimOpacityUp: 0.55 * variance.rimBias,
      rimOpacityDown: 0.22 * variance.rimBias,
    };
  }, [sculpt, variance, palette]);

  const handlePress = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      pressPointer();
      onActivate(id);
    },
    [id, pressPointer, onActivate],
  );

  const handleRelease = useCallback(() => {
    releasePointer();
    onDeactivate(id);
  }, [releasePointer, onDeactivate, id]);

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-pressed={pressed}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onPointerLeave={handleRelease}
      style={
        {
          flexGrow: width,
          flexBasis: 0,
          minWidth: 0,
          height: keyHeight,
          "--tilt": `${variance.microTilt}deg`,
        } as CSSProperties
      }
      className="kb-key relative select-none outline-none"
    >
      <span
        className="pointer-events-none absolute"
        style={{
          inset: 0,
          borderRadius: radius.wall,
          boxShadow: pressed
            ? "0 0.5px 1px rgba(15,9,4,0.2), 0 2px 4px rgba(15,9,4,0.12)"
            : contactShadow,
          transition: "box-shadow 140ms ease-out",
          zIndex: 0,
        }}
      />
      <span
        className="absolute inset-0"
        style={{
          borderRadius: radius.wall,
          background: layers.wallGradient,
          filter: layers.wallFilter,
          boxShadow: layers.wallShadow,
          zIndex: 1,
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          borderRadius: radius.wall,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.wall}px ${noiseSize.wall}px`,
          backgroundPosition: layers.wallNoisePosition,
          opacity: noiseOpacity.wall,
          zIndex: 1,
        }}
      />
      <span
        className="absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background: layers.topGradient,
          filter: layers.topFilter,
          boxShadow: pressed ? layers.topShadowPressed : layers.topShadow,
          transition: "box-shadow 140ms ease-out, background 140ms ease-out",
          zIndex: 3,
        }}
      />
      <span
        className="pointer-events-none absolute mix-blend-overlay"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.top}px ${noiseSize.top}px`,
          backgroundPosition: layers.topNoisePosition,
          opacity: noiseOpacity.top,
          zIndex: 3,
        }}
      />
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background: `radial-gradient(55% 50% at 26% 18%, ${palette.capTopSpecular}, transparent 70%)`,
          opacity: pressed ? 0.4 : 1,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, transparent 14%), linear-gradient(100deg, rgba(255,255,255,0.09) 0%, transparent 9%)",
          opacity: pressed ? layers.rimOpacityDown : layers.rimOpacityUp,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      <span className="pointer-events-none absolute inset-0" style={{ zIndex: 5 }}>
        {shiftLabel && (
          <span
            className="absolute font-medium leading-none"
            style={{
              top: `calc(${sculpt.insetTop}px + ${LEGEND_SHARED.shiftTopOffset})`,
              left: LEGEND_SHARED.shiftLeftOffset,
              fontSize: legendFont.shift,
              color: palette.legendInkSoft,
              opacity: LEGEND_SHARED.shiftOpacity,
              letterSpacing: "0.01em",
              textShadow: palette.legendShadowSoft,
            }}
          >
            {shiftLabel}
          </span>
        )}
        {label && (
          <span
            className={`absolute leading-none ${small ? "font-semibold" : "font-bold"} ${align === "left" ? "text-left" : "text-center"}`}
            style={{
              bottom: `calc(${sculpt.insetBottom}px + ${LEGEND_SHARED.primaryBottomOffset})`,
              left:
                align === "left"
                  ? LEGEND_SHARED.primaryLeftOffset
                  : shiftLabel
                    ? `calc(50% - ${LEGEND_SHARED.opticalCenterShift})`
                    : "50%",
              transform: align === "left" ? undefined : "translateX(-50%)",
              fontSize: small ? legendFont.small : legendFont.normal,
              color: palette.legendInk,
              opacity: LEGEND_SHARED.primaryOpacity,
              letterSpacing: small ? "0.015em" : "-0.01em",
              textShadow: palette.legendShadow,
              whiteSpace: "nowrap",
              overflow: "hidden",
              maxWidth: "100%",
            }}
          >
            {displayLabel}
          </span>
        )}
      </span>
    </button>
  );
});

const MODIFIER_FAMILIES: Array<{ modifier: string; ids: string[] }> = [
  { modifier: "Alt", ids: ["lalt", "ralt"] },
  { modifier: "Control", ids: ["lctrl"] },
  { modifier: "Shift", ids: ["lshift", "rshift"] },
  { modifier: "Meta", ids: ["lwin", "rwin"] },
];

export interface VintageKeyboardProps {
  /** Fill the viewport, as upstream does. Off by default so it can sit inline. */
  fullBleed?: boolean;
  /** Show the "Press any key…" readout above the board. */
  showIndicator?: boolean;
  /**
   * Light keys up while a form field has focus. Password fields are always
   * excluded — see the note on `isPrivateTarget`.
   */
  mirrorTyping?: boolean;
  className?: string;
}

export function VintageKeyboard({
  fullBleed = false,
  showIndicator = true,
  mirrorTyping = false,
  className,
}: VintageKeyboardProps) {
  const rows = useMemo(() => ROWS, []);
  const keyTriggersRef = useRef<Record<string, KeyTrigger>>({});
  const tier = useDeviceTier();
  const isDark = useIsDark();
  const palette = isDark ? PALETTES.dark : PALETTES.light;
  const caseTier = CASE_TIERS[tier];
  const gap = KEY_GAP_TIERS[tier];

  const registerTrigger = useCallback((id: string, trigger: KeyTrigger) => {
    keyTriggersRef.current[id] = trigger;
    return () => {
      if (keyTriggersRef.current[id] === trigger) delete keyTriggersRef.current[id];
    };
  }, []);

  const [activeKeyIds, setActiveKeyIds] = useState<string[]>([]);
  const [indicatorParts, setIndicatorParts] = useState<string[] | null>(null);
  const [indicatorVisible, setIndicatorVisible] = useState(true);
  const indicatorPartsRef = useRef<string[] | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);

  /*
   * The finished word.
   *
   * Individual keys flash past one at a time while you type; once the typing
   * stops, the readout collects what was actually spelled and shows it whole.
   *
   * The buffer only ever fills from keystrokes the mirror already accepted, so
   * a password field contributes nothing to it — the keydown handler returns
   * before this code is reached for any secret field, and there is no path that
   * assembles a word out of characters the board refused to light up.
   */
  const [typedWord, setTypedWord] = useState<string | null>(null);
  const [wordVisible, setWordVisible] = useState(true);
  const bufferRef = useRef("");
  /** Whether the buffer currently holds dots or letters. */
  const maskedRef = useRef(false);
  const settleTimeoutRef = useRef<number | null>(null);
  const wordHoldTimeoutRef = useRef<number | null>(null);
  const wordFadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    indicatorPartsRef.current = indicatorParts;
  }, [indicatorParts]);

  const activateKey = useCallback((id: string) => {
    setActiveKeyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const deactivateKey = useCallback((id: string) => {
    setActiveKeyIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : prev));
  }, []);

  const clearWordTimers = useCallback(() => {
    if (settleTimeoutRef.current !== null) window.clearTimeout(settleTimeoutRef.current);
    if (wordHoldTimeoutRef.current !== null) window.clearTimeout(wordHoldTimeoutRef.current);
    if (wordFadeTimeoutRef.current !== null) window.clearTimeout(wordFadeTimeoutRef.current);
    settleTimeoutRef.current = null;
    wordHoldTimeoutRef.current = null;
    wordFadeTimeoutRef.current = null;
  }, []);

  /** Puts `text` on the readout and starts its hold-then-fade. */
  const showWord = useCallback(
    (text: string) => {
      setTypedWord(text.length > WORD_MAX_CHARS ? `…${text.slice(-WORD_MAX_CHARS)}` : text);
      setWordVisible(true);

      if (wordHoldTimeoutRef.current !== null) window.clearTimeout(wordHoldTimeoutRef.current);
      if (wordFadeTimeoutRef.current !== null) window.clearTimeout(wordFadeTimeoutRef.current);

      wordHoldTimeoutRef.current = window.setTimeout(() => {
        setWordVisible(false);
        wordFadeTimeoutRef.current = window.setTimeout(() => {
          setTypedWord(null);
          setWordVisible(true);
        }, 160);
      }, WORD_HOLD_MS);
    },
    [],
  );

  /** Publish whatever has been spelled, then let it fade on its own. */
  const settleWord = useCallback(() => {
    const text = bufferRef.current.trim();
    bufferRef.current = "";
    settleTimeoutRef.current = null;
    // One character is just the key that is already showing.
    if (text.length < 2) return;
    showWord(text);
  }, [showWord]);

  /** Called on every accepted keystroke: extends the word, restarts the clock. */
  const recordKeystroke = useCallback(
    (event: KeyboardEvent, masked: boolean) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Switching between a masked and a plain field starts a new buffer, so a
      // password's dots and an email's letters can never end up in one string.
      if (maskedRef.current !== masked) {
        bufferRef.current = "";
        maskedRef.current = masked;
      }

      if (event.key === "Backspace") {
        bufferRef.current = bufferRef.current.slice(0, -1);
      } else if (event.key.length === 1) {
        // THE MASK. The character itself is never stored, so there is nothing
        // in the buffer to leak later even if the readout logic changes.
        bufferRef.current += masked ? "•" : event.key;
      } else if (event.key !== "Enter" && event.key !== "Tab") {
        return; // Shift, arrows, F-keys — not part of a word
      }

      // A key pressed while a finished word is up starts the next one.
      clearWordTimers();

      if (masked) {
        /*
         * Dots track the field live rather than waiting for a pause. A masked
         * field shows its dot the instant the key goes down, and the readout
         * that stands in for it should not lag behind by a quarter second.
         */
        if (bufferRef.current.length === 0) {
          setTypedWord(null);
          setWordVisible(true);
        } else {
          showWord(bufferRef.current);
        }
        return;
      }

      setTypedWord(null);
      setWordVisible(true);

      // Enter and Tab end the word where they are; anything else waits for a
      // pause in the typing.
      if (event.key === "Enter" || event.key === "Tab") {
        settleWord();
        return;
      }
      settleTimeoutRef.current = window.setTimeout(settleWord, WORD_SETTLE_MS);
    },
    [clearWordTimers, settleWord, showWord],
  );

  useEffect(() => clearWordTimers, [clearWordTimers]);

  useEffect(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (activeKeyIds.length > 0) {
      setIndicatorParts(getActiveKeyParts(activeKeyIds));
      setIndicatorVisible(true);
      return;
    }

    if (indicatorPartsRef.current !== null) {
      holdTimeoutRef.current = window.setTimeout(() => {
        setIndicatorVisible(false);
        fadeTimeoutRef.current = window.setTimeout(() => {
          setIndicatorParts(null);
          setIndicatorVisible(true);
        }, 220);
      }, 550);
    }
  }, [activeKeyIds]);

  useEffect(
    () => () => {
      if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current);
      if (fadeTimeoutRef.current !== null) window.clearTimeout(fadeTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const held = new Set<string>();

    /*
     * THE GUARD.
     *
     * ONE RULE GOVERNS ALL OF THIS: the board never shows more than the field
     * itself is already showing. Everything below follows from it.
     *
     *   silent    the mirror is off, or the field opted out with
     *             `data-kb-private`. Nothing at all.
     *   masked    the field is masking its own value (`type="password"`), so
     *             the readout masks too — one dot per character, and NO KEY
     *             LIGHTS UP, because lighting the cap would spell out the
     *             character the dots exist to hide.
     *   plain     an ordinary field, or a password whose reveal toggle is on.
     *             Once the field itself is printing the characters on screen,
     *             a dot in the readout hides nothing that is not already there.
     *
     * One-time codes and card numbers stay masked whatever their `type` says.
     * They are never "revealed by a toggle" — they are simply secrets that
     * happen to live in a text input, and there is no user intent behind them
     * being visible to key off.
     */
    type FieldMode = "silent" | "masked" | "plain";

    const fieldMode = (target: EventTarget | null): FieldMode => {
      const el = target as HTMLElement | null;
      if (!el) return "plain";
      const tag = el.tagName?.toLowerCase();
      const isField = tag === "input" || tag === "textarea" || el.isContentEditable;
      if (!isField) return "plain"; // typing at the page, not into anything
      if (!mirrorTyping) return "silent";

      const input = el as HTMLInputElement;
      if (el.dataset.kbPrivate !== undefined) return "silent";
      if (input.type === "password") return "masked";

      const hint = `${input.name ?? ""} ${input.autocomplete ?? ""}`.toLowerCase();
      if (/otp|one-time-code|cc-number|cc-csc/.test(hint)) return "masked";
      return "plain";
    };

    const releaseKey = (id: string) => {
      if (!held.has(id)) return;
      held.delete(id);
      keyTriggersRef.current[id]?.release();
      deactivateKey(id);
    };

    const releaseAllHeld = () => {
      held.forEach((id) => {
        keyTriggersRef.current[id]?.release();
        deactivateKey(id);
      });
      held.clear();
    };

    const reconcileModifiers = (event: KeyboardEvent) => {
      if (typeof event.getModifierState !== "function") return;
      for (const { modifier, ids } of MODIFIER_FAMILIES) {
        if (!event.getModifierState(modifier)) for (const id of ids) releaseKey(id);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const mode = fieldMode(event.target);
      if (mode === "silent") return;
      reconcileModifiers(event);
      if (event.repeat) return;

      recordKeystroke(event, mode === "masked");

      // Masked fields stop here: dots in the readout, dark keys on the board.
      if (mode === "masked") return;

      const id = CODE_TO_KEY_ID[event.code];
      if (!id || held.has(id)) return;

      held.add(id);
      keyTriggersRef.current[id]?.press();
      activateKey(id);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (fieldMode(event.target) !== "plain") return;
      reconcileModifiers(event);
      const id = CODE_TO_KEY_ID[event.code];
      if (id) releaseKey(id);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) releaseAllHeld();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAllHeld);
    window.addEventListener("focus", releaseAllHeld);
    /* Tabbing out of a mirrored field into a silenced one strands its keyup,
       which would leave that key pressed forever. Clear on every focus move —
       and treat the move as the end of the word, since the next field is a new
       thought. */
    const handleFocusIn = () => {
      releaseAllHeld();
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
      settleWord();
    };
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAllHeld);
      window.removeEventListener("focus", releaseAllHeld);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activateKey, deactivateKey, mirrorTyping, recordKeystroke, settleWord]);

  return (
    <div
      className={cn(
        /* `overflow-x-clip`, not `-hidden`: `hidden` on one axis forces the
           other to `auto`, and the board's rotateX overflows its box by a
           couple of pixels — enough to raise a styled vertical scrollbar
           beside the keyboard. `clip` leaves overflow-y `visible`. */
        "flex w-full items-center justify-center overflow-x-clip",
        fullBleed && "min-h-dvh",
        className,
      )}
    >
      <style>{KEY_STYLE_TAG}</style>
      <div className="flex w-full flex-col items-center">
        {showIndicator && (
          <div
            className="flex items-center justify-center"
            style={{
              marginBottom: "clamp(0.65rem, 2.2vw, 1.15rem)",
              /* Sized to the taller chips below, so the row does not jump
                 height the moment the first key is pressed. */
              minHeight: "clamp(3.1rem, 4.6vw, 3.5rem)",
            }}
          >
            {/*
              Precedence: keys under the finger, then the word they spelled,
              then the resting prompt. The word outranks the trailing fade of
              the last keypress, so the readout hands off from key to word
              without a flash of empty space between them.
            */}
            {activeKeyIds.length === 0 && typedWord ? (
              <div
                style={{
                  opacity: wordVisible ? 1 : 0,
                  transition: "opacity 160ms ease-out",
                }}
              >
                <kbd className="block max-w-[min(28ch,80vw)] overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-brand-500/40 bg-white px-4 py-2 text-2xl font-bold tracking-tight text-ink-700 dark:border-brand-500/45 dark:bg-ink-900 dark:text-ink-200">
                  {typedWord}
                </kbd>
              </div>
            ) : (
            <div
              style={{
                opacity: indicatorVisible ? 1 : 0,
                transition: "opacity 220ms ease-out",
              }}
            >
              {indicatorParts && indicatorParts.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5">
                  {indicatorParts.map((part, i) => (
                    <Fragment key={`${part}-${i}`}>
                      {i > 0 && <span className="text-lg text-ink-400">+</span>}
                      <kbd className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-2xl font-bold tracking-tight text-ink-700 dark:border-white/15 dark:bg-ink-900 dark:text-ink-200">
                        {part}
                      </kbd>
                    </Fragment>
                  ))}
                </div>
              ) : (
                <span className="text-lg font-medium text-ink-500 dark:text-ink-400">
                  Press any key…
                </span>
              )}
            </div>
            )}
          </div>
        )}

        <div style={{ perspective: "1800px", width: "100%" }}>
          <div
            className="relative w-full"
            style={{ transform: "rotateX(7deg)", transformOrigin: "50% 100%" }}
          >
            <div
              className="absolute inset-x-[16%] top-[99%] -z-10 h-1 rounded-full blur-[1.5px]"
              style={{ background: palette.groundShadow }}
            />
            <div
              className="relative rounded-[var(--kb-case-radius)]"
              style={
                {
                  padding: caseTier.casePadding,
                  background: palette.caseGradient,
                  boxShadow:
                    "0 0.5px 0 rgba(255,222,185,0.18) inset, 0 -2px 4.5px rgba(35,19,6,0.32) inset, 0.4px 0.4px 0.8px rgba(255,232,200,0.14) inset, 0 3px 6px rgba(15,8,3,0.22), 0 1px 2px rgba(15,8,3,0.2)",
                  "--kb-case-radius": caseTier.caseRadius,
                  "--kb-bezel-radius": caseTier.bezelRadius,
                } as CSSProperties
              }
            >
              {[
                { uri: WOOD_TONE_URI, size: "520px 520px", opacity: 0.46, blend: "multiply" as const },
                { uri: WOOD_GRAIN_URI, size: "460px 460px", opacity: 0.5, blend: "multiply" as const },
                { uri: WOOD_GRAIN_FINE_URI, size: "300px 300px", opacity: 0.24, blend: "multiply" as const },
                { uri: WOOD_PORE_URI, size: "130px 130px", opacity: 0.34, blend: "multiply" as const },
                { uri: WOOD_MICROSCRATCH_URI, size: "620px 420px", opacity: 0.5, blend: "screen" as const },
              ].map((layer, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)]"
                  style={{
                    backgroundImage: `url("${layer.uri}")`,
                    backgroundSize: layer.size,
                    opacity: layer.opacity * palette.textureScale,
                    mixBlendMode: layer.blend,
                  }}
                />
              ))}

              <div
                className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)]"
                style={{
                  background:
                    "linear-gradient(112deg, transparent 30%, rgba(255,244,222,0.06) 44%, rgba(255,244,222,0.1) 49%, rgba(255,244,222,0.05) 54%, transparent 68%)",
                  mixBlendMode: "screen",
                }}
              />
              <div
                className="pointer-events-none absolute rounded-tl-[var(--kb-case-radius)] mix-blend-multiply"
                style={{
                  left: 0,
                  top: 0,
                  width: "9%",
                  height: "18%",
                  backgroundImage: `url("${END_GRAIN_URI}")`,
                  backgroundSize: "80px 80px",
                  opacity: 0.56,
                  maskImage: "radial-gradient(ellipse at top left, black, transparent 75%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)]"
                style={{
                  boxShadow: isDark
                    ? "inset 0 1px 0 rgba(255,236,205,0.16), inset 0 -1px 0 rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,236,205,0.07), inset -1px 0 0 rgba(0,0,0,0.45)"
                    : "inset 0 1px 0 rgba(255,246,224,0.6), inset 0 -1px 0 rgba(10,6,2,0.55), inset 1px 0 0 rgba(255,246,224,0.26), inset -1px 0 0 rgba(10,6,2,0.36)",
                }}
              />

              <div
                className="relative rounded-[var(--kb-bezel-radius)]"
                style={{
                  padding: caseTier.bezelPadding,
                  background: palette.bezelGradient,
                  boxShadow:
                    "inset 0 2.5px 6px rgba(0,0,0,0.55), inset 0 4px 8px rgba(0,0,0,0.28), inset 0 -1px 0 rgba(255,255,255,0.04), inset 0 0.5px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.32), 0 1px 0 rgba(255,236,204,0.1)",
                }}
              >
                <div className="relative z-10 flex flex-col" style={{ gap }}>
                  {rows.map((row, i) => (
                    <div key={i} className="flex" style={{ gap }}>
                      {row.map((key) => (
                        <Key
                          key={key.id}
                          config={key}
                          rowIndex={i}
                          tier={tier}
                          palette={palette}
                          registerTrigger={registerTrigger}
                          onActivate={activateKey}
                          onDeactivate={deactivateKey}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { VintageKeyboard as Component };
