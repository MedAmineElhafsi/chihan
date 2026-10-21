/**
 * 0012 and 0023 — the group room, and the door to it.
 *
 * A community group is the one place in Cîhan where a conversation has more
 * than two people in it, which makes "who is allowed in" a harder question
 * than it is for a direct message. 0023 made groups private, and the comment
 * at the top of it promises that private is enforced in the database rather
 * than the interface — that a guessed URL, a stale link and a direct API
 * call all fail the same way. This is where that promise is checked.
 *
 * Three things have to hold at once: a non-member cannot read the group row,
 * cannot read who is in it, and cannot read a word that was said in it.
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0012 + 0023 — group rooms, and who is let into them";

const OWNER = "c1200000-0000-4000-8000-000000000001";
const MEMBER = "c1200000-0000-4000-8000-000000000002";
const OUTSIDER = "c1200000-0000-4000-8000-000000000003";
const INVITED = "c1200000-0000-4000-8000-000000000004";

export default async function test0012GroupMessages(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${OWNER}', 'owner@x.test'),
      ('${MEMBER}', 'member@x.test'),
      ('${OUTSIDER}', 'outsider@x.test'),
      ('${INVITED}', 'invited@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${OWNER}', 'Dilan'),
      ('${MEMBER}', 'Şiyar'),
      ('${OUTSIDER}', 'Nobody'),
      ('${INVITED}', 'Hêlîn');
  `);

  t.section("making the two kinds of group");

  const makeGroup = async (uid, name, isPrivate) =>
    (
      await as(db, uid, () =>
        db.query(
          `insert into public.community_groups (name, created_by, is_private)
           values ($1, $2, $3) returning id`,
          [name, uid, isPrivate]
        )
      )
    ).rows[0].id;

  const open = await makeGroup(OWNER, "Kurdî li Berlînê", false);
  const closed = await makeGroup(OWNER, "Komeleya taybet", true);
  t.ok("a public one", Boolean(open));
  t.ok("and a private one", Boolean(closed));

  // The owner takes their own seat — the insert policy lets the creator in
  // before any membership row exists.
  for (const g of [open, closed]) {
    await as(db, OWNER, () =>
      db.query(
        `insert into public.group_members (group_id, user_id, role)
         values ($1, $2, 'owner')`,
        [g, OWNER]
      )
    );
  }
  t.ok(
    "the creator can seat themselves as owner in both",
    (
      await asService(db, () =>
        db.query(
          `select group_id from public.group_members where user_id = $1`,
          [OWNER]
        )
      )
    ).rows.length === 2
  );

  t.section("joining");

  await as(db, MEMBER, () =>
    db.query(
      `insert into public.group_members (group_id, user_id) values ($1, $2)`,
      [open, MEMBER]
    )
  );
  t.ok(
    "anybody may walk into a public group",
    (
      await asService(db, () =>
        db.query(
          `select user_id from public.group_members
            where group_id = $1 and user_id = $2`,
          [open, MEMBER]
        )
      )
    ).rows.length === 1
  );

  await t.refuses(
    "but not into a private one",
    () =>
      as(db, OUTSIDER, () =>
        db.query(
          `insert into public.group_members (group_id, user_id) values ($1, $2)`,
          [closed, OUTSIDER]
        )
      ),
    /row-level security/i
  );

  // The way in is to be brought in by somebody already inside.
  await as(db, OWNER, () =>
    db.query(
      `insert into public.group_members (group_id, user_id) values ($1, $2)`,
      [closed, INVITED]
    )
  );
  t.ok(
    "somebody inside can bring another member in",
    (
      await asService(db, () =>
        db.query(
          `select user_id from public.group_members
            where group_id = $1 and user_id = $2`,
          [closed, INVITED]
        )
      )
    ).rows.length === 1
  );

  t.section("what a private group looks like from outside");

  const groupsSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.community_groups order by name`)
      )
    ).rows.map((r) => r.id);

  const outsiderSees = await groupsSeenBy(OUTSIDER);
  t.ok(
    "an outsider sees the public group",
    outsiderSees.includes(open),
    JSON.stringify(outsiderSees)
  );
  t.ok("and not the private one", !outsiderSees.includes(closed));
  t.ok(
    "somebody signed out sees only the public one",
    (await groupsSeenBy(null)).join() === open
  );
  t.ok(
    "a member of the private group sees both",
    (await groupsSeenBy(INVITED)).length === 2
  );

  const membershipSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select user_id from public.group_members where group_id = $1`,
          [closed]
        )
      )
    ).rows.length;
  t.ok(
    "who belongs to a private group is private as well",
    (await membershipSeenBy(OUTSIDER)) === 0
  );
  t.ok(
    "...and plain to the people in it",
    (await membershipSeenBy(INVITED)) === 2,
    `${await membershipSeenBy(INVITED)} of 2 — the owner and the invitee`
  );

  // The stats view is security_invoker, so the select policy filters it too:
  // a private group is absent from the rows, not merely flagged in them.
  const viewRows = await as(db, OUTSIDER, () =>
    db.query(`select id, member_count from public.community_groups_with_stats`)
  );
  t.ok(
    "the stats view drops the private group rather than counting it",
    viewRows.rows.length === 1 && viewRows.rows[0].id === open,
    JSON.stringify(viewRows.rows)
  );

  t.section("what was said in the room");

  await as(db, OWNER, () =>
    db.query(
      `insert into public.group_messages (group_id, sender_id, body)
       values ($1, $2, 'Em sibê dicivin.')`,
      [closed, OWNER]
    )
  );
  await as(db, MEMBER, () =>
    db.query(
      `insert into public.group_messages (group_id, sender_id, body)
       values ($1, $2, 'Hûn bi xêr hatin.')`,
      [open, MEMBER]
    )
  );

  const messagesIn = async (uid, group) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.group_messages where group_id = $1`, [
          group,
        ])
      )
    ).rows.length;

  t.ok(
    "a member reads the private room",
    (await messagesIn(INVITED, closed)) === 1
  );
  t.ok(
    "an outsider reads nothing of it",
    (await messagesIn(OUTSIDER, closed)) === 0
  );
  t.ok("nor does anybody signed out", (await messagesIn(null, closed)) === 0);

  // Worth stating plainly: a *public* group is public to read about, not
  // public to listen in on. The room is for members either way.
  t.ok(
    "even a public group's chat is closed to non-members",
    (await messagesIn(OUTSIDER, open)) === 0
  );
  t.ok("...while its members read it", (await messagesIn(MEMBER, open)) === 1);

  t.section("speaking in a room you are not in");

  await t.refuses(
    "an outsider cannot post to the private group",
    () =>
      as(db, OUTSIDER, () =>
        db.query(
          `insert into public.group_messages (group_id, sender_id, body)
           values ($1, $2, 'hello?')`,
          [closed, OUTSIDER]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "...nor to the public one, without joining it first",
    () =>
      as(db, OUTSIDER, () =>
        db.query(
          `insert into public.group_messages (group_id, sender_id, body)
           values ($1, $2, 'hello?')`,
          [open, OUTSIDER]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "and a member cannot put words in another member's mouth",
    () =>
      as(db, MEMBER, () =>
        db.query(
          `insert into public.group_messages (group_id, sender_id, body)
           values ($1, $2, 'I never said this')`,
          [open, OWNER]
        )
      ),
    /row-level security/i
  );

  t.section("a group message cannot be unsaid either");

  await as(db, OWNER, () =>
    db.query(`update public.group_messages set body = 'never mind'`)
  );
  await as(db, OWNER, () => db.query(`delete from public.group_messages`));
  const left = await asService(db, () =>
    db.query(`select count(*)::int as n from public.group_messages`)
  );
  t.ok(
    "there is no edit and no delete, for anyone",
    left.rows[0].n === 2,
    `${left.rows[0].n} of 2 still there`
  );

  t.section("leaving, and the door that does not exist");

  await as(db, MEMBER, () =>
    db.query(
      `delete from public.group_members where group_id = $1 and user_id = $2`,
      [open, MEMBER]
    )
  );
  t.ok(
    "a member may leave",
    (
      await asService(db, () =>
        db.query(
          `select user_id from public.group_members
            where group_id = $1 and user_id = $2`,
          [open, MEMBER]
        )
      )
    ).rows.length === 0
  );

  await as(db, OWNER, () =>
    db.query(
      `delete from public.group_members where group_id = $1 and user_id = $2`,
      [open, OWNER]
    )
  );
  t.ok(
    "an owner may not leave their own group, which would orphan it",
    (
      await asService(db, () =>
        db.query(
          `select user_id from public.group_members
            where group_id = $1 and user_id = $2`,
          [open, OWNER]
        )
      )
    ).rows.length === 1
  );

  // Stated rather than hidden: the delete policy only ever matches your own
  // row, so there is no way to remove somebody else. A private group cannot
  // be cleaned up by its owner through the API — only by deleting the group,
  // or from the SQL editor.
  await as(db, OWNER, () =>
    db.query(
      `delete from public.group_members where group_id = $1 and user_id = $2`,
      [closed, INVITED]
    )
  );
  t.ok(
    "and nobody can be removed by anybody else — there is no way to throw a member out",
    (
      await asService(db, () =>
        db.query(
          `select user_id from public.group_members
            where group_id = $1 and user_id = $2`,
          [closed, INVITED]
        )
      )
    ).rows.length === 1
  );

  t.section("realtime");

  t.ok(
    "group messages arrive live",
    (
      await db.query(
        `select tablename from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'public'
            and tablename = 'group_messages'`
      )
    ).rows.length === 1
  );

  await db.close();
}
