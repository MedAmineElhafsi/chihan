-- 0005_feed.sql — Phase 6: feed (posts & events) + likes + comments

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'post' check (type in ('post', 'event')),
  body text,
  media text[] not null default '{}',
  event_title text,
  event_at timestamptz,
  event_location text,
  event_lat double precision,
  event_lng double precision,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_event_at_idx on public.posts (event_at);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

-- Posts with like/comment counts (security_invoker keeps public-read RLS).
create or replace view public.posts_with_counts with (security_invoker = on) as
select
  p.id, p.author_id, p.type, p.body, p.media, p.event_title, p.event_at,
  p.event_location, p.event_lat, p.event_lng, p.created_at,
  coalesce(l.cnt, 0) as like_count,
  coalesce(c.cnt, 0) as comment_count
from public.posts p
left join (select post_id, count(*)::int cnt from public.post_likes group by post_id) l
  on l.post_id = p.id
left join (select post_id, count(*)::int cnt from public.post_comments group by post_id) c
  on c.post_id = p.id;

-- ----------------------------------------------------------------------------
-- RLS (public read; owner writes; premium gating enforced in the server action)
-- ----------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts" on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = author_id);

drop policy if exists "Likes are viewable by everyone" on public.post_likes;
create policy "Likes are viewable by everyone" on public.post_likes for select using (true);
drop policy if exists "Users can like as themselves" on public.post_likes;
create policy "Users can like as themselves" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own like" on public.post_likes;
create policy "Users can remove their own like" on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists "Comments are viewable by everyone" on public.post_comments;
create policy "Comments are viewable by everyone" on public.post_comments for select using (true);
drop policy if exists "Users can comment as themselves" on public.post_comments;
create policy "Users can comment as themselves" on public.post_comments for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update their own comment" on public.post_comments;
create policy "Users can update their own comment" on public.post_comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Users can delete their own comment" on public.post_comments;
create policy "Users can delete their own comment" on public.post_comments for delete using (auth.uid() = author_id);

-- Post media bucket (public read; owners manage their folder).
insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true) on conflict (id) do nothing;
drop policy if exists "Post media is publicly readable" on storage.objects;
create policy "Post media is publicly readable" on storage.objects for select using (bucket_id = 'post-media');
drop policy if exists "Users upload post media to their folder" on storage.objects;
create policy "Users upload post media to their folder" on storage.objects for insert with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete their post media" on storage.objects;
create policy "Users delete their post media" on storage.objects for delete using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
