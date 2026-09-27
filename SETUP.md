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
| `DATABASE_SSL` | no | `relaxed` (default), `verify`, or `disable` for a local container. Any `sslmode` in `DATABASE_URL` is stripped so this is the single place TLS is decided. |
| `DATABASE_POOL_MAX` | no | Connections per process. Default 5. |
| `NEXT_PUBLIC_SITE_URL` | no, but set it | Absolute origin for the sitemap, robots, canonical tags, OG card and reset links. |
| `RESEND_API_KEY` | no | Enables the contact form and password reset. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | no | Enables Google sign-in. |
| `GITHUB_CLIENT_ID` / `_SECRET` | no | Enables GitHub sign-in. |
| `FACEBOOK_CLIENT_ID` / `_SECRET` | no | Enables Facebook sign-in — see the caveat below. |
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
{
  "status": "ok",
  "store": "postgres",
  "auth": true,
  "site": "https://your-site",
  "mail": { "passwordReset": true, "contactForm": false, "sharedSender": true },
  "oauth": [
    { "id": "google", "label": "Google", "configured": true,
      "callback": "https://your-site/api/auth/oauth/google/callback" },
    { "id": "github", "label": "GitHub", "configured": false,
      "callback": "https://your-site/api/auth/oauth/github/callback" }
  ],
  "reachable": true
}
```

`store: "file"` on a real URL means `DATABASE_URL` is missing. `auth: false`
means `AUTH_SECRET` is missing and every sign-in will fail. Either returns 503,
so a smoke test catches it instead of your first visitor.

`status` covers only the two things that break the core of the site: the store
and session signing. Mail and social sign-in are genuinely optional, so their
absence is reported rather than treated as degraded — otherwise the one signal an
uptime monitor watches would be red on a perfectly good deployment.

The rest of the fields exist because mail and social sign-in are configured
entirely outside the code, which means a mistake in a hosting dashboard is
invisible from the outside:

| Field | Meaning |
| --- | --- |
| `site` | The origin the app thinks it is on, from `NEXT_PUBLIC_SITE_URL`, trailing slash removed. If this is `http://localhost:3000` in production, reset links and every OAuth callback are wrong. |
| `mail.passwordReset` | `RESEND_API_KEY` is set, so reset mail can be sent. |
| `mail.contactForm` | The key **and** `CONTACT_TO_EMAIL` are set. The contact form needs both; password reset needs only the key. |
| `mail.sharedSender` | `true` means you are sending as Resend's `onboarding@resend.dev`, which delivers **only to the address you signed up with**. Not an error, but not working for real users either. `null` when no key is set. |
| `oauth[].configured` | Both halves of that provider's credential are present. Half a credential does not count — it would send people into a provider error. |
| `oauth[].callback` | The exact string to register with that provider. Copy it from here rather than typing it. |

All three providers are listed whether or not they are configured, because the
callback has to be registered with the provider *before* the credentials exist to
enable it. Nothing here is a secret: the callback is a fixed public path, shown on
the provider's own consent screen and visible in the address bar mid-flow.

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
| `/api/auth/providers` | GET | — |
| `/api/auth/oauth/[provider]` | GET | — |
| `/api/auth/oauth/[provider]/callback` | GET | state |
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

## Backend file map

1,935 lines across 21 modules, plus 17 route handlers. Nothing here is generated;
every file has a comment at the top saying why it is shaped the way it is.

### Storage — `lib/server/store`

| File | Lines | Does |
| --- | --- | --- |
| `types.ts` | 56 | The `Store` interface: `get`, `put`, `delete`, `find`, `findOne`, `count`, `deleteWhere`, `init`. Deliberately document-shaped, so each repository is written once. |
| `index.ts` | 84 | Picks the adapter from `DATABASE_URL` and caches one instance. Holds the guard that refuses the file store on a serverless host. |
| `postgres.ts` | 167 | One `documents` table, `jsonb` column, GIN index. Filters compile to `data @> $2::jsonb`, always parameterised. |
| `file.ts` | 149 | JSON file per collection. Atomic writes via temp-file rename, and an in-process mutex so two writes cannot lose each other. |

### Auth — `lib/server/auth`

| File | Lines | Does |
| --- | --- | --- |
| `password.ts` | 100 | scrypt at N=2^16. Cost parameters stored with the hash, so they can be raised without invalidating anyone. Malformed input reads as a mismatch, never a throw. |
| `session.ts` | 123 | Issues and verifies HMAC-signed cookie values, and owns the cookie attributes. Throws in production without `AUTH_SECRET`. |
| `guard.ts` | 60 | `currentUser`, `requireUser`, `requireAdmin`. Checks cheapest-first: signature, then session row, then that the account still exists. |

### Data — `lib/server/repo`

| File | Lines | Does |
| --- | --- | --- |
| `users.ts` | 165 | Accounts. Email normalised to one identity; first account becomes admin; sign-in spends equal time on a wrong password and an unknown address. |
| `sessions.ts` | 70 | Session rows. Expiry enforced server-side, not from the cookie. Bulk revoke for a password change. |
| `wishlist.ts` | 85 | One row per (user, product), so two devices cannot clobber each other. `mergeWishlist` unions, never replaces. |
| `compare.ts` | 67 | Comparison history, order-insensitive de-duplication, capped at 8. |
| `reviews.ts` | 125 | One review per person per product; a second submission edits the first. Delete re-checks ownership. |
| `newsletter.ts` | 63 | Address is the row id. Unsubscribe marks rather than deletes, so a later import cannot re-mail someone. |
| `views.ts` | 49 | Per-product view counters. No visitor identity, so nothing to track. |
| `passwordResets.ts` | 83 | Tokens stored as SHA-256 hashes, single use, one hour, and issuing a new one kills the last. |

