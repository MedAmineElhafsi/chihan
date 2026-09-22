-- ============================================================================
-- 0029 — Translations, kept so each text is translated once.
--
-- A Sorani speaker and a Kurmanji speaker read each other's posts; a German
-- neighbour reads a request for help. A reader taps "Translate", the server
-- fetches the text with that reader's own permissions, has it translated,
-- and keeps the result here, so the next reader gets it at once and the
-- community pays for each translation a single time.
--
-- Nobody reads this table directly. It has row-level security and no
-- policies, so only the server's service role can touch it, and the server
-- hands a translation only to someone who could already read the original.
--
-- A translation is forgotten when its original is deleted, including when
-- the author deletes their account and their posts go with it.
-- ============================================================================

create table if not exists public.translations (
  kind text not null check (kind in ('post', 'help_request', 'help_offer')),
  entity_id uuid not null,
  target text not null check (target in ('en', 'de', 'ku', 'ckb', 'ar')),
  -- A digest of the original. An edited post no longer matches, so its old
  -- translation is replaced rather than shown.
  source_hash text not null,
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  -- The language the service recognised, to say "Translated from Sorani".
  detected text,
  created_at timestamptz not null default now(),
  primary key (kind, entity_id, target)
);

alter table public.translations enable row level security;
revoke all on public.translations from anon, authenticated;

-- security definer: the person deleting a post has no rights on this table,
-- and must not need any to take their words' translations with them.
create or replace function public.forget_translations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.translations
   where kind = tg_argv[0]
     and entity_id = old.id;
  return old;
end;
$$;

revoke all on function public.forget_translations() from public, anon, authenticated;

drop trigger if exists posts_forget_translations on public.posts;
create trigger posts_forget_translations
  after delete on public.posts
  for each row execute function public.forget_translations('post');

drop trigger if exists help_requests_forget_translations on public.help_requests;
create trigger help_requests_forget_translations
  after delete on public.help_requests
  for each row execute function public.forget_translations('help_request');

drop trigger if exists help_offers_forget_translations on public.help_offers;
create trigger help_offers_forget_translations
  after delete on public.help_offers
  for each row execute function public.forget_translations('help_offer');
