/**
 * 0028 — a voice note is as private as the words beside it.
 *
 * Speaking is how many elders and anyone who reads only one Kurdish script
 * will use Cîhan, and what they say is usually more personal than what they
 * would type. So the bucket is private, and a recording can be heard by
 * exactly the people who could have read the message it is attached to —
 * no more, and not one link-forward more.
 */
import { freshDb, as } from "../harness.mjs";

export const title = "0028 — a voice note is as private as the words beside it";

const ANA = "f0000000-0000-4000-8000-000000000001";
const BERIVAN = "f0000000-0000-4000-8000-000000000002";
const OUTSIDER = "f0000000-0000-4000-8000-000000000003";

const CONV = "f0000000-cccc-4000-8000-000000000001";
const NOTE = `${ANA}/note.webm`;

export default async function test0028VoiceNotes(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ANA}', 'ana@x.test'), ('${BERIVAN}', 'berivan@x.test'),
      ('${OUTSIDER}', 'out@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${ANA}', 'Ana'), ('${BERIVAN}', 'Berîvan'), ('${OUTSIDER}', 'Outsider');
    insert into public.conversations (id) values ('${CONV}');
    insert into public.conversation_participants (conversation_id, user_id) values
      ('${CONV}', '${ANA}'), ('${CONV}', '${BERIVAN}');
  `);

  t.section("what may be attached to a message");

  await t.refuses(
    "a note in somebody else's folder cannot be attached",
    () =>
      as(db, ANA, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body, voice_path, voice_ms)
           values ($1, $2, '', $3, 4000)`,
          [CONV, ANA, `${BERIVAN}/stolen.webm`]
        )
      ),
    /messages_voice_check|violates check constraint/
  );

  await t.refuses(
    "a note of a tenth of a second is refused",
    () =>
      as(db, ANA, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body, voice_path, voice_ms)
           values ($1, $2, '', $3, 100)`,
          [CONV, ANA, NOTE]
        )
      ),
    /violates check constraint/
  );

  await t.refuses(
    "nor one of an hour",
    () =>
      as(db, ANA, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body, voice_path, voice_ms)
           values ($1, $2, '', $3, 3600000)`,
          [CONV, ANA, NOTE]
        )
      ),
    /violates check constraint/
  );

  await t.refuses(
    "a waveform of a thousand bars is refused",
    () =>
      as(db, ANA, () =>
        db.query(
          `insert into public.messages (conversation_id, sender_id, body, voice_path, voice_ms, voice_peaks)
           values ($1, $2, '', $3, 4000, $4::smallint[])`,
          [
            CONV,
            ANA,
            NOTE,
            `{${Array.from({ length: 100 }, () => 50).join(",")}}`,
          ]
        )
      ),
    /violates check constraint/
  );

  await as(db, ANA, () =>
    db.query(
      `insert into public.messages (conversation_id, sender_id, body, voice_path, voice_ms, voice_peaks)
       values ($1, $2, '', $3, 4200, '{10,40,80,30}'::smallint[])`,
      [CONV, ANA, NOTE]
    )
  );
  t.ok("a note in your own folder, of a sane length, is fine", true);

  t.section("who can hear it");

  // The storage policy asks this, under the listener's own row-level
  // security — which is why it is deliberately not a definer function.
  const canHear = async (uid, name) =>
    (
      await as(db, uid, () =>
        db.query(`select public.can_hear_voice_note($1) as v`, [name])
      )
    ).rows[0].v;

  t.ok(
    "the person it was sent to can",
    (await canHear(BERIVAN, NOTE)) === true
  );
  t.ok("the sender can", (await canHear(ANA, NOTE)) === true);
  t.ok(
    "somebody outside the conversation cannot, even holding the exact path",
    (await canHear(OUTSIDER, NOTE)) === false
  );
  t.ok(
    "and a path nobody ever attached opens nothing",
    (await canHear(BERIVAN, `${ANA}/invented.webm`)) === false
  );

  t.section("the bucket itself");

  const bucket = (
    await db.query(
      `select public from storage.buckets where id = 'voice-notes'`
    )
  ).rows[0];
  t.ok("voice-notes is private", bucket && bucket.public === false);

  // Prove it end to end through the storage policies, as the browser does.
  await db.exec(
    `insert into storage.objects (bucket_id, name, owner)
     values ('voice-notes', '${NOTE}', '${ANA}')`
  );
  const reaches = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select 1 from storage.objects where bucket_id = 'voice-notes' and name = $1`,
          [NOTE]
        )
      )
    ).rows.length;

  t.ok("the recipient reaches the file", (await reaches(BERIVAN)) === 1);
  t.ok("the sender reaches their own file", (await reaches(ANA)) === 1);
  t.ok("an outsider reaches nothing", (await reaches(OUTSIDER)) === 0);
  t.ok("nor does somebody not signed in", (await reaches(null)) === 0);

  await t.refuses(
    "nobody uploads into another member's folder",
    () =>
      as(db, OUTSIDER, () =>
        db.query(
          `insert into storage.objects (bucket_id, name, owner)
           values ('voice-notes', $1, $2)`,
          [`${ANA}/forged.webm`, OUTSIDER]
        )
      ),
    /row-level security/
  );

  t.section("the note is reachable only while the message is");

  // `messages` has no delete policy at all — nobody takes a message out of
  // somebody else's conversation, including its sender.
  const tried = await as(db, ANA, () =>
    db.query(`delete from public.messages where voice_path = $1`, [NOTE])
  );
  t.ok(
    "a member cannot delete a message, so cannot orphan a recording",
    tried.affectedRows === 0,
    `deleted ${tried.affectedRows}`
  );

  // Moderation removes it through the service role; the recording should
  // stop answering to everybody except the folder it sits in.
  await db.query(`delete from public.messages where voice_path = $1`, [NOTE]);
  t.ok(
    "once the message is gone the recipient reaches nothing",
    (await reaches(BERIVAN)) === 0
  );
  t.ok(
    "...while its owner can still find their own file to delete",
    (await reaches(ANA)) === 1
  );

  await db.close();
}
