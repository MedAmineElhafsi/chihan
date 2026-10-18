-- ============================================================================
-- 0036 — Bazar: selling what Kurds make.
--
-- Artists and makers in the diaspora sell their work here and keep most of
-- the money. Cîhan takes the payment, carries the tax, and reads every
-- design before it goes on sale.
--
-- Three things make this different from the event tickets in 0035, and all
-- three are in this file rather than in the interface:
--
--   * Cîhan is the merchant, not the seller. A download is taxed where the
--     buyer is, so one registration carries it; nobody hands an OSS VAT
--     registration to a newcomer selling six posters. The order therefore
--     records what tax was charged and where, and the creator's share is
--     settled separately (shop_payouts).
--
--   * A seller never learns who bought their work. There is no select
--     policy for them on shop_orders at all — their sales come back as
--     counts and amounts from shop_sales(). Some members travel to Turkey,
--     Iran and Syria, and an order history tying a name to political
--     material is a safety matter, not a preference.
--
--   * Nothing is listed until a person has looked at it. Symbols of banned
--     organisations are a criminal matter in Germany; the trigger below
--     forces every submission to 'pending' whatever the client sends, and
--     only an administrator moves it on.
--
-- The 14-day right of withdrawal is waived at checkout or not at all, so
-- the acknowledgement is a column here, not a line in a log.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. What is for sale.
-- ----------------------------------------------------------------------------
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  description text not null
    check (char_length(btrim(description)) between 20 and 3000),

  -- Only downloads for now. 'print' is deliberately absent: shipping,
  -- returns and customs are a different business, and adding the word here
  -- without the rest of it would be a promise the table cannot keep.
  kind text not null default 'download' check (kind in ('download')),

  -- Zero means free, and free is a first-class case: no Stripe, no tax, no
  -- invoice. The flag pack lives here.
  price_cents integer not null default 0
    check (price_cents = 0 or price_cents between 100 and 50000),
  currency text not null default 'eur',
  licence text not null default 'personal'
    check (licence in ('personal', 'commercial')),

  -- What a browser may show anyone: small, watermarked, public bucket.
  preview_path text,
  -- What a buyer gets: private bucket, in the seller's own folder.
  file_path text,
  file_bytes bigint check (file_bytes is null or file_bytes <= 104857600),
  file_type text,

  -- The seller saying, on the record, that this is theirs to sell.
  rights_confirmed_at timestamptz,

  status text not null default 'pending' check (
    status in ('draft', 'pending', 'listed', 'held', 'withdrawn')
  ),
  -- What the wording check found. Triage for the queue, never a verdict.
  flags text[] not null default '{}',

  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),

  -- How many times it has been taken. A number, never a who — the same
  -- rule as a listing's statistics.
  downloads integer not null default 0 check (downloads >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A file and a preview must sit in the seller's own folder, so nobody
  -- can sell somebody else's upload by pointing at it.
  constraint shop_products_own_files check (
    public.paths_in_folder(
      array_remove(array[preview_path, file_path], null),
      seller_id
    )
  ),
  -- Nothing reaches the queue without something to sell and the rights
  -- confirmed. A draft may still be empty.
  constraint shop_products_ready_to_review check (
    status = 'draft'
    or (file_path is not null and rights_confirmed_at is not null)
  )
);

create index if not exists shop_products_listed_idx
  on public.shop_products (status, created_at desc);
create index if not exists shop_products_seller_idx
  on public.shop_products (seller_id, status);

drop trigger if exists shop_products_set_updated_at on public.shop_products;
create trigger shop_products_set_updated_at before update on public.shop_products
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Reading a submission the way a reviewer would.
--
-- The point is not to decide anything. It is to put the submissions that
-- need a careful look at the top of the queue: symbols of organisations
-- banned in Germany, somebody else's trademark, and attempts to move the
-- sale off Cîhan where there is no record of it.
-- ----------------------------------------------------------------------------
create or replace function public.shop_flags(p_title text, p_description text)
returns text[]
language plpgsql
immutable
set search_path = public
as $fn$
declare
  t text := lower(coalesce(p_title, '') || ' ' || coalesce(p_description, ''));
  out text[] := '{}';
begin
  -- Named organisations whose symbols are prohibited in Germany. The list
  -- belongs to the published policy and to a lawyer; this only flags.
  if t ~ '(\mpkk\M|\mykk\M|partiya karker|abdullah öcalan|\möcalan\M|\mapo\M)'
  then out := out || 'banned_symbol'::text; end if;

  -- Somebody else's work, named outright.
  if t ~ '(disney|marvel|nike|adidas|barcelona|real madrid|galatasaray|fenerbahçe|lego)'
  then out := out || 'trademark'::text; end if;

  -- Taking the sale somewhere with no record and no refund.
  if t ~ '(whatsapp|telegram|paypal\.me|western union|iban|send me|bitcoin|usdt)'
  then out := out || 'off_platform'::text; end if;

  return out;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 3. The guard: what a client sends is not what is stored.
