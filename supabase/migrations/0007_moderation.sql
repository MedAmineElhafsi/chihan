-- 0007_moderation.sql — Phase 9: reports + admin flag

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Read the admin flag without tripping profile RLS.
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where user_id = uid), false);
$$;

-- Prevent a normal user from elevating themselves via a profile update.
-- (auth.uid() is null in the SQL editor / service role, so bootstrapping the
-- first admin from the dashboard is still allowed.)
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

-- Bootstrap your first admin (run once, replacing the user id):
--   update public.profiles set is_admin = true where user_id = '<your-user-id>';
