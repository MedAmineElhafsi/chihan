# Bazar — selling what Kurds make

A proposal, not a decision. Written 18 October 2026 after the customer asked
for "digital products, like a Kurdish flag, that people can buy".

Working name **Bazar** — it reads the same in all five of Cîhan's languages
and needs no translation. Rename with the brand.

---

## 1. What this is, and what it is not

**Not** a shop where Cîhan sells flags. That makes Cîhan a merchant — VAT
registration, consumer-rights obligations, refunds, copyright exposure on
the artwork — in exchange for a side business that earns roughly nothing at
26 members.

**Instead:** Kurdish artists and makers in the diaspora sell their work here
and keep most of the money. Cîhan handles the payment and the tax, takes a
fee, and reviews everything before it goes on sale.

That version does three things the first one does not:

- it gives artists a reason to join, and they arrive with an audience;
- it fits what Cîhan already is — the money is the member's, the platform
  takes a cut, exactly as with event tickets;
- a diaspora genuinely cannot buy this material anywhere else. A Kurdish
  alphabet poster for a child born in Hamburg is not in any shop.

### The flag should be free

The single most shareable thing this site could have is a beautiful,
print-ready Kurdish flag pack that costs nothing and travels through
WhatsApp groups without asking anyone to sign up. That is Cîhan's actual
problem — nobody knows it exists — and a free download addresses it better
than a €3 sale ever will.

Sell what took an artist real work. Give away what is everyone's anyway.

---

## 2. The three things that will bite

### 2.1 EU VAT on digital goods — and why the ticket model cannot be reused

A downloadable file sold to a consumer is taxed **where the buyer is**.
There is a €10,000/year EU-wide threshold for a seller established in one
member state; under it you may charge home-country VAT, over it you must
register for OSS and charge each buyer's national rate.

Manageable once, centrally. **Unmanageable if each member is the seller** —
no newcomer selling six posters should be handed an OSS registration.

This is the architectural consequence, and it is the opposite of what
migration 0035 does for tickets:

| | Tickets (0035) | Bazar |
| --- | --- | --- |
| Who is the merchant | the organiser | **Cîhan** |
| Stripe mechanism | destination charge to their account | charge on Cîhan's account |
| How the other side is paid | automatically, minus a fee | **transfer**, on a schedule |
| Who owes the VAT | the organiser, locally | Cîhan, in the buyer's country |

Tickets work that way because an organiser selling into a local hall has a
simple local tax position. A download crosses a border the instant it is
bought.

Two routes:

- **Stripe Tax** (`automatic_tax: { enabled: true }`) calculates and collects;
  Cîhan registers for OSS and files. Cheaper, more admin.
- **A merchant of record** — Paddle, Lemon Squeezy — takes the VAT liability
  entirely for roughly 5–8%. For a v1 at this scale, almost certainly worth
  the fee, and reversible later.

**Ask the customer which, before anything is built.** It changes the
checkout.

### 2.2 Political symbols — specific to this audience, and serious

The PKK is a banned organisation in Germany and some associated symbols are
a criminal matter (§86a StGB). A platform selling *Kurdish* artwork to a
German audience will be offered PKK- or YPG-adjacent designs, probably in
the first month, often by someone who does not know it is a problem.

What follows from that:

- **Every design is reviewed by a human before it is listed.** Not after.
  This is not negotiable and it sets the pace of the whole feature.
- An explicit written policy of what may not be sold, drawn up with a German
  lawyer, published on the site and shown at submission.
- A takedown path that is faster than the review path.

There is a second edge. **An order history ties a named person to political
material.** For members who travel to Turkey, Iran or Syria that is a safety
matter, not a privacy preference. So:

- a seller never sees who bought their work — counts and amounts only;
- order records keep the minimum, and the invoice line says "digital
  download", not the title of the piece;
- German accounting law requires invoices to be kept for ten years
  (§147 AO), which cannot be waived — hence making the retained record
  uninformative rather than trying not to retain it.

### 2.3 The 14-day withdrawal right

EU consumers may cancel within 14 days. For digital content delivered
immediately the right can be waived — but **only** with the buyer's express
prior consent and acknowledgement that they lose it, in specific wording, at
checkout.

Miss the checkbox and every buyer can download the file and demand a refund
for a fortnight. It is a required field on the order record
(`withdrawal_waived_at`), and it is the kind of thing that is miserable to
retrofit.

---

## 3. Most of this is already built

| What it needs | What already exists |
| --- | --- |
| Deliver a file only to whoever paid | private bucket + `signPaths()` signed URLs — the voice-note pattern (0028) |
| Write the record once, even if Stripe retries | unique `stripe_session_id` on the order — the ticket pattern (0035) |
| A human check before anything is public | hold-don't-delete and the admin queue (0034) |
| Pay a creator their share | `payout_accounts`, Stripe Express (0035) |
| Keep the whole thing invisible until it is ready | feature flag + `schema-ready` probe |
| Shrink and strip metadata from an upload | `lib/image-shrink.ts` |
| Screen wording automatically | `classified_flags()` (0034), as triage for the review queue |

Realistically: one migration, two buckets, a review queue, a product page
and a checkout. A week of work, not a month — the expensive part is the tax
decision and the lawyer, not the code.

