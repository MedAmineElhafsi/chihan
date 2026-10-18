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

### 3.1 Ten migrations have never been run

`supabase/migrations/0026_*` through `0035_*` are written, tested and
committed, but **none of them has been applied to the live Supabase project**
(verified against the live database on 18 Oct 2026 — every table and column
they add is still missing).

Everything built in the last several sessions is therefore invisible in
production: ads, listing details (opening hours, WhatsApp), voice notes,
Translate, interpreter requests, Give & Ask, city guides, the buddy programme,
the jobs & housing board, the business plan and event tickets. The code is
live and correct; it is just hiding, by design (see §5.1).

Build the one-file script and paste it into the Supabase SQL editor:

```bash
node -e "const fs=require('fs');const d='supabase/migrations';let o='-- Cihan - every migration that has not run yet, in order.\n-- Paste the whole file into the Supabase SQL editor and run it once.\n-- Each part is safe to run again.\n\n';for(const f of fs.readdirSync(d).filter(f=>/^00(2[6-9]|3[0-5])_/.test(f)).sort()){o+='-- ====== '+f+' ======\n'+fs.readFileSync(d+'/'+f,'utf8').replace(/\r\n/g,'\n').trimEnd()+'\n\n'}fs.writeFileSync('pending.sql',o);console.log('wrote pending.sql')"
```

It is idempotent — the whole set was run twice, end to end, against a local
Postgres seeded to the 0025 state. Delete `pending.sql` afterwards; it is a
build artefact, not a source file.

### 3.2 There are no administrators

The live project has **26 profiles and 0 admins**. Nothing that needs approval
can be approved: sponsored ads, held board posts, verification requests, city
guides. Promote someone after the migrations run:

```sql
update public.profiles set is_admin = true where user_id = 'THE-UUID';
```

Migration `0031` deliberately closes the hole that would have let a member do
this to themselves, so it has to be done in SQL by hand, once.

### 3.3 Two verified badges will disappear

The live project has 2 profiles with `is_verified = true` and **0 verification
requests**, approved or otherwise — the badges were never earned. `0031` ends
by resetting exactly those. That is correct, not a bug: "verified" decides who
may post a room or a job and who may be a buddy, so it has to mean a document
an administrator looked at. Tell the customer before you run it.

### 3.4 Production environment

`NEXT_PUBLIC_SITE_URL` must be set in production or every Stripe return link
and share link points at localhost.

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

**Added over the recent sessions** (all behind migrations 0026–0035):

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
file, and is written to be safe to run twice. They were each tested against a
real Postgres (PGlite) dressed up as Supabase — roles `anon` /
`authenticated` / `service_role`, `auth.uid()` from the JWT claim, a fake
`storage` schema — before being handed to the customer: 92 checks for
0032–0035 alone, plus the full 0026–0035 set run end to end on a 0025 database,
twice.

**That harness is not in the repository.** It lived in a session scratchpad and
is gone. Rebuilding it is the single highest-value piece of engineering
housekeeping left (see §7).

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
2. **Put the migration test harness in the repository.** A `scripts/` or
   `test/db/` folder with the PGlite setup, the Supabase-shaped prelude and the
   per-migration test files, runnable with `npm run test:db`. Right now the
   proof that these policies are correct exists only in old transcripts, and
   the next person to touch a policy has no net.
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
