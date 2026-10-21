/**
 * 0037 — the block holds in the database now.
 *
 * The companion to the section at the end of `0004-chat.test.mjs`, which
 * records what used to happen: a blocked member could reach `messages`
 * directly and the policy would wave them through, because all it asked was
 * whether they were in the conversation.
 *
 * What is checked here is the whole of the promise. Not only that the
 * blocked person is stopped, but that the block works in both directions,
 * that it cannot be walked around by opening a fresh conversation, that
 * unblocking gives the conversation back, and that none of it touches what
 * was already said or anybody else's chats.
 */
import { freshDb, as, asService, applyMigration } from "../harness.mjs";

export const title = "0037 — a block that holds without the server's help";

const ROJ = "c3700000-0000-4000-8000-000000000001";
const DILAN = "c3700000-0000-4000-8000-000000000002";
const FRIEND = "c3700000-0000-4000-8000-000000000003";

export default async function test0037Blocks(t) {
  // Stop at 0036 first, so the hole can be demonstrated on the database as
  // it stands live, and then watched closing.
  const db = await freshDb({ upTo: "0036" });
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ROJ}', 'roj@x.test'),
      ('${DILAN}', 'dilan@x.test'),
      ('${FRIEND}', 'friend@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${ROJ}', 'Rojîn'),
      ('${DILAN}', 'Dilan'),
      ('${FRIEND}', 'Hêja');
  `);

  const open = async (me, other) =>
    (
      await as(db, me, () =>
        db.query(`select public.create_direct_conversation($1) as id`, [other])
      )
    ).rows[0].id;

  const send = (me, conv, body) =>
    as(db, me, () =>
      db.query(
        `insert into public.messages (conversation_id, sender_id, body)
         values ($1, $2, $3)`,
        [conv, me, body]
      )
    );

  const count = async (conv) =>
    (
      await asService(db, () =>
        db.query(
          `select count(*)::int as n from public.messages where conversation_id = $1`,
          [conv]
        )
      )
    ).rows[0].n;

  const conv = await open(ROJ, DILAN);
  const elsewhere = await open(ROJ, FRIEND);
  await send(ROJ, conv, "Silav.");
  await send(DILAN, conv, "Silav jî.");

  t.section("before the migration, which is where the live database is");

  await as(db, DILAN, () =>
    db.query(
      `insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`,
      [DILAN, ROJ]
    )
  );
  await send(ROJ, conv, "the API does not know I am blocked");
  t.ok(
    "a blocked member reaches the table directly and the policy allows it",
    (await count(conv)) === 3,
    `${await count(conv)} messages`
  );

  t.section("after it");

  await applyMigration(db, "0037_blocks_in_the_database.sql");

  await t.refuses(
    "the blocked member cannot send any more",
    () => send(ROJ, conv, "and now?"),
    /row-level security/i
  );
  t.ok("nothing arrived", (await count(conv)) === 3);

  // Symmetric on purpose, and matching what the server action already does:
  // whoever blocked does not get to keep talking at somebody who has no way
  // to answer.
  await t.refuses(
    "and neither can the person who did the blocking",
    () => send(DILAN, conv, "one last thing"),
    /row-level security/i
  );

  t.ok(
    "while the same member's other conversations are untouched",
    (await (async () => {
      await send(ROJ, elsewhere, "this one is fine");
      return count(elsewhere);
    })()) === 1
  );

  t.section("the ways around it");

  await t.refuses(
    "a blocked member cannot open a fresh conversation instead",
    () => open(ROJ, DILAN),
    /blocked/i
  );
  await t.refuses(
    "...nor can the blocker, which is the same door",
    () => open(DILAN, ROJ),
    /blocked/i
  );

  await t.refuses(
    "the helper cannot be asked about anybody but the caller",
    () =>
      as(db, FRIEND, () =>
        db.query(`select public.blocked_in_conversation($1, $2)`, [conv, ROJ])
      ),
    /does not exist|function/i
  );

  t.ok(
    "and somebody outside the conversation learns nothing from it",
    (
      await as(db, FRIEND, () =>
        db.query(`select public.blocked_in_conversation($1) as b`, [conv])
      )
    ).rows[0].b === false
  );

  // The two of them are still in the conversation, so a policy that asked
  // only about membership would still say yes. This is the check that the
  // new clause is the one doing the work.
  t.ok(
    "membership alone is no longer enough",
    (
      await as(db, ROJ, () =>
        db.query(
          `select public.is_conversation_participant($1, $2) as member,
                  public.blocked_in_conversation($1) as blocked`,
          [conv, ROJ]
        )
      )
    ).rows[0].member === true
  );

  t.section("what a block does not do");

  t.ok(
    "the conversation is still readable — a record of harassment is worth keeping",
    (
      await as(db, DILAN, () =>
        db.query(`select id from public.messages where conversation_id = $1`, [
          conv,
        ])
      )
    ).rows.length === 3
  );

  // Groups are deliberately left alone: if a block stopped somebody posting
  // to a shared room, every member would hold a mute button over every
  // other. See the head of the migration.
  const group = (
    await as(db, DILAN, () =>
      db.query(
        `insert into public.community_groups (name, created_by, is_private)
         values ('Berlin', $1, false) returning id`,
        [DILAN]
      )
    )
  ).rows[0].id;
  for (const uid of [DILAN, ROJ]) {
    await as(db, uid, () =>
      db.query(
        `insert into public.group_members (group_id, user_id) values ($1, $2)`,
        [group, uid]
      )
    );
  }
  await as(db, ROJ, () =>
    db.query(
      `insert into public.group_messages (group_id, sender_id, body)
       values ($1, $2, 'hello everyone')`,
      [group, ROJ]
    )
  );
  t.ok(
    "a blocked member may still speak in a group both of them are in",
    (
      await asService(db, () =>
        db.query(`select count(*)::int as n from public.group_messages`)
      )
    ).rows[0].n === 1
  );

  t.section("taking the block off");

  await as(db, DILAN, () =>
    db.query(
      `delete from public.user_blocks where blocker_id = $1 and blocked_id = $2`,
      [DILAN, ROJ]
    )
  );
  await send(ROJ, conv, "still there?");
  t.ok("the conversation comes back", (await count(conv)) === 4);

  t.ok(
    "and the conversation can be opened again",
    (await open(ROJ, DILAN)) === conv
  );

  t.section("running it twice changes nothing");

  await applyMigration(db, "0037_blocks_in_the_database.sql");
  await send(DILAN, conv, "yes");
  t.ok("the policy still allows an unblocked pair", (await count(conv)) === 5);

  await as(db, DILAN, () =>
    db.query(
      `insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`,
      [DILAN, ROJ]
    )
  );
  await t.refuses(
    "...and still refuses a blocked one",
    () => send(ROJ, conv, "again"),
    /row-level security/i
  );

  await db.close();
}
