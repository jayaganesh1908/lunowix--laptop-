# Lunowix — Compare Laptops, Phones & Headphones

Lunowix is a device comparison platform for laptops, phones and headphones. It
scores each product on axes that suit its category — a laptop on coding, gaming
and battery; a phone on camera and sustained performance; headphones on
isolation, comfort and codecs — and puts any two side by side.

## Features

- Browse and filter 59 products across three categories
- Compare two products side by side, with category-appropriate rows
- Per-category performance scores, game benchmarks and software compatibility
- Search across every catalogue at once
- Accounts, with a wishlist and comparison history that follow you between devices
- Reviews you can write, edit and delete
- Newsletter sign-up and a contact form that actually deliver
- Admin dashboard with live account and engagement figures
- Light and dark themes, and a 3D product viewer

The wishlist and comparison tray work **without an account** — both save to the
browser — and whatever you saved is folded into your account when you sign in.

## Tech stack

- **Next.js 15** (App Router, Turbopack) and **React 19**
- **TypeScript**, strict
- **Tailwind CSS v4**
- **Postgres** in production, via a swappable store interface with a zero-config
  file adapter for development
- **Zod** for request validation
- **node:crypto** for password hashing and session signing — no auth dependency
- **Framer Motion**, **Recharts**, **three.js**

## Architecture

```
app/              Routes. Product pages are statically pre-rendered.
  api/            Route handlers — auth, wishlist, reviews, products, admin.
components/       UI, grouped by domain.
lib/
  data/           The product catalogue, as typed modules. Not in the database.
  server/
    store/        Store interface + Postgres and file adapters.
    auth/         scrypt passwords, HMAC-signed sessions, route guards.
    repo/         One module per collection.
  validation/     Field rules shared by the browser and the server.
  hooks/          Client state: session, wishlist, compare, theme.
```

The catalogue stays in `lib/data` on purpose: it is identical for every visitor,
so keeping it out of the database is what lets all 74 detail pages pre-render as
static HTML.

## Getting started

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. Nothing to configure — with no `DATABASE_URL` the
app uses a JSON file store under `.data/`.

For anything deployed you need `AUTH_SECRET` and `DATABASE_URL`. See
[SETUP.md](./SETUP.md), which also covers free Postgres providers, the security
model, and the full API.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build (needs `AUTH_SECRET`) |
| `npm test` | 89 tests; 100 with a test database |
| `npm run lint` | ESLint (`--max-warnings 0`) |

CI runs all of these on every pull request, plus the test suite a second time
against a real Postgres service container — see `.github/workflows/ci.yml`.

## Documentation

- [SETUP.md](./SETUP.md) — installation, environment, deployment, API, security
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — colour, type and surface reasoning
- [LESSONS.md](./LESSONS.md) — bugs found and what they taught
- [progress.txt](./progress.txt) — running changelog
