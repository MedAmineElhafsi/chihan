# Progress

Building in phases (see the project brief). One phase at a time; stop for confirmation after each.

## ✅ Phase 0 — Scaffold & Auth (complete & verified)

Next.js 16 + TS strict + Tailwind v4; next-intl (en/de/ku/ckb/ar) with RTL; next-themes
dark-first "cosmic warmth" design system; Supabase (`@supabase/ssr`) clients + session refresh
in `proxy.ts`; email/password + Google auth, gated dashboard; glass app shell + landing with hero
globe; PostGIS/RLS base migration. Verified against the live Supabase project (sign-up → dashboard
→ sign-out).

## ✅ Phase 1 — Profiles & onboarding (code complete)

- **Migration `0001_profiles.sql`**: `profiles` table with `geography(Point,4326)` derived from
  lat/lng via trigger; **RLS** (public-read only for consented profiles + owner-only writes);
  GIST index; public **`avatars` storage bucket** with per-user-folder policies.
- **Onboarding / edit flow** (`/onboarding`, `/profile/edit`): avatar upload to Storage,
  display name, bio, city/country, languages + dialect chips, and an explicit **consent** toggle
  — profiles are **private by default**; `consent_at`/`is_public` set only on opt-in (brief §7).
- **Geocoding**: city/country → lat/lng via Nominatim (`lib/geocode.ts`, cached, polite UA).
- **Server action** `saveProfile` (Zod-validated, server-side geocode + upsert).
- **Profile pages**: own `/profile` (with Edit), public `/u/[id]` (RLS-gated — private profiles
  404 for non-owners). Dashboard shows a profile summary and forces onboarding for new users.
- **i18n**: Onboarding + Profile namespaces across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓ (all routes compile). Onboarding UI renders.
**Final step (requires you):** run `supabase/migrations/0001_profiles.sql` in the Supabase SQL
editor, then complete onboarding to confirm a consented profile saves with a geocoded location.

## ✅ Phase 2 — The Globe (code complete)

- **`/explore`**: full-screen `react-globe.gl` Explore screen — a stylized dark globe (graticule
  grid, golden atmosphere) over the cosmic backdrop, with a center **reticle**, auto-rotation,
  and a glowing **people points** layer fed from public geocoded profiles (`lib/globe.ts`).
- **Interaction**: click a point or a country → **fly-to** + a glass **results panel** (countries
  list → country members → person detail with a link to the public profile). Recenter control.
- **Layer toggles**: People (active); Restaurants/Doctors present but "Soon" (Directory = Phase 3).
- Empty state when no public members yet. "Explore" is now a real nav link (desktop + mobile).
- **Optional `supabase/seed.sql`**: ~24 fake Kurdish people across the diaspora so the globe looks
  alive in demos. Explore i18n namespace across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓. Globe renders in-browser (WebGL ok),
no console errors; empty state shown until profiles exist.
**To populate (you):** run `0001_profiles.sql` (if not yet) and optionally `seed.sql`, then open
`/explore` to see the dots + per-country panel.

## ✅ Phase 3 — Directory & reviews (code complete)

- **Migration `0002`**: `listings` (category CHECK, PostGIS location via trigger) + `reviews`
  (1–5, one per user/listing) + a `listings_with_stats` view (rating average/count) + a
  `listing-photos` storage bucket. RLS: public read; owner-only writes; an authenticated user
  can **claim** an unowned listing.
- **Directory**: `/directory` browse with category filter + cards (photo, rating, place);
  `/directory/[id]` detail with photo gallery, **MapLibre map** (key-less CARTO dark basemap),
  full contact info (tel/mailto/website), **1–5★ reviews** (read + write/update/delete), and a
  **Claim** button; `/directory/new` + `/directory/[id]/edit` with multi-photo upload + geocoding.
- **Globe integration**: listings now appear as points; the **All / People / Restaurants /
  Doctors** toggles filter live; panel entries link people → `/u/[id]` and businesses →
  `/directory/[id]` (the "Spain → restaurants" path).
- "Directory" is a real nav link (desktop + mobile). Directory i18n across all 5 locales.
- Optional `supabase/seed_listings.sql`: ~20 Kurdish businesses (claimable) across the diaspora.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓ (all directory routes compile).
**To populate (you):** run `0002_listings_reviews.sql` and optionally `seed_listings.sql`, then
browse `/directory`, open a listing, leave a ★ review, and find it on the globe.

## ⏭️ Next: Phase 4 — People discovery + gating foundation

Searchable/filterable people list; profile reveal flow; `getEntitlements` + `usage_events` with
the free limits from §5 (upgrade prompts, before Stripe). **Awaiting "go".**

## Backlog (per brief)

Phase 5 Chat · 6 Feed & events · 7 News · 8 Stripe billing · 9 Polish, moderation, deploy.
(Account deletion + data export from §7 with the privacy pass.)
