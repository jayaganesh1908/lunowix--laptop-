# Lunowix

A laptop recommendation site built around what people actually do with a machine —
budget, games, and the software they open every morning — rather than a raw spec table.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Supabase (Postgres + Auth) · Framer Motion · Recharts.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Backend

Auth and the catalogue run on Supabase. **The app boots without it** — with no
credentials it serves the static catalogue in `lib/data` and shows a "not
configured" notice on the sign-in screen, so a fresh clone runs immediately.

To switch it onto a real backend, follow **[SETUP.md](SETUP.md)**: create the
project, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
copy three keys into `.env.local`, then:

```bash
npm run seed
```

**Auth** covers Google and GitHub OAuth (Discord, GitLab and Apple are wired and
one env var away), email + password, magic link, and password reset. Sessions are
httpOnly cookies refreshed in `middleware.ts`; `/profile` and `/admin` redirect to
sign-in when signed out.

**Security** is enforced in Postgres, not the app. Row Level Security makes the
catalogue world-readable and admin-writable, and scopes wishlists, comparisons and
profiles to their owner — so a leaked anon key exposes nothing a visitor could not
already see. The `service_role` key is server-only and used by exactly two things:
the seed script and stamping `welcome_email_sent_at`.

**A welcome email** goes out on first sign-in via Resend, guarded by
`welcome_email_sent_at` so signing in again never re-sends. It is fired from both
the OAuth callback and the password sign-up action, because which one runs depends
on whether email confirmation is enabled. A failed send never fails a login.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero with animated particles, budget bands, featured laptops, feature grid, newsletter |
| `/laptops` | Full catalogue with sidebar filters, sort, pagination — all state mirrored in the URL |
| `/laptops/[id]` | Gallery, specs, animated performance meters, game benchmarks, software compatibility, reviews, alternatives |
| `/compare` | Two-slot autocomplete selector and a side-by-side table that marks the stronger figure in every row |
| `/wishlist` | Saved machines with remove / compare / view actions |
| `/search` | Debounced search across names, silicon, budgets, playable games and supported software |
| `/about` | Methodology — how every score in the site is produced |
| `/contact` | Validated contact form with real error, loading and success states |
| `/auth/login`, `/auth/register` | Demo auth forms with full client-side validation |
| `/profile` | Account summary, wishlist and comparison history |
| `/admin` | Dashboard cards, three Recharts visualisations, and browsable laptop / user / review / game / software tables |

All 25 detail pages are statically generated via `generateStaticParams`.

## The scoring model

The demo data is 25 laptops with realistic Indian-market pricing. Only the hardware is
authored by hand — every score, frame rate and compatibility rating is **derived** in
`lib/data/laptops.ts`, so the same rules apply to every machine and nothing has a thumb
on the scale.

**Performance scores** (0-100, seven per laptop). Processors and GPUs sit on normalised
score tables. Memory, storage, panel and battery figures feed in with fixed weights:

- `coding` — CPU 60%, RAM 28%, storage 12%
- `gaming` — GPU 72%, CPU 18%, refresh rate 10%
- `editing` — CPU 40%, GPU 30%, RAM 20%, storage 10%
- `battery` — rated runtime, scaled
- `display` — resolution 50%, refresh 30%, panel bonus (OLED > Mini LED > IPS)
- `aiDevelopment` — VRAM 45%, GPU 30%, CPU 15%, RAM 10% (local inference is VRAM-bound first)
- `overall` — weighted blend of the six above

**Game benchmarks.** Each of the ten games carries a `demand` value: the GPU score needed
to hold ~60fps at High, 1080p. Frame rates scale from that anchor with an exponent of 0.8,
then the preset steps up to Ultra where there is headroom or down to Medium/Low where there
is not. CPU-bound titles (Valorant, CS2, Minecraft) weight the CPU at 45% instead of 15%.

**Software compatibility.** Each of the eleven applications declares the CPU score, GPU
score and RAM it needs to merely "Run Fine". A machine is rated on the **weakest** of those
three ratios, which is why a fast chip paired with 8GB still gets flagged for Premiere Pro.

These are modelled estimates, not measured benchmark runs — the site says so on every page
that shows one.

## Architecture

```
app/          routes (server components by default)
components/   layout · home · laptops · details · compare · admin · common · providers
components/ui shadcn-convention primitives (Particles)
lib/data/     laptops, games, software, users — the swap-in point for a real API
lib/hooks/    useLocalStorage, useTheme, useWishlist, useCompare, useAuth, useDebouncedValue
lib/types/    Laptop, Game, Software
lib/utils/    cn, formatters, animations, filterParams
scripts/      generate-images.mjs
styles/       globals.css (design tokens + component utilities)
```

**State.** Theme uses React context plus `localStorage`. Wishlist and compare are built on
`useLocalStorage`, which is a `useSyncExternalStore` wrapper with a shared subscriber
registry — every hook instance for a key re-renders together, so toggling a heart on a card
updates the navbar badge with no provider in between, and `storage` events keep other tabs
in sync. Filters and search live in the URL so any view can be shared or bookmarked.

