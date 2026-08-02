-- Who-viewed-me + verified badge — paste into Supabase SQL Editor and Run.
-- Same content as supabase/migrations/0011_profile_views_verified.sql

alter table public.profiles
  add column if not exists is_verified boolean not null default false;

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, viewer_user_id)
);

create index if not exists profile_views_profile_idx
  on public.profile_views (profile_id, created_at desc);

alter table public.profile_views enable row level security;

drop policy if exists "Viewers can record views" on public.profile_views;
create policy "Viewers can record views" on public.profile_views for insert
  with check (auth.uid() = viewer_user_id);

drop policy if exists "Viewers can refresh their view" on public.profile_views;
create policy "Viewers can refresh their view" on public.profile_views for update
  using (auth.uid() = viewer_user_id)
  with check (auth.uid() = viewer_user_id);

drop policy if exists "Owners read views of their profile" on public.profile_views;
create policy "Owners read views of their profile" on public.profile_views for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );
