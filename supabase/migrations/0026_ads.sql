-- ============================================================================
-- 0026 — Sponsored listings in Explore.
--
-- Whoever owns a business or professional listing can promote it in
-- Explore, between posts, labelled as sponsored: one ad per listing at a
-- time, free during launch, seven days from the moment an administrator
-- approves it. Nothing runs before that approval.
--
-- Every write goes through a function below, and the table has no insert,
-- update or delete policy at all: an owner cannot approve their own ad,
-- stretch its week, or touch its counters, because no path exists to do it.
-- The public never reads the table either. Explore asks running_ads() for
-- what to show, which returns the words on the card and nothing else, so one
-- business cannot read another's view counts.
-- ============================================================================

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  headline text not null
    check (char_length(btrim(headline)) between 3 and 80),
  body text
    check (body is null or char_length(body) <= 280),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'ended')),
  decision_note text
    check (decision_note is null or char_length(decision_note) <= 500),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An approved ad always knows its week.
  constraint ads_approved_window check (
    status <> 'approved'
    or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
  before update on public.ads
  for each row execute function public.set_updated_at();

-- One ad waiting or running per listing. An approved ad whose week is over
-- still counts until submit_ad() marks it ended, which it does first.
create unique index if not exists ads_one_active_per_listing
  on public.ads (listing_id)
  where status in ('pending', 'approved');

create index if not exists ads_running_idx
  on public.ads (ends_at)
  where status = 'approved';

create index if not exists ads_pending_idx
  on public.ads (created_at)
  where status = 'pending';

create index if not exists ads_listing_idx
  on public.ads (listing_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security: owners read their own ads (with their numbers),
-- administrators read everything. Nobody writes except through functions.
-- ----------------------------------------------------------------------------
alter table public.ads enable row level security;

revoke insert, update, delete on public.ads from anon, authenticated;

drop policy if exists "ads: owners read their own" on public.ads;
create policy "ads: owners read their own" on public.ads
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "ads: administrators read all" on public.ads;
create policy "ads: administrators read all" on public.ads
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- submit_ad — the owner of a listing asks for it to be promoted.
-- Errors are short codes the app turns into sentences.
-- ----------------------------------------------------------------------------
create or replace function public.submit_ad(
  p_listing uuid,
  p_headline text,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select owner_user_id into v_owner from listings where id = p_listing;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not_owner';
  end if;

  -- A finished week frees the slot.
  update ads
     set status = 'ended'
   where listing_id = p_listing
     and status = 'approved'
     and ends_at <= now();

  if exists (
    select 1 from ads
     where listing_id = p_listing and status in ('pending', 'approved')
  ) then
    raise exception 'already_active';
  end if;

  insert into ads (listing_id, owner_id, headline, body)
  values (
    p_listing,
    auth.uid(),
    btrim(p_headline),
    nullif(btrim(coalesce(p_body, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- withdraw_ad — the owner (or an administrator) stops an ad that is waiting
-- or running. A running ad's week ends now.
-- ----------------------------------------------------------------------------
create or replace function public.withdraw_ad(p_ad uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update ads
     set status = 'ended',
         ends_at = case
           when status = 'approved' then least(ends_at, now())
           else ends_at
         end
   where id = p_ad
     and status in ('pending', 'approved')
     and (owner_id = auth.uid() or public.is_admin(auth.uid()));

  if not found then
    raise exception 'not_withdrawable';
  end if;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- decide_ad — an administrator approves (the week starts now) or declines
-- (with a note the owner will read). Either way the owner is told.
-- ----------------------------------------------------------------------------
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

  if p_approve then
    update ads
       set status = 'approved',
           starts_at = now(),
           ends_at = now() + interval '7 days',
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
-- running_ads — what Explore may show right now: the words on the card and
-- the listing they point to. No counters, no notes, no owner.
-- ----------------------------------------------------------------------------
create or replace function public.running_ads(p_limit integer default 24)
returns table (
  id uuid,
  listing_id uuid,
  headline text,
  body text,
  ends_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $fn$
  select a.id, a.listing_id, a.headline, a.body, a.ends_at
    from ads a
   where a.status = 'approved'
     and a.starts_at <= now()
     and a.ends_at > now()
   order by a.starts_at desc
   limit least(greatest(coalesce(p_limit, 24), 1), 50);
$fn$;

-- ----------------------------------------------------------------------------
-- record_ad_event — a card was seen, or tapped. Counts only while the ad is
-- running, and never the owner looking at their own ad.
-- ----------------------------------------------------------------------------
create or replace function public.record_ad_event(p_ad uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_kind not in ('view', 'click') then
    return;
  end if;

  update ads
     set impressions = impressions + (case when p_kind = 'view' then 1 else 0 end),
         clicks = clicks + (case when p_kind = 'click' then 1 else 0 end)
   where id = p_ad
     and status = 'approved'
     and now() >= starts_at
     and now() < ends_at
     and owner_id is distinct from auth.uid();
end;
$fn$;

revoke all on function public.submit_ad(uuid, text, text) from public;
grant execute on function public.submit_ad(uuid, text, text) to authenticated;

revoke all on function public.withdraw_ad(uuid) from public;
grant execute on function public.withdraw_ad(uuid) to authenticated;

revoke all on function public.decide_ad(uuid, boolean, text) from public;
grant execute on function public.decide_ad(uuid, boolean, text) to authenticated;

revoke all on function public.running_ads(integer) from public;
grant execute on function public.running_ads(integer) to anon, authenticated;

revoke all on function public.record_ad_event(uuid, text) from public;
grant execute on function public.record_ad_event(uuid, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Two notification types: an owner hears when their ad goes live or is
-- declined. (Includes help_match from 0025, so the order they run in does
-- not matter.)
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'message', 'group_message', 'like', 'comment', 'help_match',
      'ad_approved', 'ad_rejected'
    )
  );
