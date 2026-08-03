-- Event RSVPs — paste into Supabase SQL Editor and Run.
-- Same content as supabase/migrations/0015_event_rsvps.sql

create table if not exists public.event_rsvps (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('going', 'interested', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists event_rsvps_user_idx on public.event_rsvps (user_id);
create index if not exists event_rsvps_post_status_idx
  on public.event_rsvps (post_id, status);

drop trigger if exists event_rsvps_set_updated_at on public.event_rsvps;
create trigger event_rsvps_set_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();

alter table public.event_rsvps enable row level security;

drop policy if exists "RSVPs are viewable by everyone" on public.event_rsvps;
create policy "RSVPs are viewable by everyone" on public.event_rsvps for select
  using (true);

drop policy if exists "Users manage own RSVPs" on public.event_rsvps;
create policy "Users manage own RSVPs" on public.event_rsvps for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own RSVPs" on public.event_rsvps;
create policy "Users update own RSVPs" on public.event_rsvps for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own RSVPs" on public.event_rsvps;
create policy "Users delete own RSVPs" on public.event_rsvps for delete
  using (auth.uid() = user_id);
