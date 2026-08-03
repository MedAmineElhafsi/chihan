-- User blocks & mutes — paste into Supabase SQL Editor and Run.
-- Same content as supabase/migrations/0017_user_blocks_mutes.sql

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users read own blocks" on public.user_blocks;
create policy "Users read own blocks" on public.user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users insert own blocks" on public.user_blocks;
create policy "Users insert own blocks" on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users delete own blocks" on public.user_blocks;
create policy "Users delete own blocks" on public.user_blocks for delete
  using (auth.uid() = blocker_id);

create table if not exists public.user_mutes (
  muter_id uuid not null references auth.users (id) on delete cascade,
  muted_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create index if not exists user_mutes_muted_idx on public.user_mutes (muted_id);

alter table public.user_mutes enable row level security;

drop policy if exists "Users read own mutes" on public.user_mutes;
create policy "Users read own mutes" on public.user_mutes for select
  using (auth.uid() = muter_id);

drop policy if exists "Users insert own mutes" on public.user_mutes;
create policy "Users insert own mutes" on public.user_mutes for insert
  with check (auth.uid() = muter_id);

drop policy if exists "Users delete own mutes" on public.user_mutes;
create policy "Users delete own mutes" on public.user_mutes for delete
  using (auth.uid() = muter_id);