**The migration is written**: `supabase/migrations/0036_bazar.sql`, with 42
checks in `test/db/tests/0036-bazar.test.mjs`. There is no application code
yet, and nothing should be built on it until §6 is answered.

---

## 4. The shape of it

### Tables (migration 0036)

**`shop_products`** — seller_id, slug, title, description, `kind` ('download',
leaving room for 'print' later), price_cents (0 means free), currency,
preview_path (public bucket), file_path (private bucket), file_bytes,
file_type, licence ('personal' | 'commercial'), `rights_confirmed_at` (the
seller affirming they made it or hold the rights), status
('draft' | 'pending' | 'listed' | 'held' | 'withdrawn'), flags text[],
reviewed_by, reviewed_at, review_note.

RLS: anyone reads a product that is `listed`; a seller reads their own; an
administrator reads everything. **Insert requires `is_verified(auth.uid())`**
— the same bar as the jobs board, for the same reason: money and identity.
A `before insert or update` guard forces `status` to `pending`, recomputes
the flags, and refuses to let a client set its own status — exactly as
`classifieds_guard()` does.

**`shop_orders`** — buyer_id, product_id, **seller_id denormalised** (so a
payout survives the product being withdrawn), **file_path copied at the
moment of sale**, amount_cents, platform_fee_cents, seller_share_cents,
vat_cents, vat_country, vat_rate, stripe_session_id (unique), status,
`withdrawal_waived_at`, download_count, last_downloaded_at, expires_at.

Copying the file path onto the order rather than joining back to the product
is not tidiness. The tests found that the join version broke two ways: a
seller editing their work sent it back to the review queue, which took the
download away from everybody who had already paid; and a seller could swap
`file_path` and change what a completed sale delivered. The order records
what was bought.

RLS: the buyer reads their own orders. **The seller does not read this table
at all** — their sales come from a security-definer function returning
counts and amounts per product, never a buyer. That is §2.2 made structural
rather than promised.

**`shop_payouts`** — seller_id, period, amount_cents, status,
stripe_transfer_id. Settlement to the Express account already in
`payout_accounts`.

### Buckets

- `shop-previews` — public. A watermarked, low-resolution render. The seller
  uploads it, or the browser makes it with the canvas trick already used for
  help photos.
- `shop-files` — private. Read policy asks `can_download(name)`, a function
  that checks for a paid, unexpired order belonging to `auth.uid()`.
  Deliberately **not** security definer, so the order table's own RLS still
  applies — the same reasoning as `can_hear_voice_note`.

### Delivery

A server action mints a 6-hour signed URL and increments `download_count`.
Cap re-downloads (ten is generous), keep the window open a year, and show
the buyer a "your downloads" page that re-issues the link.

No watermarking the buyer's name into the file. For this audience, stamping
somebody's name on a flag PDF is a risk, not a deterrent.

### Checkout

Stripe Checkout, `mode: payment`, on **Cîhan's own account** — no destination
charge — with `automatic_tax` enabled and the billing address collected for
VAT evidence. Metadata `{ kind: 'shop', product_id, buyer_id }`. The webhook
gains a `shop` branch beside the existing `ticket` one and writes the order
idempotently on `stripe_session_id`.

The withdrawal-waiver checkbox gates the Buy button and its timestamp goes
on the order.

### What the fee should be

`TICKET_FEE_PERCENT` is 5. That does not survive contact with small digital
sales: Stripe's fixed component alone is about €0.25, which on a €3 item is
over 8% before anything else. Cîhan is also carrying the VAT admin here.

- **15% on paid downloads**, or 10% plus the Stripe fee passed through.
- **A €5 floor** for paid items, and bundles rather than singles — "twelve
  Newroz cards, €6" works; "one card, €1" does not.
- Free items cost nothing to run: no Stripe, no VAT, no invoice.

---

## 5. How to phase it

**Phase A — free downloads only. Shippable before launch.**
No Stripe, no VAT, no invoices, no consumer-rights exposure. An administrator
uploads a flag pack, Newroz cards, a Kurdish alphabet sheet. It exercises the
whole delivery chain end to end and produces the one thing Cîhan is short
of: something worth sharing that is not "please sign up".

**Phase B — paid, with three to five invited creators.**
Stripe Tax or a merchant of record, the review queue, transfers. Invited
rather than open, so the review load is known and the first impression is
curated.

**Phase C — open submissions.**
Only once there are enough members for the review work to be worth a human's
evening.

---

## 6. What the customer has to decide

1. **Merchant of record: Cîhan with Stripe Tax and an OSS registration, or
   Paddle / Lemon Squeezy taking the liability for a larger cut?** This
   changes the checkout and should be settled first.
2. **Where does the first artwork come from** — commissioned, licensed, or
   donated? And who confirms the rights?
3. **The symbols policy.** What may not be sold, decided deliberately with a
   lawyer, not discovered in a takedown notice.
4. **Who reviews submissions, and within how long?** There is still no
   administrator on the live project at all.

---

## 7. Where it sits

Honestly: this is not next. Ten migrations have never run, there are no
administrators, the site is not deployed and there is no Impressum. A shop
on a site with 26 members and no domain earns nothing.

But **Phase A costs almost nothing and helps the launch** rather than
competing with it — a free flag pack is a reason for someone to send a link
to a WhatsApp group, which is the only distribution this project has. That
part is worth doing early. The paid machinery should wait until there is a
site for it to sit on.
