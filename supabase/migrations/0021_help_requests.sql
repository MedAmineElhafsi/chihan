-- 0021_help_requests.sql — the core loop: newcomers asking for practical help.
--
-- Visibility note: unlike listings or news, a help request exposes that someone
-- is vulnerable ("I need a room", "I need help at the Ausländerbehörde").
-- These are therefore readable by **signed-in members only**, never anonymously.

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  category text not null check (
    category in (
      'housing','paperwork','work','language','health',
      'education','family','legal','transport','other'
    )
  ),
  urgency text not null default 'normal'
    check (urgency in ('normal','soon','urgent')),
  city text,
  country text,
  status text not null default 'open'
    check (status in ('open','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists help_requests_open_idx
  on public.help_requests (status, created_at desc);
create index if not exists help_requests_city_idx on public.help_requests (city);
create index if not exists help_requests_category_idx
  on public.help_requests (category);

drop trigger if exists help_requests_set_updated_at on public.help_requests;
create trigger help_requests_set_updated_at before update on public.help_requests
  for each row execute function public.set_updated_at();

-- Replies: someone offering to help.
create table if not exists public.help_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists help_offers_request_idx
  on public.help_offers (request_id, created_at);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.help_requests enable row level security;
alter table public.help_offers enable row level security;

drop policy if exists "Members can read help requests" on public.help_requests;
create policy "Members can read help requests" on public.help_requests for select
  to authenticated using (true);

drop policy if exists "Users create their own requests" on public.help_requests;
create policy "Users create their own requests" on public.help_requests for insert
  to authenticated with check (auth.uid() = author_id);

drop policy if exists "Users update their own requests" on public.help_requests;
create policy "Users update their own requests" on public.help_requests for update
  to authenticated using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users delete their own requests" on public.help_requests;
create policy "Users delete their own requests" on public.help_requests for delete
  to authenticated using (auth.uid() = author_id);

drop policy if exists "Members can read offers" on public.help_offers;
create policy "Members can read offers" on public.help_offers for select
  to authenticated using (true);

drop policy if exists "Users create their own offers" on public.help_offers;
create policy "Users create their own offers" on public.help_offers for insert
  to authenticated with check (auth.uid() = author_id);

drop policy if exists "Users delete their own offers" on public.help_offers;
create policy "Users delete their own offers" on public.help_offers for delete
  to authenticated using (auth.uid() = author_id);
