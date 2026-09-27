# Setup

Lunowix is a Next.js app with a real backend: accounts, saved wishlists,
comparison history, written reviews and newsletter subscribers all persist.

Two things are worth understanding before anything else.

**The product catalogue is not in the database.** It ships as typed modules in
`lib/data`, which is what lets all 74 product detail pages pre-render as static
HTML. A database would make them dynamic and buy nothing — the catalogue is the
same for every visitor and changes when someone edits a file, not at runtime.

**The database is swappable, and one option needs no setup.** `lib/server/store`
defines one `Store` interface with two adapters. `DATABASE_URL` set means
Postgres; unset means a JSON file store under `.data/`. Every repository and
route above that seam is the same code either way, so what you exercise locally
is the real request path.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. No database, no credentials, no `.env.local`
needed to start.

## Environment variables

Copy `.env.example` to `.env.local`. Everything is optional in development. Two
are **required in production**:

| Key | Required | What it does |
| --- | --- | --- |
| `AUTH_SECRET` | **in production** | Signs the session cookie. At least 32 characters — `openssl rand -base64 32`. |
| `DATABASE_URL` | **in production** | Any Postgres connection string. |
| `DATABASE_SSL` | no | `relaxed` (default), `verify`, or `disable` for a local container. |
| `DATABASE_POOL_MAX` | no | Connections per process. Default 5. |
| `NEXT_PUBLIC_SITE_URL` | no, but set it | Absolute origin for the sitemap, robots, canonical tags, OG card and reset links. |
| `RESEND_API_KEY` | no | Enables the contact form and password reset. |
| `CONTACT_TO_EMAIL` | no | Where contact messages go. |
| `RESEND_FROM_EMAIL` | no | Sender identity. Defaults to Resend's shared address. |
| `LUNOWIX_DATA_DIR` | no | Where the file store writes. Default `.data/`. |
| `LUNOWIX_ALLOW_FILE_STORE` | no | Permits the file store on a host detected as serverless. Only with a real persistent disk. |

### Why `AUTH_SECRET` is not optional

Without it, `next start` **refuses to sign sessions** and every sign-in and
registration fails. That is deliberate. A random per-process fallback would sign
cookies the next deploy could not verify, signing everyone out at intervals
nobody could explain; a hardcoded fallback would be a public constant that mints
valid sessions on every deployment that forgot to set the variable.

Changing it signs everybody out — which is also how you revoke every session at
once.

## Picking a database

Any Postgres works. The free tiers all do:

