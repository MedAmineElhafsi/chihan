/**
 * 0033 — the buddy programme.
 *
 * A buddy sits beside someone at an office and reads their post. The side
 * with the power is the side that gets checked: only a verified member may
 * offer. Everything else — capacity, blocks, who may end it — runs through
 * the functions, because the tables have no write policy at all.
 */
import { freshDb, as } from "../harness.mjs";

export const title = "0033 — the buddy programme";

const MENTOR = "cc000000-0000-4000-8000-000000000001";
const NEWCOMER = "cc000000-0000-4000-8000-000000000002";
const SECOND = "cc000000-0000-4000-8000-000000000003";
const THIRD = "cc000000-0000-4000-8000-000000000004";
const UNCHECKED = "cc000000-0000-4000-8000-000000000005";

export default async function test0033Buddies(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${MENTOR}', 'mentor@x.test'), ('${NEWCOMER}', 'new@x.test'),
      ('${SECOND}', 'second@x.test'), ('${THIRD}', 'third@x.test'),
      ('${UNCHECKED}', 'unchecked@x.test');
    insert into public.profiles (user_id, display_name, is_verified) values
      ('${MENTOR}', 'Şiler', true);
    insert into public.profiles (user_id, display_name) values
      ('${NEWCOMER}', 'Rojda'), ('${SECOND}', 'Baran'),
      ('${THIRD}', 'Avan'), ('${UNCHECKED}', 'Stranger');
  `);

  const join = (uid, role, extra = "") =>
    as(db, uid, () =>
      db.query(
        `insert into public.buddy_profiles (user_id, role, areas, capacity)
         values ($1, $2, '{paperwork}', $3)`,
        [uid, role, extra || 1]
      )
    );

  t.section("who may offer to be a buddy");

  await t.refuses(
    "an unverified member cannot offer",
    () => join(UNCHECKED, "mentor"),
    /row-level security/
  );
  await join(UNCHECKED, "newcomer");
  t.ok("...but may ask for one", true);

  await join(MENTOR, "mentor", 2);
  t.ok("a verified member may offer", true);

  await t.refuses(
    "and cannot quietly become one by editing their entry",
    () =>
      as(db, UNCHECKED, () =>
        db.query(
          `update public.buddy_profiles set role = 'mentor' where user_id = $1`,
          [UNCHECKED]
        )
      ),
    /row-level security/
  );

  await t.refuses(
    "nobody joins in somebody else's name",
    () =>
      as(db, NEWCOMER, () =>
        db.query(
          `insert into public.buddy_profiles (user_id, role) values ($1, 'newcomer')`,
          [SECOND]
        )
      ),
    /row-level security/
  );

  await t.refuses(
    "a buddy cannot take more than three at once",
    () =>
      as(db, THIRD, () =>
        db.query(
          `insert into public.buddy_profiles (user_id, role, capacity)
           values ($1, 'newcomer', 9)`,
          [THIRD]
        )
      ),
    /buddy_profiles_capacity_check/
  );

  await join(NEWCOMER, "newcomer");
  await join(SECOND, "newcomer");
  await join(THIRD, "newcomer");

  t.section("who may read whose entry");

  const seen = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select user_id, role from public.buddy_profiles`)
      )
    ).rows;

  const asNewcomer = await seen(NEWCOMER);
  t.ok(
    "a newcomer sees the mentors and their own entry, nobody else's",
    asNewcomer.length === 2 &&
      asNewcomer.every((r) => r.role === "mentor" || r.user_id === NEWCOMER),
    JSON.stringify(asNewcomer)
  );

  t.section("asking, and being told no");

  await t.refuses(
    "nobody writes a pair straight into the table",
    () =>
      as(db, NEWCOMER, () =>
        db.query(
          `insert into public.buddy_pairs (newcomer_id, mentor_id, status)
           values ($1, $2, 'active')`,
          [NEWCOMER, MENTOR]
        )
      ),
    /row-level security/
  );

  await t.refuses(
    "you cannot ask yourself",
    () =>
      as(db, MENTOR, () =>
        db.query(`select public.request_buddy($1, null)`, [MENTOR])
      ),
    /not_yourself/
  );

  await t.refuses(
    "somebody who never joined cannot ask",
    () =>
      as(db, "cc000000-0000-4000-8000-00000000ffff", () =>
        db.query(`select public.request_buddy($1, 'hello')`, [MENTOR])
      ),
    /not_a_newcomer/
  );

  const pair = (
    await as(db, NEWCOMER, () =>
      db.query(`select public.request_buddy($1, $2) as id`, [
        MENTOR,
        "I arrived in March and the Jobcenter letters frighten me.",
      ])
    )
  ).rows[0].id;
  t.ok("a newcomer may ask a mentor", Boolean(pair));

  t.ok(
    "the mentor is told",
    (
      await db.query(
        `select 1 from public.notifications where type = 'buddy_request' and user_id = $1`,
        [MENTOR]
      )
    ).rows.length === 1
  );

  t.section("a block ends it before it starts");

  await as(db, SECOND, () =>
    db.query(
      `insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`,
      [SECOND, MENTOR]
    )
  );
  await t.refuses(
    "somebody you blocked cannot become your buddy",
    () =>
      as(db, SECOND, () =>
        db.query(`select public.request_buddy($1, null)`, [MENTOR])
      ),
    /not_available/
  );
  await as(db, SECOND, () =>
    db.query(`delete from public.user_blocks where blocker_id = $1`, [SECOND])
  );

  t.section("answering");

  await t.refuses(
    "a stranger cannot answer somebody else's request",
    () =>
      as(db, THIRD, () =>
        db.query(`select public.respond_buddy($1, true)`, [pair])
      ),
    /not_pending/
  );

  await as(db, MENTOR, () =>
    db.query(`select public.respond_buddy($1, true)`, [pair])
  );
  t.ok(
    "the buddy accepts",
    (
      await db.query(`select status from public.buddy_pairs where id = $1`, [
        pair,
      ])
    ).rows[0].status === "active"
  );
  t.ok(
    "the newcomer is told",
    (
      await db.query(
        `select 1 from public.notifications where type = 'buddy_accepted' and user_id = $1`,
        [NEWCOMER]
      )
    ).rows.length === 1
  );

  await t.refuses(
    "a newcomer already paired cannot collect another",
    () =>
      as(db, NEWCOMER, () =>
        db.query(`select public.request_buddy($1, null)`, [MENTOR])
      ),
    /already_paired/
  );

  t.section("capacity is a promise, not a suggestion");

  const second = (
    await as(db, SECOND, () =>
      db.query(`select public.request_buddy($1, null) as id`, [MENTOR])
    )
  ).rows[0].id;
  await as(db, MENTOR, () =>
    db.query(`select public.respond_buddy($1, true)`, [second])
  );
  t.ok(
    "two newcomers fill a capacity of two",
    (await db.query(`select public.buddy_active_count($1) as n`, [MENTOR]))
      .rows[0].n === 2
  );

  await t.refuses(
    "a third is turned away",
    () =>
      as(db, THIRD, () =>
        db.query(`select public.request_buddy($1, null)`, [MENTOR])
      ),
    /buddy_full/
  );

  t.section("ending it");

  await t.refuses(
    "somebody outside the pair cannot end it",
    () =>
      as(db, THIRD, () =>
        db.query(`select public.end_buddy($1, 'done')`, [pair])
      ),
    /not_yours/
  );

  await as(db, NEWCOMER, () =>
    db.query(`select public.end_buddy($1, 'uncomfortable')`, [pair])
  );
  const ended = (
    await db.query(
      `select status, ended_by, end_reason from public.buddy_pairs where id = $1`,
      [pair]
    )
  ).rows[0];
  t.ok(
    "a newcomer ends it the moment they want to",
    ended.status === "ended" && ended.ended_by === NEWCOMER,
    JSON.stringify(ended)
  );
  t.ok(
    "...and the reason is kept as given",
    ended.end_reason === "uncomfortable"
  );

  t.ok(
    "ending frees the place",
    (await db.query(`select public.buddy_active_count($1) as n`, [MENTOR]))
      .rows[0].n === 1
  );
  t.ok(
    "but still counts towards everyone this buddy has taken on",
    (await db.query(`select public.buddy_helped_count($1) as n`, [MENTOR]))
      .rows[0].n === 2
  );

  await db.close();
}
