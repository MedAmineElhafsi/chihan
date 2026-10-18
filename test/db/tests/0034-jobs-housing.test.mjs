/**
 * 0034 — jobs and housing.
 *
 * The board is where somebody new hands over a deposit or a passport scan,
 * so it is screened twice: by the wording scams use, in four languages, and
 * by the people reading it. A post is held, never deleted — the same
 * sentence can be a fraud or a clumsy translation, and holding costs an
 * honest poster a few hours and a scammer their whole opportunity.
 */
import { freshDb, as } from "../harness.mjs";

export const title = "0034 — jobs and housing";

const LANDLORD = "dd000000-0000-4000-8000-000000000001";
const UNCHECKED = "dd000000-0000-4000-8000-000000000002";
const READER = "dd000000-0000-4000-8000-000000000003";
const R2 = "dd000000-0000-4000-8000-000000000004";
const R3 = "dd000000-0000-4000-8000-000000000005";
const ADMIN = "dd000000-0000-4000-8000-000000000009";

export default async function test0034JobsHousing(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${LANDLORD}', 'l@x.test'), ('${UNCHECKED}', 'u@x.test'),
      ('${READER}', 'r@x.test'), ('${R2}', 'r2@x.test'),
      ('${R3}', 'r3@x.test'), ('${ADMIN}', 'a@x.test');
    insert into public.profiles (user_id, display_name, is_verified)
      values ('${LANDLORD}', 'Şiler', true);
    insert into public.profiles (user_id, display_name)
      values ('${UNCHECKED}', 'Stranger'), ('${READER}', 'Rojda'),
             ('${R2}', 'Baran'), ('${R3}', 'Avan');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
  `);

  const post = (uid, title, description, extra = {}) =>
    as(db, uid, () =>
      db.query(
        `insert into public.classifieds
           (author_id, kind, title, description, city, housing_type, rent_cents, expires_at)
         values ($1, $2, $3, $4, 'Berlin', $5, $6, $7)
         returning id, status, flags, expires_at`,
        [
          uid,
          extra.kind ?? "housing",
          title,
          description,
          extra.housing_type ?? "room",
          extra.rent_cents ?? 45000,
          extra.expires_at ?? null,
        ]
      )
    );

  t.section("who may post");

  await t.refuses(
    "an unverified member cannot",
    () => post(UNCHECKED, "Nice room, Neukölln", "Available now."),
    /row-level security/
  );

  const clean = (
    await post(
      LANDLORD,
      "Room in a shared flat, Neukölln",
      "A furnished room in a quiet flat of three. Come and see it any evening."
    )
  ).rows[0];
  t.ok("a verified member can", clean.status === "open", clean.status);
  t.ok("an honest post carries no flags", clean.flags.length === 0);

  t.section("the wording scams use");

  const flagged = async (title, description) =>
    (await post(LANDLORD, title, description)).rows[0];

  const deposit = await flagged(
    "Flat, Mitte",
    "Please pay the deposit before the viewing and I will send the contract."
  );
  t.ok(
    "money before a viewing is held",
    deposit.status === "held" &&
      deposit.flags.includes("payment_before_viewing"),
    JSON.stringify(deposit.flags)
  );

  const german = await flagged(
    "Wohnung, Wedding",
    "Die Kaution bitte im Voraus überweisen, dann schicke ich die Schlüssel."
  );
  t.ok(
    "the same thing in German is held",
    german.status === "held",
    JSON.stringify(german.flags)
  );

  const arabic = await flagged(
    "شقة في برلين",
    "يرجى دفع العربون قبل المعاينة وسأرسل لك المفاتيح."
  );
  t.ok("and in Arabic", arabic.status === "held", JSON.stringify(arabic.flags));

  const keys = await flagged(
    "Flat, Kreuzberg",
    "I am abroad at the moment, so I will send the keys by post once you transfer."
  );
  t.ok(
    "the remote-landlord story is held",
    keys.status === "held" && keys.flags.includes("keys_by_post"),
    JSON.stringify(keys.flags)
  );

  const crypto = await flagged(
    "Room available",
    "Payment in bitcoin only please."
  );
  t.ok("crypto is held", crypto.status === "held");

  const fee = await flagged(
    "Kitchen help wanted",
    "Send a registration fee of 50 euro to be considered.",
    {}
  );
  t.ok(
    "a job that charges you to apply is held",
    fee.status === "held" && fee.flags.includes("fee_to_apply"),
    JSON.stringify(fee.flags)
  );

  const whatsapp = await flagged(
    "Room, Moabit",
    "WhatsApp only please, I do not check here."
  );
  t.ok(
    "taking it off Cîhan only warns the reader",
    whatsapp.status === "open" && whatsapp.flags.includes("off_platform"),
    `${whatsapp.status} ${JSON.stringify(whatsapp.flags)}`
  );

  t.section("what the client sends is not what is stored");

  const forged = (
    await as(db, LANDLORD, () =>
      db.query(
        `insert into public.classifieds (author_id, kind, title, description, status, flags, expires_at)
         values ($1, 'housing', 'Quiet room', 'Pay the deposit in advance.', 'open', '{}', now() + interval '400 days')
         returning author_id, status, flags, expires_at`,
        [LANDLORD]
      )
    )
  ).rows[0];
  t.ok(
    "a post cannot arrive pre-approved",
    forged.status === "held",
    forged.status
  );
  t.ok("flags are recomputed, not accepted", forged.flags.length > 0);
  t.ok(
    "and it cannot buy itself a year on the board",
    new Date(forged.expires_at) - Date.now() < 31 * 864e5,
    forged.expires_at
  );

  const stolen = (
    await as(db, LANDLORD, () =>
      db.query(
        `insert into public.classifieds (author_id, kind, title, description)
         values ($1, 'job', 'Driver wanted', 'Regular hours, paid monthly.')
         returning author_id`,
        [READER]
      )
    )
  ).rows[0];
  t.ok(
    "a post cannot be written in somebody else's name",
    stolen.author_id === LANDLORD,
    stolen.author_id
  );

  t.section("a hold stays until a human lifts it");

  await as(db, LANDLORD, () =>
    db.query(
      `update public.classifieds set status = 'open', title = 'Flat, Mitte' where id = $1`,
      [deposit.id]
    )
  );
  t.ok(
    "the author cannot lift their own hold",
    (
      await db.query(`select status from public.classifieds where id = $1`, [
        deposit.id,
      ])
    ).rows[0].status === "held"
  );

  await as(db, ADMIN, () =>
    db.query(`update public.classifieds set status = 'open' where id = $1`, [
      deposit.id,
    ])
  );
  t.ok(
    "an administrator can",
    (
      await db.query(`select status from public.classifieds where id = $1`, [
        deposit.id,
      ])
    ).rows[0].status === "open"
  );

  t.section("who may read the board");

  const visible = async (uid) =>
    (await as(db, uid, () => db.query(`select id from public.classifieds`)))
      .rows.length;

  const open = (
    await db.query(
      `select count(*)::int n from public.classifieds where status = 'open'`
    )
  ).rows[0].n;
  t.ok("a member sees the open posts", (await visible(READER)) === open);
  t.ok(
    "somebody not signed in sees nothing at all",
    (await visible(null)) === 0
  );
  t.ok(
    "an author still sees their own held post",
    (await visible(LANDLORD)) > open
  );

  t.section("three reports take a post down");

  const report = (uid) =>
    as(db, uid, () =>
      db.query(
        `insert into public.reports (reporter_id, target_type, target_id, reason)
         values ($1, 'classified', $2, 'scam')`,
        [uid, clean.id]
      )
    );

  await report(READER);
  await report(R2);
  t.ok(
    "two are not enough",
    (
      await db.query(`select status from public.classifieds where id = $1`, [
        clean.id,
      ])
    ).rows[0].status === "open"
  );

  await report(R3);
  t.ok(
    "a third holds it",
    (
      await db.query(`select status from public.classifieds where id = $1`, [
        clean.id,
      ])
    ).rows[0].status === "held"
  );

  const reporters = (
    await db.query(
      `select count(distinct reporter_id)::int n from public.reports
        where target_type = 'classified' and target_id = $1`,
      [clean.id]
    )
  ).rows[0].n;
  t.ok(
    "and administrators can still count who reported it",
    reporters === 3,
    String(reporters)
  );

  await db.close();
}
