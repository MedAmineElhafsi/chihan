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

## Phase 5

- **`SECURITY DEFINER` helper functions inside RLS** (`is_conversation_participant`,
  `shares_conversation`) so participant checks don't recurse on `conversation_participants`.
- **Conversations created via a `SECURITY DEFINER` RPC** (`create_direct_conversation`) — the
  creator inserts both participant rows, which a normal `with check (user_id = auth.uid())` policy
  would forbid. `find_direct_conversation` makes start-conversation a get-or-create.
- **Read state via `last_read_at` on the participant row**, not `read_at` per message — one update
  to mark a thread read, column-safe RLS (`user_id = auth.uid()`), and the sender derives "Seen"
  from the partner's `last_read_at`. (Deviates slightly from the brief's `messages.read_at`.)
- **A single Realtime subscription** to `messages` powers both the live thread and the list's
  unread counts; RLS scopes the stream to the user's own conversations, so no client-side filter
  by id is needed.
- **Partners can read each other's profile** (extra `profiles` SELECT policy via
  `shares_conversation`) so you always see who you're chatting with, even if they're private.
- Active conversation's unread is **derived to 0 at render** (not set in an effect) to satisfy the
  React `set-state-in-effect` rule.

## Phase 6

- **Premium gating in the server action**, not RLS: posting/event creation checks
  `getEntitlements`. RLS only enforces `author_id = auth.uid()` (a tier check in a policy would
  need a subscriptions join on every insert). Free members can like and comment (lighter
  engagement); only authoring posts/events is gated.
- **30-day event horizon filtered server-side** in `getFeed` for free users — far-future events
  never reach the client.
