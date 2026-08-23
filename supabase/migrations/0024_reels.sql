-- ============================================================================
-- 0024 — Reels.
--
-- A reel is a post with a video, not a separate system. That means likes,
-- comments, reporting, blocking, the city filter and every RLS policy already
-- written apply to it on the first day, with nothing to duplicate.
--
-- No new bucket: post-media is already public-read and folder-scoped per user,
-- and stories already share it under their own prefix. Reels use reels/.
-- ============================================================================

-- The type column gains a third kind. Drop and recreate rather than alter, so
-- an existing 'post' or 'event' row cannot be left failing a stricter check.
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts
  add constraint posts_type_check check (type in ('post', 'event', 'reel'));

-- A still frame, made in the browser when the reel is uploaded. Without it the
-- feed would download every video just to show a thumbnail — which on a phone
-- plan is somebody else's money.
alter table public.posts
  add column if not exists poster_url text;

-- Kept so the player can size the scrubber before the video loads, and so an
-- over-long upload can be spotted server-side rather than trusted from the
-- client.
alter table public.posts
  add column if not exists duration_seconds int;

alter table public.posts drop constraint if exists posts_duration_check;
alter table public.posts
  add constraint posts_duration_check check (
    duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 120)
  );

-- A reel must actually carry a video; a post must not pretend to be one.
--
-- cardinality(), not array_length(): array_length on an empty array returns
-- NULL, and a CHECK passes on NULL, so the obvious spelling of this rule lets
-- an empty reel straight through.
alter table public.posts drop constraint if exists posts_reel_has_media;
alter table public.posts
  add constraint posts_reel_has_media check (
    type <> 'reel' or cardinality(media) >= 1
  );

-- Reels are read newest-first and filtered by type, like the feed.
create index if not exists posts_type_created_idx
  on public.posts (type, created_at desc);
