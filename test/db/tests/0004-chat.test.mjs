/**
 * 0004 — private messages stay private.
 *
 * Of everything in this database, a direct message is the thing a member
 * would least like read by a stranger. The policies that keep it private all
 * route through one security definer helper, `is_conversation_participant`,
 * which means a single mistake there would open every conversation in the
 * project at once. Nothing below trusts that it is right; it asks.
 *
 * The questions are the ones an attacker would ask. Can I read a
 * conversation I am not in? Can I put myself into one? Can I send a message
 * signed with somebody else's name? Can I say something and then take it
 * back?
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0004 — private messages stay private";

const RONAHI = "c4000000-0000-4000-8000-000000000001";
const BARAN = "c4000000-0000-4000-8000-000000000002";
const STRANGER = "c4000000-0000-4000-8000-000000000003";

export default async function test0004Chat(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${RONAHI}', 'ronahi@x.test'),
      ('${BARAN}', 'baran@x.test'),
      ('${STRANGER}', 'stranger@x.test');
    insert into public.profiles (user_id, display_name, is_public) values
      ('${RONAHI}', 'Ronahî', true),
      ('${BARAN}', 'Baran', false),
      ('${STRANGER}', 'Nobody', true);
  `);

  t.section("opening a conversation");

  const conv = (
    await as(db, RONAHI, () =>
      db.query(`select public.create_direct_conversation($1) as id`, [BARAN])
    )
  ).rows[0].id;
  t.ok("a member can open one with another member", Boolean(conv), conv);

  const again = (
    await as(db, BARAN, () =>
      db.query(`select public.create_direct_conversation($1) as id`, [RONAHI])
    )
  ).rows[0].id;
  t.ok(
    "the other side opening it again lands in the same room",
    again === conv,
    `${again} vs ${conv}`
  );

  const people = await asService(db, () =>
    db.query(
      `select user_id from public.conversation_participants
        where conversation_id = $1 order by user_id`,
      [conv]
    )
  );
  t.ok(
    "and it has exactly the two of them in it",
    people.rows.length === 2,
    JSON.stringify(people.rows)
  );

  await t.refuses(
    "nobody opens a conversation with themselves",
    () =>
      as(db, RONAHI, () =>
        db.query(`select public.create_direct_conversation($1)`, [RONAHI])
      ),
    /invalid conversation/i
  );

  t.section("who can read what was said");

  await as(db, RONAHI, () =>
    db.query(
      `insert into public.messages (conversation_id, sender_id, body)
       values ($1, $2, $3)`,
      [conv, RONAHI, "Tu li ku derê yî?"]
    )
  );

  const readAs = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.messages where conversation_id = $1`, [
          conv,
        ])
      )
    ).rows.length;

  t.ok("the person it was sent to reads it", (await readAs(BARAN)) === 1);
  t.ok("the sender reads it", (await readAs(RONAHI)) === 1);
  t.ok("a stranger sees nothing at all", (await readAs(STRANGER)) === 0);
  t.ok("and somebody not signed in sees nothing", (await readAs(null)) === 0);

  const convVisible = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.conversations where id = $1`, [conv])
      )
    ).rows.length;
  t.ok("the room itself is invisible too", (await convVisible(STRANGER)) === 0);
  t.ok("...to a participant, it is there", (await convVisible(BARAN)) === 1);

  const participantsSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select user_id from public.conversation_participants
            where conversation_id = $1`,
          [conv]
        )
      )
    ).rows.length;
  t.ok(
    "who is talking to whom is private as well",
    (await participantsSeenBy(STRANGER)) === 0
  );

  t.section("getting in uninvited");

  await t.refuses(
    "a stranger cannot add themselves to the conversation",
    () =>
      as(db, STRANGER, () =>
        db.query(
          `insert into public.conversation_participants (conversation_id, user_id)
           values ($1, $2)`,
          [conv, STRANGER]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "...nor post into it",
    () =>
      as(db, STRANGER, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body)
           values ($1, $2, 'let me in')`,
          [conv, STRANGER]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "and a participant cannot sign a message with the other one's name",
    () =>
      as(db, RONAHI, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body)
           values ($1, $2, 'I never said this')`,
          [conv, BARAN]
        )
      ),
    /row-level security/i
  );

  t.section("the read marker belongs to its owner");

  await as(db, BARAN, () =>
    db.query(
      `update public.conversation_participants set last_read_at = now()
        where conversation_id = $1 and user_id = $2`,
      [conv, BARAN]
    )
  );
  await as(db, BARAN, () =>
    db.query(
      `update public.conversation_participants set last_read_at = now()
        where conversation_id = $1 and user_id = $2`,
      [conv, RONAHI]
    )
  );
  const marks = await asService(db, () =>
    db.query(
      `select user_id, last_read_at is not null as read
         from public.conversation_participants
        where conversation_id = $1 order by user_id`,
      [conv]
    )
  );
  const mark = (uid) => marks.rows.find((r) => r.user_id === uid)?.read;
  t.ok("a member marks their own side read", mark(BARAN) === true);
  t.ok(
    "but cannot mark the other side read for them",
    mark(RONAHI) === false,
    JSON.stringify(marks.rows)
  );

  t.section("a message cannot be unsaid");

  // There is no update or delete policy on messages, deliberately: a chat
  // where one side can silently rewrite what they said is worse than no
  // record at all. RLS does not raise here, it simply matches no rows.
  await as(db, RONAHI, () =>
    db.query(`update public.messages set body = 'something kinder'`)
  );
  await as(db, RONAHI, () => db.query(`delete from public.messages`));
  const surviving = await asService(db, () =>
    db.query(`select body from public.messages where conversation_id = $1`, [
      conv,
    ])
  );
  t.ok(
    "the sender cannot edit it afterwards",
    surviving.rows[0]?.body === "Tu li ku derê yî?",
    JSON.stringify(surviving.rows)
  );
  t.ok("nor delete it", surviving.rows.length === 1);

  t.section("the profile a conversation opens up");

  // Baran's profile is private. Talking to somebody is consent to be seen by
  // them, and only by them.
  const profileSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select display_name from public.profiles where user_id = $1`,
          [BARAN]
        )
      )
    ).rows.length;
  t.ok(
    "a private profile stays hidden from a stranger",
    (await profileSeenBy(STRANGER)) === 0
  );
  t.ok(
    "but the person they are talking to can see it",
    (await profileSeenBy(RONAHI)) === 1
  );
  t.ok(
    "and it is still hidden from everyone signed out",
    (await profileSeenBy(null)) === 0
  );

  t.section("what the database does not enforce: blocking");

  // `user_blocks` is checked in `lib/chat-actions.ts` before a message is
  // sent, and nowhere in the database. PostgREST is a public endpoint — a
  // blocked member holding the anon key can insert into `messages` directly
  // and the policy above will allow it, because all it asks is whether they
  // are in the conversation.
  //
  // This test states the gap rather than hiding it. If a later migration
  // closes it, this is the test that should change.
  await as(db, BARAN, () =>
    db.query(
      `insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`,
      [BARAN, RONAHI]
    )
  );
  await as(db, RONAHI, () =>
    db.query(
      `insert into public.messages (conversation_id, sender_id, body)
       values ($1, $2, 'blocked, but the API does not know that')`,
      [conv, RONAHI]
    )
  );
  const afterBlock = await asService(db, () =>
    db.query(`select count(*)::int as n from public.messages`)
  );
  t.ok(
    "a blocked member can still reach the table directly — the block lives in the server action, not here",
    afterBlock.rows[0].n === 2,
    `${afterBlock.rows[0].n} messages`
  );

  t.ok(
    "the blocked person can at least see that they were blocked",
    (
      await as(db, RONAHI, () =>
        db.query(`select blocker_id from public.user_blocks`)
      )
    ).rows.length === 1
  );
  t.ok(
    "while a mute is known only to the person who set it",
    (
      await (async () => {
        await as(db, BARAN, () =>
          db.query(
            `insert into public.user_mutes (muter_id, muted_id) values ($1, $2)`,
            [BARAN, RONAHI]
          )
        );
        return as(db, RONAHI, () =>
          db.query(`select muter_id from public.user_mutes`)
        );
      })()
    ).rows.length === 0
  );

  t.section("realtime");

  const published = (
    await db.query(
      `select tablename from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public'
          and tablename in ('messages', 'conversation_participants')
        order by tablename`
    )
  ).rows.map((r) => r.tablename);
  t.ok(
    "messages and read markers both arrive live",
    published.length === 2,
    JSON.stringify(published)
  );

  await db.close();
}
