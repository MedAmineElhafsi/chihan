-- ============================================================================
-- 0025 — Let a help request reach the people who said they would help.
--
-- Onboarding has always asked "I can offer: housing help, job leads, local
-- tips, language help…" and nothing has ever read the answer. A request sat
-- on a board waiting to be noticed.
--
-- This adds the one notification type needed to tap someone on the shoulder.
-- ============================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in ('message', 'group_message', 'like', 'comment', 'help_match')
  );

-- Matching reads profiles by city and by their offering tags, for everyone in
-- the city rather than one row at a time.
create index if not exists profiles_city_offering_idx
  on public.profiles (city)
  where offering is not null;
