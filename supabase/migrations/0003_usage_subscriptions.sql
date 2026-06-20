-- 0003_usage_subscriptions.sql — Phase 4: freemium foundation
-- usage_events (rate limits) + subscriptions (entitlements, wired in Phase 8).

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_feature_idx
  on public.usage_events (user_id, feature, created_at);

alter table public.usage_events enable row level security;

drop policy if exists "Users can read their own usage" on public.usage_events;
create policy "Users can read their own usage" on public.usage_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can record their own usage" on public.usage_events;
create policy "Users can record their own usage" on public.usage_events for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- subscriptions — one per user; written only by the Stripe webhook
-- (service role bypasses RLS), readable by the owner.
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription" on public.subscriptions for select
  using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role (webhook) writes here.
