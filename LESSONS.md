# Design Lessons

Mistakes made and corrections learned, so they are not repeated. Newest first.

---

## Two `createContext()` calls are two contexts, and the second one fails silently

`components/providers/index.tsx` held a duplicate `ToastProvider` — including its
own `const ToastContext = createContext(null)`. `app/layout.tsx` mounts the provider from
`ToastProvider.tsx`, so `useToast` imported from the barrel resolved against a context with no
provider above it, hit the deliberate "safe outside the provider" no-op fallback, and returned a
`toast()` that did nothing at all.

`ProductCard` imported from the barrel. So every wishlist and compare confirmation on
`/phones`, `/headphones`, `/products`, `/search` and the home featured row was **silently
dropped**, while `LaptopCard` — which imports from `./ToastProvider` directly — showed its toast
normally. Nothing threw. Nothing logged. Two identical-looking buttons behaved differently
depending on which import path their file had used.

The no-op fallback is what made it invisible. It exists so components stay portable, which is
reasonable, and it converts "this is mounted wrong" into "this quietly does nothing".

**A context object's identity is the contract, not its shape.** A duplicated provider is not a
duplicate — it is a second, unreachable one.

---

## A stretched link covers the buttons above it, because DOM order breaks the tie

Both product cards use the stretched-link pattern for the title:
`after:absolute after:inset-0`, so the whole card is clickable. The wishlist and compare buttons
sit in an absolutely positioned strip over the image, earlier in the DOM.

Neither had a `z-index`. Positioned elements at `z-index: auto` paint in DOM order, so the
title's `::after` — later in the markup — painted **on top of the buttons across the entire
card**. Clicking the heart navigated to the product page instead of saving. On every grid on the
site, for both card components, for both controls.

It survived review because it looks right in the markup (the buttons are visually on top, and
they respond to hover) and because the click still *did something* — just the wrong thing, which
reads as a mis-tap rather than a bug.

Found by Playwright, which reports the element that actually receives a click rather than the one
you aimed at.

**With `inset-0` overlays, state the stacking explicitly.** `z-10` on the controls; not a lower
`z-index` on the overlay, which would put it under the card body and break the card click.

---

## `Intl` is not deterministic across runtimes, so it cannot be used during render

`formatCompact` was `Intl.NumberFormat("en-IN", { notation: "compact" })`. The locale was pinned,
so it looked safe. It was not:

| Runtime | 8,616 formats as |
| --- | --- |
| Node 22 (ICU 78) | `8.6K` |
| Chromium (newer CLDR) | `8.6T` |

Newer CLDR added an Indian-English short form where **T means thousand**. Server and client
rendered different text from the same number, React failed hydration on `/admin`, and it threw
away and regenerated the subtree. Pinning the locale does not help, because the disagreement is
about the locale's *data*, which ships with each runtime and changes on its own schedule.

It also produced a number nobody can read: "8.6T" is trillions to almost everybody.

**For text that both sides render, use arithmetic, not locale data.** The replacement is nine
lines of division and gives one answer everywhere. Keep `Intl` for client-only rendering, or send
a formatted snapshot from the server.

---

## `force-static` silently empties `searchParams`

`/api/products` was declared `export const dynamic = "force-static"` on the reasoning that the
catalogue only changes at build time. That is true of the *data* and false of the *response*.

A statically rendered route handler has no request to read, so `new URL(request.url).searchParams`
came back empty. `?category=phone&sort=price-asc&limit=3` returned 24 unsorted products of every
category — with a **200**. Worse, the validation below it never ran, so the deliberate 400s for a
bad `limit` or an unknown `category` were unreachable and the endpoint looked permissive rather
than broken.

Caught only because a test asserted on the *contents* of the response. A status-code assertion
would have passed.

**Anything that varies by query string is dynamic by definition.** Cacheability is a property of
the response, not of where the data came from.

---

## Sharing a zod schema with the browser ships zod to the browser

Client and server were validating with the same imported schemas, so the two could not disagree
about what a valid password was. Good intent; it added **~74 KB to first load on every product
page** — the most-visited page on a comparison site — because importing a schema module into a
client component pulls zod into the bundle.