- **`posts_with_counts` view** for like/comment counts; "liked by me" is a separate per-viewer
  query (can't live in a shared view). Comments load lazily on expand via a server action.
- **Insert row typed as `Record<string, unknown>`** so the post/event union doesn't trip the
  Supabase client's excess-property check.

## Phase 8

- **User↔Stripe mapping via `client_reference_id` + `subscription_data.metadata.user_id`** at
  checkout, so every `customer.subscription.*` webhook can resolve the user without a lookup table.
- **Webhook writes with the service role** (bypasses RLS); the `subscriptions` table stays
  user-read-only. Entitlements are derived from `subscriptions.status` — no separate "is premium"
  flag to keep in sync.
- **`current_period_end` read defensively** (subscription or first item) to survive Stripe API
  version differences.
- **Billing degrades gracefully**: actions return a friendly error and the Upgrade button is
  disabled with a "connect Stripe keys" note when `STRIPE_SECRET_KEY` is absent, so the app builds
  and runs without billing configured.
- **Premium unlock is fully automatic** — once the webhook marks a subscription `active`, every
  existing gate (people reveals, advanced filters, posting/events) opens via `getEntitlements`,
  with no per-feature billing code.

## Phase 9

- **Admin via `profiles.is_admin`** + an `is_admin()` SECURITY DEFINER helper for RLS. A trigger
  blocks non-admins from elevating themselves, but allows changes when `auth.uid()` is null (SQL
  editor / service role) so the first admin can be bootstrapped.
- **Moderation "remove" uses the service role** after verifying the caller is an admin in the
  action — simpler than per-table admin-override RLS policies. Reported **profiles are hidden**
  (`is_public=false`), not deleted, to avoid destroying a person's account over a content report.
- **Account deletion** uses `auth.admin.deleteUser`; all owned rows cascade via FK
  `on delete cascade`. **Data export** is a route handler streaming the user's own rows as JSON.
- **`error.tsx` / `loading.tsx`** live under `[locale]` so they render inside the intl + theme
  providers.
- The app is built to **degrade gracefully** end-to-end: missing Supabase or Stripe keys never
  crash a page — data loaders catch and return empty, and gated actions return friendly errors.

## Surface reduction: fewer things, done properly

**Decision.** Groups, Feed, Stories, People, Match and Who-viewed are switched
off for launch. Help, Directory, Explore, News, Messages and Search stay.
Billing is off too — everyone gets full access.

**Why.** Those six surfaces were ~4,200 lines carrying features that only work
at scale. A feed with no posts, a groups tab with no groups and a match page
with nobody to match reads as an abandoned product, not an early one. Help and
Directory are the two surfaces that work on day one with a handful of members,
because the value is in a single good answer, not in volume.

Billing follows the same logic: with no users a paywall earns nothing and only
adds friction to the loop we want people to try.

**How.** Hidden, not deleted. `lib/features.ts` holds the flags; each route
guards with `if (!isEnabled(...)) notFound();`. Tables, RLS policies, data and
components are untouched — flipping a flag back brings a surface home with its
history intact. Nothing destructive was run.

**Directory wired into Help.** A health request now suggests doctors from the
directory in the same city, legal suggests lawyers, and so on
(`lib/help-directory.ts`). When the asker marks a request resolved, they are
invited to add whoever solved it as a listing. The directory becomes the help
board's memory: the second person to need a Kurdish-speaking dentist in Berlin
finds the answer instead of asking for it.

## Contrast is measured on the rendered page

**Decision.** Text contrast is checked against the pixels actually rendered
behind the glyphs — the worst pixel, across several moments of the aurora's
drift — not against the page's background colour. The floor stays 4.5:1.

**Why.** The aurora is part of the ground. Against the flat colour, quiet text
passed at 5.89; against what was really behind it on a 1280 screen, the same
text was 3.14. The flat number described a page nobody sees.

**What it changed.** Muted text went from `#7f979d` to `#a4bcc3` (same hue,
lighter). The aurora's blur moved from px to vmax so light no longer pools
harder on bigger screens. Indigo and violet gained alpha to keep the desktop
atmosphere as bright as before. Primary text keeps a 1.7× step over muted
text, so the hierarchy survives. Details and numbers are in PROGRESS.md.

## One loading boundary, at the root, shaped by destination

**Decision.** The app keeps a single `loading.tsx`, at `app/[locale]`. It
reads the destination's pathname and draws that section's skeleton, or a
spinner for anything without one. There is no `loading.tsx` inside a section.

**Why.** A section's `loading.tsx` also stands in for its filter links and
sub-pages: a help category chip would blank the board into a skeleton, and a
request's own page would load under the board's shape. At the root, the
fallback shows only when you move between sections, which is exactly when
nothing of the destination is on screen yet; within a section the router
keeps the current page until the next one is ready.

**How to keep it honest.** Each skeleton in
`components/loading/section-skeletons.tsx` copies its page's container and
spacing and names the page it mirrors; change them together. Member-only and
visitor-only parts switch on the layout's `data-viewer` attribute with CSS,
so a skeleton never promises what this viewer will not get.

## One name per place

**Decision.** A destination is called the same thing everywhere: tab bar,
header, menus, its own heading and its document title. The names are the
customer's: the globe (`/explore`) is **Home**, the feed (`/feed`) is
**Explore**. The routes keep their old names; renaming a route would break
links already shared, and the URL is not where people read the name.

**How.** A section's document title comes from its nav label through
`lib/page-title.ts`, and the feed's heading reads `Nav.explore` directly, so
renaming a tab renames its page. Headings that describe content rather than
name a place (the globe panel's "On the globe") must not reuse another
place's name.

**Why it matters.** Next announces a navigation to screen readers only when
the document title changes; one title for every page meant silence.

## Sharing follows the privacy of what is shared

**Decision.** Listings, public posts and events share with a real preview:
name, photo, date, place. A help request shares only "someone on Cîhan is
asking for help", in the preview and — unless the sharer is the one who
asked — in the message too. Group posts have no Share at all.

**Why.** Requests are members-only because asking for help is exposing, and
a link preview is drawn by an anonymous crawler for anyone in the group chat
to see. The share button is how Cîhan reaches the WhatsApp groups the
community already lives in; it must not be how a request leaks into them.

## A voice note is as private as the words beside it

**Decision.** Voice notes and give photos live in private buckets. The
storage policy lets a file be read by the person who uploaded it, or by
anyone who can already see a row that points at it — a message in their
conversation, a message in their group, a request or reply on the
members-only board. The lookup runs under the reader's own row-level
security, so it cannot say yes where the row's own policy says no. A row may
only point at a file in its author's own folder, so nobody can attach
someone else's recording to their message and hand it on.

**Why.** Speaking is how many elders and people who read only one Kurdish
script will use Cîhan; what they say is often more personal than what they
would type. A public bucket with unguessable names would leak the moment one
link was forwarded.

## Translation reads as the reader

**Decision.** The Translate link sends the server which text to translate,
never the text itself. The server reads the original with the reader's own
session, translates it through Google Cloud Translation, and keeps the
result in a table nobody but the server can read, keyed to the original and
deleted with it. New translations are capped at 60 an hour per member.

**Why.** Sending text would let anyone translate anything on Cîhan's key and
bill; reading as the reader means nothing can be translated that the reader
could not already read. Google is the one service that translates both
Kurmanji and Sorani. Readers are told Google translated it, and the privacy
notice says the text is sent there.

## Guides are written, not crowdsourced

**Decision.** A guide is written and published by an administrator, in as
many languages as it exists in, with the date it was last checked on the
page. Members cannot edit one; they can suggest that a guide should exist,
and a question on the help board can be turned into a suggestion in one tap.
A reader is shown the guide in their own language where it exists, and the
next best language where it does not.

**Why.** Wrong information about a residence permit costs somebody their
status. A wiki would be faster to fill and impossible to trust; the
suggestion box keeps the community's knowledge of what is missing without
putting the office's rules in anyone's hands. The review date is there so a
reader can see when an answer went stale rather than assume it did not.

## A buddy must be a verified member

**Decision.** Only a member whose identity an administrator has checked may
offer to be a buddy, and only they may post a room or a job. Being a
newcomer asking for a buddy needs nothing. Either side ends a buddyship
instantly, without a reason, and the programme's safety note is on the page
rather than behind a link.

**Why.** A buddy sits beside someone at an office and reads their post. A
landlord takes a deposit. The people on the receiving end are new, often
without the language, and frequently alone — the asymmetry is the whole
point of the feature, so the side with the power is the side that gets
checked. Paying for anything never grants this; only a document does.

## The board holds a post, it does not delete it

**Decision.** Every job and room is read on the way in for the wording scams
use — money before a viewing, keys by post, a fee to apply, a transfer to a
foreign account — in English, German, Arabic and Kurdish. A match holds the
post for an administrator instead of publishing it; three different people
reporting a post holds it too. Nothing is thrown away, and the author is not
accused of anything.

**Why.** The same sentence can be a fraud or a clumsy translation. Holding
costs an honest poster a few hours and costs a scammer their whole
opportunity, which is the right way round; deleting would lose the evidence
and tell the scammer exactly which words to change.

## Ticket money never passes through Cîhan

**Decision.** An organiser connects their own Stripe account, and a buyer's
payment is made straight into it, with Cîhan's 5% taken as a platform fee on
the way. Cîhan never holds anyone else's money, never sees a card, and
writes a ticket only when Stripe says the payment completed — the checkout
session's id is unique in the table, so a retried webhook cannot sell the
same place twice. The price and the number of places left are read on the
server, never taken from the page.

**Why.** Holding other people's money is a regulated business and a
liability Cîhan has no reason to take on. This way an organiser is paid
whether or not Cîhan is still running, and a lost webhook can be replayed
without double-selling.

## A business learns how many, never who

**Decision.** A listing's statistics are a count per day and per kind — page
opened, tapped call, tapped WhatsApp, tapped the website, asked for
directions, shared. There is no row per visit and nothing that identifies a
visitor, the owner's own visits are not counted, and only the owner can read
the numbers. The headline totals are free; the day-by-day detail is what the
business plan buys.

**Why.** A shop needs to know whether the listing works, which a count
answers. Anything finer would mean keeping a record of who looked at what,
for an audience with good reason to be careful about exactly that — and once
such a record exists it can be demanded.
