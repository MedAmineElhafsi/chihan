-- ============================================================================
-- 0033 — The buddy programme.
--
-- Someone who arrived last month has questions that someone who arrived
-- three years ago can answer in an afternoon: which form, which queue,
-- which tram, how to ask a landlord. Pairing them is the oldest integration
-- programme there is, and the one that works.
--
-- Safety is the whole design:
--   * a buddy must be verified — an administrator saw an identity document
--     (0023, and 0031 made that mean something);
--   * both sides accept the buddy promise, and the promise is recorded;
--   * a buddy takes at most three newcomers, so nobody collects people;
--   * blocks are respected in both directions;
--   * either side can end it at any moment, and "I felt uncomfortable" is
--     one tap from reporting;
--   * nothing is written directly: every change goes through a function
--     below, so no request, acceptance or count can be forged.
-- ============================================================================

create table if not exists public.buddy_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('newcomer', 'mentor')),
  -- What they want help with, or can help with.
  areas text[] not null default '{}' check (cardinality(areas) <= 6),
  about text check (about is null or char_length(about) <= 500),
  -- Mentors only: how many newcomers at once.
  capacity int not null default 1 check (capacity between 1 and 3),
  -- Paused rather than deleted, so a buddy can take a break.
  active boolean not null default true,
  -- When they accepted the buddy promise. Not null: there is no way in
  -- without it.
  agreed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buddy_profiles_mentors_idx
  on public.buddy_profiles (role, active);

drop trigger if exists buddy_profiles_set_updated_at on public.buddy_profiles;
create trigger buddy_profiles_set_updated_at before update on public.buddy_profiles
  for each row execute function public.set_updated_at();

alter table public.buddy_profiles enable row level security;

drop policy if exists "Join the programme yourself" on public.buddy_profiles;
create policy "Join the programme yourself" on public.buddy_profiles for insert
  to authenticated with check (
    user_id = auth.uid()
    and (role <> 'mentor' or public.is_verified(auth.uid()))
  );

drop policy if exists "Edit your own buddy entry" on public.buddy_profiles;
create policy "Edit your own buddy entry" on public.buddy_profiles for update
  to authenticated using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (role <> 'mentor' or public.is_verified(auth.uid()))
  );

drop policy if exists "Leave the programme" on public.buddy_profiles;
create policy "Leave the programme" on public.buddy_profiles for delete
  to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Pairs.
-- ----------------------------------------------------------------------------
create table if not exists public.buddy_pairs (
  id uuid primary key default gen_random_uuid(),
  newcomer_id uuid not null references auth.users (id) on delete cascade,
  mentor_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'active', 'declined', 'ended')),
  message text check (message is null or char_length(message) <= 500),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references auth.users (id) on delete set null,
  end_reason text check (
    end_reason is null
    or end_reason in ('done', 'no_contact', 'uncomfortable', 'other')
  ),
  constraint buddy_pairs_two_people check (newcomer_id <> mentor_id)
);

-- One open pair between the same two people.
create unique index if not exists buddy_pairs_one_open
  on public.buddy_pairs (newcomer_id, mentor_id)
  where status in ('requested', 'active');

create index if not exists buddy_pairs_mentor_idx
  on public.buddy_pairs (mentor_id, status);
create index if not exists buddy_pairs_newcomer_idx
  on public.buddy_pairs (newcomer_id, status);

alter table public.buddy_pairs enable row level security;

-- A mentor's entry is visible to members looking for a buddy. A newcomer's
-- is visible to themselves and to a mentor they have written to — being new
-- and needing help is not something to publish.
drop policy if exists "See buddies you may see" on public.buddy_profiles;
create policy "See buddies you may see" on public.buddy_profiles for select
  to authenticated using (
    user_id = auth.uid()
    or (role = 'mentor' and active)
    or exists (
      select 1 from public.buddy_pairs p
       where p.newcomer_id = buddy_profiles.user_id
         and p.mentor_id = auth.uid()
    )
  );

