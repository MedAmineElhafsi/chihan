-- ============================================================================
-- 0030 — Interpreter requests, and Give & Ask for free things.
--
-- Both are help requests with a few more facts, so both keep the board, the
-- replies, the chat, the notifications and the reviews that already exist.
--
-- Interpreting. "I need Kurmanji–German at the doctor's on Thursday" is the
-- request a newcomer makes most and a volunteer can answer in an hour. It
-- adds which two languages, what kind of appointment, how (in person, by
-- phone, by video) and when — and it reaches members who said they can
-- interpret and who speak both languages.
--
-- Free things. A family arrives with two suitcases; someone across town has
-- a cot their child outgrew. A request in "Free things" is either an ask
-- ("I need a winter coat, size 110") or a give ("Giving away a sofa"), and a
-- give can carry photos. Posting a give tells the people in that city who
-- are asking for things.
--
-- Photos stay members-only, like everything else on the board: a private
-- bucket, readable by the uploader and by members who can see the request.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The categories. Existing rows keep theirs.
-- ----------------------------------------------------------------------------
alter table public.help_requests drop constraint if exists help_requests_category_check;
alter table public.help_requests add constraint help_requests_category_check check (
  category in (
    'housing', 'paperwork', 'work', 'language', 'health',
    'education', 'family', 'legal', 'transport', 'other',
    'interpreting', 'items'
  )
);

-- ----------------------------------------------------------------------------
-- 2. Interpreting.
-- ----------------------------------------------------------------------------
alter table public.help_requests
  add column if not exists interpret_from text,
  add column if not exists interpret_to text,
  add column if not exists setting text,
  add column if not exists meeting text,
  add column if not exists needed_at timestamptz;

alter table public.help_requests drop constraint if exists help_requests_setting_check;
alter table public.help_requests add constraint help_requests_setting_check check (
  setting is null
  or setting in ('medical', 'authority', 'school', 'legal', 'work', 'other')
);

alter table public.help_requests drop constraint if exists help_requests_meeting_check;
alter table public.help_requests add constraint help_requests_meeting_check check (
  meeting is null or meeting in ('in_person', 'phone', 'video')
);

-- An interpreter request names two different languages; nothing else names
-- any.
alter table public.help_requests drop constraint if exists help_requests_interpreting_check;
alter table public.help_requests add constraint help_requests_interpreting_check check (
  case
    when category = 'interpreting' then
      interpret_from is not null
      and interpret_to is not null
      and interpret_from <> interpret_to
      and length(interpret_from) <= 40
      and length(interpret_to) <= 40
    else interpret_from is null and interpret_to is null
  end
);

-- ----------------------------------------------------------------------------
-- 3. Give & Ask.
-- ----------------------------------------------------------------------------
alter table public.help_requests
  add column if not exists kind text not null default 'ask',
  add column if not exists photos text[] not null default '{}';

alter table public.help_requests drop constraint if exists help_requests_kind_check;
alter table public.help_requests add constraint help_requests_kind_check check (
  kind in ('ask', 'give')
  -- Only things are given away: "giving away help with paperwork" is an
  -- offer, and offers are replies.
  and (kind = 'ask' or category = 'items')
);

-- True when every path sits in the given folder. A check constraint cannot
-- hold a subquery, so the loop over the array lives in a function.
create or replace function public.paths_in_folder(p_paths text[], p_folder uuid)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(bool_and(split_part(p, '/', 1) = p_folder::text), true)
  from unnest(p_paths) as p;
$$;

-- Up to four photos, all in the author's own folder, and only on a give.
alter table public.help_requests drop constraint if exists help_requests_photos_check;
alter table public.help_requests add constraint help_requests_photos_check check (
  cardinality(photos) <= 4
  and (kind = 'give' or cardinality(photos) = 0)
  and public.paths_in_folder(photos, author_id)
);

create index if not exists help_requests_photos_gin
  on public.help_requests using gin (photos);

-- ----------------------------------------------------------------------------
-- 4. The photo bucket. Private, same size and types as other photos.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'help-photos',
  'help-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Not security definer: the lookup runs under the caller's own row-level
-- security, so it finds only requests the caller may already read.
create or replace function public.can_see_help_photo(p_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.help_requests where photos @> array[p_name]
  );
$$;

revoke all on function public.can_see_help_photo(text) from public, anon;
grant execute on function public.can_see_help_photo(text) to authenticated;

drop policy if exists "Upload help photos to your own folder" on storage.objects;
create policy "Upload help photos to your own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'help-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "See help photos on requests you can see" on storage.objects;
create policy "See help photos on requests you can see" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'help-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_see_help_photo(name)
    )
  );

drop policy if exists "Delete your own help photos" on storage.objects;
create policy "Delete your own help photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'help-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 5. Two more shoulder-taps. The full list is repeated, so this runs the
--    same whether or not 0026 (ads) has run before it.
-- ----------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'message', 'group_message', 'like', 'comment', 'help_match',
    'ad_approved', 'ad_rejected',
    'interpreter_match', 'give_match'
  )
);

-- Matching reads open asks for things by city.
create index if not exists help_requests_items_open_idx
  on public.help_requests (city)
  where category = 'items' and kind = 'ask' and status = 'open';
