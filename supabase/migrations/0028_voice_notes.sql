-- ============================================================================
-- 0028 — Voice messages.
--
-- For members who find it easier to speak than to type: elders, people who
-- read one Kurdish script and not the other, anyone explaining something
-- complicated from a bus stop. A voice note can go in a chat, a group chat,
-- a help request, or a reply to one.
--
-- Privacy follows the row that carries the note. The bucket is private, and
-- a file can be heard only by the person who recorded it or by someone who
-- can already see a message, request or reply that points at it. A voice
-- note in a chat is heard by the people in that chat and nobody else,
-- exactly as its text would be read.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The bucket. Private. Three minutes of speech is well under 5 MB even at
--    the bitrates a phone chooses on its own.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes',
  'voice-notes',
  false,
  5242880,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Where a note can be attached: the same three columns on each table.
--
--    voice_ms    — its length. Browsers report no duration for a freshly
--                  recorded WebM file, and the player must show "0:42"
--                  before anything downloads.
--    voice_peaks — a coarse waveform (up to 64 bars, 0–100), so a note is
--                  recognisable at a glance and shows how far it has played.
--
--    A note must live in its author's own folder. Without that rule, anyone
--    who learned the name of someone else's file could attach it to their
--    own message and hand it to a stranger.
-- ----------------------------------------------------------------------------
alter table public.messages
  add column if not exists voice_path text,
  add column if not exists voice_ms int,
  add column if not exists voice_peaks smallint[];

alter table public.group_messages
  add column if not exists voice_path text,
  add column if not exists voice_ms int,
  add column if not exists voice_peaks smallint[];

alter table public.help_requests
  add column if not exists voice_path text,
  add column if not exists voice_ms int,
  add column if not exists voice_peaks smallint[];

alter table public.help_offers
  add column if not exists voice_path text,
  add column if not exists voice_ms int,
  add column if not exists voice_peaks smallint[];

alter table public.messages drop constraint if exists messages_voice_check;
alter table public.messages add constraint messages_voice_check check (
  voice_path is null
  or (
    split_part(voice_path, '/', 1) = sender_id::text
    and voice_ms between 500 and 180000
    and (
      voice_peaks is null
      or (
        cardinality(voice_peaks) <= 64
        and 0 <= all (voice_peaks)
        and 100 >= all (voice_peaks)
      )
    )
  )
);

alter table public.group_messages drop constraint if exists group_messages_voice_check;
alter table public.group_messages add constraint group_messages_voice_check check (
  voice_path is null
  or (
    split_part(voice_path, '/', 1) = sender_id::text
    and voice_ms between 500 and 180000
    and (
      voice_peaks is null
      or (
        cardinality(voice_peaks) <= 64
        and 0 <= all (voice_peaks)
        and 100 >= all (voice_peaks)
      )
    )
  )
);

alter table public.help_requests drop constraint if exists help_requests_voice_check;
alter table public.help_requests add constraint help_requests_voice_check check (
  voice_path is null
  or (
    split_part(voice_path, '/', 1) = author_id::text
    and voice_ms between 500 and 180000
    and (
      voice_peaks is null
      or (
        cardinality(voice_peaks) <= 64
        and 0 <= all (voice_peaks)
        and 100 >= all (voice_peaks)
      )
    )
  )
);

alter table public.help_offers drop constraint if exists help_offers_voice_check;
alter table public.help_offers add constraint help_offers_voice_check check (
  voice_path is null
  or (
    split_part(voice_path, '/', 1) = author_id::text
    and voice_ms between 500 and 180000
    and (
      voice_peaks is null
      or (
        cardinality(voice_peaks) <= 64
        and 0 <= all (voice_peaks)
        and 100 >= all (voice_peaks)
      )
    )
  )
);

-- A message, a group message and a reply each carry words or a voice note,
-- never neither. `not valid`: the rule applies to everything written from
-- now on and does not re-judge rows written before it existed.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
  check (btrim(body) <> '' or voice_path is not null) not valid;

alter table public.group_messages drop constraint if exists group_messages_content_check;
alter table public.group_messages add constraint group_messages_content_check
  check (btrim(body) <> '' or voice_path is not null) not valid;

alter table public.help_offers drop constraint if exists help_offers_content_check;
alter table public.help_offers add constraint help_offers_content_check
  check (btrim(body) <> '' or voice_path is not null) not valid;

-- The storage policy below looks each file up by name.
create index if not exists messages_voice_path_idx
  on public.messages (voice_path) where voice_path is not null;
create index if not exists group_messages_voice_path_idx
  on public.group_messages (voice_path) where voice_path is not null;
create index if not exists help_requests_voice_path_idx
  on public.help_requests (voice_path) where voice_path is not null;
create index if not exists help_offers_voice_path_idx
  on public.help_offers (voice_path) where voice_path is not null;

-- ----------------------------------------------------------------------------
-- 3. Who can hear a note.
--
--    Deliberately NOT security definer: the four lookups run under the
--    caller's own row-level security, so "a message you can see" means
--    exactly the messages that policy already lets you see — your own
--    conversations, groups you belong to, and the members-only help board.
-- ----------------------------------------------------------------------------
create or replace function public.can_hear_voice_note(p_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (select 1 from public.messages where voice_path = p_name)
    or exists (select 1 from public.group_messages where voice_path = p_name)
    or exists (select 1 from public.help_requests where voice_path = p_name)
    or exists (select 1 from public.help_offers where voice_path = p_name);
$$;

revoke all on function public.can_hear_voice_note(text) from public, anon;
grant execute on function public.can_hear_voice_note(text) to authenticated;

drop policy if exists "Upload voice notes to your own folder" on storage.objects;
create policy "Upload voice notes to your own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Hear voice notes you can see" on storage.objects;
create policy "Hear voice notes you can see" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voice-notes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_hear_voice_note(name)
    )
  );

drop policy if exists "Delete your own voice notes" on storage.objects;
create policy "Delete your own voice notes" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
