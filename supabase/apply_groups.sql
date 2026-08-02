-- Groups migration — paste into Supabase SQL Editor and Run.
-- Same content as supabase/migrations/0010_groups.sql

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  location geography (Point, 4326),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists community_groups_set_updated_at on public.community_groups;
create trigger community_groups_set_updated_at before update on public.community_groups
  for each row execute function public.set_updated_at();

drop trigger if exists community_groups_set_location on public.community_groups;
create trigger community_groups_set_location before insert or update of lat, lng on public.community_groups
  for each row execute function public.set_profile_location();

create index if not exists community_groups_location_gix
  on public.community_groups using gist (location);
create index if not exists community_groups_country_idx
  on public.community_groups (country);

create table if not exists public.group_members (
  group_id uuid not null references public.community_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

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
  count(m.user_id)::int as member_count
from public.community_groups g
left join public.group_members m on m.group_id = g.id
group by g.id;

alter table public.community_groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "Groups are viewable by everyone" on public.community_groups;
create policy "Groups are viewable by everyone" on public.community_groups for select
  using (true);

drop policy if exists "Authenticated users create groups" on public.community_groups;
create policy "Authenticated users create groups" on public.community_groups for insert
  with check (auth.uid() = created_by);

drop policy if exists "Owners update their groups" on public.community_groups;
create policy "Owners update their groups" on public.community_groups for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "Owners delete their groups" on public.community_groups;
create policy "Owners delete their groups" on public.community_groups for delete
  using (auth.uid() = created_by);

drop policy if exists "Members are viewable by everyone" on public.group_members;
create policy "Members are viewable by everyone" on public.group_members for select
  using (true);

drop policy if exists "Users can join groups" on public.group_members;
create policy "Users can join groups" on public.group_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can leave groups" on public.group_members;
create policy "Users can leave groups" on public.group_members for delete
  using (
    auth.uid() = user_id
    and role <> 'owner'
  );
