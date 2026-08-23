-- ============================================================================
-- 0023 — Private groups, and verification that means something.
--
-- Private is enforced in the database, not the interface. A non-member cannot
-- read a private group row, its membership, or its messages — so a guessed
-- URL, a stale link and a direct API call all fail the same way.
--
-- The column defaults to false so no existing group silently disappears. New
-- groups are created private by the form; changing an existing one stays the
-- owner decision, not this migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Private groups.
-- ----------------------------------------------------------------------------
alter table public.community_groups
  add column if not exists is_private boolean not null default false;

-- `is_group_member` is security definer (0012), so these policies can consult
-- membership without the group -> member -> group recursion that would
-- otherwise make Postgres refuse the query.
drop policy if exists "Groups are viewable by everyone" on public.community_groups;
drop policy if exists "Public groups, or private ones you belong to" on public.community_groups;
create policy "Public groups, or private ones you belong to"
  on public.community_groups for select using (
    is_private = false
    or created_by = auth.uid()
    or public.is_group_member(id, auth.uid())
  );

-- Membership of a private group is itself private: who is in it should not be
-- readable by people who cannot see the group.
drop policy if exists "Members are viewable by everyone" on public.group_members;
drop policy if exists "Membership follows group visibility" on public.group_members;
create policy "Membership follows group visibility"
  on public.group_members for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.community_groups g
      where g.id = group_id
        and (
          g.is_private = false
          or g.created_by = auth.uid()
          or public.is_group_member(g.id, auth.uid())
        )
    )
  );

-- You cannot add yourself to a private group. Invitations are inserted by the
-- inviter, whose own membership is checked here.
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Join public groups, or be added by a member" on public.group_members;
create policy "Join public groups, or be added by a member"
  on public.group_members for insert with check (
    -- Joining a public group yourself.
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.community_groups g
        where g.id = group_id and g.is_private = false
      )
    )
    -- Or being added by someone already inside.
    or public.is_group_member(group_id, auth.uid())
    -- Or by the owner, who may not have a membership row yet.
    or exists (
      select 1 from public.community_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Verification requests.
--
-- The badge is a promise to whoever is deciding who to trust, so it is granted
-- by a human in the admin queue and never by the applicant.
-- ----------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_url text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

-- One open request at a time; a decided one can be replaced by a new attempt.
create unique index if not exists verification_one_pending_per_user
  on public.verification_requests (user_id)
  where status = 'pending';

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at desc);

alter table public.verification_requests enable row level security;

-- Applicants see only their own. Admins see everything.
drop policy if exists "See your own verification request" on public.verification_requests;
create policy "See your own verification request"
  on public.verification_requests for select using (
    user_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists "Apply for verification yourself" on public.verification_requests;
create policy "Apply for verification yourself"
  on public.verification_requests for insert
  with check (user_id = auth.uid());

-- Only an admin decides. Deliberately no policy letting applicants update their
-- own row: that would be a way to approve yourself.
drop policy if exists "Admins decide verification" on public.verification_requests;
create policy "Admins decide verification"
  on public.verification_requests for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Withdraw your pending request" on public.verification_requests;
create policy "Withdraw your pending request"
  on public.verification_requests for delete
  using (user_id = auth.uid() and status = 'pending');

-- ----------------------------------------------------------------------------
-- 3. Deciding a request. security definer because granting the badge writes to
--    profiles, which the admin does not otherwise own.
-- ----------------------------------------------------------------------------
create or replace function public.decide_verification(
  p_request uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an administrator can decide a verification request';
  end if;

  select user_id into v_user
    from verification_requests
   where id = p_request and status = 'pending';

  if v_user is null then
    raise exception 'No pending verification request with that id';
  end if;

  update verification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = p_note
   where id = p_request;

  if p_approve then
    update profiles set is_verified = true where user_id = v_user;
  end if;
end;
$fn$;

revoke all on function public.decide_verification(uuid, boolean, text) from public;
grant execute on function public.decide_verification(uuid, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Documents bucket — private. Identity papers must never be public, so
--    unlike listing photos this bucket has no public read policy: only the
--    owner and an admin can reach a file.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists "Upload your own verification document" on storage.objects;
create policy "Upload your own verification document" on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Read your own verification document" on storage.objects;
create policy "Read your own verification document" on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "Delete your own verification document" on storage.objects;
create policy "Delete your own verification document" on storage.objects for delete
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 5. The stats view carries the flag. security_invoker is already on, so the
--    select policy above filters the view too — a private group is absent from
--    these rows entirely, not merely marked.
-- ----------------------------------------------------------------------------
create or replace view public.community_groups_with_stats
with (security_invoker = true) as
select
  g.id,
  g.name,
  g.description,
  g.city,
  g.country,
  g.lat,
  g.lng,
  g.created_by,
  g.created_at,
  g.updated_at,
  count(m.user_id)::int as member_count,
  g.is_private
from public.community_groups g
left join public.group_members m on m.group_id = g.id
group by g.id;
