# Cîhan

> A global community + discovery platform for the Kurdish diaspora, built around a
> Radio-Garden-style interactive 3D globe. **"Cîhan"** (Kurdish for *world*) is a working
> name — replace it when the brand is confirmed (see `lib/constants.ts`).

This repository is being built in phases. **Phase 0 (Scaffold & Auth) is complete.** See
[`PROGRESS.md`](./PROGRESS.md) for status and [`DECISIONS.md`](./DECISIONS.md) for the decision log.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) · React 19 · **TypeScript (strict)**
- **Tailwind CSS v4** + shadcn/ui-style primitives (Radix) · **lucide-react** · **Framer Motion** (`motion`)
- **next-intl** for i18n (EN, DE, Kurmancî, Soranî, Arabic) with full **RTL** support
- **next-themes** (dark-first, with light + system)
- **Supabase** (Auth + Postgres + PostGIS) via `@supabase/ssr`
- **Zod** (validation, used from Phase 1)

> ⚠️ Next.js 16 renames `middleware.ts` → **`proxy.ts`**, makes `params`/`cookies()`/`headers()`
> **async**, and uses Tailwind v4's CSS-first config. See `AGENTS.md`.

---

## Prerequisites

- **Node.js ≥ 20.9** and npm (this project was scaffolded with Node 24 / npm 11)
- A free **Supabase** project (cloud) — no Docker required

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000  (redirects to /en)
```

The app **runs without Supabase keys** — auth simply stays inactive and shows a friendly
"not connected yet" notice. Add keys to activate sign-in.

### 1. Configure Supabase

1. Create a project at <https://supabase.com/dashboard>.
2. **Project Settings → API**, copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the client)
3. Run the base migration so the database is PostGIS-enabled and RLS-ready:
   - **SQL Editor** → paste the contents of `supabase/migrations/0000_init.sql` → Run.
   - (Later, when the Supabase CLI is installed, migrations can be applied with
     `supabase db push`.)
4. **Authentication → Providers → Email**: for quick demos you may disable
   "Confirm email" so password sign-ups log in immediately.

### 2. (Optional) Enable Google sign-in

The "Continue with Google" button is already built. To activate it:

1. Create OAuth credentials in Google Cloud Console.
2. Supabase **Authentication → Providers → Google**: paste the Client ID + Secret.
3. Add the Supabase callback URL shown there to Google's authorized redirect URIs.

No code changes are needed — Google login works as soon as the provider is configured.

### 3. (Optional) Enable Stripe billing

Premium unlocks automatically once a `subscriptions` row is `active`. To wire real checkout:

1. In the Stripe **test-mode** dashboard, create a **Premium** product with a **monthly** and a
   **yearly** recurring price. Copy the two Price IDs.
2. Fill `.env.local`:
   - `STRIPE_SECRET_KEY` (Developers → API keys)
   - `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`, `NEXT_PUBLIC_STRIPE_PRICE_YEARLY`
3. Forward webhooks locally with the Stripe CLI and copy the signing secret it prints into
   `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Restart `npm run dev`. On `/pricing`, choose monthly/yearly → **Upgrade** → pay with test card
   `4242 4242 4242 4242`. The webhook writes the subscription and you become Premium; **Manage
   subscription** opens the Customer Portal to cancel (which re-locks Premium).

---

## Scripts

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the dev server (Turbopack)             |
| `npm run build`   | Production build (also type-checks)          |
| `npm run start`   | Run the production build                     |
| `npm run lint`    | ESLint (flat config)                         |
| `npx tsc --noEmit`| Type-check only                              |

---

## Project structure

```
app/
  layout.tsx              # root pass-through (i18n pattern)
  globals.css             # Tailwind v4 tokens: "cosmic warmth" palette + utilities
  [locale]/               # locale-segmented routes (en, de, ku, ckb, ar)
    layout.tsx            # <html lang dir>, fonts, theme + intl providers, app shell
    page.tsx              # landing (hero globe + features)
    (auth)/login, signup  # email/password + Continue with Google
    dashboard/            # auth-gated page
    not-found.tsx
  auth/callback, signout  # OAuth/email-confirm + sign-out route handlers
components/
  ui/                     # shadcn-style primitives (button, input, card, dropdown, …)
  app-shell/              # header, footer, brand, language switcher, theme toggle, menus
  auth/                   # auth form (Google + email)
  marketing/              # hero globe
  backdrop.tsx            # cosmic starfield background
i18n/                     # next-intl routing, navigation, request config
messages/                 # en/de/ku/ckb/ar.json
lib/                      # supabase clients, auth, env, utils, constants
proxy.ts                  # next-intl routing + Supabase session refresh (Next 16 "middleware")
supabase/migrations/      # versioned SQL (PostGIS + RLS conventions)
```

---

## Internationalization & RTL

- Locales: `en`, `de`, `ku` (Kurmancî), `ckb` (Soranî), `ar` (Arabic). English is the
  source of truth; the others cover the app shell + auth (Kurmancî/Soranî are best-effort
  and will be refined).
- `ckb` and `ar` render **right-to-left** — the whole layout mirrors and switches to the
  Vazirmatn typeface. Latin locales use Fraunces (display) + Manrope (UI).

---

## Database migrations

Apply the SQL files in `supabase/migrations` **in order** (SQL Editor or `supabase db push`):

| File | Adds |
| --- | --- |
| `0000_init.sql` | PostGIS + pgcrypto + `set_updated_at()` + RLS conventions |
| `0001_profiles.sql` | `profiles` + RLS + `avatars` bucket |
| `0002_listings_reviews.sql` | `listings` + `reviews` + stats view + `listing-photos` bucket |
| `0003_usage_subscriptions.sql` | `usage_events` + `subscriptions` |
| `0004_chat.sql` | chat tables + RPCs + Realtime |
| `0005_feed.sql` | `posts` + likes + comments + `post-media` bucket |
| `0006_news.sql` | `news_articles` |
| `0007_moderation.sql` | `reports` + `profiles.is_admin` |

Optional demo data: `seed.sql` (people), `seed_listings.sql` (businesses), `seed_news.sql` (news).
Make yourself an admin once: `update public.profiles set is_admin = true where user_id = '<id>';`

## Deployment (Vercel + Supabase)

1. **Supabase**: create a project, run all migrations above (+ optional seeds).
2. **Vercel**: import this repo. Add the environment variables from `.env.example`
   (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and set
   `NEXT_PUBLIC_SITE_URL` to the deployed origin, e.g. `https://your-app.vercel.app`). Deploy.
3. **Supabase Auth → URL Configuration**: set the Site URL + add `https://your-app.vercel.app/**`
   to the redirect allow-list (and configure Google OAuth there if used).
4. **Stripe** (if billing): in the live/test dashboard add a webhook endpoint
   `https://your-app.vercel.app/api/stripe/webhook` for `checkout.session.completed` and
   `customer.subscription.*`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

The app runs in degraded-but-functional mode if Stripe (or even Supabase) keys are missing, so you
can deploy first and wire integrations incrementally.
