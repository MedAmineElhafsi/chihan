# Cîhan — Project Brief

> A global community + discovery platform for the Kurdish diaspora, built around a
> Radio-Garden-style interactive 3D globe. Replace the working name "Cîhan" (Kurdish
> for "world") with the final brand name when the customer confirms it.
>
> **This brief describes a project already in flight.** See §9 before acting.

---

## 0. How I want you to work (read this first)

- **Build in phases.** Do **one phase at a time** (see §9). After each phase: run the app,
  give me a short summary of what works, list any decisions you made, and **stop and wait
  for my confirmation** before starting the next phase.
- **Read PROGRESS.md first.** It is the source of truth for what exists. This brief is
  context, not a to-do list.
- **Never hardcode secrets.** All keys go in `.env.local` (and `.env.example` with
  placeholder values committed). Never commit real keys.
- **Migrations, not manual edits.** Every database change is a versioned SQL migration in
  `/supabase/migrations`. Add **Row-Level Security (RLS) policies for every table** in the
  same migration — no table ships without RLS.
- **Ask before destructive actions** (dropping tables, deleting data, force-pushing).
- **Type-safe and linted.** TypeScript strict mode, ESLint + Prettier. No `any` unless
  justified in a comment. `tsc`, `eslint`, and `next build` must be clean before a phase closes.
- **Verify in the browser**, not just in the type checker. State what you checked and at
  what viewport widths.
- **Commit per phase** with clear messages. Keep PROGRESS.md and DECISIONS.md current.

---

## 1. Vision

Cîhan is a social + discovery platform for Kurdish people worldwide. The signature feature is
a **spinnable 3D earth** (visually inspired by Radio Garden): a dark globe covered in glowing
dots, a fixed reticle in the center, and a side panel that updates as the user rotates the
globe or clicks a region. Dots represent **Kurdish people, restaurants, doctors, and other
businesses/professionals**.

Core user journeys:

1. Spin/zoom the globe to a country (e.g. **Spain**) → see every Kurdish **restaurant /
   doctor / business** there, each with **rating & reviews** and **contact info**.
2. **Find Kurdish people** near a place or by filters, view public profiles, **chat** in real time.
3. Read a **News** page aggregating Kurdish-related news from around the world.
4. Browse and post to a **Feed** — posts and **events** anyone can share.
5. A **freemium paywall**: free users get limited people-discovery and feed access; paid
   subscribers get unlimited discovery, full feed, event posting, and advanced filters.

The product should feel **premium, warm, and modern** — a "wow" demo for the customer.

---

## 2. Tech stack (fixed — do not substitute without asking)

- **Framework:** Next.js 16 (App Router) + React + TypeScript (strict).
- **Styling/UI:** Tailwind v4 + shadcn/ui + lucide-react. Framer Motion for animation.
- **3D globe:** react-globe.gl (Three.js) for the hero globe with point data.
- **Detail map:** maplibre-gl (free, no token) for zoomed-in country/city maps.
- **Backend:** **Supabase** — Postgres + **PostGIS**, Supabase Auth, Realtime (chat), Storage.
- **Payments:** **Stripe** Checkout + Customer Portal + webhooks (EU-ready: cards + SEPA).
  Do **not** build custom card forms.
- **Geocoding:** Nominatim (OpenStreetMap, free, respect rate limits). Cache results.
- **i18n:** next-intl. Languages: **English, German, Kurmancî (Latin), Soranî (Arabic
  script, RTL), Arabic (RTL)**. Full **RTL layout support** required.
- **Deployment:** Vercel (frontend) + Supabase (cloud). Must run locally first.

---

## 3. Core modules

