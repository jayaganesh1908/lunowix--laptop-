/**
 * Generates the placeholder product imagery in `public/laptop-images` plus the
 * brand wordmarks in `public/logos`.
 *
 * Everything ships as local SVG rather than remote photography so the demo has
 * no external image dependency and renders identically offline.
 *
 *   node scripts/generate-images.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = resolve(root, "public/laptop-images");
const logosDir = resolve(root, "public/logos");

mkdirSync(imagesDir, { recursive: true });
mkdirSync(logosDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* Pull ids + brands straight out of the data file so the two cannot   */
/* drift apart.                                                        */
/* ------------------------------------------------------------------ */

const source = readFileSync(resolve(root, "lib/data/laptops.ts"), "utf8");

const entries = [];
const entryPattern = /\n\s*id:\s*"([a-z0-9-]+)",\n\s*name:\s*"([^"]+)",\n\s*brand:\s*"([A-Za-z]+)"/g;
let match;
while ((match = entryPattern.exec(source)) !== null) {
  entries.push({ id: match[1], name: match[2], brand: match[3] });
}

if (entries.length === 0) {
  throw new Error("No laptop seeds found — did lib/data/laptops.ts change shape?");
}

/* ------------------------------------------------------------------ */
/* Deterministic per-laptop palette                                    */
/* ------------------------------------------------------------------ */

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const BRAND_TINT = {
  Lenovo: 8,
  HP: 196,
  Dell: 210,
  ASUS: 268,
  Acer: 128,
  MSI: 348,
  Samsung: 226,
};

function palette(id, brand, variant) {
  const seed = hash(`${id}-${variant}`);
  const tint = BRAND_TINT[brand] ?? 24;
  const spin = (seed % 18) - 9;
  return {
    bgFrom: `hsl(${tint + spin} 22% ${variant === 3 ? 13 : 9}%)`,
    bgTo: `hsl(${tint + spin + 12} 26% ${variant === 2 ? 6 : 4}%)`,
    glow: `hsl(24 100% 50%)`,
    chassis: `hsl(${tint + spin} 8% ${variant === 3 ? 26 : 21}%)`,
    chassisDark: `hsl(${tint + spin} 9% 14%)`,
    screen: `hsl(${tint + spin} 30% 8%)`,
  };
}

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------------ */
/* Laptop illustrations                                                */
/* ------------------------------------------------------------------ */

function screenContent(p, seed) {
  // Abstract "UI" bars so the screen reads as a running machine, not a void.
  const bars = [];
  for (let row = 0; row < 6; row += 1) {
    const width = 90 + ((seed >> (row * 3)) % 5) * 46;
    const opacity = 0.16 + ((seed >> row) % 4) * 0.07;
    bars.push(
      `<rect x="${330}" y="${292 + row * 30}" width="${width}" height="10" rx="5" fill="${p.glow}" opacity="${opacity.toFixed(2)}"/>`,
    );
  }
  return bars.join("");
}

function laptopSvg({ id, name, brand }, variant) {
  const p = palette(id, brand, variant);
  const seed = hash(id + variant);
  const rotate = variant === 2 ? -6 : variant === 3 ? 0 : 0;
  const scale = variant === 2 ? 0.92 : variant === 3 ? 0.86 : 1;

  const openLaptop = `
    <g transform="translate(600 470) rotate(${rotate}) scale(${scale}) translate(-600 -470)">
      <!-- lid -->
      <rect x="300" y="238" width="600" height="368" rx="18" fill="${p.chassis}"/>
      <rect x="316" y="254" width="568" height="316" rx="10" fill="${p.screen}"/>
      <rect x="316" y="254" width="568" height="316" rx="10" fill="url(#screenGlow${variant})"/>
      ${screenContent(p, seed)}
      <rect x="316" y="254" width="568" height="316" rx="10" fill="none" stroke="${p.glow}" stroke-opacity="0.28"/>
      <circle cx="600" cy="248" r="3.5" fill="${p.chassisDark}"/>
      <!-- base -->
      <path d="M232 606h736l46 62a14 14 0 0 1-11.4 22.2H197.4A14 14 0 0 1 186 668l46-62Z" fill="${p.chassisDark}"/>
      <path d="M232 606h736l16 22H216l16-22Z" fill="${p.chassis}"/>
      <rect x="516" y="662" width="168" height="9" rx="4.5" fill="${p.glow}" opacity="0.45"/>
    </g>`;

  const closedLaptop = `
    <g transform="translate(600 470) rotate(-14) translate(-600 -470)">
      <rect x="286" y="300" width="628" height="392" rx="26" fill="${p.chassis}"/>
      <rect x="302" y="316" width="596" height="360" rx="18" fill="${p.chassisDark}" opacity="0.55"/>
      <g transform="translate(600 496)">
        <rect x="-58" y="-40" width="116" height="80" rx="16" fill="none" stroke="${p.glow}" stroke-width="6" stroke-opacity="0.85"/>
        <path d="M-78 44h156l10 14H-88l10-14Z" fill="${p.glow}" opacity="0.85"/>
      </g>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900" role="img" aria-label="${escape(name)}">
  <defs>
    <linearGradient id="bg${variant}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bgFrom}"/>
      <stop offset="100%" stop-color="${p.bgTo}"/>
    </linearGradient>
    <radialGradient id="halo${variant}" cx="50%" cy="${variant === 2 ? 70 : 28}%" r="60%">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="screenGlow${variant}" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0.02"/>
    </linearGradient>
    <pattern id="grid${variant}" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0v48" fill="none" stroke="#ffffff" stroke-opacity="0.035"/>
    </pattern>
  </defs>

  <rect width="1200" height="900" fill="url(#bg${variant})"/>
  <rect width="1200" height="900" fill="url(#grid${variant})"/>
  <rect width="1200" height="900" fill="url(#halo${variant})"/>

  ${variant === 3 ? closedLaptop : openLaptop}

  <g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif">
    <text x="72" y="112" fill="${p.glow}" font-size="30" font-weight="700" letter-spacing="7">${escape(brand.toUpperCase())}</text>
    <text x="72" y="164" fill="#ffffff" fill-opacity="0.92" font-size="42" font-weight="700">${escape(name)}</text>
    <text x="72" y="836" fill="#ffffff" fill-opacity="0.4" font-size="24" letter-spacing="4">LUNOWIX</text>
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Brand wordmarks                                                     */
/* ------------------------------------------------------------------ */

function logoSvg(brand) {
  const tint = BRAND_TINT[brand] ?? 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" width="240" height="64" role="img" aria-label="${brand}">
  <rect width="240" height="64" rx="14" fill="hsl(${tint} 20% 12%)"/>
  <rect x="16" y="16" width="32" height="32" rx="9" fill="hsl(24 100% 50%)"/>
  <text x="62" y="41" font-family="ui-sans-serif, system-ui, sans-serif" font-size="24" font-weight="700" fill="#ffffff" letter-spacing="1">${brand}</text>
</svg>
`;
}

/* ------------------------------------------------------------------ */

let written = 0;
for (const entry of entries) {
  for (const variant of [1, 2, 3]) {
    writeFileSync(
      resolve(imagesDir, `${entry.id}-${variant}.svg`),
      laptopSvg(entry, variant),
      "utf8",
    );
    written += 1;
  }
}

const brands = [...new Set(entries.map((entry) => entry.brand))];
for (const brand of brands) {
  writeFileSync(resolve(logosDir, `${brand.toLowerCase()}.svg`), logoSvg(brand), "utf8");
  written += 1;
}

console.log(`Generated ${written} files for ${entries.length} laptops.`);
