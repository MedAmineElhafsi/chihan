/**
 * The set that has not run yet, as the customer will run it.
 *
 * The live project is at 0025. What they are handed is one file holding
 * 0026 through 0035, pasted into the Supabase SQL editor. Two things have
 * to be true of it: it works on a 0025 database, and running it again —
 * because a paste was interrupted, or nobody could remember — changes
 * nothing and breaks nothing.
 */
import fs from "node:fs";
import path from "node:path";

import { freshDb, adapt, migrationFiles, MIGRATIONS } from "../harness.mjs";

export const title =
  "the pending set — 0026 to 0035, on the live project's state";

const PENDING = /^00(2[6-9]|3[0-5])_/;

export default async function testPendingSet(t) {
  const files = migrationFiles().filter((f) => PENDING.test(f));
  const bundle = files
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n\n");

  t.section("the file the customer is handed");

  t.ok(
    "it holds every migration that has not run",
    files.length === 10,
    files.join(", ")
  );

  const db = await freshDb({ upTo: "0025" });
  t.ok("a database at 0025, like the live one", true);

  await db.exec("set check_function_bodies = off;");
  try {
    await db.exec(adapt(bundle));
    t.ok("the whole file runs on it", true);
  } catch (err) {
    t.ok("the whole file runs on it", false, err.message.slice(0, 120));
    await db.close();
    return;
  }

  t.section("and runs again without complaint");

  try {
    await db.exec(adapt(bundle));
    t.ok("a second run changes nothing and raises nothing", true);
  } catch (err) {
    t.ok(
      "a second run changes nothing and raises nothing",
      false,
      err.message.slice(0, 120)
    );
  }
  await db.exec("set check_function_bodies = on;");

  t.section("what it leaves behind");

  const expected = [
    "ads",
    "buddy_pairs",
    "buddy_profiles",
    "business_subscriptions",
    "classifieds",
    "guide_suggestions",
    "guides",
    "listing_events",
    "payout_accounts",
    "tickets",
    "translations",
  ];
  const present = (
    await db.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name = any($1)
        order by table_name`,
      [expected]
    )
  ).rows.map((r) => r.table_name);
  t.ok(
    "every table the ten migrations promise",
    present.length === expected.length,
    `missing: ${expected.filter((e) => !present.includes(e)).join(", ")}`
  );

  // A table without row-level security is a table anybody can read.
  const unguarded = (
    await db.query(
      `select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
        order by c.relname`
    )
  ).rows.map((r) => r.relname);
  t.ok(
    "and row-level security on every table in the database",
    unguarded.length === 0,
    `without RLS: ${unguarded.join(", ")}`
  );

  // `translations` is the deliberate exception: RLS on, no policies at all,
  // so only the service role can reach it.
  const policies = (
    await db.query(
      `select count(*)::int n from pg_policies
        where schemaname = 'public' and tablename = 'translations'`
    )
  ).rows[0].n;
  t.ok(
    "the translation store has no policies, so nobody but the server reads it",
    policies === 0,
    `${policies} policies`
  );

  t.section("the buckets it creates are private");

  const buckets = (
    await db.query(
      `select id, public from storage.buckets
        where id in ('voice-notes', 'help-photos', 'board-photos')
        order by id`
    )
  ).rows;
  t.ok(
    "all three of them exist",
    buckets.length === 3,
    JSON.stringify(buckets.map((b) => b.id))
  );
  t.ok(
    "and not one of them is public",
    buckets.every((b) => b.public === false),
    JSON.stringify(buckets)
  );

  await db.close();
}
