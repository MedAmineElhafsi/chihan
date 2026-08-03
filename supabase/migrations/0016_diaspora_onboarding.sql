-- Diaspora onboarding: origin region, interests, looking for / offering.

alter table public.profiles
  add column if not exists origin_region text;

alter table public.profiles
  add column if not exists interests text[] not null default '{}';

alter table public.profiles
  add column if not exists looking_for text[] not null default '{}';

alter table public.profiles
  add column if not exists offering text[] not null default '{}';

create index if not exists profiles_origin_region_idx
  on public.profiles (origin_region)
  where origin_region is not null;

create index if not exists profiles_looking_for_gin
  on public.profiles using gin (looking_for);

create index if not exists profiles_offering_gin
  on public.profiles using gin (offering);
