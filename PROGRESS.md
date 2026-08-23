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

## ✅ Phase 4 — People discovery + gating foundation (code complete)

- **Migration `0003`**: `usage_events` (daily rate limits) + `subscriptions` (entitlements, wired
  to Stripe in Phase 8), with RLS (owner-read; usage self-insert; subscriptions written only by
  the service role).
- **`getEntitlements()`** (free vs premium) drives the whole freemium model in one place.
- **`/people`** discovery: searchable list of public profiles; **country/city filters free**;
  **language/dialect filters premium-gated** (shown locked, enforced server-side); each card's
  details are **blurred until revealed**.
- **Profile reveal flow**: 5 distinct reveals/day for free users, enforced server-side via
  `usage_events` (`revealProfile` action). The 6th reveal opens an **upgrade dialog**; a daily
  counter shows reveals left.
- **`/pricing`** page (Free vs Premium) + reusable Dialog primitive + UpgradeDialog.
- "People" wired as a real nav link. People/Pricing/Upgrade i18n across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓. Pricing + People pages render (premium
filter locks, blurred cards, sign-in gate), no console errors.
**To exercise the limit (you):** run `0003_usage_subscriptions.sql`, sign in, ensure several public
profiles exist (run `seed.sql`), then reveal 6 people on `/people` to hit the upgrade prompt.

## ✅ Phase 5 — Realtime chat (code complete)

- **Migration `0004`**: `conversations` / `conversation_participants` (with `last_read_at`) /
  `messages`. RLS uses `SECURITY DEFINER` helpers (`is_conversation_participant`,
  `shares_conversation`) to avoid recursive policies; find/create-conversation RPCs; a policy so
  chat partners can view each other's profile even if private; `messages` added to the Realtime
  publication.
- **Chat data + actions**: conversation list (last message + unread), thread messages,
  `startConversation` (free **new-conversation/day limit**; replies always free), `sendMessage`,
  `markRead`.
