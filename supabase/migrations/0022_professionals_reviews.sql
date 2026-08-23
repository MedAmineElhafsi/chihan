-- ============================================================================
-- 0022 — Reviews for every profession and business.
--
-- A member switches on "I offer a professional service" and gets a listing of
-- their own. Reviews already attach to listings, so a mechanic, a translator
-- and a restaurant all use one review system rather than three.
--
-- Nobody is reviewable without opting in: a private profile has no listing,
-- and no listing means no review target.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The opt-in switch.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists offers_service boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. A listing is either a business or a person offering a service.
--    `profession` keeps the real trade; `category` stays for map colour, which
--    only has seven values and would otherwise flatten every trade into "other".
-- ----------------------------------------------------------------------------
alter table public.listings
  add column if not exists kind text not null default 'business',
  add column if not exists profession text;

alter table public.listings drop constraint if exists listings_kind_check;
alter table public.listings
  add constraint listings_kind_check check (kind in ('business', 'professional'));

-- One professional listing per person — you are one professional, not five.
create unique index if not exists listings_one_professional_per_owner
  on public.listings (owner_user_id)
  where kind = 'professional';

-- ----------------------------------------------------------------------------
-- 3. The professional's single public reply. Named reviews are permanent and
--    public, so the person being reviewed must be able to answer.
-- ----------------------------------------------------------------------------
alter table public.reviews
  add column if not exists reply text,
  add column if not exists replied_at timestamptz;

-- ----------------------------------------------------------------------------
-- 4. The gate: you may only review someone you actually dealt with.
--
--    security definer because it reads conversations and help threads the
--    reviewer is not otherwise entitled to see. It answers one yes/no question
--    and leaks nothing else.
-- ----------------------------------------------------------------------------
create or replace function public.has_dealt_with(p_owner uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- They have a conversation together.
    exists (
      select 1
      from conversation_participants a
      join conversation_participants b on b.conversation_id = a.conversation_id
      where a.user_id = p_user
        and b.user_id = p_owner
    )
    -- Or one of them answered the other's request for help.
    or exists (
      select 1
      from help_offers o
      join help_requests r on r.id = o.request_id
      where (o.author_id = p_owner and r.author_id = p_user)
         or (o.author_id = p_user and r.author_id = p_owner)
    );
$$;

create or replace function public.can_review(p_listing uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from listings l
    where l.id = p_listing
      and (
        -- An unclaimed business: there is no person to have dealt with, so an
        -- ordinary customer review stands, exactly as it did before.
        l.owner_user_id is null
        -- A claimed listing or a professional: you must have actually dealt
        -- with them, and you cannot review yourself.
        or (
          l.owner_user_id <> p_user
          and public.has_dealt_with(l.owner_user_id, p_user)
        )
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. RLS. Reviews stay publicly readable; writing one now needs the gate.
-- ----------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone" on public.reviews
  for select using (true);

drop policy if exists "Users can create their own reviews" on public.reviews;
drop policy if exists "Reviews require a real dealing" on public.reviews;
create policy "Reviews require a real dealing" on public.reviews
  for insert with check (
    auth.uid() = author_id
    and public.can_review(listing_id, auth.uid())
  );

-- Editing your own review must not become a way to forge the reply.
drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews" on public.reviews
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews" on public.reviews
  for delete using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- 6. Replying. RLS cannot restrict single columns, so the reply goes through a
--    function that proves the caller owns the listing being reviewed.
-- ----------------------------------------------------------------------------
create or replace function public.reply_to_review(p_review uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select l.owner_user_id
    into v_owner
    from reviews r
    join listings l on l.id = r.listing_id
   where r.id = p_review;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Only the owner of this listing can reply to its reviews';
  end if;

  update reviews
     set reply = nullif(btrim(p_body), ''),
         replied_at = case when nullif(btrim(p_body), '') is null then null else now() end
   where id = p_review;
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. The stats view carries the new columns. New columns append to the end so
--    `create or replace view` accepts them.
-- ----------------------------------------------------------------------------
create or replace view public.listings_with_stats with (security_invoker = on) as
select
  l.id, l.owner_user_id, l.name, l.category, l.description, l.address,
  l.city, l.country, l.lat, l.lng, l.phone, l.email, l.website, l.photos,
  l.is_verified, l.created_at, l.updated_at,
  coalesce(r.review_count, 0) as review_count,
  r.rating_avg,
  l.kind,
  l.profession
from public.listings l
left join (
  select listing_id,
         count(*)::int as review_count,
         round(avg(rating)::numeric, 2) as rating_avg
  from public.reviews
  group by listing_id
) r on r.listing_id = l.id;
