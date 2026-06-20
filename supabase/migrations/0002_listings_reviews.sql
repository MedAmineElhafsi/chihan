-- 0002_listings_reviews.sql — Phase 3: directory listings + reviews
-- Depends on 0000_init.sql (set_profile_location is generic over lat/lng/location).

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  category text not null check (
    category in ('restaurant','doctor','grocery','lawyer','hairdresser','community','other')
  ),
  description text,
  address text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  location geography (Point, 4326),
  phone text,
  email text,
  website text,
  photos text[] not null default '{}',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- set_profile_location() only reads new.lat/new.lng and writes new.location, so it
-- is reused here.
drop trigger if exists listings_set_location on public.listings;
create trigger listings_set_location before insert or update of lat, lng on public.listings
  for each row execute function public.set_profile_location();

create index if not exists listings_location_gix on public.listings using gist (location);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_country_idx on public.listings (country);

alter table public.listings enable row level security;

-- Public read (directory + globe browsing is always free).
drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone" on public.listings for select using (true);

drop policy if exists "Users can create listings they own" on public.listings;
create policy "Users can create listings they own" on public.listings for insert
  with check (auth.uid() = owner_user_id);

-- Owners edit their own; an authenticated user may claim an unowned listing by
-- setting owner_user_id to themselves (with check enforces self-ownership).
drop policy if exists "Owners update or claim listings" on public.listings;
create policy "Owners update or claim listings" on public.listings for update
  using (auth.uid() = owner_user_id or owner_user_id is null)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can delete their listings" on public.listings;
create policy "Owners can delete their listings" on public.listings for delete
  using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- Reviews — one per (listing, author), rating 1..5.
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, author_id)
);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create index if not exists reviews_listing_idx on public.reviews (listing_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);

drop policy if exists "Users can create their own reviews" on public.reviews;
create policy "Users can create their own reviews" on public.reviews for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews" on public.reviews for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews" on public.reviews for delete
  using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- View: listings + their rating aggregates (excludes the raw geography column).
-- security_invoker so the underlying public-read RLS still applies.
-- ----------------------------------------------------------------------------
create or replace view public.listings_with_stats with (security_invoker = on) as
select
  l.id, l.owner_user_id, l.name, l.category, l.description, l.address,
  l.city, l.country, l.lat, l.lng, l.phone, l.email, l.website, l.photos,
  l.is_verified, l.created_at, l.updated_at,
  coalesce(r.review_count, 0) as review_count,
  r.rating_avg
from public.listings l
left join (
  select listing_id,
         count(*)::int as review_count,
         round(avg(rating)::numeric, 2) as rating_avg
  from public.reviews
  group by listing_id
) r on r.listing_id = l.id;

-- ----------------------------------------------------------------------------
-- Listing photos storage bucket (public read; owners manage their own folder).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "Listing photos are publicly readable" on storage.objects;
create policy "Listing photos are publicly readable" on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "Users upload listing photos to their folder" on storage.objects;
create policy "Users upload listing photos to their folder" on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their listing photos" on storage.objects;
create policy "Users update their listing photos" on storage.objects for update
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their listing photos" on storage.objects;
create policy "Users delete their listing photos" on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
