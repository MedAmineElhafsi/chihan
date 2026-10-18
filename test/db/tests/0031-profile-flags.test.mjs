/**
 * 0031 — nobody promotes themselves.
 *
 * is_admin, is_verified and is_banned are decisions other people make about
 * you. A member may insert, update and delete their own profile row, so
 * before this migration any member could verify themselves, lift their own
 * ban, or delete their profile and insert it again as an administrator.
 */
import { freshDb, as } from "../harness.mjs";

export const title = "0031 — nobody promotes themselves";

const ME = "aa000000-0000-4000-8000-000000000001";
const ADMIN = "aa000000-0000-4000-8000-000000000002";
const HONEST = "aa000000-0000-4000-8000-000000000003";

export default async function test0031ProfileFlags(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ME}', 'me@x.test'),
      ('${ADMIN}', 'admin@x.test'),
      ('${HONEST}', 'honest@x.test');
    insert into public.profiles (user_id, display_name) values ('${ME}', 'Rojda');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
    insert into public.profiles (user_id, display_name) values ('${HONEST}', 'Baran');
  `);

  const flags = async (uid) =>
    (
      await db.query(
        `select is_admin, is_verified, is_banned from public.profiles where user_id = $1`,
        [uid]
      )
    ).rows[0];

  t.section("a member writing their own row");

  await as(db, ME, () =>
    db.query(
      `update public.profiles set is_admin = true, is_verified = true where user_id = $1`,
      [ME]
    )
  );
  let mine = await flags(ME);
  t.ok(
    "making yourself an administrator does nothing",
    mine.is_admin === false,
    JSON.stringify(mine)
  );
  t.ok("giving yourself the badge does nothing", mine.is_verified === false);

  await as(db, ME, () =>
    db.query(
      `update public.profiles set is_banned = false where user_id = $1`,
      [ME]
    )
  );
  await db.query(
    `update public.profiles set is_banned = true where user_id = $1`,
    [ME]
  );
  await as(db, ME, () =>
    db.query(
      `update public.profiles set is_banned = false where user_id = $1`,
      [ME]
    )
  );
  mine = await flags(ME);
  t.ok("a banned member cannot lift their own ban", mine.is_banned === true);
  await db.query(
    `update public.profiles set is_banned = false where user_id = $1`,
    [ME]
  );

  t.section("the hole 0007 left open: delete, then insert as an admin");

  await as(db, ME, async () => {
    await db.query(`delete from public.profiles where user_id = $1`, [ME]);
    await db.query(
      `insert into public.profiles (user_id, display_name, is_admin, is_verified)
       values ($1, 'Rojda', true, true)`,
      [ME]
    );
  });
  mine = await flags(ME);
  t.ok(
    "a fresh row cannot arrive already an administrator",
    mine.is_admin === false,
    JSON.stringify(mine)
  );
  t.ok("...nor already verified", mine.is_verified === false);

  t.section("the ordinary parts of a profile still work");

  await as(db, ME, () =>
    db.query(
      `update public.profiles set display_name = 'Rojda A.', city = 'Berlin' where user_id = $1`,
      [ME]
    )
  );
  const row = (
    await db.query(
      `select display_name, city from public.profiles where user_id = $1`,
      [ME]
    )
  ).rows[0];
  t.ok(
    "a member can still edit their own name and city",
    row.display_name === "Rojda A." && row.city === "Berlin",
    JSON.stringify(row)
  );

  t.section("who may still set the flags");

  // Nobody edits anybody else's profile row directly — the row-level policy
  // only ever matches your own. An administrator decides a verification
  // through decide_verification(), which runs as the definer.
  await as(db, ME, () =>
    db.query(
      `update public.profiles set is_verified = true where user_id = $1`,
      [HONEST]
    )
  );
  t.ok(
    "one member cannot reach another's row at all",
    (await flags(HONEST)).is_verified === false
  );

  const request = (
    await as(db, HONEST, () =>
      db.query(
        `insert into public.verification_requests (user_id, document_url)
         values ($1, $2) returning id`,
        [HONEST, `${HONEST}/passport.jpg`]
      )
    )
  ).rows[0].id;

  await t.refuses(
    "a member cannot approve their own verification request",
    () =>
      as(db, HONEST, () =>
        db.query(`select public.decide_verification($1, true, null)`, [request])
      ),
    /administrator/i
  );
  t.ok(
    "...and the badge stays off",
    (await flags(HONEST)).is_verified === false
  );

  await as(db, ADMIN, () =>
    db.query(`select public.decide_verification($1, true, null)`, [request])
  );
  t.ok(
    "an administrator approving the request does grant it",
    (await flags(HONEST)).is_verified === true
  );

  await db.query(
    `update public.profiles set is_admin = true where user_id = $1`,
    [HONEST]
  );
  t.ok(
    "the SQL editor may make the first administrator",
    (await flags(HONEST)).is_admin === true
  );
  await db.query(
    `update public.profiles set is_admin = false where user_id = $1`,
    [HONEST]
  );

  t.section("is_verified(), the helper the other migrations ask");

  const verified = async (uid) =>
    (await db.query(`select public.is_verified($1) as v`, [uid])).rows[0].v;

  t.ok("true for a verified member", (await verified(HONEST)) === true);
  t.ok("false for an unverified one", (await verified(ME)) === false);

  await db.query(
    `update public.profiles set is_banned = true where user_id = $1`,
    [HONEST]
  );
  t.ok(
    "a banned member is not verified, whatever the badge says",
    (await verified(HONEST)) === false
  );
  await db.query(
    `update public.profiles set is_banned = false where user_id = $1`,
    [HONEST]
  );

  t.ok(
    "false for somebody who does not exist",
    (await verified("ffffffff-0000-4000-8000-00000000ffff")) === false
  );

  t.section("the badges it takes back");

  // A profile marked verified with no approved request is a badge the old
  // profile page handed out for being "Premium" while billing is off.
  await db.query(
    `update public.profiles set is_verified = true where user_id = $1`,
    [ME]
  );
  // Re-run the migration's closing statement.
  await db.exec(`
    update public.profiles p
       set is_verified = false
     where p.is_verified
       and not exists (
         select 1 from public.verification_requests v
          where v.user_id = p.user_id and v.status = 'approved'
       );
  `);
  t.ok(
    "a badge with no approved document is taken back",
    (await flags(ME)).is_verified === false
  );
  t.ok(
    "a badge an administrator granted on a document stays",
    (await flags(HONEST)).is_verified === true
  );

  await db.close();
}
