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

## Phase 2

- **Stylized textureless globe**, not a photoreal earth image. A dark `MeshPhongMaterial` sphere
  with graticules + a golden atmosphere reads as the Radio-Garden look, matches our aesthetic, and
  avoids bundling/fetching a large earth texture or countries GeoJSON.
- **Country selection without polygon data.** Countries are derived by grouping points by their
  `country` field; fly-to targets the average of a country's member coordinates. No external
  GeoJSON/topojson dependency, no reverse-geocoding on click.
- **`react-globe.gl` loaded via `next/dynamic` (`ssr:false`)** inside a small client wrapper, with
  the globe instance passed back through a `globeRef` prop (dynamic components don't forward refs).
- **Globe fed by real public profiles only** (People layer). Restaurants/Doctors layers are shown
  but disabled until the Directory (`listings`) lands in Phase 3.
- **Seed creates `auth.users` + `profiles` in one data-modifying CTE** (shared fixed UUIDs) so the
  two inserts stay consistent and re-runnable; seed users have no `identities` row (data only, not
  meant to log in). Kept optional.

## Phase 3

- **MapLibre with a key-less CARTO dark raster basemap** (over OSM data) — free, no token, and it
  matches the dark theme. The JS is dynamically imported inside `useEffect` so it never touches
  `window` during SSR.
- **`listings_with_stats` view** (`security_invoker`) computes rating average/count once in the DB
  rather than aggregating reviews in the app; excludes the raw geography column.
- **`set_profile_location()` reused** for listings — it only reads `lat`/`lng`, so it's generic.
- **Reviewer names come from public profiles only** (RLS); private reviewers render as "Member",
  keeping the consent model intact.
- **Claim flow via one RLS UPDATE policy**: `using (owner is null or owner = auth.uid())` +
  `with check (owner = auth.uid())` lets a user take an unowned listing without a separate table.
- **Category as a text CHECK** (not a Postgres enum) so adding categories is a simple migration.
- **Listings seeded unowned** so the Claim button is demonstrable; photos left empty (cards fall
  back to a category icon) to avoid bundling external images.

## Phase 4

- **One `getEntitlements()` source of truth** (brief §5). It reads `subscriptions`; everything else
  (filters, reveals, future feed/event gates) derives from it, so tuning the model is one place.
- **Reveal limit enforced server-side** in `revealProfile` (counts distinct `target_id` in
  `usage_events` since local midnight), not just blurred in the UI — re-revealing the same profile
  that day is free, so the count reflects distinct people.
- **Advanced filters gated server-side too**: the page ignores `language`/`dialect` query params
  for free users, so the lock can't be bypassed by editing the URL.
- **Blur is a product gate, not a security boundary** — profiles are already public via `/u/[id]`,
  so CSS-blurring loaded data is acceptable for the freemium UX (no hidden secrets here).
- **`subscriptions` has no user write policies** — only the service role (Stripe webhook) writes;
  users can read their own row. Created now so entitlements work before Stripe lands in Phase 8.
- Added a small **Radix Dialog** primitive (shadcn-style) for the upgrade modal — reusable later.
