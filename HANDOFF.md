# Cîhan — handoff

Written 18 October 2026, for whoever picks this up next. `PROGRESS.md` is the
long record of what exists and `DECISIONS.md` says why; this file is the short
version plus the things that are not written down anywhere else.

---

## 1. What this is

A community and discovery platform for the Kurdish diaspora, built around an
interactive 3D globe. There is a real customer; the site has **not launched**.
"Cîhan" (Kurdish for *world*) is a working name — the brand is set in
`lib/constants.ts` and changes in one place.

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v4
· Radix/shadcn primitives · next-intl in five locales (`en`, `de`, `ku`, and
RTL `ckb`, `ar`) · Supabase (Auth + Postgres + PostGIS) · Stripe.

**Next.js 16 is not the Next.js you remember.** `middleware.ts` is now
`proxy.ts`, `params` / `cookies()` / `headers()` are async, Tailwind v4 is
CSS-first. Read the relevant guide in `node_modules/next/dist/docs/` before
writing anything that touches the framework. `AGENTS.md` says the same.

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                  # http://localhost:3000 → /en
```

The app runs without any keys — every feature that needs one hides itself
instead of erroring.

---

## 2. Repository state

- Working tree **clean**, on `main` at **`5c81e87`** ("Two ways to earn: a
  business plan, and tickets").
- **Push to the `chihan` remote**, not `origin`:
  `git push chihan main`. `origin` points at an older `platform.git` and is 52
  commits behind — ignore it, do not push there.
- `chihan/main` and local `main` are in sync (0 ahead, 0 behind).
- The `phase-*` branches are history from the original build; everything since
  happens on `main`.

---

## 3. Do these first — the project is blocked on them

### 3.1 The migrations have been run

All eleven, `0026` through `0036`, applied to the live project
(`czihcdhrzbhgsugdnyxx`) on 21 October 2026, one at a time and each recorded
under its own name.

Verified afterwards: the fourteen new tables all exist, row-level security
is on for every one of them, the four private buckets are private and
`shop-previews` is public as intended, and the content survived untouched —
26 profiles, 21 listings, 11 posts, 7 help requests, exactly as before.

Two things that look wrong and are not:

- `spatial_ref_sys` reports no row-level security. It is PostGIS's own table
  of coordinate-system definitions, installed by the extension, holding no
  user data and not something RLS can be enabled on normally. The test
  harness never sees it because it strips `create extension postgis`.
- `translations` refuses the anon key with a permission error. That is the
  point of it: RLS on, no policies at all, service role only.

**The deployed site will not show any of this until its Supabase keys are
added and it is redeployed** (§3.4). The migrations are in the database; the
site cannot reach the database yet.

### 3.2 There is one administrator

`8970e05f-a138-493c-a622-a21111329a94` (Mohamed Amine El Hafsi), set on
21 October 2026. Ads, held board posts, verification requests, guides and
Bazar submissions can now be approved by somebody.

Being an administrator does **not** confer the verified badge, and
deliberately so — `is_verified` means a document was checked, and it is what
decides who may post a room or a job and who may be a buddy. An
administrator who wants to do those things submits a verification request
like anyone else and then approves it through `decide_verification()`, which
leaves the record that a direct flag update would not.

To add another administrator:

```sql
update public.profiles set is_admin = true where user_id = 'THE-UUID';
```

Migration `0031` stops a member doing that to themselves, so it has to be
run in SQL by somebody who already has access to the database.

### 3.3 Two verified badges were taken back

The live project had 2 profiles with `is_verified = true` and **0
verification requests**, approved or otherwise — the badges were never
earned. `0031` reset exactly those, and the count went 2 → 0 with nothing
else touched. Correct, not a bug: "verified" decides who may post a room or
a job and who may be a buddy, so it has to mean a document an administrator
looked at.

The two affected accounts, should the customer want them restored after a
real check: `8970e05f-a138-493c-a622-a21111329a94` (Mohamed Amine El Hafsi)
and `a870626f-d181-426e-b851-59906a2e5d68` (el hafsi hatem). Restoring means
an approved `verification_requests` row, not a direct flag update — the
trigger from `0031` now refuses that from anyone but an administrator.

### 3.4 It is deployed, behind a login

**https://cihan-xi.vercel.app** — Vercel project `cihan` under
`medamineelhafsis-projects`, deployed 21 October 2026 from `e01c7f0`.

**Vercel Authentication is on for every deployment, production included**
(`ssoProtection: { deploymentType: "all" }`). An anonymous visitor gets
Vercel's login page, not the site — deep links too; nothing of the app
leaks. That is deliberate: until the Impressum, the terms and a real
privacy notice exist (§6 below), a public German-facing commercial site is
an exposure rather than a launch. Turning it off is one setting in the
dashboard when the paperwork is ready.

There is no Git integration — linking the repository needs a GitHub Login
Connection on the Vercel account, which was not set up. Deployments are
therefore manual:

```bash
npx vercel deploy --prod --yes
```

**The site is built but keyless.** Only `NEXT_PUBLIC_SITE_URL` is set. Add
the rest in the Vercel dashboard (Settings → Environment Variables) — they
belong to the customer and nobody else should be typing them:

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | everything. Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything. Public by design — RLS is what protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret.** Webhooks and admin tasks. Never `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret. Premium, tickets, the Bazar |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` / `_YEARLY` / `_BUSINESS` | the plans that use them |
| `STRIPE_CONNECT` | event tickets |
| `STRIPE_TAX` | **leave unset.** `on` enables paid Bazar selling and must wait for the OSS registration |
| `GOOGLE_TRANSLATE_API_KEY` | the Translate link |
| `RESEND_API_KEY` | invite emails |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | web push |

`NEXT_PUBLIC_*` values are inlined at build time, so **redeploy after
adding them** or they will not take effect.

The build survives without any of them — the globe loader catches its own
error — so a keyless deployment goes green and simply shows nothing. Do not
read a successful build as a working site.

Optional keys, each gating one feature that stays invisible without it:

| Key | Unlocks |
| --- | --- |
| `GOOGLE_TRANSLATE_API_KEY` | the Translate link on posts, requests, replies |
| `NEXT_PUBLIC_STRIPE_PRICE_BUSINESS` | the business plan |
| Stripe Connect (Express) enabled, `STRIPE_CONNECT` not `"off"` | selling event tickets |

In the Stripe dashboard the webhook must also send **`account.updated`** — it
is how an organiser's payout readiness gets recorded — alongside the
`checkout.session.*` and `customer.subscription.*` events already in use.

---

## 4. What is built

Everything below is committed, type-checked, linted, builds clean, and was
verified on a production build with sample data at 375 px and 1280 px in
English, Sorani and Arabic.

**The core** — globe, directory of businesses and professionals with reviews,
member profiles, realtime chat, feed and events, news, help board, private
groups, reels, invites, reports and moderation, Stripe subscriptions, five
locales with full RTL, PWA with web push.

**Added over the recent sessions** (all behind migrations 0026–0036):

| Feature | Migration | Notes |
| --- | --- | --- |
| Sponsored listings in Explore | 0026 | owner promotes, admin approves |
| Opening hours, WhatsApp, services | 0027 | "open now" in the listing's own time zone |
| Voice notes | 0028 | chats, groups, help requests and replies; private bucket, signed URLs |
| Translate | 0029 | Google Cloud Translation, cached, 60 new translations/hour/member |
| Interpreter requests · Give & Ask | 0030 | matched by language + city; photos stripped of EXIF in the browser |
| Profile-flag lockdown | 0031 | **security fix** — see §3.2/§3.3 |
| City guides | 0032 | admin-written, per city or country, in the reader's language |
| Buddy programme | 0033 | verified mentors only, capacity 1–3, either side ends it instantly |
| Jobs & housing board | 0034 | verified posters only, scam wording screened in EN/DE/AR/KU, held not deleted |
| Business plan · event tickets | 0035 | longer ad runs + listing statistics; Stripe Connect destination charges, 5% fee |
| Bazar — downloads by Kurdish makers | 0036 | the shelf, product pages, a review queue, checkout, settlement. **Paid selling is off until `STRIPE_TAX=on`**, which must not be set before the OSS registration exists. Free downloads work without any of it. See [BAZAR.md](BAZAR.md) |

Feature flags live in `lib/features.ts`. Deliberately **off** for launch:
`match`, `views`, `billing` — engagement machinery that works against a
community built on helping, plus a paywall that earns nothing at zero users.
The code and tables are intact; each is one flag away.

---

## 5. How the codebase works — do not break these

### 5.1 A feature hides until its migration runs

`lib/schema-ready.ts` probes for a table/column with the anonymous client and
memoises a *yes* for the life of the server (a column does not stop existing);
a *no* is re-asked every request, so running the migration switches the feature
on **without a redeploy**. Every loader for a post-0025 feature starts with one
of these probes and returns empty on a database that has not caught up. This is
why the app is currently running fine against a 0025 database.

When you add a feature: add the probe, gate the loaders and the nav entry with
it, and never add a new column to an existing `select` string without one —
selecting a missing column fails the *whole* query and takes a working page
down with it.

### 5.2 Migrations are proven before they are offered

Every migration ships with RLS policies for every table it creates, in the same
file, and is written to be safe to run twice. They are each tested against a
real Postgres (PGlite) dressed up as Supabase — roles `anon` /
`authenticated` / `service_role`, `auth.uid()` from the JWT claim, a fake
`storage` schema — before being handed to the customer.

```bash
npm run test:db
```

145 checks in about thirteen seconds: who may write a guide, who may be a
buddy, what the board holds, who can hear a voice note, who reads a
listing's numbers, that nobody can write themselves a ticket, and that the
whole pending set runs on a 0025 database twice. It lives in
[`test/db`](test/db/README.md), and its README explains how to add to it.

**Run it before writing any migration, and before handing anyone SQL.** It
has already earned its place: it caught a `CHECK` constraint in 0035 that
let an event carry a ticket price with no number of places, because the
constraint evaluated to `null` and a `CHECK` passes on `null` — and the
number of places is the only thing stopping an event overselling.

### 5.3 Private files, signed URLs

`voice-notes`, `help-photos` and `board-photos` are private buckets.
`lib/signed-urls.ts` batch-signs paths with the *viewer's* session (6 h). The
storage-read helpers (`can_hear_voice_note`, `can_see_help_photo`,
`can_see_board_photo`) are deliberately **not** `security definer`, so the RLS
of the row that points at the file still applies. Do not "fix" that.

### 5.4 Money

Cîhan never holds anyone else's money and never sees a card. Ticket payments
are Stripe destination charges straight into the organiser's connected account
with a platform fee (`TICKET_FEE_PERCENT` in `lib/stripe.ts`). Price and
remaining places are read on the server, never taken from the page. A ticket
row is written only from the webhook, and `stripe_session_id` is unique, so a
retried webhook cannot sell the same seat twice.

### 5.5 Counting

`listing_events` holds one row per listing **per day per kind** — never a row
per visit, nothing identifying a visitor, and the owner's own visits are not
counted. Keep it that way; §"A business learns how many, never who" in
`DECISIONS.md` explains why that matters for this audience in particular.

### 5.6 Five locales, every time

A string added to `messages/en.json` must be added to `de`, `ku`, `ckb` and
`ar` in the same change. The files are plain JSON, 2-space indented, and they
round-trip through `JSON.stringify(x, null, 2)` — a small Node script is the
reliable way to edit all five. In RTL, use logical alignment (`text-start` /
`text-end`, not `text-left` / `text-right`), and format every number through
`Intl` so a page never mixes Latin and Arabic-Indic digits.

---

## 6. The customer's standing rules

- **Never hardcode secrets.** Keys in `.env.local`, placeholders in
  `.env.example`. Never commit a real key, never print one into the chat.
- **Never ask the customer to paste the database password**, and never fill a
  password into `.env.local` yourself.
- **Migrations, not manual edits.** Versioned SQL in `supabase/migrations`,
  with RLS policies for every table in the same file.
- **Ask before destructive actions** — dropping tables, deleting data,
  force-pushing.
- **Deleting one of the customer's files goes to the Recycle Bin**, never a
  permanent delete.
- TypeScript strict, ESLint + Prettier, no `any`. `tsc --noEmit`, `eslint .`
  and `next build` must all be clean before anything is called done.
- Keep `PROGRESS.md` and `DECISIONS.md` current.
- The original brief asks for **one phase at a time, stopping for confirmation
  after each**. In practice the customer has lately asked for several numbered
  items at once and told me to keep going — follow what they actually ask for
  in the session, but do stop and report at the end of a numbered block.

---

## 7. What to do next

In the order I would do it:

1. **Get §3 done.** Migrations, then an admin, then the production env vars.
   Nothing else is worth doing while ten migrations sit unapplied — the
   customer has been looking at a site that hides most of what has been built.
2. **Extend the database tests as you go.** `npm run test:db` covers 0028 and
   0031–0036 plus the pending set; the migrations before those have no tests
   yet. Chat, groups and the help board are the ones carrying private
   material, so they are worth backfilling — and every new migration should
   arrive with its own file.
3. **Have a native speaker read the Kurmancî and Soranî strings.** They are my
   best effort, not a translator's. 1,304 strings in each.
4. **Fix the map tiles.** The listing map's CARTO basemap now returns tiles
   watermarked "API KEY REQUIRED" (`components/directory/listing-map.tsx`).
   Needs a key or a different free provider. This is visible on every listing
   page with coordinates, so it is the most embarrassing open bug.
5. **Seed real content before launch.** 21 listings, 11 posts and 7 help
   requests across 26 profiles is not yet a community. City guides (0032) are
   the cheapest way to make the site useful on day one — they are
   administrator-written and need no other members to be there.
6. **Decide on the brand name.** "Cîhan" is still the working name;
   `lib/constants.ts` is the one place it changes.

Only after all that would I reach for new features. If the customer asks for
more, the honest advice is that density, not surface area, is what this
project is short of.

---

## 8. Gotchas that cost me time

- **The `Bash` tool single-quotes the whole command**, so an apostrophe inside
  a heredoc breaks it. Write longer scripts to a file first.
- **`Write` and `Bash` turn `\uXXXX` escapes into literal characters.** A regex
  that needs a literal backslash has to build it (`String.fromCharCode(92)`).
- **Line endings.** The git index is LF, the working tree is CRLF; edits should
  write LF. The "LF will be replaced by CRLF" warnings on every `git add` are
  normal here.
- **Prettier.** Most of the repo does *not* satisfy the project's own Prettier
  config (the Tailwind class-sorting plugin reorders almost every file). Format
  only files that were already clean, plus files you create — otherwise a
  two-line change arrives as a 400-line diff. Check with
  `npx prettier --check <file>` against a copy of the `HEAD` version *inside
  the repository* (config resolution is path-based; checking a copy in `/tmp`
  silently skips the plugin and lies to you).
- **Verifying UI without a live database**: make a worktree, point it at a
  mocked `lib/schema-ready.ts` and stubbed loaders, `npm install` inside it
  (a junction to the main `node_modules` makes Turbopack refuse to build:
  "Symlink points out of the filesystem root"), then build, start and
  screenshot. Slow to set up, and the only way the layout bugs got caught.
- **Contrast is measured on rendered pixels**, not on token values — the aurora
  backdrop lifts the ground unevenly. Lowest measured so far: 7.26 for the
  voice/translate work, 5.45 for the newest screens. Keep it above 4.5.

---

## 9. Where to read more

| File | What it holds |
| --- | --- |
| `PROGRESS.md` | every phase and feature, what was verified and how |
| `DECISIONS.md` | why things are the way they are — read before changing one |
| `BRIEF.md` | the original customer brief and phase plan |
| `AGENTS.md` / `CLAUDE.md` | the Next.js 16 warning and working rules |
| `README.md` | setup, environment variables, Supabase and Stripe wiring |
| `.env.example` | every key, with a comment saying what it unlocks |