**Auth & onboarding** — email + Google OAuth; onboarding captures display name, city/country
(geocoded), languages/dialect, avatar, and an **explicit consent checkbox** ("I choose to
appear in the Kurdish community directory") — see §7.

**Globe (Explore)** — full-screen react-globe.gl, dark Earth, glowing point layer from
people + listings. Center reticle. Rotate/click selects the nearest country and opens a
results panel. Fly-to animation. Layer toggles: People / Restaurants / Doctors / All.
Text + country + profession search dims non-matches rather than hiding them.

**Directory** — businesses & professionals. Categories (restaurant, doctor, grocery, lawyer,
hairdresser, mosque/community center, other). Detail page: contact info, MapLibre map,
photos, **reviews with 1–5 star ratings** and owner right-of-reply. Owners claim/create/edit.

**People discovery** — searchable, filterable public profiles (country, city, language,
distance). **Premium-gated** (§5). Profile pages with "Message".

**Chat** — real-time 1:1 via Supabase Realtime. Conversation list + thread, read receipts,
unread badges. Group chat is out of scope.

**Feed** — posts and **events**. Create post (text + optional image); create event (title,
date/time, location, description). Like + comment. **Premium-gated** (§5).

**News** — Kurdish-related news items (title, summary, source, image, country, published
date), filterable by region.

**Billing** — Stripe subscription (monthly + yearly), upgrade flow, Customer Portal,
webhook-driven entitlements.

---

## 4. Data model (Postgres / Supabase)

`postgis` enabled. `geography(Point,4326)` for coordinates. **Every table gets RLS.**

Core tables: `profiles`, `listings`, `reviews`, `conversations`,
`conversation_participants`, `messages`, `posts`, `post_likes`, `post_comments`,
`news_articles`, `subscriptions`, `usage_events`.

26 migrations exist in `/supabase/migrations`. **That directory is the authoritative
schema, not this section** — later phases added stories, help requests, push
subscriptions, professional listings, private groups, verification, and reels.

Provide a typed Supabase client and generated DB types.

---

## 5. Monetization rules (freemium)

A single `getEntitlements(userId)` helper returns tier and limits, enforced **both** in the
UI (locks/upgrade prompts) **and** server-side (API routes / RLS where possible — never
trust the client).

**Free tier**

- People discovery: browse, but **profile contact / "Message" limited to 5 per day**;
  beyond that, a blurred "Upgrade to view" state.
- Feed: **read-only** + like; **cannot create posts or events**; events >30 days out hidden.
- Chat: can reply to people who messaged them; limited new conversations per day.
- Directory + globe browsing + reading reviews: **always free** (the public hook).

**Premium tier (monthly / yearly via Stripe)**

- Unlimited people discovery + messaging.
- Full feed: create posts **and events**, see all upcoming events.
- Advanced filters (language, dialect, distance radius), "who viewed my profile".
- Verified badge eligibility.

All numbers configurable in one constants file. Clean **Upgrade** modal + pricing page.

---

## 6. Design direction

- **Mood:** premium, modern, warm, a little cinematic. The globe is the showpiece — dark
  space background, subtly glowing dots, smooth inertia, soft bloom.
- **Palette:** Kurdish identity *tastefully* — deep night-blue/charcoal base, with red,
  green, white, and a golden-sun accent (#E1B12C-ish) used sparingly for highlights/CTAs.
  Avoid a garish flag-colored UI.
- **Type:** clean modern sans for UI; a characterful display face for headings. The stack
  must support Arabic/Soranî glyphs.
- **Panels:** glassmorphism over the globe, rounded, blurred, high-contrast text.
- **Motion:** Framer Motion for panel transitions and globe fly-to. Smooth, never janky.
- **Mobile-first & responsive.** The globe must feel good on phones. Full RTL mirroring.

**The design system is established, not open for reinvention.** Dark-first "cosmic warmth",
glass panels, sparing gold accent. Current contrast measures **15.7:1** heading and **5.9:1**
body against a 4.5 floor — do not regress these. Match what exists; do not introduce a new
aesthetic direction. See §10 for which guidance governs.

---

## 7. Non-functional / privacy / security

- **GDPR / consent:** membership implies ethnic-community affiliation — sensitive data in the
  EU. Profiles are **private by default**; a user appears on the globe / in discovery only
  after **explicit opt-in** at onboarding (store `consent_at`). Provide account deletion
  (full erasure) and data export. Privacy notice page. Never expose contact info without consent.
- **RLS everywhere:** read public profiles/listings/posts; edit only your own profile,
  listings you own, your own reviews/posts/messages. Messages readable only by participants.
- **Input validation** with Zod on every API route. Sanitize user content; profanity/spam
  guard on posts and reviews.
- **Moderation:** `reports` table + minimal admin view to hide/remove flagged content.
- **Performance:** cluster globe points when zoomed out; lazy-load globe and maps; paginate
  feed and discovery.
- **Accessibility:** keyboard-navigable, ARIA labels, sufficient contrast.

---

## 8. Project conventions

Single Next.js app (App Router): `/app`, `/components`, `/lib` (supabase client,
entitlements, geocoding), `/supabase/migrations`, `/messages` (i18n), `/types`.

Environment variables documented in `.env.example`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`,
`NEXT_PUBLIC_STRIPE_PRICE_YEARLY`.

Keep PROGRESS.md and DECISIONS.md updated.

---

## 9. Where the build actually is

**Complete:** Phases 0–9 (scaffold/auth, profiles, globe, directory, people discovery,
chat, feed, news, billing, polish). Phase A (five-tab shell) and Phase B (globe search).

**Written but not live — four migrations are UNRUN:**

| Migration | Phase |
|---|---|
| `0022_professionals_reviews.sql` | C — reviews for every profession |
| `0023_private_groups_verification.sql` | D — private groups + verification |
| `0024_reels.sql` | E — reels |
| `0025_help_match_notifications.sql` | help matching |

**Do not scaffold, re-init, or re-run completed phases.** Read PROGRESS.md before acting.

Known and pre-existing: Realtime presence returns 400 on `/explore`, so online dots never
light. Unrelated to current work — don't fix it in passing.

Open question from the last session: the "Explore" tab points at `/feed`, which is
backwards — every app uses Explore for discovery. Renaming it to "Feed" is a two-line change.

---

## 10. Design authority (strict precedence)

Use the vendored skills in `.claude/skills`. On conflict, earlier wins:

1. **apple-design** — motion feel, springs, interruptibility, translucent materials
2. **emil-design-eng** — component polish, craft bar
3. **ui-styling** — shadcn / Radix / Tailwind patterns (this stack)
4. **ui-ux-pro-max** — palettes, fonts, icons, motion presets

For animation work: **animate** to build, **review-animations** before committing.
To find gaps: **find-animation-opportunities**. To survey existing motion: **improve-animations**.

These are vendored deliberately — pure markdown, no keys, no outbound calls. Do not add
design skills or component libraries to this project without asking. Do not introduce a
competing design direction.

---

## 11. Imagery

Seed/demo imagery only, so the globe and directory look alive in demos.

Generate with **Higgsfield** `generate_image` (model `gpt_image_2_5`):

- ~30 avatar portraits — varied ages, genders, natural light, neutral backgrounds, 1:1
- ~20 business exteriors/interiors — restaurant, grocery, clinic, law office, hairdresser,
  community center — warm evening tone, 4:3

Save into `public/seed/` and reference locally from the seed script. Never hotlink.

This is the **only** sanctioned outbound generator. It does not reverse the policy in
`.claude/skills/README.md` — nothing else in this project makes network calls or needs keys.

---

## 12. Start now

Run migration `0022`, verify Phase C end-to-end in the browser, and report back.

Before writing code, restate your plan in 5–8 bullets and list any assumptions.
Then stop and wait for my "go" before Phase D.
