# Design Lessons

Mistakes made and corrections learned, so they are not repeated. Newest first.

---

## WCAG contrast ratio is the wrong instrument for surfaces

A comment in `globals.css` claimed the dark page/card pair measured **1.72:1**. It actually
measured **1.17:1** — and the pair was visibly indistinguishable.

The ratio's `+0.05` flare term compresses every dark pair into 1.1–1.3 regardless of whether the
surfaces are distinguishable. Fixing the card moved the ratio 1.17 → 1.25, which reads as noise,
while L\* moved 6.6 → 10.1 and described the real change.

**Use contrast ratio for text. Use L\* for surfaces.**

---

## Tailwind opacity modifiers serialise as `oklab()`, and string-parsing silently misreads them

`getComputedStyle(el).backgroundColor` on anything with an opacity modifier returns
`oklab(0.181783 0.00447655 0.0136081 / 0.6)`. A regex that grabs the first three numbers treats
`0.18, 0.004, 0.014` as RGB — i.e. near-black — and every downstream measurement is wrong but
plausible-looking.

This produced two confidently reported wrong numbers before it was caught.

**Resolve colours through a canvas** (`fillStyle = value`, then `getImageData`). The browser does
the conversion; every CSS Color 4 syntax works, including `color-mix()`.

---

## A design fix can move a number the "wrong" way and still be correct

Deepening the page token made the card border's contrast against the page drop from 1.58:1 to
1.43:1 — while the design got substantially better.

The border had been compensating for a missing tonal gap and failing at it. Once the 5 L\* gap
did the separation work, the border became a warm edge detail rather than a load-bearing
outline.

**Judge the number against its job, not its direction.**

---

## Light and dark are not mirrors, and forcing parity breaks them

Three separate places where the naive symmetric choice was wrong:

- **Separation direction.** Dark separates *downward* (card darker than page); light separates
  *upward*. On a mid-brown page a lighter card washes out; on a cream page there is no headroom
  above white, so the *ground* must move instead.
- **Glow strength.** In light the bloom darkens its ground, in dark it lights it. Equal alpha
  gives wildly unequal presence: 0.16 light read weaker than 0.32 dark by more than the numbers
  suggest.
- **Muted text.** No single grey clears 4.5:1 on both a light and a dark surface. The requirement
  is mutually exclusive, hence the permanent `text-ink-500 dark:text-ink-400` pairing.

---

## Hover-only accents leave the majority of the UI with no accent

The card glow was hover-only, so on a grid of 18 cards at most one carried any brand colour. The
grids read as flat panels and the palette looked absent from the product surfaces.

**Give the resting state the treatment; make hover a step up, not the only state.**

---

## A JSX comment before the root element breaks the component

```jsx
return (
  {/* comment */}
  <footer>…</footer>
)
```

Two children in a `return` with no fragment → build error, HTTP 500, blank page. It broke every
route until fixed.

**Put explanatory comments above the `return` as ordinary `/* */`,** or inside the root element.

---

## Content that only becomes visible via JS is invisible when the JS does not run

26 elements ship with inline `opacity: 0` from Framer Motion's `initial="hidden"` and become
visible only when a `whileInView` observer fires. When Fast Refresh remounted them, `once: true`
did not re-arm and the cards stayed invisible — a fully rendered page that looked empty.

The same failure mode applies to a slow device, a JS error, or a failed chunk load.

**Unresolved.** Options: drop `once: true`, gate `initial` on reduced motion, or move the reveal
to CSS so the visible state is the default and the animation is purely additive.

---

## Duplicated component files drift, and drift in opposite directions

`components/layout/Navbar.tsx` and `components/layout/index.tsx` both defined `NAV_LINKS`.
`index.tsx` had gained `/phones` and `/headphones` but lost `/contact`; `Navbar.tsx` — the copy
actually mounted by `app/layout.tsx`, and therefore the one users saw — had `/contact` but
neither category.

Two entire product categories, fully built with data and detail routes, were unreachable except
by typing the URL.

**Derive lists from a single source** (`categories` in `lib/types`) rather than writing them out
per copy. The metadata already described itself as "consumed by the nav" — nothing consumed it.
