# Deployment

A step-by-step walkthrough for putting Lunowix online. Start to finish is about
fifteen minutes.

`SETUP.md` is the reference — every variable, the API, the security model. This
file is the order to do things in.

You need three things, all free:

1. A **Postgres database** (Neon, Supabase, Railway or Render)
2. A **host** for the app (Vercel, Netlify, Render or Railway)
3. A **session secret** you generate yourself

Optionally a **Resend** account, if you want the contact form and password reset
to send real email.

---

## Step 1 — Get a free Postgres database

Any Postgres works. Neon is the simplest if you are deploying to Vercel.

1. Sign up at <https://neon.tech>
2. Create a project. Any name and region will do — pick a region near your users.
3. Copy the connection string it shows you. It looks like this:

```
postgres://myuser:mypassword@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Keep that tab open. This is your `DATABASE_URL`.

**You do not need to create any tables.** The app creates its own schema — one
`documents` table and one index — the first time it talks to the database. There
is no migration command to run, and running the app against an empty database is
the expected path.

Supabase, Railway and Render all work the same way: create a Postgres instance,
copy the connection string. If you use Supabase, you want **only** the connection
string; none of the rest of Supabase is involved.

---

## Step 2 — Generate a session secret

On your own machine:

```bash
openssl rand -base64 32
```

That prints something like `k3Jv8Qx2mZp5Rw7Ty1Ub4Nc6Ae9Sd0Fg2Hj4Kl6Mn8=`. This is
your `AUTH_SECRET`.

**It must be at least 32 characters, and it must be a real random value.** Do not
reuse an example from this file or from anywhere else — a secret that someone else
knows lets them mint valid sessions for your site.

Store it somewhere you will not lose it. Changing it later signs everybody out.
That is also how you deliberately revoke every session at once.

---

## Step 3 — Deploy the app

### Vercel

1. Go to <https://vercel.com/new> and import this repository.
2. Vercel detects Next.js. Leave the build settings alone.
3. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The connection string from Step 1 |
| `AUTH_SECRET` | The value from Step 2 |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` |

4. Deploy.

You will not know your final URL until the first deploy finishes, so
`NEXT_PUBLIC_SITE_URL` is a guess at this point. Come back and correct it after,
then redeploy — it is baked in at build time, so a redeploy is required for a
change to take effect.

### Netlify, Render or Railway

Same three variables. Standard Next.js build:

- Build command: `npm run build`
- Start command: `npm start`
- Node version: **22**

---

## Step 4 — Check it worked

Open this URL in a browser, or curl it:

```bash
curl https://your-site.vercel.app/api/health
```

You want `status`, `store`, `auth` and `reachable` to read like this:

```json
{ "status": "ok", "store": "postgres", "auth": true, "reachable": true, ... }
```

Anything else means a variable is wrong. Read the table:

| Response | What is wrong | Fix |
| --- | --- | --- |
| `"store": "file"` | `DATABASE_URL` is not set | Set it. On a serverless host the app will refuse to start rather than lose data. |
| `"auth": false` | `AUTH_SECRET` is missing or under 32 characters | Set it. Every sign-in fails without it. |
| `"reachable": false` | The database cannot be reached | Check the connection string, and that the database is not paused. |
| `503` | One of the above | The body says which. |

The response also carries a `site`, a `mail` object and an `oauth` list. Those
cover the optional features in Steps 6 and 7 and do **not** affect `status` — a
deployment with no mail and no social sign-in is fully working for registration,
sign-in, wishlists and reviews. Come back to them when you set those up.

One field is worth checking now, though:

```bash
curl -s https://your-site.vercel.app/api/health | grep -o '"site":"[^"]*"'
```

If `site` is not your real URL, `NEXT_PUBLIC_SITE_URL` is wrong or unset. That
breaks password-reset links and every OAuth callback later, so fix it before
going further.

Fix the variable, redeploy, check again. Do not skip this step — a green health
check is what tells you the backend is actually wired up, rather than finding out
from the first person who tries to register.

---

## Step 5 — Register the first account

**The first account created on a deployment becomes the admin.** Every account
after it is an ordinary member.

So do this yourself, now, before you share the URL:

1. Go to `https://your-site.vercel.app/auth/register`
2. Create your account
3. Go to `/admin` — you should see live figures

If someone else registers first, they get the admin role and you do not. There is
no way to change that from the UI. You would have to update the row in the
database by hand:

