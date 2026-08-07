# Backend setup

The app runs without any of this — it falls back to the static catalogue in
`lib/data` and shows a "not configured" notice on the sign-in screen. Work
through these steps to switch it onto a real backend.

**I could not do these steps for you**: every one requires signing into an
account and creating credentials.

---

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> and **New project**.
2. Pick a region close to your users and save the database password somewhere safe.
3. Wait for provisioning (~2 minutes).

## 2. Run the schema

Open **SQL Editor → New query**, paste the whole of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.

It creates nine tables, the enums, the `profiles` auto-create trigger, and the
Row Level Security policies. You should see "Success. No rows returned".

## 3. Copy the keys

**Project Settings → API**, then fill in `.env.local`:

| Dashboard field | `.env.local` key |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key bypasses every security policy. It is server-only —
never give it a `NEXT_PUBLIC_` prefix and never commit it.

## 4. Seed the catalogue

```bash
npm run seed
```

Pushes all 25 laptops, 10 games, 11 applications, the derived benchmarks and the
demo reviews into Postgres. It upserts, so it is safe to re-run after editing
`lib/data`.

## 5. Enable Google sign-in

1. <https://console.cloud.google.com> → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → External → fill in the app name
   and your support email.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. Under **Authorised redirect URIs** add — copy this exactly from Supabase
   (**Authentication → Providers → Google**), it looks like:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

5. Copy the **Client ID** and **Client secret** into Supabase
   **Authentication → Providers → Google**, and enable it.

## 6. Enable GitHub sign-in

1. <https://github.com/settings/developers> → **New OAuth App**.
2. Homepage URL: `http://localhost:3000`
3. Authorisation callback URL: the same
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Generate a client secret, then paste the ID and secret into Supabase
   **Authentication → Providers → GitHub**, and enable it.

### Adding more providers

Discord, GitLab and Apple are already wired up. Enable the provider in Supabase,
then add it to the list:

```bash
NEXT_PUBLIC_OAUTH_PROVIDERS=google,github,discord
```

The sign-in screen only renders buttons named here, because a button for a
provider that is not enabled in Supabase errors on click.

## 7. Set the redirect allow-list

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

Add your production origin here too when you deploy, or OAuth will refuse to
return to it.

## 8. Welcome email (optional)

1. Sign up at <https://resend.com> and create an API key.
2. Put it in `RESEND_API_KEY`.
3. Until you verify a domain, Resend only delivers to the address you signed up
   with. To send to real users, verify a domain and set
   `RESEND_FROM_EMAIL=Lunowix <hello@yourdomain.com>`.

Without a key, sign-in works normally and the mail is skipped with a console
warning — it is never allowed to fail a login.

## 9. Make yourself an admin

`/admin` is behind a login, and admin-only writes are enforced by RLS. After
signing in once, run this in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## 10. Restart

```bash
npm run dev
```

Next.js only reads `.env.local` at boot — changes need a restart.

---

## Verifying it worked

| Check | Expected |
| --- | --- |
| `/auth/login` | Google and GitHub buttons, no yellow "not configured" banner |
| Sign in with Google | Lands on `/profile` with your name and avatar |
| Supabase → Table editor → `profiles` | A row for you, `role = member` |
| Your inbox | "Welcome to Lunowix" (if Resend is configured) |
| Sign in a second time | No second welcome email |
| `/admin` while signed out | Redirects to `/auth/login` |

## Deploying

Set the same variables in your host's dashboard, with `NEXT_PUBLIC_SITE_URL`
pointing at the real origin. Then add that origin to the Supabase redirect
allow-list (step 7) and to the Google/GitHub OAuth apps (steps 5–6).
