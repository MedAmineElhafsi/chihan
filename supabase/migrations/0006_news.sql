-- 0006_news.sql — Phase 7: news articles

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  source text,
  url text,
  image_url text,
  country text,
  category text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists news_published_idx on public.news_articles (published_at desc);
create index if not exists news_country_idx on public.news_articles (country);

alter table public.news_articles enable row level security;

-- Public read; writes happen via the service role (admin insert / seed / a future
-- aggregation pipeline) — there is intentionally no user insert policy.
drop policy if exists "News is viewable by everyone" on public.news_articles;
create policy "News is viewable by everyone" on public.news_articles for select using (true);
