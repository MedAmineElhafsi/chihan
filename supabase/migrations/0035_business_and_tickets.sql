-- ============================================================================
-- 0035 — Two ways for Cîhan to earn, and for its members to.
--
-- 1. A business plan. A shop or a professional pays a monthly fee and gets
--    what a business actually wants: longer runs for the ads they already
--    submit (thirty days instead of seven), and numbers — how often their
--    listing was opened, and how often someone tapped call, WhatsApp,
--    the website or directions.
--
-- 2. Event tickets. An organiser sells tickets for their event and is paid
--    directly by Stripe into their own account; Cîhan takes a small fee.
--    The money never sits with Cîhan, and no card details ever touch it.
--
-- Everything here waits for Stripe keys. Without them the plan cannot be
-- bought, tickets cannot be sold, and every surface hides itself — the
-- tables simply stay empty.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. What a listing's own numbers are made of.
--
-- A day and a kind per listing, counted — not one row per visit. There is
-- nothing in here about who: a business learns that forty people opened
-- its page on Tuesday, never which forty.
-- ----------------------------------------------------------------------------
create table if not exists public.listing_events (
  listing_id uuid not null references public.listings (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (
    kind in ('view', 'call', 'whatsapp', 'website', 'directions', 'share')
  ),
  count integer not null default 0 check (count >= 0),
  primary key (listing_id, day, kind)
);

create index if not exists listing_events_day_idx
  on public.listing_events (listing_id, day desc);

alter table public.listing_events enable row level security;

-- Only the owner of the listing (or an administrator) reads them.
drop policy if exists "Owners read their listing's numbers" on public.listing_events;
create policy "Owners read their listing's numbers" on public.listing_events
  for select to authenticated using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and l.owner_user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- No write policy: counting goes through the function below, so nobody can
-- invent their own numbers by writing rows.
create or replace function public.record_listing_event(
  p_listing uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_kind not in ('view', 'call', 'whatsapp', 'website', 'directions', 'share') then
    return;
  end if;
  -- A business watching its own page is not a customer.
  if exists (
    select 1 from listings
     where id = p_listing and owner_user_id = auth.uid()
  ) then
    return;
  end if;

  insert into listing_events (listing_id, day, kind, count)
  values (p_listing, current_date, p_kind, 1)
  on conflict (listing_id, day, kind)
  do update set count = listing_events.count + 1;
exception
  when foreign_key_violation then
    return;
end;
$fn$;

revoke all on function public.record_listing_event(uuid, text) from public;
grant execute on function public.record_listing_event(uuid, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. The business plan. Written only by the Stripe webhook (service role),
--    read by its owner.
-- ----------------------------------------------------------------------------
create table if not exists public.business_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists business_subscriptions_set_updated_at on public.business_subscriptions;
create trigger business_subscriptions_set_updated_at
  before update on public.business_subscriptions
  for each row execute function public.set_updated_at();

alter table public.business_subscriptions enable row level security;

drop policy if exists "Read your own business plan" on public.business_subscriptions;
create policy "Read your own business plan" on public.business_subscriptions
  for select to authenticated using (user_id = auth.uid());

create or replace function public.has_business(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_subscriptions
     where user_id = uid
       and status in ('active', 'trialing')
       and (current_period_end is null or current_period_end > now())
  );
$$;

revoke all on function public.has_business(uuid) from public;
grant execute on function public.has_business(uuid) to authenticated;

-- An approved ad runs a week, or a month for a business. Same approval,
-- same words, longer run — that is what the plan buys.
create or replace function public.decide_ad(
  p_ad uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
  v_listing uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_days integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_admin';
  end if;

  select owner_id, listing_id into v_owner, v_listing
    from ads
   where id = p_ad and status = 'pending'
   for update;

  if v_owner is null then
    raise exception 'not_pending';
  end if;

  v_days := case when public.has_business(v_owner) then 30 else 7 end;

  if p_approve then
    update ads
       set status = 'approved',
           starts_at = now(),
           ends_at = now() + make_interval(days => v_days),
           decided_by = auth.uid(),
           decided_at = now(),
           decision_note = v_note
     where id = p_ad;
  else
    update ads
       set status = 'rejected',
           decided_by = auth.uid(),
           decided_at = now(),
           decision_note = v_note
     where id = p_ad;
  end if;

  if v_owner <> auth.uid() then
    insert into notifications (user_id, actor_id, type, entity_id, link)
    values (
      v_owner,
      auth.uid(),
      case when p_approve then 'ad_approved' else 'ad_rejected' end,
      v_listing,
      '/directory/' || v_listing
    );
  end if;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 3. Tickets.
--
-- An event can carry a price and a number of places. The organiser is paid
-- by Stripe into their own connected account, so the money is theirs from
-- the first second and Cîhan is not holding anyone else's.
-- ----------------------------------------------------------------------------
alter table public.posts
  add column if not exists ticket_price_cents integer,
  add column if not exists ticket_capacity integer,
  add column if not exists ticket_currency text not null default 'eur';

alter table public.posts drop constraint if exists posts_tickets_check;
alter table public.posts add constraint posts_tickets_check check (
  (ticket_price_cents is null and ticket_capacity is null)
  or (
    type = 'event'
    and ticket_price_cents >= 100
    and ticket_price_cents <= 100000000
    and ticket_capacity between 1 and 100000
  )
);

-- Where an organiser's money goes. Written by the server (service role)
-- from what Stripe says about the account; read by its owner.
create table if not exists public.payout_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_account_id text unique,
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists payout_accounts_set_updated_at on public.payout_accounts;
create trigger payout_accounts_set_updated_at
  before update on public.payout_accounts
  for each row execute function public.set_updated_at();

alter table public.payout_accounts enable row level security;

drop policy if exists "Read your own payout account" on public.payout_accounts;
create policy "Read your own payout account" on public.payout_accounts
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.posts (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 10),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  -- What the buyer shows at the door.
  code text not null unique,
  status text not null default 'paid'
    check (status in ('paid', 'refunded', 'cancelled')),
  stripe_session_id text unique,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_event_idx on public.tickets (event_id, status);
create index if not exists tickets_buyer_idx on public.tickets (buyer_id, created_at desc);

alter table public.tickets enable row level security;

drop policy if exists "Buyers and organisers read tickets" on public.tickets;
create policy "Buyers and organisers read tickets" on public.tickets for select
  to authenticated using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.posts p
       where p.id = event_id and p.author_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- No insert, update or delete policy: only the webhook (service role)
-- writes a ticket, and only after Stripe says it was paid for.

create or replace function public.tickets_sold(p_event uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(quantity), 0)::int
    from public.tickets
   where event_id = p_event and status = 'paid';
$$;

revoke all on function public.tickets_sold(uuid) from public;
grant execute on function public.tickets_sold(uuid) to anon, authenticated;

-- The organiser at the door: one code, checked once.
create or replace function public.check_in_ticket(p_code text)
returns table (ok boolean, reason text, quantity integer)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_ticket record;
begin
  select t.*, p.author_id
    into v_ticket
    from tickets t
    join posts p on p.id = t.event_id
   where upper(t.code) = upper(btrim(p_code))
   for update;

  if v_ticket is null then
    return query select false, 'not_found', 0;
    return;
  end if;
  if v_ticket.author_id <> auth.uid() then
    return query select false, 'not_yours', 0;
    return;
  end if;
  if v_ticket.status <> 'paid' then
    return query select false, v_ticket.status, 0;
    return;
  end if;
  if v_ticket.checked_in_at is not null then
    return query select false, 'already_used', v_ticket.quantity;
    return;
  end if;

  update tickets set checked_in_at = now() where id = v_ticket.id;
  return query select true, 'ok', v_ticket.quantity;
end;
$fn$;

revoke all on function public.check_in_ticket(text) from public;
grant execute on function public.check_in_ticket(text) to authenticated;

-- The same count for a screenful of events at once, so a feed asks once.
create or replace function public.tickets_sold_many(p_events uuid[])
returns table (event_id uuid, sold integer)
language sql
stable
security definer
set search_path = public
as $$
  select t.event_id, coalesce(sum(t.quantity), 0)::int
    from public.tickets t
   where t.event_id = any(p_events) and t.status = 'paid'
   group by t.event_id;
$$;

revoke all on function public.tickets_sold_many(uuid[]) from public;
grant execute on function public.tickets_sold_many(uuid[]) to anon, authenticated;

-- An organiser hears when a ticket is bought.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'message', 'group_message', 'like', 'comment', 'help_match',
    'ad_approved', 'ad_rejected', 'interpreter_match', 'give_match',
    'buddy_request', 'buddy_accepted', 'ticket_sold'
  )
);