-- ----------------------------------------------------------------------------
create or replace function public.shop_products_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- The SQL editor, the service role and administrators pass.
  if auth.uid() is null or public.is_admin(auth.uid()) then
    return new;
  end if;

  new.seller_id := coalesce(old.seller_id, auth.uid());
  new.flags := public.shop_flags(new.title, new.description);

  -- A seller decides one thing about status: whether it is still a draft
  -- or ready to be read. Everything past that is the reviewer's.
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      new.status := 'pending';
    end if;
  else
    if old.status in ('listed', 'held', 'withdrawn') then
      -- Editing something already decided sends it back to the queue
      -- rather than quietly changing what people were shown.
      if new.status = 'withdrawn' or old.status = 'withdrawn' then
        new.status := new.status;
      elsif
        new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.file_path is distinct from old.file_path
        or new.price_cents is distinct from old.price_cents
      then
        new.status := 'pending';
      else
        new.status := old.status;
      end if;
    elsif new.status not in ('draft', 'pending', 'withdrawn') then
      new.status := 'pending';
    end if;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;
  end if;

  return new;
end;
$fn$;

drop trigger if exists shop_products_guard_trigger on public.shop_products;
create trigger shop_products_guard_trigger
  before insert or update on public.shop_products
  for each row execute function public.shop_products_guard();

alter table public.shop_products enable row level security;

