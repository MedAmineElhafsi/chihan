# Decisions

A running log of notable technical/product decisions and their rationale.

## Phase 0

- **Cloud Supabase (not local Docker).** No Docker on the dev machine; cloud is the fastest
  path to a working demo. Migrations are versioned SQL applied via the dashboard/CLI.
- **Google login built now, configured later.** The button + `/auth/callback` flow ships in
  Phase 0; Google activates once OAuth credentials are added in the Supabase dashboard.
- **Next.js 16** (current latest). Adapted to breaking changes: `middleware.ts` → **`proxy.ts`**
  (Node runtime), **async** `params`/`cookies()`/`headers()`, ESLint flat config, Turbopack
  default, and **Tailwind v4** (CSS-first `@theme`).
- **proxy.ts composition order:** next-intl routing first (owns the response), then Supabase
  session refresh onto it. Skipped gracefully when Supabase env vars are absent.
- **Auth route handlers live outside `[locale]`** and are excluded from the proxy matcher.
- **npm**; **dark-first "cosmic warmth"** palette (golden-sun accent, Kurdish red/green sparingly);
  Fraunces + Manrope + Vazirmatn fonts; hand-authored shadcn-style primitives on Radix.

## Phase 1

- **PostGIS point via trigger, not a generated column.** A `before insert/update` trigger derives
  `location` from `lat`/`lng`, so the app (and PostgREST) only ever writes plain numbers — avoids
  geography-cast immutability concerns and keeps the API simple.
- **Two SELECT RLS policies on profiles** (public-when-`is_public` OR owner) so an owner always
  sees their own private profile while everyone else only sees consented ones. Private profiles
  therefore 404 on `/u/[id]` for non-owners via RLS, not app logic.
- **Privacy by default (brief §7).** `is_public=false` and `consent_at=null` until the user ticks
  the explicit "appear in the directory" consent. Consent timestamp is recorded server-side.
- **Geocoding server-side on save** via Nominatim with a descriptive User-Agent + in-process cache;
  results stored as `lat`/`lng` on the profile (so the place isn't re-geocoded unless it changes).
- **Avatars in a public Storage bucket**, objects keyed `"<user_id>/<file>"`; RLS lets each user
  write only their own folder while anyone can read (public profile photos).
- **Server Action for saving** (`saveProfile`, Zod-validated) — client uploads the avatar first
  (browser client, RLS-scoped), then hands the resulting URL + fields to the action, which never
  trusts client values (languages/dialect filtered to known sets; `user_id` taken from the session).
- **Account deletion + data export (§7) deferred** to the later privacy/moderation pass; Phase 1
  focuses on the onboarding + consent acceptance criteria.
