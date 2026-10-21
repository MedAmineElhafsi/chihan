# Database tests

```bash
npm run test:db          # everything
npm run test:db 0034     # only the files whose name matches
```

Every migration runs against a real Postgres (PGlite, Postgres 17 compiled
to WASM) dressed up as Supabase, in memory, in about two seconds. No Docker,
no project, no network.

## Why this exists

Row-level security is the only thing standing between one member of Cîhan
and another's private messages, voice notes, identity documents and
telephone number. A policy that reads correctly can still be wrong — the
mistakes are quiet ones. `using` instead of `with check`. A `CHECK`
constraint that evaluates to `null` and therefore passes. A `security
definer` function that bypasses the very policy it was meant to respect.
None of those show up in a type checker or a code review, and all of them
show up here in a second, because the test asks the database _as somebody_
and looks at what comes back.

So: nothing goes to the customer to paste into the SQL editor until it has
been proven here first.

## Writing a test

A file in `tests/` exports a title and a default function. The runner hands
it `t`, and the labels are the point — each one is a sentence somebody could
read without knowing SQL.

```js
import { freshDb, as } from "../harness.mjs";

export const title = "0036 — something new";

export default async function (t) {
  const db = await freshDb();

  t.section("who may write one");
  t.ok("a verified member can", ...);
  await t.refuses("an unverified member cannot", () => ..., /row-level security/);

  await db.close();
}
```

`t.ok(label, condition, detail?)` asserts. `t.refuses(label, fn, pattern?)`
asserts that the database says no, and prints _which_ rule refused — often
the more interesting half.

## The harness

|                            |                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `freshDb({ upTo })`        | every migration applied, in order. `upTo: "0025"` stops where the live project is, so a pending migration can be tested as it will actually arrive.         |
| `as(db, uid, fn)`          | run `fn` as that signed-in member — or, with `uid` null, as somebody not signed in. Policies apply exactly as they will for a browser holding that session. |
| `asService(db, fn)`        | run `fn` as the server does in a webhook: service role, no RLS.                                                                                             |
| `applyMigration(db, file)` | apply one file to an existing database.                                                                                                                     |
| `adapt(sql)`               | the rewrites that let the real migration files run here.                                                                                                    |

What it provides on top of plain Postgres is the part of Supabase the
migrations lean on: the roles `anon`, `authenticated` and `service_role`;
`auth.uid()` reading the signed-in member out of a session setting;
`auth.users`; `storage.buckets`, `storage.objects` and
`storage.foldername()`; and the `supabase_realtime` publication.

### What is faked, and why it is safe

PostGIS will not compile to WASM, so `adapt()` turns `geography(Point, 4326)`
into `text`, `::geography` into `::text`, and a GiST index into a btree one.
It also drops the two `create extension` lines — `gen_random_uuid()` has
been core Postgres since 13.

Nothing it rewrites is ever the thing under test. No policy in this project
makes a decision about who may see what based on a coordinate; distance is
worked out in TypeScript (`lib/feed.ts`). If that ever changes, this
shortcut has to go with it.

One consequence worth knowing, found when the migrations were applied for
real: the harness has no `spatial_ref_sys`, because that table arrives with
PostGIS and the extension is stripped. So the "row-level security on every
table" sweep in `pending-set.test.mjs` passes here and reports one table
without RLS on a real Supabase project. That table is PostGIS's own list of
coordinate systems — no user data, and not something RLS is enabled on. It
is the one known difference between this harness and the real database.

## A worked example

`tests/0035-business-tickets.test.mjs` asserts that an event cannot carry a
price without a number of places. It failed the first time it ran, and the
migration was wrong:

```sql
check (
  (ticket_price_cents is null and ticket_capacity is null)
  or (type = 'event' and ticket_price_cents >= 100
      and ticket_capacity between 1 and 100000)
)
```

With a price and no capacity, the second branch evaluates to `null`, and a
`CHECK` constraint passes on `null`. The number of places is the only thing
standing between an event and overselling itself. The fix was to say `is not
null` out loud. That is the kind of thing this directory is for.