| Provider | Notes |
| --- | --- |
| [Neon](https://neon.tech) | Serverless, scales to zero. Good fit for Vercel. |
| [Supabase](https://supabase.com) | Use the connection string only; none of the rest is needed. |
| [Railway](https://railway.app) / [Render](https://render.com) | Ordinary managed Postgres. |
| `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw -d postgres:16` | Local. Set `DATABASE_SSL=disable`. |

```bash
DATABASE_URL=postgres://user:password@host/dbname
```

The schema is created on first use — one `documents` table plus a GIN index, via
`create table if not exists`. There is no migration step to run.

### About the file store

It is the default so a fresh clone runs immediately, and it is genuinely used in
development, not mocked. It is **not for production**:

- Serverless hosts give each invocation a fresh, mostly read-only filesystem.
  An account created by one request would not exist for the next. The app
  detects Vercel, Netlify and Lambda and **refuses to start** on the file store
  rather than losing data silently.
- Two processes writing the same file have no shared lock. The in-process mutex
  in `lib/server/store/file.ts` serialises writes within one Node process, and
  cannot do more than that.

## The first account is the admin

Someone has to be, and the alternative is an admin dashboard nobody can open.
The first account registered on a deployment gets `role: "admin"`; every later
one is a `member`. So register yours before announcing the URL.

## Checking a deployment

```bash
curl https://your-site/api/health
```

```json
{ "status": "ok", "store": "postgres", "auth": true, "reachable": true }
```

`store: "file"` on a real URL means `DATABASE_URL` is missing. `auth: false`
means `AUTH_SECRET` is missing and every sign-in will fail. Either returns 503,
so a smoke test catches it instead of your first visitor.

## API

Everything under `/api`. The site's own pages do **not** call the products
endpoints — they import `lib/data` directly, which is what keeps them static.

| Route | Methods | Auth |
| --- | --- | --- |
| `/api/health` | GET | — |
| `/api/auth/register` | POST | — |
| `/api/auth/login` | POST | — |
| `/api/auth/logout` | POST | — |
| `/api/auth/session` | GET | — |
| `/api/auth/forgot-password` | POST | — |
| `/api/auth/reset-password` | POST | token |
| `/api/wishlist` | GET, POST, DELETE | account |
| `/api/wishlist/merge` | POST | account |
| `/api/compare-history` | GET, POST, DELETE | account |
| `/api/reviews/[productId]` | GET, POST, DELETE | GET open, writes need an account |
| `/api/newsletter` | POST, DELETE | — |
| `/api/products` | GET | — |
| `/api/products/[id]` | GET | — |
| `/api/admin/stats` | GET | admin |
| `/api/admin/users` | GET | admin |

`/api/products` takes `category`, `q`, `sort`, `limit` and `offset`. An invalid
value is a 400, not a silent default.

## Security notes

- **Passwords**: scrypt from `node:crypto` at N=2^16, salted per password, with
  the cost parameters stored alongside the hash so they can be raised later
  without invalidating anyone. No native build step, which matters on free tiers.
- **Sessions**: a random 32-byte id stored server-side, handed out in an
  HMAC-signed `httpOnly` cookie. The signature lets a forged cookie be rejected
  without a database round trip. `sameSite: "lax"` is the CSRF control.
- **Sign-in** answers identically for an unknown address and a wrong password,
  and spends the same time on both, so the form is not an oracle for which
  addresses are registered. So does password reset.
- **Reset tokens** are stored as SHA-256 hashes, are single use, expire in an
  hour, and issuing a new one invalidates the last. Using one destroys every
  session for the account.
- **Rate limiting** is per process and in memory (`lib/server/rateLimit.ts`). It
  is a brake on password guessing and on the mail endpoints, not a defence
  against a distributed attack — that belongs at the edge.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on port 3000. |
| `npm run build` | Production build; pre-renders every product detail page. |
| `npm start` | Serves the build. Needs `AUTH_SECRET`. |
| `npm test` | 89 tests. 100 with a test database — see below. |
| `npm run lint` | ESLint. |

Tests run on Node's built-in runner through `tsx`; there is no framework to
install. The `--conditions=react-server` flag is required: modules marked
`server-only` throw on import without it.

The Postgres adapter's 11 tests are skipped unless you point them at a database:

```bash
TEST_DATABASE_URL=postgres://postgres:pw@localhost:5432/postgres npm test
```

They are skippable, not optional — they cover behaviour only SQL can get wrong
(jsonb containment matching null, `count(*)` arriving as a string, upsert on
conflict), none of which a typecheck can see.

## Verifying it worked

| Check | Expected |
| --- | --- |
| `/api/health` | `{"status":"ok", ...}` |
| `/auth/register` | Creates an account and signs you in. |
| Save a phone on `/phones`, then register | The saved phone is still saved. |
| `/admin` | Live account and engagement figures, for the first account. |
| `/compare?a=redmi-13c-5g&b=moto-g64-5g` | Two phones side by side. |
| `/sitemap.xml` | 74 URLs, derived from the catalogue. |
| `npm test` | 89 passing. |
| `npm run build` | Completes, pre-rendering every detail route. |

## Deploying

Any Next.js host. Set `AUTH_SECRET`, `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL`,
plus the mail variables if you want the contact form and password reset live.
Then check `/api/health` and register the first account.
