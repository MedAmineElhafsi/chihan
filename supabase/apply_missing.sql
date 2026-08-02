-- Migrations manquantes pour le projet Cihan (czihcdhrzbhgsugdnyxx)
-- À coller telles quelles dans le SQL Editor de Supabase, puis Run.
-- Contenu combiné (idempotent) de : 0004_chat.sql + 0007_moderation.sql + 0008_professions.sql

-- ============================================================================
-- 0004_chat.sql — realtime 1:1 chat
-- ============================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index if not exists conv_participants_user_idx
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_participant(conv uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.conversation_participants
    where conversation_id = conv and user_id = uid
  );
$$;

create or replace function public.shares_conversation(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on cp1.conversation_id = cp2.conversation_id
    where cp1.user_id = a and cp2.user_id = b
  );
$$;

create or replace function public.find_direct_conversation(other uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select cp1.conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = auth.uid() and cp2.user_id = other
  limit 1;
$$;

create or replace function public.create_direct_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
  me uuid := auth.uid();
begin
  if me is null or other is null or me = other then
    raise exception 'invalid conversation';
  end if;
  select public.find_direct_conversation(other) into conv;
  if conv is not null then
    return conv;
  end if;
  insert into public.conversations default values returning id into conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (conv, me), (conv, other);
  return conv;
end;
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "View my conversations" on public.conversations;
create policy "View my conversations" on public.conversations for select
  using (public.is_conversation_participant(id, auth.uid()));

drop policy if exists "View participants of my conversations" on public.conversation_participants;
create policy "View participants of my conversations" on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Update my own participant row" on public.conversation_participants;
create policy "Update my own participant row" on public.conversation_participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "View messages in my conversations" on public.messages;
create policy "View messages in my conversations" on public.messages for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Send messages to my conversations" on public.messages;
create policy "Send messages to my conversations" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );

drop policy if exists "View conversation partners" on public.profiles;
create policy "View conversation partners" on public.profiles for select
  using (public.shares_conversation(user_id, auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end $$;

-- ============================================================================
-- 0007_moderation.sql — reports + admin flag
-- ============================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where user_id = uid), false);
$$;

create or replace function public.protect_profile_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin on public.profiles;
create trigger profiles_protect_admin before update on public.profiles
  for each row execute function public.protect_profile_admin();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (
    target_type in ('listing', 'post', 'comment', 'review', 'profile')
  ),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports" on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Admins can read reports" on public.reports;
create policy "Admins can read reports" on public.reports for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports for update
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============================================================================
-- 0008_professions.sql — profession sur les profils
-- ============================================================================

alter table public.profiles add column if not exists profession text;

create index if not exists profiles_profession_idx on public.profiles (profession);
