-- 0009_notifications.sql — in-app notifications (messages, likes, comments)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('message', 'group_message', 'like', 'comment')),
  entity_id uuid,
  link text not null default '/',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- An actor can notify someone else (never themselves).
drop policy if exists "Actors can create notifications" on public.notifications;
create policy "Actors can create notifications" on public.notifications for insert
  with check (
    auth.uid() = actor_id
    and auth.uid() is distinct from user_id
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