- **Chat UI** (`/messages`, `/messages/[id]`): two-pane list + thread, **live messages via Supabase
  Realtime**, **unread badges**, and **"Seen" receipts** (driven by participants' `last_read_at`).
- **Message** button on public profiles → get-or-create conversation → thread (or upgrade prompt
  when the daily new-conversation cap is hit). Messages link added to the account menus.
- Chat i18n across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓ (all message routes compile).
**To test live (you):** run `0004_chat.sql`, then open two browsers signed in as two accounts and
message between them — they update in real time.

## ✅ Phase 6 — Feed & events (code complete)

- **Migration `0005`**: `posts` (post|event), `post_likes`, `post_comments`, a `posts_with_counts`
  view, RLS (public read; owner writes), and a `post-media` storage bucket.
- **`/feed`**: post & event cards with **likes** and **comments** (load on expand), author headers
  linking to profiles, event cards (title, full date/time, location).
- **Composer** (premium): Post tab (text + optional image) and Event tab (title, datetime,
  geocoded location, details).
- **Gating** (server-enforced): creating posts/events is **premium** — free members read, like and
  comment, and see an upgrade prompt instead of the composer; **events more than 30 days out are
  hidden from free users**. Anonymous visitors get a sign-in prompt.
- "Feed" wired as a real nav link; Feed i18n across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓. Feed renders with the correct gating
state (sign-in prompt / upgrade prompt / composer), no console errors.
**To test acceptance (you):** run `0005_feed.sql`; as a free user you'll see the upgrade prompt; to
try the premium path, temporarily set your `subscriptions.status` to `active`, then post an event.

## ✅ Phase 7 — News (code complete)

- **Migration `0006`**: `news_articles` (title, summary, source, url, image, country, category,
  published_at) + RLS (public read; writes via service-role / admin — no user insert policy).
- **`/news`**: responsive article cards (category-colored header, country badge, summary, source +
  date, external "Read more"), filterable by **country** via chips.
- Optional **`supabase/seed_news.sql`** (~12 sample articles across countries/categories).
- "News" wired as a real nav link — **all five primary nav items are now live** (no more "Soon").
  News i18n across all 5 locales.

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓. News page renders (empty state until
seeded), no console errors.
**To populate (you):** run `0006_news.sql` then `seed_news.sql`, and open `/news`.

## ✅ Phase 8 — Stripe billing (code complete)

- **`lib/stripe.ts`** + **`lib/billing-actions.ts`**: `createCheckout(monthly|yearly)` (Stripe
  Checkout, subscription mode, `client_reference_id` + `subscription_data.metadata.user_id`) and
  `createPortal()` (Customer Portal).
- **Webhook** `app/api/stripe/webhook/route.ts`: verifies the signature and on
  `checkout.session.completed` / `customer.subscription.*` upserts the `subscriptions` row via the
  **service role** — `getEntitlements` then flips the user to Premium automatically.
- **Pricing** page wired with a `BillingActions` client (interval toggle + Upgrade, or **Manage
  subscription** when premium); graceful "connect Stripe keys" state when unconfigured.
- Dashboard shows a **Premium badge** + an upgrade-success banner; Pricing/Dashboard i18n updated.
- `.env.example` + README document the test-mode setup (Stripe CLI webhook forwarding).

**Verification:** `tsc` ✓ · `eslint` ✓ · `next build` ✓ (`/api/stripe/webhook` compiles). Pricing
renders the interval toggle + Upgrade button (disabled until keys exist), no console errors.
**To test end-to-end (you):** add Stripe test keys + price IDs, run `stripe listen`, then upgrade
with card `4242 4242 4242 4242` and cancel via the portal (see README §3).

## ✅ Phase 9 — Polish, moderation & deploy (code complete)

- **Migration `0007`**: `reports` + `profiles.is_admin` with a trigger that blocks self-elevation;
  RLS (users file reports; admins read/resolve).
- **Moderation**: a **Report** button (dialog) on posts and listings → `reports`; an admin-only
  **`/admin`** queue to **Dismiss** or **Remove** flagged content (removal via the service role;
  reported profiles are hidden, not deleted). Admin link surfaces in the account menu for admins.
- **Privacy (§7)**: **`/settings`** with **data export** (`/api/account/export` → JSON download)
  and **account deletion** (full erasure via the auth admin API), a **`/privacy`** notice page, and
  a footer link.
- **Polish**: global **`error.tsx`** + **`loading.tsx`** boundaries. Report/Admin/Settings/Privacy/
  Error localized across all 5 locales.
- **Deploy-ready**: README documents the migration order, Vercel + Supabase setup, Auth redirect
  config, and the Stripe webhook endpoint.

**Verification:** `tsc` ✓ · `eslint` ✓ (clean) · `next build` ✓ (all routes incl. `/admin`,
`/settings`, `/privacy`, `/api/account/export`). Privacy page renders, no console errors.
**Deploy (you):** push to GitHub → import in Vercel → set env vars → run migrations on Supabase →
set the Auth redirect URLs + Stripe webhook (see README "Deployment").

---

## 🎉 All 10 phases (0–9) are code-complete

The platform is feature-complete: auth · profiles/onboarding · the globe · directory & reviews ·
people discovery + freemium gating · realtime chat · feed & events · news · Stripe billing ·
moderation + privacy. Each phase is on its own branch; everything type-checks, lints and builds.
Remaining work is your hosted setup (run migrations, add keys, deploy).

## Surface reduction (post-Phase 9)

- [x] `lib/features.ts` — flags for every surface, documented reasons
- [x] Groups / Feed / People / Match / Who-viewed / Pricing return 404
- [x] Header, mobile menu, user menu and dashboard cleaned of dead links
- [x] Dashboard's Matches card replaced with the Help board
- [x] Billing off: `getEntitlements` grants everything while `FEATURES.billing` is false
- [x] Help → Directory suggestions by category + city (`lib/help-directory.ts`)
- [x] Resolved requests invite the asker to leave a listing behind
- [x] 5 locales updated · `tsc`, `eslint`, `next build` all clean

Reversible: flip a flag in `lib/features.ts`. No tables dropped, no data deleted.

## Phase A — the five-tab shell

- [x] `feed`, `stories`, `groups`, `people` switched back on in `lib/features.ts`
- [x] `reels: false` added — the compose sheet hides it until it exists
- [x] `components/app-shell/tab-bar.tsx` — Home · Explore · + · Chat · You, mobile only
- [x] `components/app-shell/compose-sheet.tsx` — one button: post, help, place (reel when built)
- [x] Desktop header carries the same five destinations
- [x] Layout mounts the bar and pads `main` so nothing hides behind it
- [x] Nav strings in 5 locales · `tsc`, `eslint`, `next build` clean

Verified in the browser at 375px and 1280px: bar pins to the bottom, active
tab is cyan with `aria-current="page"`, header nav takes over at `lg`, no
console errors, no sideways scroll. `/feed` and `/groups` render; `/match`
and `/pricing` still return not-found.

Still off: match, who-viewed, billing.

## Phase B — search over the globe

- [x] `components/globe/globe-search.tsx` — text box, country chip, profession chip, match count, clear
- [x] Profession chip groups People (professions) and Places (categories) in one dropdown
- [x] Layer stays a hard filter; search is soft — non-matches dim instead of vanishing
- [x] Matching points grow (0.45 → 0.62); the globe turns to the centroid of the results
- [x] Dropdown options come from the whole layer, so they never collapse to the current selection
- [x] Search strings in 5 locales · `tsc`, `eslint`, `next build` clean

Verified in the browser: 46 points → Germany 10 → "berlin" + Germany 4, with the
globe still drawing all 46 and dimming 42. Clear returns to 46. Read from the
committed fiber, not the stale alternate.

Known, pre-existing and unrelated: Realtime presence returns 400 on /explore,
so the online dots never light. Not touched by this phase.

## Phase C — reviews for every profession and business

- [x] `supabase/migrations/0022_professionals_reviews.sql` — **needs running**
  - `profiles.offers_service` — the opt-in switch
  - `listings.kind` ('business' | 'professional') + `listings.profession`
  - unique index: one professional listing per person
  - `reviews.reply` + `replied_at` — the right of reply
  - `has_dealt_with()` / `can_review()` — security definer, answer one yes/no
  - insert policy on `reviews` now requires `can_review`
  - `reply_to_review()` — RLS cannot gate a single column, so replies go through
    a function that proves the caller owns the listing
- [x] `lib/professional-actions.ts` — opt in, opt out (listing hidden, reviews kept), reply
- [x] `lib/reviews.ts` — `canReview` so the interface can explain itself
- [x] `components/profile/offers-service-switch.tsx` — the switch, on /profile
- [x] `components/directory/review-item.tsx` — name, face, reply, report
- [x] Review form explains the gate instead of failing at submit
- [x] "Professional" badge distinguishes a person from a shop
- [x] `.claude/worktrees/**` added to eslint ignores
- [x] Strings in 5 locales · `tsc`, `eslint`, `next build` clean

Design note: an **unclaimed** business stays reviewable by anyone signed in —
there is no person to have dealt with, and requiring one would have silently
killed every restaurant review. The gate applies to claimed listings and
professionals, where there is a real person on the other side.

### Phase C — verified against the live database

Migrations 0021 and 0022 are applied. Checked directly, not assumed:

| Check | Result |
|---|---|
| `listings_with_stats` exposes `kind` + `profession` | yes |
| `can_review()` / `has_dealt_with()` / `reply_to_review()` callable | yes |
| `reply_to_review` ownership guard fires on a forged id | yes |
| Stranger may review a **professional** listing | **false** |
| Owner may review **himself** | **false** |
| Stranger may review an **unclaimed business** | **true** |
| Stranger may review after a shared conversation exists | **true** |
| Gate closes again once that conversation is removed | **false** |

Fixed while verifying: the professional listing was only written when the
switch was flipped, so editing your profession afterwards left the listing
describing who you used to be. `syncProfessionalListing()` is now shared by
the switch and by `saveProfile`.

Still unseeded: `seed_help.sql` (help board is empty) and `seed_professions.sql`
(all 26 profiles have `profession = null`, so the globe's People filter has
only one value).
