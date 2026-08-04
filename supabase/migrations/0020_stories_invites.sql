-- Stories (24h) + app email invites.
-- Paste into Supabase SQL Editor and Run.

-- ========== Stories ==========
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  media_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_active_idx
  on public.stories (expires_at desc, created_at desc);

create index if not exists stories_author_idx
  on public.stories (author_id, created_at desc);

alter table public.stories enable row level security;

drop policy if exists "Active stories are viewable" on public.stories;
create policy "Active stories are viewable" on public.stories for select
  using (expires_at > now());

drop policy if exists "Users create own stories" on public.stories;
create policy "Users create own stories" on public.stories for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users delete own stories" on public.stories;
create policy "Users delete own stories" on public.stories for delete
  using (auth.uid() = author_id);

-- Reuse post-media bucket with stories/ prefix (policies already folder-scoped by uid).

-- ========== App invites (email / link) ==========
create table if not exists public.app_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

create index if not exists app_invites_inviter_idx
  on public.app_invites (inviter_id, created_at desc);

create index if not exists app_invites_email_idx
  on public.app_invites (lower(email));

alter table public.app_invites enable row level security;

drop policy if exists "Users read own invites" on public.app_invites;
create policy "Users read own invites" on public.app_invites for select
  using (auth.uid() = inviter_id);

drop policy if exists "Users create own invites" on public.app_invites;
create policy "Users create own invites" on public.app_invites for insert
  with check (auth.uid() = inviter_id);

drop policy if exists "Users update own invites" on public.app_invites;
create policy "Users update own invites" on public.app_invites for update
  using (auth.uid() = inviter_id);

-- Public token lookup via service role in app (no open select by token for anon).
