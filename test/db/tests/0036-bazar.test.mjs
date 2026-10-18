/**
 * 0036 — Bazar.
 *
 * Three rules carry this feature, and all three are supposed to hold in the
 * database rather than in the interface: only verified members sell,
 * nothing is listed until a person has read it, and a seller never learns
 * who bought their work.
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0036 — Bazar: selling what Kurds make";

const ARTIST = "aa360000-0000-4000-8000-000000000001";
const UNCHECKED = "aa360000-0000-4000-8000-000000000002";
const BUYER = "aa360000-0000-4000-8000-000000000003";
const OTHER = "aa360000-0000-4000-8000-000000000004";
const ADMIN = "aa360000-0000-4000-8000-000000000009";

export default async function test0036Bazar(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ARTIST}', 'artist@x.test'), ('${UNCHECKED}', 'unchecked@x.test'),
      ('${BUYER}', 'buyer@x.test'), ('${OTHER}', 'other@x.test'),
      ('${ADMIN}', 'admin@x.test');
    insert into public.profiles (user_id, display_name, is_verified)
      values ('${ARTIST}', 'Zîn', true);
    insert into public.profiles (user_id, display_name) values
      ('${UNCHECKED}', 'Stranger'), ('${BUYER}', 'Rojda'), ('${OTHER}', 'Avan');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
  `);

  const submit = (uid, fields = {}) => {
    const slug =
      fields.slug ?? `print-${Math.random().toString(36).slice(2, 8)}`;
    return as(db, uid, () =>
      db.query(
        `insert into public.shop_products
           (seller_id, slug, title, description, price_cents, file_path,
            preview_path, rights_confirmed_at, status)
         values ($1, $2, $3, $4, $5, $6, $7, now(), $8)
         returning id, status, flags, seller_id, file_path`,
        [
          uid,
          slug,
          fields.title ?? "Newroz, linocut print",
          fields.description ??
            "A linocut of the Newroz fire, drawn in Hamburg. Print-ready PDF at A3.",
          fields.price_cents ?? 800,
          // One file per product: can_download() matches on the path, so
          // sharing one between two products shares the access as well.
          fields.file_path ?? `${uid}/${slug}.pdf`,
          fields.preview_path ?? `${uid}/${slug}-preview.png`,
          fields.status ?? "pending",
        ]
      )
    );
  };

  t.section("who may sell");

  await t.refuses(
    "an unverified member cannot list work",
    () => submit(UNCHECKED),
    /row-level security/
  );

  const first = (await submit(ARTIST)).rows[0];
  t.ok("a verified member can", Boolean(first.id));

  // The guard rewrites the seller to whoever is signed in rather than
  // raising — so a forged row becomes an honest one.
  const forgedSeller = (
    await as(db, ARTIST, () =>
      db.query(
        `insert into public.shop_products
           (seller_id, slug, title, description, file_path, rights_confirmed_at)
         values ($1, 'claimed-by-someone-else', 'Not mine', $2, $3, now())
         returning seller_id`,
        [
          OTHER,
          "A description long enough to pass the check.",
          `${ARTIST}/x.pdf`,
        ]
      )
    )
  ).rows[0];
  t.ok(
    "work cannot be listed in somebody else's name",
    forgedSeller.seller_id === ARTIST,
    forgedSeller.seller_id
  );

  await t.refuses(
    "a file in another member's folder cannot be sold",
    () =>
      submit(ARTIST, {
        slug: "pointing-elsewhere",
        file_path: `${OTHER}/theirs.pdf`,
      }),
    /shop_products_own_files/
  );

  await t.refuses(
    "nothing reaches the queue without the rights confirmed",
    () =>
      as(db, ARTIST, () =>
        db.query(
          `insert into public.shop_products
             (seller_id, slug, title, description, file_path, status)
           values ($1, 'no-rights', 'Unclaimed', $2, $3, 'pending')`,
          [
            ARTIST,
            "A description long enough to pass the check.",
            `${ARTIST}/a.pdf`,
          ]
        )
      ),
    /shop_products_ready_to_review/
  );

  t.section("nothing is listed until a person has read it");

  t.ok(
    "a submission arrives pending",
    first.status === "pending",
    first.status
  );

  const forged = (
    await submit(ARTIST, { slug: "pre-approved", status: "listed" })
  ).rows[0];
  t.ok(
    "a seller cannot list their own work by saying so",
    forged.status === "pending",
    forged.status
  );

  const visible = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select id from public.shop_products where status = 'listed'`)
      )
    ).rows.length;

  t.ok("so a visitor sees nothing yet", (await visible(BUYER)) === 0);

  await t.refuses(
    "a seller cannot decide their own submission",
    () =>
      as(db, ARTIST, () =>
        db.query(`select public.decide_product($1, true, null)`, [first.id])
      ),
    /not_admin/
  );

  await as(db, ADMIN, () =>
    db.query(`select public.decide_product($1, true, null)`, [first.id])
  );
  const decided = (
    await db.query(
      `select status, reviewed_by from public.shop_products where id = $1`,
      [first.id]
    )
  ).rows[0];
  t.ok(
    "an administrator lists it, and who decided is kept",
    decided.status === "listed" && decided.reviewed_by === ADMIN,
    JSON.stringify(decided)
  );

  t.ok("now anybody can see it", (await visible(BUYER)) === 1);
  t.ok("including somebody who has not joined", (await visible(null)) === 1);

  await as(db, ARTIST, () =>
    db.query(
      `update public.shop_products set title = 'Something else entirely' where id = $1`,
      [first.id]
    )
  );
  t.ok(
    "editing listed work sends it back to the queue",
    (
      await db.query(`select status from public.shop_products where id = $1`, [
        first.id,
      ])
    ).rows[0].status === "pending"
  );

  t.section("what the wording check notices");

  const flagsOf = async (title, description) =>
    (await submit(ARTIST, { title, description })).rows[0].flags;

  t.ok(
    "a banned organisation's name is flagged for the reviewer",
    (
      await flagsOf(
        "PKK flag, high resolution",
        "A clean vector of the flag, ready for printing at any size."
      )
    ).includes("banned_symbol")
  );
  t.ok(
    "so is somebody else's trademark",
    (
      await flagsOf(
        "Barcelona crest, Kurdish colours",
        "The club crest redrawn in red, white and green, print-ready."
      )
    ).includes("trademark")
  );
  t.ok(
    "and an attempt to take the sale elsewhere",
    (
      await flagsOf(
        "Calligraphy set",
        "Message me on WhatsApp and I will send the IBAN for payment."
      )
    ).includes("off_platform")
  );
  t.ok(
    "an ordinary submission is flagged with nothing",
    first.flags.length === 0,
    JSON.stringify(first.flags)
  );

  t.section("free is a first-class case");

  const free = (await submit(ARTIST, { slug: "flag-pack", price_cents: 0 }))
    .rows[0];
  await as(db, ADMIN, () =>
    db.query(`select public.decide_product($1, true, null)`, [free.id])
  );
  await asService(db, () =>
    db.query(
      `insert into public.shop_orders (buyer_id, product_id, seller_id, amount_cents, file_path)
       values ($1, $2, $3, 0, $4)`,
      [BUYER, free.id, ARTIST, free.file_path]
    )
  );
  t.ok("a free download needs no waiver and no Stripe", true);

  await t.refuses(
    "but a paid order without the withdrawal waiver is refused",
    () =>
      asService(db, () =>
        db.query(
          `insert into public.shop_orders
             (buyer_id, product_id, seller_id, amount_cents, stripe_session_id, file_path)
           values ($1, $2, $3, 800, 'cs_no_waiver', $4)`,
          [BUYER, first.id, ARTIST, first.file_path]
        )
      ),
    /shop_orders_paid_waiver/
  );

  t.section("an order exists only because the server wrote it");

  await t.refuses(
    "nobody writes themselves an order",
    () =>
      as(db, OTHER, () =>
        db.query(
          `insert into public.shop_orders (buyer_id, product_id, seller_id, amount_cents, file_path)
           values ($1, $2, $3, 0, $4)`,
          [OTHER, free.id, ARTIST, free.file_path]
        )
      ),
    /row-level security/
  );

  await asService(db, () =>
    db.query(
      `insert into public.shop_orders
         (buyer_id, product_id, seller_id, amount_cents, platform_fee_cents,
          seller_share_cents, vat_cents, vat_country, vat_rate,
          stripe_session_id, withdrawal_waived_at, file_path)
       values ($1, $2, $3, 800, 120, 553, 127, 'DE', 19.00, 'cs_test_1', now(), $4)`,
      [BUYER, first.id, ARTIST, first.file_path]
    )
  );
  t.ok("the webhook can", true);

  await t.refuses(
    "a retried webhook cannot sell the same thing twice",
    () =>
      asService(db, () =>
        db.query(
          `insert into public.shop_orders
             (buyer_id, product_id, seller_id, amount_cents, withdrawal_waived_at,
              stripe_session_id, file_path)
           values ($1, $2, $3, 800, now(), 'cs_test_1', $4)`,
          [BUYER, first.id, ARTIST, first.file_path]
        )
      ),
    /shop_orders_stripe_session_id_key|duplicate key/
  );

  await t.refuses(
    "the shares can never exceed what was paid",
    () =>
      asService(db, () =>
        db.query(
          `insert into public.shop_orders
             (buyer_id, product_id, seller_id, amount_cents, platform_fee_cents,
              seller_share_cents, withdrawal_waived_at, file_path)
           values ($1, $2, $3, 800, 500, 500, now(), $4)`,
          [OTHER, first.id, ARTIST, first.file_path]
        )
      ),
    /shop_orders_shares/
  );

  t.section("a seller never learns who bought their work");

  const ordersSeenBy = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select buyer_id from public.shop_orders`)
      )
    ).rows.length;

  t.ok("the buyer sees their own orders", (await ordersSeenBy(BUYER)) === 2);
  t.ok("the seller sees none of them", (await ordersSeenBy(ARTIST)) === 0);
  t.ok("nor does anybody else", (await ordersSeenBy(OTHER)) === 0);
  t.ok("an administrator can, for refunds", (await ordersSeenBy(ADMIN)) === 2);

  const sales = (
    await as(db, ARTIST, () =>
      db.query(`select * from public.shop_sales($1)`, [ARTIST])
    )
  ).rows;
  const sold = sales.find((r) => r.product_id === first.id);
  t.ok(
    "what they get instead is counts and amounts",
    sold && sold.sold === 1 && Number(sold.earned_cents) === 553,
    JSON.stringify(sold)
  );
  t.ok(
    "and no column anywhere in it names a person",
    !Object.keys(sold ?? {}).some((k) => /buyer|email|name/.test(k)),
    Object.keys(sold ?? {}).join(", ")
  );

  t.ok(
    "one seller cannot read another's figures",
    (
      await as(db, OTHER, () =>
        db.query(`select * from public.shop_sales($1)`, [ARTIST])
      )
    ).rows.length === 0
  );

  t.section("the file reaches the person who paid, and nobody else");

  const FILE = first.file_path;
  await db.exec(
    `insert into storage.objects (bucket_id, name, owner)
     values ('shop-files', '${FILE}', '${ARTIST}')`
  );

  const reaches = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select 1 from storage.objects where bucket_id = 'shop-files' and name = $1`,
          [FILE]
        )
      )
    ).rows.length;

  t.ok("the buyer reaches it", (await reaches(BUYER)) === 1);
  t.ok("the seller reaches their own file", (await reaches(ARTIST)) === 1);
  t.ok(
    "somebody who did not buy it reaches nothing",
    (await reaches(OTHER)) === 0
  );
  t.ok("nor does a visitor who is not signed in", (await reaches(null)) === 0);

  // The order carries the file, so neither of these touches a sale that
  // has already happened.
  await as(db, ARTIST, () =>
    db.query(`update public.shop_products set description = $2 where id = $1`, [
      first.id,
      "Rewritten, which sends it back to the review queue.",
    ])
  );
  t.ok(
    "a sale keeps working while the work is back in the queue",
    (
      await db.query(`select status from public.shop_products where id = $1`, [
        first.id,
      ])
    ).rows[0].status === "pending" && (await reaches(BUYER)) === 1
  );

  await as(db, ARTIST, () =>
    db.query(`update public.shop_products set file_path = $2 where id = $1`, [
      first.id,
      `${ARTIST}/something-else.pdf`,
    ])
  );
  t.ok(
    "and a seller cannot swap the file under somebody who paid",
    (await reaches(BUYER)) === 1
  );

  await db.query(
    `update public.shop_orders set expires_at = now() - interval '1 day'
      where buyer_id = $1 and product_id = $2`,
    [BUYER, first.id]
  );
  t.ok("an expired link stops working", (await reaches(BUYER)) === 0);
  await db.query(
    `update public.shop_orders set expires_at = now() + interval '365 days'
      where buyer_id = $1 and product_id = $2`,
    [BUYER, first.id]
  );

  await db.query(
    `update public.shop_orders set status = 'refunded'
      where buyer_id = $1 and product_id = $2`,
    [BUYER, first.id]
  );
  t.ok("so does a refunded one", (await reaches(BUYER)) === 0);

  await t.refuses(
    "nobody uploads into another seller's folder",
    () =>
      as(db, OTHER, () =>
        db.query(
          `insert into storage.objects (bucket_id, name, owner)
           values ('shop-files', $1, $2)`,
          [`${ARTIST}/forged.pdf`, OTHER]
        )
      ),
    /row-level security/
  );

  t.section("the two buckets have opposite jobs");

  const buckets = (
    await db.query(
      `select id, public from storage.buckets
        where id in ('shop-files', 'shop-previews') order by id`
    )
  ).rows;
  t.ok(
    "what a buyer gets is private",
    buckets.find((b) => b.id === "shop-files")?.public === false
  );
  t.ok(
    "what anybody may look at is public",
    buckets.find((b) => b.id === "shop-previews")?.public === true
  );

  t.section("free work is for everyone — the point of giving it away");

  const FREE_FILE = free.file_path;
  await db.exec(
    `insert into storage.objects (bucket_id, name, owner)
     values ('shop-files', '${FREE_FILE}', '${ARTIST}')`
  );

  const reachesFree = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(
          `select 1 from storage.objects where bucket_id = 'shop-files' and name = $1`,
          [FREE_FILE]
        )
      )
    ).rows.length;

  t.ok(
    "somebody who has never signed in can take a free download",
    (await reachesFree(null)) === 1
  );
  t.ok("so can a member", (await reachesFree(OTHER)) === 1);

  // The paid file next to it must not become public by association.
  t.ok(
    "while the paid file beside it stays shut",
    (await reaches(OTHER)) === 0
  );

  await as(db, ADMIN, () =>
    db.query(
      `update public.shop_products set status = 'held' where id = $1`,
      [free.id]
    )
  );
  t.ok(
    "and taking it off the shelf closes the link",
    (await reachesFree(null)) === 0
  );
  await as(db, ADMIN, () =>
    db.query(
      `update public.shop_products set status = 'listed' where id = $1`,
      [free.id]
    )
  );

  t.section("counting what was taken, never who");

  await as(db, null, () =>
    db.query(`select public.record_download($1)`, [free.id])
  );
  await as(db, OTHER, () =>
    db.query(`select public.record_download($1)`, [free.id])
  );
  t.ok(
    "a visitor's download counts as much as a member's",
    (
      await db.query(`select downloads from public.shop_products where id = $1`, [
        free.id,
      ])
    ).rows[0].downloads === 2
  );

  const held = (await submit(ARTIST, { slug: "not-listed-yet" })).rows[0];
  await as(db, null, () =>
    db.query(`select public.record_download($1)`, [held.id])
  );
  t.ok(
    "nothing counts against work that is not on the shelf",
    (
      await db.query(`select downloads from public.shop_products where id = $1`, [
        held.id,
      ])
    ).rows[0].downloads === 0
  );

  t.section("an administrator stocks the shelf");

  const seeded = (
    await as(db, ADMIN, () =>
      db.query(
        `insert into public.shop_products
           (seller_id, slug, title, description, price_cents, file_path,
            rights_confirmed_at, status)
         values ($1, 'flag-pack-official', 'Kurdish flag, print-ready', $2, 0, $3, now(), 'listed')
         returning seller_id, status`,
        [
          ARTIST,
          "The flag at A3, A2 and A1, plus a vector. Free, for everyone, forever.",
          `${ARTIST}/flag-pack.pdf`,
        ]
      )
    )
  ).rows[0];
  t.ok(
    "an administrator may put work up on a maker's behalf",
    seeded.seller_id === ARTIST,
    seeded.seller_id
  );
  t.ok(
    "...and list it directly, because they are the review",
    seeded.status === "listed",
    seeded.status
  );

  t.section("settlement");

  await asService(db, () =>
    db.query(
      `insert into public.shop_payouts (seller_id, period, amount_cents)
       values ($1, date_trunc('month', now())::date, 553)`,
      [ARTIST]
    )
  );
  t.ok(
    "a seller reads what they are owed",
    (await as(db, ARTIST, () => db.query(`select 1 from public.shop_payouts`)))
      .rows.length === 1
  );
  t.ok(
    "and nobody else's",
    (await as(db, OTHER, () => db.query(`select 1 from public.shop_payouts`)))
      .rows.length === 0
  );
  await t.refuses(
    "nobody pays themselves",
    () =>
      as(db, OTHER, () =>
        db.query(
          `insert into public.shop_payouts (seller_id, period, amount_cents)
           values ($1, '2026-01-01', 100000)`,
          [OTHER]
        )
      ),
    /row-level security/
  );

  await db.close();
}
