-- 0012_group_messages.sql — realtime chat inside community groups

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.group_members
    where group_id = gid and user_id = uid
  );
$$;

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_idx
  on public.group_messages (group_id, created_at);

alter table public.group_messages enable row level security;

drop policy if exists "Members read group messages" on public.group_messages;
create policy "Members read group messages" on public.group_messages for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Members send group messages" on public.group_messages;
create policy "Members send group messages" on public.group_messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_group_member(group_id, auth.uid())
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;