### Shared — `lib/server`

| File | Lines | Does |
| --- | --- | --- |
| `http.ts` | 81 | One response envelope, `readJson` for validated bodies, and `guarded` so an unexpected throw becomes a 500 with nothing leaked. |
| `rateLimit.ts` | 93 | Fixed-window limiter, in memory, bounded so it cannot become its own memory leak. |
| `validation.ts` | 95 | The zod schemas, built from the shared constants. |
| `stats.ts` | 112 | Admin figures. Reports authored and live view counts separately rather than blending them. |
| `../validation/rules.ts` | 101 | The bounds and messages both sides share — no zod, so the browser does not pay for it. |

## Social sign-in

Google, GitHub and Facebook. A provider is enabled **only** when both its client id
and secret are present; `/api/auth/providers` reports which are live and the
sign-in form enables exactly those buttons. Turning one on is two environment
variables and a redeploy — never a code change.

Every provider needs this redirect URI registered, matching
`NEXT_PUBLIC_SITE_URL` exactly, with no trailing slash:

```
https://your-site/api/auth/oauth/<provider>/callback
```

A mismatch is what produces `redirect_uri_mismatch`, and the fix is always to make
the two strings identical.

| Provider | Where | Effort |
| --- | --- | --- |
| **GitHub** | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App | Easiest. No review, no consent screen. |
| **Google** | [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth client ID (Web application) | Straightforward. `openid email profile` are non-sensitive scopes and need no review. |
| **Facebook** | [developers.facebook.com](https://developers.facebook.com) → create an app → add Facebook Login | **Blocked on Meta, not on code.** See below. |

### Facebook needs Meta's approval first

The code is complete and tested, but Meta gates the `email` permission behind
**Business Verification and App Review**. Until that is done, the button works for
accounts listed as **testers** on the Meta app and for nobody else: everyone else
gets no email back and the sign-in is refused with "that account did not share an
email address".

Leave `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` unset until the review is
through, and the button stays honestly disabled rather than failing for real
visitors.

### How an account gets linked

Three paths, in order:

1. **This provider account has signed in before** → its existing account.
2. **An account already holds that email** → linked, but **only if the provider
   asserts the email is verified**. This is the security-critical rule: anyone can
   open an account at a provider claiming someone else's address, so linking on an
   unverified claim would hand over that Lunowix account. It is refused, and the
   person is asked to sign in with their password instead.
3. **Neither** → a new account, with **no password**. No password can sign into it
   (`passwordHash` is empty, which nothing verifies against) until its owner sets
   one through the reset flow, which proves they control the inbox.

The first account on a deployment is the admin however it was created — signing in
with Google on a fresh install makes you the admin, exactly as registering would.

Every failure redirects to `/auth/login?error=…` and the form renders it as a
sentence. Nothing leaks a provider error string or a stack trace to the visitor.

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
| `npm test` | 89 unit tests. 100 with a test database — see below. |
| `npm run test:e2e` | 17 end-to-end tests in a real browser. Needs `npm run build` first. |
| `npm run test:e2e:ui` | The same suite in Playwright's inspector, for debugging one test. |
| `npm run lint` | ESLint, with `--max-warnings 0`. |

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

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`,
as two jobs:

**`checks`** — install, lint, typecheck, the unit suite **twice** (once on the
file store, once against a `postgres:16` service container), then the production
build. Usually under three minutes.

**`e2e`** — builds the app, serves the production build, and drives it in
Chromium. A matrix over both storage adapters, so it runs twice.

Running on both adapters is the point. They sit behind one `Store` interface and
the whole claim of that seam is that the repositories above it behave identically
on either; a green run on only one of them would not check that.

The end-to-end job is separate so a ~150 MB browser download never delays the fast
feedback, and the browser is cached on the resolved Playwright version — the
browser build is pinned per release, so a looser cache key would hand a new
Playwright an old browser it refuses to launch. On failure the HTML report and
traces upload as an artifact.

### Running the end-to-end suite locally

```bash
npm run build
npm run test:e2e
```

Playwright starts the server itself, serving the production build.

**If you have run `npm run dev` since your last build, build again.** `next dev`
and `next build` write to the same `.next` directory, and `next start` cannot serve
a dev build — it fails with `TypeError: routesManifest.dataRoutes is not iterable`,
which says nothing about the actual cause. The suite does **not** assume an empty
database: the first account on a deployment becomes the admin, so it reads the
role the server actually assigned and asserts the matching page, then registers a
second account to cover the member path. That means a re-run against the same
database passes.

If you are somewhere that cannot download a browser — a sandbox, an air-gapped
runner — point it at one you already have:

```bash
E2E_CHROMIUM_PATH=/path/to/chrome npm run test:e2e
```

`npm run lint` carries `--max-warnings 0`. Plain `eslint` exits 0 when there are
only warnings, and this config reports unused variables and imports as warnings,
so without the flag a lint step prints them and passes — worse than no lint step,
because it looks like coverage.

## Deploying

Any Next.js host. Set `AUTH_SECRET`, `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL`,
plus the mail variables if you want the contact form and password reset live.
Then check `/api/health` and register the first account.