-- Anyone at all may see what is for sale, including somebody who has not
-- joined: a shelf nobody can look at sells nothing, and the free downloads
-- are the most shareable thing here.
drop policy if exists "Listed work is public" on public.shop_products;
create policy "Listed work is public" on public.shop_products for select
  using (
    status = 'listed'
    or seller_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- The same bar as the jobs board, for the same reason: money and identity.
-- An administrator may also put work up on somebody's behalf, which is how
-- the shelf is stocked before there is anybody to stock it.
drop policy if exists "Verified members sell" on public.shop_products;
create policy "Verified members sell" on public.shop_products for insert
  to authenticated with check (
    (seller_id = auth.uid() and public.is_verified(auth.uid()))
    or public.is_admin(auth.uid())
  );

drop policy if exists "Sellers edit their own work" on public.shop_products;
create policy "Sellers edit their own work" on public.shop_products for update
  to authenticated using (seller_id = auth.uid() or public.is_admin(auth.uid()))
  with check (seller_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Sellers remove their own work" on public.shop_products;
create policy "Sellers remove their own work" on public.shop_products for delete
  to authenticated using (seller_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Deciding a submission. Only an administrator, and the reason is kept.
-- ----------------------------------------------------------------------------
create or replace function public.decide_product(
  p_product uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_seller uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_admin';
  end if;

  select seller_id into v_seller
    from shop_products
   where id = p_product and status = 'pending'
   for update;

  if v_seller is null then
    raise exception 'not_pending';
  end if;

  update shop_products
     set status = case when p_approve then 'listed' else 'held' end,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = v_note
   where id = p_product;
end;
$fn$;

revoke all on function public.decide_product(uuid, boolean, text) from public;
grant execute on function public.decide_product(uuid, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Orders.
--
-- Written only by the server, after Stripe says it was paid for, or when a
-- free download is taken. The session id is unique, so a retried webhook
-- cannot sell the same thing twice.
-- ----------------------------------------------------------------------------
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.shop_products (id) on delete set null,
  -- Kept here as well: a payout must survive the work being withdrawn.
  seller_id uuid not null references auth.users (id) on delete cascade,

  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  seller_share_cents integer not null default 0 check (seller_share_cents >= 0),

  -- Cîhan is the merchant, so the order is the tax record.
  vat_cents integer not null default 0 check (vat_cents >= 0),
  vat_country text check (vat_country is null or char_length(vat_country) = 2),
  vat_rate numeric(5, 2) check (vat_rate is null or vat_rate between 0 and 100),

  -- What they actually bought, copied at the moment of sale. Not a join:
  -- a buyer paid for one file, so a seller editing their work later must
  -- not swap it underneath them, and a sale must keep working while the
  -- product sits back in the review queue.
  file_path text not null,

  stripe_session_id text unique,
  status text not null default 'paid'
    check (status in ('paid', 'refunded', 'cancelled')),

  -- Waived at checkout or not at all. A paid order without this is a
  -- fortnight of refunds waiting to happen, so the table refuses it.
  withdrawal_waived_at timestamptz,

  download_count integer not null default 0 check (download_count >= 0),
  last_downloaded_at timestamptz,
  -- How long the link keeps working. Generous: people change phones.
  expires_at timestamptz not null default now() + interval '365 days',
  created_at timestamptz not null default now(),

  constraint shop_orders_paid_waiver check (
    amount_cents = 0 or withdrawal_waived_at is not null
  ),
  constraint shop_orders_shares check (
    platform_fee_cents + seller_share_cents <= amount_cents
  )
);

create index if not exists shop_orders_buyer_idx
  on public.shop_orders (buyer_id, created_at desc);
create index if not exists shop_orders_seller_idx
  on public.shop_orders (seller_id, created_at desc);
create index if not exists shop_orders_product_idx
  on public.shop_orders (product_id);

alter table public.shop_orders enable row level security;

-- The buyer, and nobody else. Deliberately no policy for the seller: what
-- they are owed comes back as numbers from shop_sales(), never as a list
-- of people. An administrator can read orders for support and refunds.
drop policy if exists "Buyers read their own orders" on public.shop_orders;
create policy "Buyers read their own orders" on public.shop_orders for select
  to authenticated using (
    buyer_id = auth.uid() or public.is_admin(auth.uid())
  );

-- No insert, update or delete policy at all: only the server writes here.

-- ----------------------------------------------------------------------------
-- 6. What a seller is allowed to know: how many, and how much.
-- ----------------------------------------------------------------------------
create or replace function public.shop_sales(p_seller uuid)
returns table (
  product_id uuid,
  title text,
  sold integer,
  gross_cents bigint,
  earned_cents bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.title,
         count(o.id)::int,
         coalesce(sum(o.amount_cents), 0)::bigint,
         coalesce(sum(o.seller_share_cents), 0)::bigint
    from public.shop_products p
    left join public.shop_orders o
      on o.product_id = p.id and o.status = 'paid'
   where p.seller_id = p_seller
     and (p_seller = auth.uid() or public.is_admin(auth.uid()))
   group by p.id, p.title
   order by p.created_at desc;
$$;

revoke all on function public.shop_sales(uuid) from public;
grant execute on function public.shop_sales(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Settlement. Cîhan took the money, so Cîhan sends the share on.
-- ----------------------------------------------------------------------------
create table if not exists public.shop_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  -- The month being settled, as its first day.
  period date not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  stripe_transfer_id text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (seller_id, period)
);

alter table public.shop_payouts enable row level security;

drop policy if exists "Sellers read their own payouts" on public.shop_payouts;
create policy "Sellers read their own payouts" on public.shop_payouts for select
  to authenticated using (
    seller_id = auth.uid() or public.is_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 8. The files.
--
-- Two buckets, because the two halves have opposite jobs: a preview exists
-- to be seen by anyone, and the file exists to be seen by one person.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-previews',
  'shop-previews',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-files',
  'shop-files',
  false,
  104857600,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml',
    'application/zip', 'font/otf', 'font/ttf'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately not security definer: the order's own row-level security
-- decides whether this reader has an order, exactly as the voice-note
-- helper leans on the message's.
create or replace function public.can_download(p_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shop_orders o
     where o.file_path = p_name
       and o.buyer_id = auth.uid()
       and o.status = 'paid'
       and o.expires_at > now()
  );
$$;

revoke all on function public.can_download(text) from public, anon;
grant execute on function public.can_download(text) to authenticated;

drop policy if exists "Upload what you sell to your own folder" on storage.objects;
create policy "Upload what you sell to your own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('shop-files', 'shop-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Free work is readable by anyone, signed in or not.
--
-- This is the whole point of giving something away: a link to the flag pack
-- has to work when it arrives in a WhatsApp group, for somebody who has
-- never heard of Cîhan and is not about to make an account to see a flag.
-- Not security definer, so the product's own policy still decides — and it
-- only shows what is listed.
create or replace function public.is_free_download(p_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shop_products
     where file_path = p_name and price_cents = 0 and status = 'listed'
  );
$$;

revoke all on function public.is_free_download(text) from public;
grant execute on function public.is_free_download(text) to anon, authenticated;

drop policy if exists "Free work is for everyone" on storage.objects;
create policy "Free work is for everyone" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'shop-files' and public.is_free_download(name)
  );

-- Counting what was taken. No row per person, and nothing that says who.
create or replace function public.record_download(p_product uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update shop_products
     set downloads = downloads + 1
   where id = p_product and status = 'listed';
end;
$fn$;

revoke all on function public.record_download(uuid) from public;
grant execute on function public.record_download(uuid) to anon, authenticated;

drop policy if exists "Download what you bought" on storage.objects;
create policy "Download what you bought" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shop-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_download(name)
    )
  );

drop policy if exists "Replace your own shop files" on storage.objects;
create policy "Replace your own shop files" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('shop-files', 'shop-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Delete your own shop files" on storage.objects;
create policy "Delete your own shop files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('shop-files', 'shop-previews')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 9. A seller hears that something sold. The full list is repeated, so this
--    runs whatever else has or has not run before it.
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'message', 'group_message', 'like', 'comment', 'help_match',
    'ad_approved', 'ad_rejected', 'interpreter_match', 'give_match',
    'buddy_request', 'buddy_accepted', 'ticket_sold',
    'product_sold', 'product_listed', 'product_held'
  )
);