```sql
update documents
set data = jsonb_set(data, '{role}', '"admin"')
where collection = 'users'
  and data->>'email' = 'you@example.com';
```

Easier to just register first.

---

## Step 6 — Email (optional)

Without this, the contact form and password reset both return a clear "not
configured" message rather than pretending to send. Nothing breaks; those two
features are simply off.

To turn them on:

1. Sign up at <https://resend.com>
2. Create an API key
3. Add these variables and redeploy:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | Your Resend API key |
| `CONTACT_TO_EMAIL` | Where contact form messages should arrive |
| `RESEND_FROM_EMAIL` | `Lunowix <hello@yourdomain.com>` — optional |

On Vercel, tick **Production, Preview and Development** for each variable, then
redeploy. Environment variables are read when the app boots, so a variable added
without a redeploy has no effect.

Then confirm it landed:

```bash
curl -s https://your-site.vercel.app/api/health
```

```json
"mail": { "passwordReset": true, "contactForm": true, "sharedSender": true }
```

| Field | If it is wrong |
| --- | --- |
| `passwordReset: false` | `RESEND_API_KEY` did not land. Check for a typo in the name, that you redeployed, and that the value has no stray spaces or newline. |
| `contactForm: false` while `passwordReset: true` | `CONTACT_TO_EMAIL` is missing. Password reset needs only the key; the contact form also needs somewhere to deliver. |
| `sharedSender: true` | Not an error — see below. |

### The shared-sender trap

`sharedSender: true` means you are sending as Resend's `onboarding@resend.dev`.
Resend **accepts** those sends and returns success, but delivers them **only to the
address you signed up with**. Everyone else silently receives nothing.

This is the one failure that looks exactly like success: your own reset email
arrives, so the feature seems done, and then a real user gets nothing. Test with
your signup address to prove the wiring works, and treat the feature as finished
only once `sharedSender` reads `false`.

To get there, verify a domain in Resend (Domains → Add Domain, add the DNS records
it gives you), then set `RESEND_FROM_EMAIL` to an address on that domain and
redeploy. You need a domain you own; without one, password reset works for you and
nobody else.

---

## Step 7 — Social sign-in (optional)

Google and GitHub each take about five minutes. Facebook is a different story —
see the end of this section.

First, get the exact callback URL from your own deployment rather than typing it:

```bash
curl -s https://your-site.vercel.app/api/health
```

```json
"oauth": [
  { "id": "google", "configured": false,
    "callback": "https://your-site.vercel.app/api/auth/oauth/google/callback" },
  ...
]
```

Copy the `callback` value for the provider you are setting up. It has to match
what you register **character for character** — scheme, host, path, no trailing
slash. A mismatch is the `redirect_uri_mismatch` error, and it is the single most
common reason social sign-in does not work.

### Google

1. <https://console.cloud.google.com> → create or pick a project
2. **APIs & Services → OAuth consent screen** → External → fill in app name and
   your email → Save. You do **not** need Google's verification: the scopes used
   here (`openid`, `email`, `profile`) are non-sensitive.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
