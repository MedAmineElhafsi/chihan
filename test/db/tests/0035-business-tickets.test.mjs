/**
 * 0035 — the business plan, and tickets.
 *
 * Two things that involve money, so two things worth being certain about: a
 * listing's numbers say how many and never who, and a ticket exists only
 * because Stripe said it was paid for.
 */
import { freshDb, as, asService } from "../harness.mjs";

export const title = "0035 — the business plan, and tickets";

const OWNER = "ee000000-0000-4000-8000-000000000001"; // pays, owns a listing
const PLAIN = "ee000000-0000-4000-8000-000000000002"; // owns one, does not pay
const BUYER = "ee000000-0000-4000-8000-000000000003";
const OTHER = "ee000000-0000-4000-8000-000000000004";
const ADMIN = "ee000000-0000-4000-8000-000000000009";

const L1 = "ee111111-cccc-4000-8000-000000000001";
const L2 = "ee111111-cccc-4000-8000-000000000002";
const EVENT = "ee222222-cccc-4000-8000-000000000001";

export default async function test0035BusinessTickets(t) {
  const db = await freshDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${OWNER}', 'o@x.test'), ('${PLAIN}', 'p@x.test'),
      ('${BUYER}', 'b@x.test'), ('${OTHER}', 'x@x.test'),
      ('${ADMIN}', 'a@x.test');
    insert into public.profiles (user_id, display_name) values
      ('${OWNER}', 'Şiler'), ('${PLAIN}', 'Baran'),
      ('${BUYER}', 'Rojda'), ('${OTHER}', 'Avan');
    insert into public.profiles (user_id, display_name, is_admin)
      values ('${ADMIN}', 'Admin', true);
    insert into public.listings (id, name, category, owner_user_id) values
      ('${L1}', 'Nan û Av', 'restaurant', '${OWNER}'),
      ('${L2}', 'Plain Shop', 'grocery', '${PLAIN}');
    insert into public.business_subscriptions (user_id, status, current_period_end)
      values ('${OWNER}', 'active', now() + interval '30 days');
  `);

  t.section("a listing's own numbers");

  const record = (uid, listing, kind) =>
    as(db, uid, () =>
      db.query(`select public.record_listing_event($1, $2)`, [listing, kind])
    );

  await record(BUYER, L1, "view");
  await record(BUYER, L1, "whatsapp");
  await record(OTHER, L1, "view");

  const counts = (
    await db.query(
      `select kind, count from public.listing_events where listing_id = $1 order by kind`,
      [L1]
    )
  ).rows;
  t.ok(
    "visits and taps are counted by day and by kind",
    JSON.stringify(counts) ===
      JSON.stringify([
        { kind: "view", count: 2 },
        { kind: "whatsapp", count: 1 },
      ]),
    JSON.stringify(counts)
  );

  await record(OWNER, L1, "view");
  t.ok(
    "a business looking at its own page is not a customer",
    (
      await db.query(
        `select count from public.listing_events where listing_id = $1 and kind = 'view'`,
        [L1]
      )
    ).rows[0].count === 2
  );

  await record(BUYER, L1, "bogus");
  t.ok(
    "a kind nobody defined is ignored rather than stored",
    (
      await db.query(
        `select count(*)::int n from public.listing_events where listing_id = $1`,
        [L1]
      )
    ).rows[0].n === 2
  );

  const rowsFor = async (uid) =>
    (
      await as(db, uid, () =>
        db.query(`select 1 from public.listing_events where listing_id = $1`, [
          L1,
        ])
      )
    ).rows.length;

  t.ok("the owner reads their own numbers", (await rowsFor(OWNER)) === 2);
  t.ok("a visitor reads none of them", (await rowsFor(OTHER)) === 0);
  t.ok("another business reads none either", (await rowsFor(PLAIN)) === 0);
  t.ok("an administrator can", (await rowsFor(ADMIN)) === 2);

  await t.refuses(
    "nobody invents their own numbers",
    () =>
      as(db, OTHER, () =>
        db.query(
          `insert into public.listing_events (listing_id, kind, count) values ($1, 'view', 999)`,
          [L1]
        )
      ),
    /row-level security/
  );

  t.ok(
    "the numbers say how many, never who",
    (
      await db.query(
        `select count(*)::int n from information_schema.columns
          where table_name = 'listing_events'
            and column_name in ('user_id', 'ip', 'session_id', 'visitor_id')`
      )
    ).rows[0].n === 0
  );

  t.section("the business plan");

  t.ok(
    "has_business is true for the subscriber",
    (await db.query(`select public.has_business($1) as v`, [OWNER])).rows[0]
      .v === true
  );
  t.ok(
    "...and false for everybody else",
    (await db.query(`select public.has_business($1) as v`, [PLAIN])).rows[0]
      .v === false
  );
  t.ok(
    "nobody reads somebody else's plan",
    (
      await as(db, OTHER, () =>
        db.query(`select 1 from public.business_subscriptions`)
      )
    ).rows.length === 0
  );
  await t.refuses(
    "nobody gives themselves one",
    () =>
      as(db, PLAIN, () =>
        db.query(
          `insert into public.business_subscriptions (user_id, status) values ($1, 'active')`,
          [PLAIN]
        )
      ),
    /row-level security/
  );

  t.section("what the plan actually buys: a longer run");

  const submit = async (listing, owner) =>
    (
      await as(db, owner, () =>
        db.query(`select public.submit_ad($1, $2, $3) as id`, [
          listing,
          "Fresh nan every morning from six.",
          null,
        ])
      )
    ).rows[0].id;

  const paidAd = await submit(L1, OWNER);
  const freeAd = await submit(L2, PLAIN);
  await as(db, ADMIN, () =>
    db.query(`select public.decide_ad($1, true, null)`, [paidAd])
  );
  await as(db, ADMIN, () =>
    db.query(`select public.decide_ad($1, true, null)`, [freeAd])
  );

  const days = async (id) =>
    (
      await db.query(
        `select round(extract(epoch from (ends_at - starts_at)) / 86400)::int d
           from public.ads where id = $1`,
        [id]
      )
    ).rows[0].d;

  t.ok("a business ad runs thirty days", (await days(paidAd)) === 30);
  t.ok("a free one still runs seven", (await days(freeAd)) === 7);

  t.section("what an event may charge");

  await db.query(
    `insert into public.posts (id, author_id, type, event_title, event_at, ticket_price_cents, ticket_capacity)
     values ($1, $2, 'event', 'Kurdish film night: Bahoz', now() + interval '20 days', 800, 60)`,
    [EVENT, OWNER]
  );
  t.ok("an event can carry a price and a number of places", true);

  await t.refuses(
    "a price on something that is not an event is refused",
    () =>
      db.query(
        `insert into public.posts (author_id, type, body, ticket_price_cents, ticket_capacity)
         values ($1, 'post', 'hello', 1000, 10)`,
        [OWNER]
      ),
    /posts_tickets_check/
  );
  await t.refuses(
    "a ten-cent ticket is refused",
    () =>
      db.query(
        `insert into public.posts (author_id, type, event_title, ticket_price_cents, ticket_capacity)
         values ($1, 'event', 'Cheap', 10, 10)`,
        [OWNER]
      ),
    /posts_tickets_check/
  );
  // A check constraint passes when it evaluates to null, so "both or
  // neither" has to say `is not null` out loud.
  await t.refuses(
    "a price with no number of places is refused",
    () =>
      db.query(
        `insert into public.posts (author_id, type, event_title, ticket_price_cents)
         values ($1, 'event', 'How many?', 800)`,
        [OWNER]
      ),
    /posts_tickets_check/
  );
  await t.refuses(
    "and places with no price",
    () =>
      db.query(
        `insert into public.posts (author_id, type, event_title, ticket_capacity)
         values ($1, 'event', 'How much?', 60)`,
        [OWNER]
      ),
    /posts_tickets_check/
  );

  t.section("a ticket exists only because Stripe said so");

  await t.refuses(
    "nobody writes themselves a ticket",
    () =>
      as(db, OTHER, () =>
        db.query(
          `insert into public.tickets (event_id, buyer_id, quantity, amount_cents, code)
           values ($1, $2, 1, 0, 'FREE-RIDE')`,
          [EVENT, OTHER]
        )
      ),
    /row-level security/
  );

  // The webhook writes as the service role, after Stripe confirms payment.
  await asService(db, () =>
    db.query(
      `insert into public.tickets (event_id, buyer_id, quantity, amount_cents, code, stripe_session_id)
       values ($1, $2, 2, 1600, 'CIH-7F3K-9QTM', 'cs_test_1')`,
      [EVENT, BUYER]
    )
  );
  t.ok("the webhook can", true);

  await t.refuses(
    "a retried webhook cannot sell the same seats twice",
    () =>
      asService(db, () =>
        db.query(
          `insert into public.tickets (event_id, buyer_id, quantity, amount_cents, code, stripe_session_id)
           values ($1, $2, 2, 1600, 'CIH-OTHER-CODE', 'cs_test_1')`,
          [EVENT, BUYER]
        )
      ),
    /tickets_stripe_session_id_key|duplicate key/
  );

  t.ok(
    "sold counts the places, not the rows",
    (await db.query(`select public.tickets_sold($1) as n`, [EVENT])).rows[0]
      .n === 2
  );
  const many = (
    await db.query(
      `select * from public.tickets_sold_many(array[$1]::uuid[])`,
      [EVENT]
    )
  ).rows;
  t.ok(
    "a screenful of events can ask once",
    many.length === 1 && Number(many[0].sold) === 2,
    JSON.stringify(many)
  );

  const ticketsFor = async (uid) =>
    (await as(db, uid, () => db.query(`select 1 from public.tickets`))).rows
      .length;
  t.ok("the buyer sees their ticket", (await ticketsFor(BUYER)) === 1);
  t.ok("the organiser sees it too", (await ticketsFor(OWNER)) === 1);
  t.ok("nobody else does", (await ticketsFor(OTHER)) === 0);

  t.section("the door");

  const checkIn = async (uid, code) =>
    (
      await as(db, uid, () =>
        db.query(`select * from public.check_in_ticket($1)`, [code])
      )
    ).rows[0];

  t.ok(
    "a stranger cannot check anybody in",
    (await checkIn(OTHER, "CIH-7F3K-9QTM")).reason === "not_yours"
  );

  const first = await checkIn(OWNER, "  cih-7f3k-9qtm  ");
  t.ok(
    "the organiser can, whatever the case or spacing",
    first.ok === true && first.quantity === 2,
    JSON.stringify(first)
  );
  t.ok(
    "the same code cannot be used twice",
    (await checkIn(OWNER, "CIH-7F3K-9QTM")).reason === "already_used"
  );
  t.ok(
    "an unknown code says so",
    (await checkIn(OWNER, "NOPE-0000")).reason === "not_found"
  );

  t.section("the organiser hears about it");

  await asService(db, () =>
    db.query(
      `insert into public.notifications (user_id, actor_id, type, entity_id, link)
       values ($1, $2, 'ticket_sold', $3, '/tickets')`,
      [OWNER, BUYER, EVENT]
    )
  );
  t.ok(
    "'ticket_sold' is a notification this database accepts",
    (
      await db.query(
        `select 1 from public.notifications where type = 'ticket_sold'`
      )
    ).rows.length === 1
  );

  await db.close();
}