The fix keeps the single source of truth one level lower: the bounds and messages live in a
plain module of constants and pure functions, the server builds its zod schemas from those
constants, and the forms import only the functions. Parity is now a tested property rather than
a shared import — the test runs the same values through both and asserts they agree.

**Share the rule, not the implementation of the rule.**

---

## `isVisible()` does not wait, so it tests the wrong instant

A Playwright assertion reported that a posted review never appeared. It had appeared — the API
returned 201 and the DOM updated about 200ms later.

`locator.isVisible()` answers for the DOM as it is and returns immediately. It accepts a
`timeout` option, which does nothing useful here, so `isVisible({ timeout: 10000 })` reads exactly
like a polling assertion and is not one. Anything waiting on a fetch plus a re-render has to use
`waitFor` or `expect`.

Cost an afternoon chasing a bug that did not exist — and, more dangerously, the same mistake
inverted would make a test pass while the feature was broken.

**A false failure and a false pass come from the same mistake.** Check that a failing assertion
is actually asserting what you think before believing it.

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

---

## Killing the parent leaves the server running, and the next probe reads the old one

While verifying `/api/health` against a real build, a probe script started `npm start`, curled the
endpoint, then ran `kill $!`. That kills `npm`, not the `next-server` child it spawned. The orphan
kept the port, so the next case failed to bind and curl answered from the **previous** case's
server — with the previous case's environment.

The result was two byte-identical JSON bodies where the variables I had just set read as unset.
That looks exactly like Next.js inlining `process.env` at build time, and I went looking for it in
the compiled output before checking the probe. The code was correct the whole time.

The second attempt was worse: `pkill -f next-server` matched the shell running the probe, because
that shell's own command line contained the pattern. It killed itself, twice, producing an empty
result and a bare exit code.

**Tear down by process tree, not by parent PID or by name**, and make a probe *refuse to run* when
the port is already serving — a probe that silently reads a stale server is worse than no probe,
because it reports confident nonsense.

---

## A formatter with no config in the repo will reformat the repo

`npx prettier --write` on the files I had touched produced ~70 lines of diff in a file where I had
added 33. The project has no `.prettierrc` and does not list prettier as a dependency, so `npx`
fetched a current version with default settings — `printWidth: 80`, where this codebase is written
at 100.

Worse, 4 of the 6 files I ran it over were not prettier-clean at *any* width; they were
hand-formatted. Formatting them "correctly" still rewrote code I had not changed.

Reformatting unrelated lines buries the actual change in a review. **Check whether a formatter is
configured before running one**, and when it is not, match the surrounding style by hand and verify
with `git diff --stat` that the diff is the size of the change you made.

---

## A click can be dropped outright, and it does not look like a timing problem

CI's file-store leg failed on "a saved product persists across a reload" with `aria-pressed` stuck at
`"false"` through 34 polls over 15 seconds. The same commit passed the Postgres leg, and the test
passed locally 32 times in a row and under 20× CPU throttling.

The instinct is "flaky timing", and the previous pass through this file acted on that instinct —
narrowing the toast assertion — without a root cause. That was wrong twice over: an earlier attempt
blamed pre-hydration clicks and was disproven when a click at `hydrated: false` still produced its
toast, because React 19 **replays** events captured during hydration.

What the 34 identical polls actually say is that the handler never ran at all. Two other
explanations were ruled out by evidence rather than by feel:

- **The click navigated and the locator silently re-bound to another button.** Impossible here: the
  detail page's wishlist control is a `<button>` whose accessible name comes from its text, with no
  `aria-label` attribute, so `button[aria-label*="wishlist" i]` cannot match it. The navbar's is an
  `<a>`. The locator resolved to a card heart 34 times, so the page never changed.
- **Leaked state, so the click toggled OFF.** Playwright's default `page` fixture gives each test a
  fresh context, and the sibling test that clicks the same button expecting `true` passed in the
  same run.

What is left is a click dispatched in the window between `load` and React attaching its listeners.
There is no listener to receive it, so — unlike a click *during* hydration — there is nothing to
replay. It is narrow, which is exactly why a fast machine never sees it.

**`toBeVisible` is not "ready to click".** It is satisfied by server-rendered HTML that has no
handler yet. Assert a client-driven attribute first, and make a toggle's click idempotent by gating
each retry on the state not having flipped — then a dropped click costs a retry instead of a red
build, and a retry can never toggle the control back off.
