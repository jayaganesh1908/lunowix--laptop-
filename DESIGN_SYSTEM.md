# Lunowix Design System

Extracted from `styles/globals.css`, which remains the **source of truth**. This document
explains the reasoning; the CSS holds the values. If they disagree, the CSS is right and this
file is stale.

Measurements throughout are **CIELAB L\*** (perceptual lightness, 0–100) and **chroma**
(saturation, distance from the neutral axis). WCAG contrast ratios are used only for text.

---

## Why L\*, not contrast ratio

For **text**, use WCAG contrast ratio — that is what it was designed for.

For **surfaces sitting on other surfaces**, it is useless at the dark end. The ratio's `+0.05`
flare term compresses every dark pair into roughly 1.1–1.3 whether the card is clearly visible
or completely invisible. The dark card at `#1F1810` on `#2F2519` measured 1.17:1 while being
functionally invisible; at `#16110B` it measures 1.25:1 and reads as a solid object. The ratio
barely moved. L\* moved from 6.6 to 10.1 and describes what actually changed.

**Judge surface separation in L\*. Judge text in contrast ratio.**

---

## Colour

### Brand

`#FF7D29` is the light accent, `#FA7D09` the dark one. Steps 400/500/600 are re-pointed under
`.dark` so every `brand-*` utility re-tints at once with no per-component changes.

600 and 700 are deliberately deeper than a naive ramp so they clear WCAG AA **as text on a light
surface**: 600 measures 4.78:1 on white, 700 measures 6.6:1. A conventional `#E05C00` at 600
would reach only 3.9:1 and quietly fail every eyebrow label and link in the app.

Dark's `brand-400` is `#FF9E45`, a lightened tint rather than the palette value — `#FA7D09` on
the `#4A3F35` card measures 3.90:1, below AA. The tint keeps the hue and clears it at 4.98:1.

### Ink

Steps 300–700 are **neutral on purpose**. They are text and control steps, not surfaces:
`text-ink-700` is light-mode button text and `text-ink-500` is light-mode muted text, so pushing
the palette's reds into them would turn ordinary UI copy red. Only the surface ends carry hue.

`ink-400` is the muted-text step for **dark** surfaces, `ink-500` the one for **light**. No single
grey clears 4.5:1 against both ends — the requirements are mutually exclusive — so the pairing is
always `text-ink-500 dark:text-ink-400`.

---

## The surface ladder

The single most important rule in this system: **a card must never sit near the page's
lightness**, or it loses its silhouette and dissolves into the background.

The two themes separate in **opposite directions**, and that is deliberate.

### Dark — the page is the ceiling, cards go down

| role | token | value | L\* |
|---|---|---|---|
| raised (dropdowns, active pills) | `ink-800` | `#4A3F35` | 26.6 |
| **page** | `ink-850` | `#2F2519` | 15.5 |
| header glass (`ink-900/60` over page) | — | `#201911` | 9.3 |
| **card** | `ink-900` | `#16110B` | 5.4 |
| wells, 3D edge faces, scrims | `ink-950` | `#0A0704` | 2.0 |

Page → card gap: **10.09 L\***.

On a mid-brown page a card one step *lighter* reads as a wash rather than an object, so the card
goes deeper instead. `ink-950` follows it down so the recessed layer stays below the card rather
than level with it.

### Light — the card is the ceiling, the page goes down

| role | token | value | L\* |
|---|---|---|---|
| **card** | `bg-white` | `#FFFFFF` | 100 |
| header glass (`white/75` over page) | — | `#FCFBF7` | 98.7 |
| **page**, image wells, footer ground | `ink-50` | `#F5F1DE` | 95.0 |
| badge / chip | `ink-100` | `#FFEEA9` | 94.0 |
| footer band (`ink-900/5` over page) | — | `#EAE6D4` | 91.1 |

Page → card gap: **5.01 L\***.

Light mode has **no headroom on the card side** — white is the ceiling — so separation has to come
from lowering the ground. `ink-50` is therefore deeper than the authored `#FEFFD2`, the one place
the palette is not taken literally. At `#FEFFD2` the gap was 1.08 L\*: no silhouette at all, the
same failure dark mode had.

Chroma drops 22.7 → 9.8 in the same move. `#FEFFD2` across a full viewport read as highlighter
yellow rather than as warmth.

Because `ink-50` is also the light image well and the footer ground, both gain the same recess
for free.

---

## Card glow

Every card carries a brand bloom **at rest**, not only on hover. A hover-only glow means that on
a full grid at most one card carries any accent and the rest read as flat panels.

| variable | light | dark | what it controls |
|---|---|---|---|
| `--card-glow` | `255 125 41` | `250 125 9` | accent, raw channels so alpha can vary |
| `--card-glow-strength` | `0.24` | `0.32` | resting bloom |
| `--card-glow-hover` | `0.40` | `0.60` | hover bloom |
| `--card-ring-width` | `3px` | `3px` | hover stroke thickness |
| `--card-ring-hover` | `0.35` | `0.45` | hover stroke alpha |

**Width and alpha of the hover stroke are separate knobs on purpose.** Widening reads as a
heavier frame; raising alpha reads as a hotter colour. Reach for width first.

The two themes are not at parity, and should not be. In light the bloom **darkens** its ground;
in dark it **lights** it. Measured peak deviation from the page: light 7.6 L\*, dark 17.0 L\*. A
light theme carrying a dark theme's glow reads as a rendering fault, not as atmosphere.

Composed shadows live in `--card-shadow` / `--card-shadow-hover` so `.card-surface` and every
`hover:shadow-[var(--card-shadow-hover)]` share one definition.

---

## Glow on a drawn path

`box-shadow` follows an element's **box**, so on an SVG it draws a glowing rectangle rather than
tracing the stroke. `.glow-stroke` uses `drop-shadow`, which follows the **rendered alpha**.

Two passes, not one: the tight pass keeps the line's own edge crisp, the wide pass supplies the
halo. A single wide shadow just makes the stroke look out of focus.

Driven by `currentColor` so the glow tracks the stroke's colour *and* alpha with no second value
to keep in sync.

---

## Motion

Colour-only transitions are applied globally (`background-color`, `border-color`, `color`,
`fill`, `stroke`) at 200ms. Layout and transforms are deliberately excluded so Framer Motion
animations stay on the compositor.

`prefers-reduced-motion` is honoured in CSS **and** in JS — the CSS block covers CSS animations
and transitions, but Framer Motion and canvas loops run in JS and are untouched by it, so they
opt out via `usePrefersReducedMotion`.

Tilt is a vestibular trigger, so `useTilt` returns a flat, inert style and no-op handlers under
reduced motion. The cursor glare is additionally gated on `useHoverCapable` — the tilt handlers
are harmless without a pointer since `mousemove` never fires, but the glare would render frozen
at dead centre on every touch device.

---

## Known gaps

- `components/<domain>/index.tsx` files duplicate the individual component files rather than
  re-exporting them. The two copies have drifted more than once. Any styling change must be
  applied to both until they are consolidated.
- `lib/types/laptop.ts` and `lib/types/index.ts` both define `Laptop`, producing 8 pre-existing
  `tsc` errors.
- Non-card orange glows still carry the pre-migration `rgba(255,107,0)` = `#FF6B00`: the primary
  button gradient, the logo mark, the section background washes, the admin chart hover fills.
