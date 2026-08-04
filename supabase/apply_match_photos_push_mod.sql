-- Profile gallery photos + moderation ban + web push subscriptions.
-- Paste into Supabase SQL Editor (or apply pieces separately).

-- ========== Profile photos ==========
alter table public.profiles
  add column if not exists photos text[] not null default '{}';

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

create index if not exists profiles_is_banned_idx
  on public.profiles (is_banned)
  where is_banned = true;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable" on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Users upload profile photos to their folder" on storage.objects;
create policy "Users upload profile photos to their folder" on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their profile photos" on storage.objects;
create policy "Users update their profile photos" on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their profile photos" on storage.objects;
create policy "Users delete their profile photos" on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========== Web push subscriptions ==========
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users read own push subs" on public.push_subscriptions;
create policy "Users read own push subs" on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own push subs" on public.push_subscriptions;
create policy "Users insert own push subs" on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own push subs" on public.push_subscriptions;
create policy "Users delete own push subs" on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Admins can still read banned flag via existing profile policies for own row.
-- Banned users stay in DB but discovery should treat them as private (app-side).