4. Application type: **Web application**
5. Under **Authorised redirect URIs**, paste the `callback` from above
6. Copy the client ID and client secret into Vercel as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`, tick all three environments, redeploy

While the consent screen is in **Testing** mode, only accounts you add under
**Test users** can sign in. Click **Publish app** to open it to everyone.

### GitHub

The simplest of the three — no review, no consent screen.

1. <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**
2. Homepage URL: your site URL
3. **Authorization callback URL**: paste the `callback` from above
4. Register, then **Generate a new client secret**
5. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, tick all three
   environments, redeploy

### Facebook — leave this off

The code is complete and works, but Meta gates the `email` permission behind
Business Verification and App Review. Until you pass both, the button works only
for accounts you add as testers on the Meta app, and for nobody else. That is
Meta's process, not a gap here.

Leave `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` unset and the button stays
disabled with an honest label. Google and GitHub cover almost everyone.

### Confirming it worked

```bash
curl -s https://your-site.vercel.app/api/health
```

`configured` must read `true` for the provider you set up. If it still reads
`false`, either a variable name is misspelled, only one half of the credential is
set (both are needed — an id without a secret would send people into a provider
error), or you have not redeployed.

Once `configured` is `true`, the button on `/auth/login` enables itself. The form
asks the server which providers are live, so nothing needs changing in the code.

---

## The complete variable list

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Any Postgres connection string. |
| `AUTH_SECRET` | **Yes** | 32+ characters, randomly generated. |
| `NEXT_PUBLIC_SITE_URL` | Strongly advised | Used by the sitemap, robots.txt, canonical tags, the social card and password-reset links. Baked in at build time. |
| `DATABASE_SSL` | No | `relaxed` (default) suits every managed provider. `disable` for a local container. `verify` with `PGSSLROOTCERT` for a verified chain. |
| `DATABASE_POOL_MAX` | No | Connections per process, default 5. Free tiers cap connections; raise only if you know your limit. |
| `RESEND_API_KEY` | No | Enables contact form and password reset. |
| `CONTACT_TO_EMAIL` | No | Required alongside the API key for the contact form. |
| `RESEND_FROM_EMAIL` | No | Defaults to Resend's shared sender, which delivers only to your own signup address. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Both needed to enable Google sign-in. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | Both needed to enable GitHub sign-in. |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | No | Both needed to enable Facebook sign-in, which also needs Meta's approval. Leave unset. |
| `LUNOWIX_DATA_DIR` | No | Where the local file store writes. Development only. |
| `LUNOWIX_ALLOW_FILE_STORE` | No | Permits the file store on a host detected as serverless. Only set this with a genuinely persistent disk. |

---

## Troubleshooting

**Sign-in and registration return a 500.**
`AUTH_SECRET` is missing or too short. Check `/api/health` — it will show
`"auth": false`. This is deliberate: the app refuses to sign a session it cannot
sign safely, rather than issuing cookies that stop working on the next deploy.

**Accounts disappear after a while.**
You are on the file store, not Postgres. `/api/health` will show
`"store": "file"`. Set `DATABASE_URL`.

**"Password reset email is not configured on this deployment."**
That is the app telling the truth: `RESEND_API_KEY` is not set, so rather than
claim an email is on its way it says nothing was sent. Check
`/api/health` — `mail.passwordReset` will be `false`. See Step 6.

**The reset email arrives for me but not for anyone else.**
`/api/health` shows `"sharedSender": true`. You are sending through Resend's
shared address, which only delivers to the account you signed up with. Verify a
domain and set `RESEND_FROM_EMAIL`. See Step 6.

**A social sign-in button is greyed out.**
That provider is not configured. `/api/health` shows `configured: false` for it.
Either a variable name is misspelled, only one half of the credential is set, or
you have not redeployed since adding them. See Step 7.

**`redirect_uri_mismatch`, or the provider shows its own error page.**
What you registered with the provider does not match what the app sends. Do not
guess it — read it from your own deployment:

```bash
curl -s https://your-site.vercel.app/api/health
```

Copy the `callback` for that provider and paste it into the provider's console
exactly. If `site` in that response is not your real URL, fix
`NEXT_PUBLIC_SITE_URL` first, because every callback is built from it.

**Sign-in with a provider says the email is already in use.**
Deliberate. An account already holds that address, and the provider did not
assert it has verified the email, so linking is refused — otherwise anyone able
to claim your address at a provider could take over your account. Sign in with
the password, or use a provider that verifies email (Google and GitHub both do).

**The app will not start, with a message about the filesystem.**
That is the guard working. You are on a serverless host with no `DATABASE_URL`,
where writes do not survive between requests. Set `DATABASE_URL`.

**`/admin` says my account cannot see live figures.**
Your account is a member, not the admin. The first account registered is the
admin — see Step 5.

**Sitemap and social cards point at localhost.**
`NEXT_PUBLIC_SITE_URL` is unset or wrong. It is read at build time, so fix it and
redeploy.

**Too many database connections.**
Lower `DATABASE_POOL_MAX`. Serverless multiplies the process count, and each
process opens its own pool.

**The contact form says nothing was sent.**
It is telling the truth — `RESEND_API_KEY` or `CONTACT_TO_EMAIL` is missing. See
Step 6.

---

## After deploying

Worth knowing:

- **Nothing to back up on day one**, but once you have accounts, back up the
  `documents` table. Most providers do this for you; check that yours does.
- **The product catalogue is in the code**, not the database. To change prices or
  add a product, edit `lib/data` and redeploy. That is what keeps the 74 product
  pages fast.
- **CI runs on every pull request** — lint, typecheck, 89 tests on the file store,
  100 against a real Postgres, then the build. If it is green, the branch is
  deployable.