**Swapping in a backend.** `lib/data` is the only place that knows where data comes from.
Replacing those modules with API calls leaves the types, components and pages untouched.

## Design decisions worth knowing

**Button contrast.** White text on the brand orange `#FF6B00` measures **2.6:1** — well below
the WCAG AA threshold of 4.5:1. Primary buttons therefore use near-black `ink-950` on the
orange gradient, which measures **6.9:1**. Orange remains the accent for borders, glows,
icons and badges. To ship white-on-orange instead, change the `primary` entry in
`components/common/buttonStyles.ts` — and accept the AA failure.

`buttonStyles` deliberately lives in its own module without `"use client"` so server
components can style a `<Link>` with the same tokens the interactive `<Button>` uses.

**Search relevance.** Every laptop carries an entry for all ten games and all eleven apps,
so indexing them unconditionally would make a search for "Cyberpunk" match the entire
catalogue. Only games that clear 60fps and apps rated at least "Runs Fine" are indexed, so
searching a title answers the question being asked: which of these can run it?

**Hero particle field.** `components/ui/particles.tsx` is a canvas field that drifts on its
own and parallaxes toward the pointer. It replaced a hand-rolled layer of ten Framer Motion
spans — one canvas and one rAF loop instead of ten independently animated DOM nodes, at ~14×
the particle count. shadcn is not initialised in this project, but the component follows the
`components/ui` convention so `npx shadcn@latest init` can be added later without moving it.

Note that every particle fades in from `alpha: 0` **inside** the animation loop. Anything
that skips the loop — as the `prefers-reduced-motion` branch does — must seed the alpha, or
the canvas stays permanently blank.

**Imagery.** Product shots are generated locally as SVG rather than pulled from Unsplash, so
the site renders identically offline and never shows a broken image. Regenerate with:

```bash
node scripts/generate-images.mjs
```

The generator reads the laptop ids straight out of `lib/data/laptops.ts`, so the two cannot
drift apart. Because `next/image` refuses to optimise SVG by default, `next.config.ts`
enables `dangerouslyAllowSVG` alongside a sandboxing CSP — the served files can neither run
script nor embed anything external.

## Palette

Orange is the brand; everything else is built to serve it.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `brand-500` | `#FF6B00` | `#FF6B00` | The brand colour. Decorative only — fills, glows, borders, icons |
| `brand-600` / `700` | `#C24E00` / `#9C3E00` | — | Brand as *text* (4.8:1 / 6.6:1 on white) |
| `brand-300` / `400` | — | `#FFA164` / `#FF8531` | Brand as text on dark |
| `ink-50` | `#FAF8F6` | — | Page background |
| `white` | `#FFFFFF` | — | Card background |
| `ink-950` | — | `#0A0A0A` | Page background |
| `ink-900` | — | `#121212` | Card background |
| `ink-500` / `ink-400` | `#605952` | `#8B837C` | Muted text (light / dark) |

Two deliberate choices:

**The ramp warms toward the light end and neutralises toward the dark end.** Light surfaces
carry a warm cast (hue ≈ 25°, matching the orange) because pure grey next to a saturated
orange makes the orange look bolted on. Dark surfaces are true neutral black — a warm
near-black made the whole dark theme look tinted, and orange has more presence against
neutral anyway.

**Light mode is off-white with white cards**, not white with white cards. The page tint is
what lets a card have an edge without relying on a heavy shadow.

Semantic colours avoid the brand hue so they can never be confused with it: success is
emerald, info is sky, warning is **yellow** (not amber — amber is essentially brand orange),
danger is **rose** (not red — red sits too close to orange).

`brand-500` is never used for text. It measures 3.2:1 on white, so it is reserved for fills
and decoration, and `brand-600`/`700` carry any text that needs to look orange.

## Dark mode

Class-based, toggled on `<html>`. The navbar control is a straight light ↔ dark switch;
`system` is the first-visit default and stays selectable in the admin settings panel. It
used to cycle light → dark → system, which looked broken whenever the OS preference matched
one of the two — `system` rendered identically, so every other click appeared to do nothing.

An inline script in the root layout applies the stored preference before first paint, so
there is no flash of the wrong theme. Colour transitions are limited to `background-color`,
`border-color`, `color`, `fill` and `stroke`, leaving Framer Motion transforms on the
compositor.

**Fonts.** The next/font variables sit on `<html>` and the font tokens use Tailwind's
`@theme inline`, because a plain `@theme` block resolves `var(--font-geist-sans)` at
`:root` — where the variable is not yet defined — and silently falls back to system fonts.

## Verified

- `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean; 40 routes prerendered.
- No console or server errors on any route.
- No horizontal overflow at 375px on any page; wide tables scroll inside their own container.
- Wishlist and compare persist across reloads and sync across components without a provider.
- Filters, sort and pagination round-trip through the URL.
- Comparison table highlights the correct winner per row, including ties.
- Theme choice survives reload with no flash.

## Notes

Prices, review counts and users are illustrative demo data, not live retail figures.
Authentication is demo-only: passwords are validated for shape and then discarded — only a
name and email are kept in the browser.
