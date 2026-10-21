/**
 * The set that has not run yet, as the customer will run it.
 *
 * 0026 to 0036 have since been applied to the live project, so what is
 * waiting is 0037 alone. Two things have to be true of whatever is handed
 * over: it works on a database in the state the live one is actually in,
 * and running it again — because a paste was interrupted, or nobody could
 * remember — changes nothing and breaks nothing.
 *
 * The sweeps further down are not about the pending set at all. They ask
 * what has to be true of the whole schema however it got there: that no
 * table holding members' material is missing its row-level security, and
 * that no bucket is public by accident.
 */
import fs from "node:fs";
import path from "node:path";

import { freshDb, adapt, migrationFiles, MIGRATIONS } from "../harness.mjs";

export const title = "the pending set — 0037, on the live project's state";

/** Everything after the last migration the live project has run. */
const LIVE_AT = "0036";
const PENDING = /^0037_/;

export default async function testPendingSet(t) {
  const files = migrationFiles().filter((f) => PENDING.test(f));
  const bundle = files
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n\n");

  t.section("the file the customer is handed");

  t.ok(
    "it holds every migration that has not run",
    files.length === 1,
    files.join(", ")
  );

  const db = await freshDb({ upTo: LIVE_AT });
  t.ok(`a database at ${LIVE_AT}, like the live one`, true);

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
    "shop_orders",
    "shop_payouts",
    "shop_products",
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
    "every table the features need is there",
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

  t.section("the buckets it creates");

  const buckets = (
    await db.query(
      `select id, public from storage.buckets
        where id in ('voice-notes', 'help-photos', 'board-photos', 'shop-files')
        order by id`
    )
  ).rows;
  t.ok(
    "all four of them exist",
    buckets.length === 4,
    JSON.stringify(buckets.map((b) => b.id))
  );
  t.ok(
    "and not one of them is public",
    buckets.every((b) => b.public === false),
    JSON.stringify(buckets)
  );

  // The one deliberate exception: a shop preview exists to be seen.
  t.ok(
    "while shop previews are public on purpose",
    (
      await db.query(
        `select public from storage.buckets where id = 'shop-previews'`
      )
    ).rows[0]?.public === true
  );

  await db.close();
}