drop policy if exists "See your own buddyships" on public.buddy_pairs;
create policy "See your own buddyships" on public.buddy_pairs for select
  to authenticated using (
    newcomer_id = auth.uid()
    or mentor_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- No insert, update or delete policy at all: the functions below are the
-- only way, and they check what a policy cannot.

-- How many newcomers a mentor is looking after right now.
create or replace function public.buddy_active_count(p_mentor uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.buddy_pairs
   where mentor_id = p_mentor and status = 'active';
$$;

-- How many people this buddy has been there for, ever. A trust signal on
-- their card, and nothing else about those people.
create or replace function public.buddy_helped_count(p_mentor uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.buddy_pairs
   where mentor_id = p_mentor and status in ('active', 'ended');
$$;

revoke all on function public.buddy_active_count(uuid) from public;
revoke all on function public.buddy_helped_count(uuid) from public;
grant execute on function public.buddy_active_count(uuid) to authenticated;
grant execute on function public.buddy_helped_count(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- request_buddy — a newcomer asks one buddy. Short codes, sentences in the app.
-- ----------------------------------------------------------------------------
create or replace function public.request_buddy(p_mentor uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then raise exception 'not_signed_in'; end if;
  if v_me = p_mentor then raise exception 'not_yourself'; end if;

  if not exists (
    select 1 from buddy_profiles
     where user_id = v_me and role = 'newcomer'
  ) then
    raise exception 'not_a_newcomer';
  end if;

  if not exists (
    select 1 from buddy_profiles
     where user_id = p_mentor and role = 'mentor' and active
  ) or not public.is_verified(p_mentor) then
    raise exception 'not_available';
  end if;

  -- A block in either direction ends it here.
  if exists (
    select 1 from user_blocks
     where (blocker_id = v_me and blocked_id = p_mentor)
        or (blocker_id = p_mentor and blocked_id = v_me)
  ) then
    raise exception 'not_available';
  end if;

  if public.buddy_active_count(p_mentor) >=
     (select capacity from buddy_profiles where user_id = p_mentor) then
    raise exception 'buddy_full';
  end if;

  if exists (
    select 1 from buddy_pairs
     where newcomer_id = v_me and status = 'active'
  ) then
    raise exception 'already_paired';
  end if;

  if (
    select count(*) from buddy_pairs
     where newcomer_id = v_me and status = 'requested'
  ) >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into buddy_pairs (newcomer_id, mentor_id, message)
  values (v_me, p_mentor, nullif(btrim(coalesce(p_message, '')), ''))
  returning id into v_id;

  insert into notifications (user_id, actor_id, type, entity_id, link)
  values (p_mentor, v_me, 'buddy_request', v_id, '/buddies');

  return v_id;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- respond_buddy — the buddy accepts or declines.
-- ----------------------------------------------------------------------------
create or replace function public.respond_buddy(p_pair uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := auth.uid();
  v_newcomer uuid;
begin
  select newcomer_id into v_newcomer
    from buddy_pairs
   where id = p_pair and mentor_id = v_me and status = 'requested'
   for update;
  if v_newcomer is null then raise exception 'not_pending'; end if;

  if p_accept then
    if public.buddy_active_count(v_me) >=
       (select capacity from buddy_profiles where user_id = v_me) then
      raise exception 'buddy_full';
    end if;
    update buddy_pairs
       set status = 'active', responded_at = now()
     where id = p_pair;
    insert into notifications (user_id, actor_id, type, entity_id, link)
    values (v_newcomer, v_me, 'buddy_accepted', p_pair, '/buddies');
  else
    update buddy_pairs
       set status = 'declined', responded_at = now()
     where id = p_pair;
  end if;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- end_buddy — either side, at any time, without having to explain.
-- ----------------------------------------------------------------------------
create or replace function public.end_buddy(p_pair uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := auth.uid();
begin
  update buddy_pairs
     set status = 'ended',
         ended_at = now(),
         ended_by = v_me,
         end_reason = case
           when p_reason in ('done', 'no_contact', 'uncomfortable', 'other')
           then p_reason else null end
   where id = p_pair
     and status in ('requested', 'active')
     and (newcomer_id = v_me or mentor_id = v_me);

  if not found then raise exception 'not_yours'; end if;
end;
$fn$;

revoke all on function public.request_buddy(uuid, text) from public;
revoke all on function public.respond_buddy(uuid, boolean) from public;
revoke all on function public.end_buddy(uuid, text) from public;
grant execute on function public.request_buddy(uuid, text) to authenticated;
grant execute on function public.respond_buddy(uuid, boolean) to authenticated;
grant execute on function public.end_buddy(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Two more shoulder-taps. The full list is repeated, so this runs whatever
-- else has or has not run before it.
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'message', 'group_message', 'like', 'comment', 'help_match',
    'ad_approved', 'ad_rejected', 'interpreter_match', 'give_match',
    'buddy_request', 'buddy_accepted'
  )
);
