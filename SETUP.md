# Setup

Lunowix runs on a **static catalogue**. There is no database, no auth backend
and no server state — the products live in `lib/data`, and every page is built
from them. That makes local setup short: install, run.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

> **On the history here.** This file used to document a Supabase project,
> schema migrations, OAuth providers, a redirect allow-list and an admin role
> table. All of that went when Supabase was removed, and the instructions
> outlived the system by several commits. If you find a stray reference to it
> anywhere, it is a leftover, not a feature you have failed to configure.

## Environment variables

Every one of these is optional. The app runs without a `.env.local` at all;
each variable turns on one thing.

| Key | What it does | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin for the sitemap, robots, canonical tags and the OG card. | Falls back to `http://localhost:3000`, which is wrong in production and quietly bad for SEO. |
| `RESEND_API_KEY` | Lets the contact form deliver mail. | The form returns 501 and says nothing was sent. |
| `CONTACT_TO_EMAIL` | Where contact messages are delivered. | Same as above. |
| `RESEND_FROM_EMAIL` | Sender identity, e.g. `Lunowix <hello@yourdomain.com>`. | Defaults to Resend's shared `onboarding@resend.dev`. |

**Set `NEXT_PUBLIC_SITE_URL` when you deploy.** It is the one variable that
changes output rather than enabling a feature.

## Contact form

`/contact` posts to `/api/contact`, which validates server-side and sends
through Resend. The sender's address goes on `replyTo`, never on `from` — a
visitor-supplied `from` is what gets a domain flagged for spoofing.

With the mail variables missing the form **does not pretend**: the endpoint
returns 501 and the page says nothing was sent, rather than promising a reply
within two working days that no one will act on.

Until you verify a domain, Resend only delivers to the address you signed up
with.

## Sign-in

`/auth/login` is **front end only**. It validates, shows its pending state and
resolves without transmitting a credential anywhere. Wire `onSubmit` on
`SignInCard` to something real before treating it as a login.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on port 3000. |
| `npm run build` | Production build; pre-renders all product detail pages. |
| `npm start` | Serves the build. |
| `npm test` | 23 tests over filters, sorting, score thresholds and catalogue integrity. |
| `npm run lint` | ESLint. |

Tests run on Node's built-in runner through `tsx` — there is no test framework
to install.

## Verifying it worked

| Check | Expected |
| --- | --- |
| `/` | Home page, with the scroll card showing two real laptops. |
| `/compare?a=redmi-13c-5g&b=moto-g64-5g` | Two phones side by side with phone-specific rows. |
| `/sitemap.xml` | 74 URLs, derived from the catalogue. |
| `npm test` | 23 passing. |
| `npm run build` | Completes, pre-rendering every detail route. |

## Deploying

Any Next.js host. Set `NEXT_PUBLIC_SITE_URL` to the real origin, plus the mail
variables if you want the contact form live. Nothing else to configure — there
is no database to point at.
