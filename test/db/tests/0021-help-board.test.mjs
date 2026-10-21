/**
 * 0021 — the help board is for members only.
 *
 * The migration opens with the reason, and it is the whole point of the file:
 * a help request exposes that somebody is vulnerable. "I need a room." "I
 * need someone to come with me to the Ausländerbehörde." A listing being
 * readable by the open internet is fine. This is not.
 *
 * So the policies are written `to authenticated` rather than with a `using`
 * clause that happens to be true — which means the question to ask here is
 * not "what does a stranger see" but "what does a stranger see when they are
 * not signed in at all", and the answer has to be nothing, for requests and
 * for the offers of help underneath them.
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0021 — the help board is for members only";

const ASKER = "c2100000-0000-4000-8000-000000000001";
const HELPER = "c2100000-0000-4000-8000-000000000002";
const BYSTANDER = "c2100000-0000-4000-8000-000000000003";

export default async function test0021HelpBoard(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ASKER}', 'asker@x.test'),
      ('${HELPER}', 'helper@x.test'),
      ('${BYSTANDER}', 'bystander@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${ASKER}', 'Rûken'),
      ('${HELPER}', 'Agir'),
      ('${BYSTANDER}', 'Nobody');
  `);

  t.section("asking");

  const request = (
    await as(db, ASKER, () =>
      db.query(
        `insert into public.help_requests (author_id, title, body, category, urgency, city)
         values ($1, $2, $3, 'paperwork', 'urgent', 'Hannover') returning id`,
        [
          ASKER,
          "Ez alîkariyê dixwazim li Ausländerbehörde",
          "My appointment is on Tuesday and I do not understand the letter.",
        ]
      )
    )
  ).rows[0].id;
  t.ok("a member can post a request", Boolean(request));

  await t.refuses(
    "and cannot post it under somebody else's name",
    () =>
      as(db, HELPER, () =>
        db.query(
          `insert into public.help_requests (author_id, title, category)
           values ($1, 'not mine', 'other')`,
          [ASKER]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "a category the form does not offer is refused",
    () =>
      as(db, ASKER, () =>
        db.query(
          `insert into public.help_requests (author_id, title, category)
           values ($1, 'x', 'cryptocurrency')`,
          [ASKER]
        )
      ),
    /check constraint/i
  );

  t.section("who can read it — the promise at the top of the migration");

  const requestsSeenBy = async (uid) =>
    (await as(db, uid, () => db.query(`select id from public.help_requests`)))
      .rows.length;

  t.ok("the author, obviously", (await requestsSeenBy(ASKER)) === 1);
  t.ok(
    "any signed-in member, which is the point",
    (await requestsSeenBy(HELPER)) === 1
  );
  t.ok(
    "and nobody who is not signed in — not one row",
    (await requestsSeenBy(null)) === 0
  );

  t.section("offering help");

  const offer = (
    await as(db, HELPER, () =>
      db.query(
        `insert into public.help_offers (request_id, author_id, body)
         values ($1, $2, $3) returning id`,
        [request, HELPER, "Ez dikarim werim bi te re. Ez li Hannoverê dijîm."]
      )
    )
  ).rows[0].id;
  t.ok("a member can offer", Boolean(offer));

  const offersSeenBy = async (uid) =>
    (await as(db, uid, () => db.query(`select id from public.help_offers`)))
      .rows.length;
  t.ok("members read the offers", (await offersSeenBy(ASKER)) === 1);
  t.ok(
    "and the offers are shut to the signed-out as well",
    (await offersSeenBy(null)) === 0
  );

  await t.refuses(
    "an offer cannot be signed with another member's name",
    () =>
      as(db, BYSTANDER, () =>
        db.query(
          `insert into public.help_offers (request_id, author_id, body)
           values ($1, $2, 'I did not write this')`,
          [request, HELPER]
        )
      ),
    /row-level security/i
  );

  t.section("editing and withdrawing");

  await as(db, BYSTANDER, () =>
    db.query(
      `update public.help_requests set title = 'defaced' where id = $1`,
      [request]
    )
  );
  t.ok(
    "another member cannot edit somebody's request",
    (
      await asService(db, () =>
        db.query(`select title from public.help_requests where id = $1`, [
          request,
        ])
      )
    ).rows[0].title !== "defaced"
  );

  await as(db, BYSTANDER, () =>
    db.query(`delete from public.help_requests where id = $1`, [request])
  );
  t.ok(
    "...nor delete it",
    (
      await asService(db, () =>
        db.query(`select id from public.help_requests where id = $1`, [request])
      )
    ).rows.length === 1
  );

  await as(db, ASKER, () =>
    db.query(
      `update public.help_requests set status = 'resolved' where id = $1`,
      [request]
    )
  );
  const resolved = await asService(db, () =>
    db.query(
      `select status, updated_at > created_at as touched
         from public.help_requests where id = $1`,
      [request]
    )
  );
  t.ok(
    "the author can mark it resolved",
    resolved.rows[0].status === "resolved"
  );
  t.ok(
    "and the trigger moves updated_at when they do",
    resolved.rows[0].touched === true
  );

  await as(db, BYSTANDER, () =>
    db.query(`delete from public.help_offers where id = $1`, [offer])
  );
  t.ok(
    "an offer belongs to the person who made it",
    (
      await asService(db, () =>
        db.query(`select id from public.help_offers where id = $1`, [offer])
      )
    ).rows.length === 1
  );

  await as(db, HELPER, () =>
    db.query(`delete from public.help_offers where id = $1`, [offer])
  );
  t.ok(
    "...who may withdraw it",
    (
      await asService(db, () =>
        db.query(`select id from public.help_offers where id = $1`, [offer])
      )
    ).rows.length === 0
  );

  // Stated rather than hidden: there is no update policy on help_offers, so
  // an offer can be withdrawn but never edited. The asker reads what was
  // actually written to them.
  await as(db, HELPER, () =>
    db.query(
      `insert into public.help_offers (request_id, author_id, body)
       values ($1, $2, 'still happy to come')`,
      [request, HELPER]
    )
  );
  await as(db, HELPER, () =>
    db.query(`update public.help_offers set body = 'changed my mind'`)
  );
  t.ok(
    "an offer cannot be quietly rewritten after it is read",
    (
      await asService(db, () =>
        db.query(`select body from public.help_offers where request_id = $1`, [
          request,
        ])
      )
    ).rows[0].body === "still happy to come"
  );

  t.section("the request the asker takes back");

  await as(db, ASKER, () =>
    db.query(`delete from public.help_requests where id = $1`, [request])
  );
  const after = await asService(db, () =>
    db.query(
      `select
         (select count(*)::int from public.help_requests) as requests,
         (select count(*)::int from public.help_offers) as offers`
    )
  );
  t.ok("the author can delete their own request", after.rows[0].requests === 0);
  t.ok(
    "and the offers written on it go with it, not left orphaned",
    after.rows[0].offers === 0,
    JSON.stringify(after.rows[0])
  );

  await db.close();
}
