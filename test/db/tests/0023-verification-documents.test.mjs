/**
 * 0023 — the identity papers.
 *
 * To get the verified badge a member uploads a document: a passport, a
 * residence permit, an identity card. It is the most sensitive thing anybody
 * hands this project, it belongs to someone whose immigration status may be
 * precarious, and it sits in object storage behind nothing but a storage
 * policy and a path convention.
 *
 * 0031's test already proves that nobody approves their own request. What is
 * checked here is the other half: that the document, and the row pointing at
 * it, are reachable by exactly two people — the member and an administrator.
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0023 — identity documents, and who can reach them";

const APPLICANT = "c2300000-0000-4000-8000-000000000001";
const NOSY = "c2300000-0000-4000-8000-000000000002";
const ADMIN = "c2300000-0000-4000-8000-000000000003";

export default async function test0023VerificationDocuments(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${APPLICANT}', 'applicant@x.test'),
      ('${NOSY}', 'nosy@x.test'),
      ('${ADMIN}', 'admin@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${APPLICANT}', 'Zozan'),
      ('${NOSY}', 'Nobody');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
  `);

  t.section("the bucket");

  const bucket = (
    await db.query(
      `select public from storage.buckets where id = 'verification-docs'`
    )
  ).rows[0];
  t.ok("there is one", Boolean(bucket));
  t.ok(
    "and unlike avatars and listing photos it is not public",
    bucket?.public === false
  );

  t.section("applying");

  const request = (
    await as(db, APPLICANT, () =>
      db.query(
        `insert into public.verification_requests (user_id, document_url, note)
         values ($1, $2, $3) returning id`,
        [APPLICANT, `${APPLICANT}/aufenthaltstitel.jpg`, "Residence permit"]
      )
    )
  ).rows[0].id;
  t.ok("a member can apply", Boolean(request));

  await t.refuses(
    "and cannot apply on somebody else's behalf",
    () =>
      as(db, NOSY, () =>
        db.query(
          `insert into public.verification_requests (user_id, document_url)
           values ($1, $2)`,
          [APPLICANT, `${APPLICANT}/forged.jpg`]
        )
      ),
    /row-level security/i
  );

  await t.refuses(
    "one open application at a time",
    () =>
      as(db, APPLICANT, () =>
        db.query(
          `insert into public.verification_requests (user_id, document_url)
           values ($1, $2)`,
          [APPLICANT, `${APPLICANT}/again.jpg`]
        )
      ),
    /verification_one_pending_per_user|duplicate key/i
  );

  t.section("who can see that somebody applied, and with what");

  const seenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select document_url from public.verification_requests`)
      )
    ).rows;

  t.ok("the applicant sees their own", (await seenBy(APPLICANT)).length === 1);
  t.ok(
    "an administrator sees it, because somebody has to decide",
    (await seenBy(ADMIN)).length === 1
  );
  t.ok(
    "another member sees nothing — not the document, not even that it exists",
    (await seenBy(NOSY)).length === 0
  );
  t.ok("and signed out, nothing", (await seenBy(null)).length === 0);

  t.section("the file itself");

  await as(db, APPLICANT, () =>
    db.query(
      `insert into storage.objects (bucket_id, name, owner)
       values ('verification-docs', $1, $2)`,
      [`${APPLICANT}/aufenthaltstitel.jpg`, APPLICANT]
    )
  );
  t.ok(
    "the member can upload into their own folder",
    (
      await asService(db, () =>
        db.query(
          `select name from storage.objects where bucket_id = 'verification-docs'`
        )
      )
    ).rows.length === 1
  );

  await t.refuses(
    "but not into somebody else's",
    () =>
      as(db, NOSY, () =>
        db.query(
          `insert into storage.objects (bucket_id, name, owner)
           values ('verification-docs', $1, $2)`,
          [`${APPLICANT}/planted.jpg`, NOSY]
        )
      ),
    /row-level security/i
  );

  const fileSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select name from storage.objects where bucket_id = 'verification-docs'`
        )
      )
    ).rows.length;

  t.ok("the owner can read it back", (await fileSeenBy(APPLICANT)) === 1);
  t.ok("an administrator can read it", (await fileSeenBy(ADMIN)) === 1);
  t.ok(
    "a curious member cannot, even knowing the path",
    (await fileSeenBy(NOSY)) === 0
  );
  t.ok("and neither can the open internet", (await fileSeenBy(null)) === 0);

  await as(db, NOSY, () =>
    db.query(
      `delete from storage.objects where bucket_id = 'verification-docs'`
    )
  );
  t.ok(
    "nobody can delete another member's document",
    (
      await asService(db, () =>
        db.query(
          `select name from storage.objects where bucket_id = 'verification-docs'`
        )
      )
    ).rows.length === 1
  );

  t.section("deciding, and the ways to cheat it");

  await as(db, APPLICANT, () =>
    db.query(
      `update public.verification_requests set status = 'approved' where id = $1`,
      [request]
    )
  );
  const status = async () =>
    (
      await asService(db, () =>
        db.query(
          `select status from public.verification_requests where id = $1`,
          [request]
        )
      )
    ).rows[0].status;
  t.ok(
    "an applicant cannot stamp their own row approved",
    (await status()) === "pending"
  );

  const verified = async (uid) =>
    (
      await asService(db, () =>
        db.query(`select is_verified from public.profiles where user_id = $1`, [
          uid,
        ])
      )
    ).rows[0].is_verified;
  t.ok("...so the badge stays off", (await verified(APPLICANT)) === false);

  await as(db, ADMIN, () =>
    db.query(
      `select public.decide_verification($1, true, 'Permit looks right')`,
      [request]
    )
  );
  t.ok("an administrator grants it", (await verified(APPLICANT)) === true);
  t.ok("and the row records the decision", (await status()) === "approved");

  const decided = (
    await asService(db, () =>
      db.query(
        `select decided_by, decided_at is not null as stamped
           from public.verification_requests where id = $1`,
        [request]
      )
    )
  ).rows[0];
  t.ok(
    "by name, so a decision can be traced back to who made it",
    decided.decided_by === ADMIN && decided.stamped === true,
    JSON.stringify(decided)
  );

  await t.refuses(
    "the same request cannot be decided twice",
    () =>
      as(db, ADMIN, () =>
        db.query(`select public.decide_verification($1, false, null)`, [
          request,
        ])
      ),
    /no pending verification request/i
  );

  t.section("withdrawing");

  await as(db, APPLICANT, () =>
    db.query(`delete from public.verification_requests where id = $1`, [
      request,
    ])
  );
  t.ok(
    "a decided request cannot be deleted — the record of the decision stays",
    (
      await asService(db, () =>
        db.query(`select id from public.verification_requests where id = $1`, [
          request,
        ])
      )
    ).rows.length === 1
  );

  const second = (
    await as(db, APPLICANT, () =>
      db.query(
        `insert into public.verification_requests (user_id, document_url)
         values ($1, $2) returning id`,
        [APPLICANT, `${APPLICANT}/second-try.jpg`]
      )
    )
  ).rows[0].id;
  t.ok(
    "a new attempt can be made once the old one is decided",
    Boolean(second)
  );

  await as(db, APPLICANT, () =>
    db.query(`delete from public.verification_requests where id = $1`, [second])
  );
  t.ok(
    "and while it is pending the applicant may take it back",
    (
      await asService(db, () =>
        db.query(`select id from public.verification_requests where id = $1`, [
          second,
        ])
      )
    ).rows.length === 0
  );

  await as(db, APPLICANT, () =>
    db.query(
      `delete from storage.objects where bucket_id = 'verification-docs'`
    )
  );
  t.ok(
    "the document can be taken back too, which is the only way to withdraw it",
    (
      await asService(db, () =>
        db.query(
          `select name from storage.objects where bucket_id = 'verification-docs'`
        )
      )
    ).rows.length === 0
  );

  await db.close();
}
