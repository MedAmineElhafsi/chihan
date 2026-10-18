/**
 * 0032 — city guides.
 *
 * A guide is official procedure. A wrong step costs somebody an appointment
 * or a fine, so only an administrator writes one, and a draft is nobody's
 * business until it is published. Members can say what is missing.
 */
import { freshDb, as } from "../harness.mjs";

export const title = "0032 — city guides";

const ADMIN = "bb000000-0000-4000-8000-000000000001";
const MEMBER = "bb000000-0000-4000-8000-000000000002";
const OTHER = "bb000000-0000-4000-8000-000000000003";

const steps = JSON.stringify([
  { title: "Book the appointment", body: "They open at seven and go quickly." },
]);

export default async function test0032CityGuides(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'a@x.test'), ('${MEMBER}', 'm@x.test'), ('${OTHER}', 'o@x.test');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
    insert into public.profiles (user_id, display_name)
      values ('${MEMBER}', 'Rojda'), ('${OTHER}', 'Baran');
  `);

  const write = (uid, fields) =>
    as(db, uid, () =>
      db.query(
        `insert into public.guides (slug, locale, topic, city, title, steps, status, author_id)
         values ($1, $2, 'registration', 'Berlin', $3, $4::jsonb, $5, $6) returning id`,
        [
          fields.slug,
          fields.locale ?? "en",
          fields.title ?? "Registering your address in Berlin",
          steps,
          fields.status ?? "draft",
          uid,
        ]
      )
    );

  t.section("who writes a guide");

  await t.refuses(
    "a member cannot write one",
    () => write(MEMBER, { slug: "sneaky-guide" }),
    /row-level security/
  );
  await t.refuses(
    "nor can a stranger who is not signed in",
    () => write(null, { slug: "sneaky-guide" }),
    /row-level security/
  );

  const draft = (await write(ADMIN, { slug: "anmeldung-berlin" })).rows[0].id;
  t.ok("an administrator can", Boolean(draft));

  t.section("a draft is nobody's business until it is published");

  const visible = async (uid) =>
    (await as(db, uid, () => db.query(`select id from public.guides`))).rows
      .length;

  t.ok("a member sees no drafts", (await visible(MEMBER)) === 0);
  t.ok("nor does a stranger", (await visible(null)) === 0);
  t.ok("an administrator sees their draft", (await visible(ADMIN)) === 1);

  await as(db, ADMIN, () =>
    db.query(`update public.guides set status = 'published' where id = $1`, [
      draft,
    ])
  );
  t.ok("published, a member sees it", (await visible(MEMBER)) === 1);
  t.ok(
    "published, so does somebody who has not joined",
    (await visible(null)) === 1
  );

  // An update whose policy matches no row does not raise — it simply
  // reaches nothing, which is the same protection by a quieter route.
  const edit = await as(db, MEMBER, () =>
    db.query(`update public.guides set title = 'Pay me first' where id = $1`, [
      draft,
    ])
  );
  const after = (
    await db.query(`select title from public.guides where id = $1`, [draft])
  ).rows[0].title;
  t.ok(
    "a member's edit reaches no row",
    edit.affectedRows === 0,
    `affected ${edit.affectedRows}`
  );
  t.ok("...and the words are untouched", after.startsWith("Registering"));

  t.section("one guide, several languages");

  await write(ADMIN, {
    slug: "anmeldung-berlin",
    locale: "ckb",
    status: "published",
  });
  await write(ADMIN, {
    slug: "anmeldung-berlin",
    locale: "ar",
    status: "published",
  });
  const langs = (
    await db.query(
      `select locale from public.guides where slug = 'anmeldung-berlin' order by locale`
    )
  ).rows.map((r) => r.locale);
  t.ok(
    "the same slug carries one row per language",
    langs.join(",") === "ar,ckb,en",
    langs.join(",")
  );

  await t.refuses(
    "the same language twice under one slug is refused",
    () => write(ADMIN, { slug: "anmeldung-berlin", locale: "ar" }),
    /guides_slug_locale_key|duplicate key/
  );

  t.section("what a guide may say");

  await t.refuses(
    "a slug with spaces or capitals is refused",
    () => write(ADMIN, { slug: "Anmeldung Berlin" }),
    /guides_slug_check/
  );
  await t.refuses(
    "a language Cîhan does not speak is refused",
    () => write(ADMIN, { slug: "fr-guide", locale: "fr" }),
    /guides_locale_check/
  );
  await t.refuses(
    "a title of two characters is refused",
    () => write(ADMIN, { slug: "short-one", title: "Hi" }),
    /guides_title_check/
  );
  await t.refuses(
    "more than thirty steps is refused",
    () =>
      as(db, ADMIN, () =>
        db.query(
          `insert into public.guides (slug, locale, topic, title, steps)
           values ('too-long', 'en', 'other', 'Thirty-one steps', $1::jsonb)`,
          [
            JSON.stringify(
              Array.from({ length: 31 }, () => ({ title: "x", body: "y" }))
            ),
          ]
        )
      ),
    /guides_steps_check/
  );

  t.section("suggestions from members");

  const suggest = (uid, title) =>
    as(db, uid, () =>
      db.query(
        `insert into public.guide_suggestions (suggested_by, title, city)
         values ($1, $2, 'Berlin') returning id`,
        [uid, title]
      )
    );

  const mine = (await suggest(MEMBER, "How do I enrol a child in school?"))
    .rows[0].id;
  t.ok("a member may suggest a guide", Boolean(mine));

  await t.refuses(
    "but not in somebody else's name",
    () =>
      as(db, MEMBER, () =>
        db.query(
          `insert into public.guide_suggestions (suggested_by, title) values ($1, 'Not mine')`,
          [OTHER]
        )
      ),
    /row-level security/
  );

  const seenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.guide_suggestions`)
      )
    ).rows.length;

  t.ok("a member sees their own suggestion", (await seenBy(MEMBER)) === 1);
  t.ok("another member sees none of it", (await seenBy(OTHER)) === 0);
  t.ok("an administrator sees it", (await seenBy(ADMIN)) === 1);

  await as(db, ADMIN, () =>
    db.query(
      `update public.guide_suggestions set status = 'done' where id = $1`,
      [mine]
    )
  );
  t.ok(
    "an administrator can close it",
    (
      await db.query(
        `select status from public.guide_suggestions where id = $1`,
        [mine]
      )
    ).rows[0].status === "done"
  );

  await db.close();
}
