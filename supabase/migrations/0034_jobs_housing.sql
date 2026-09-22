-- ============================================================================
-- 0034 — Jobs and housing, with the scams kept out.
--
-- Fake flats and fake jobs are aimed at newcomers on purpose: someone who
-- needs a room this week, cannot read the contract, and does not know what
-- a Kaution is. A board that ignores this would do more harm than good, so
-- the protection is part of the table, not a warning in the interface:
--
--   * only verified members may post — an administrator checked a document;
--   * the text is read for the phrases scams use (pay before viewing, money
--     transfer, "I am abroad, I will post the keys", a fee to apply), and a
--     post that uses them is held for review instead of published;
--   * an author cannot release their own held post, or stretch its life:
--     the trigger overrules whatever the client sends;
--   * three different members reporting a post takes it down until someone
--     looks;
--   * posts expire after 30 days, because a stale listing is where a scam
--     lives on;
--   * contact goes through Cîhan's own chat, so there is a record, a block
--     and a report button.
-- ============================================================================

create table if not exists public.classifieds (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('job', 'housing')),
  title text not null check (char_length(btrim(title)) between 6 and 140),
  description text not null check (char_length(btrim(description)) between 20 and 3000),
  city text check (city is null or char_length(city) <= 80),
  district text check (district is null or char_length(district) <= 80),

  -- Housing
  housing_type text check (
    housing_type is null
    or housing_type in ('room', 'apartment', 'shared', 'temporary')
  ),
  rent_cents integer check (rent_cents is null or rent_cents between 0 and 10000000),
  rent_kind text check (rent_kind is null or rent_kind in ('warm', 'cold')),
  size_m2 integer check (size_m2 is null or size_m2 between 1 and 1000),
  rooms numeric(3, 1) check (rooms is null or rooms between 0.5 and 20),
  available_from date,
  deposit_cents integer check (deposit_cents is null or deposit_cents between 0 and 10000000),

  -- Work
  employer text check (employer is null or char_length(employer) <= 120),
  job_type text check (
    job_type is null
    or job_type in ('full_time', 'part_time', 'mini_job', 'apprenticeship', 'temporary')
  ),
  pay_cents integer check (pay_cents is null or pay_cents between 0 and 10000000),
  pay_unit text check (pay_unit is null or pay_unit in ('hour', 'month')),
  languages text[] not null default '{}' check (cardinality(languages) <= 4),

  photos text[] not null default '{}',
  status text not null default 'open'
    check (status in ('open', 'held', 'filled', 'removed')),
  -- What the text-reading below found. Some hold the post; some only warn
  -- the reader.
  flags text[] not null default '{}',
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint classifieds_photos_check check (
    cardinality(photos) <= 6
    and public.paths_in_folder(photos, author_id)
  ),
  -- Only a flat has a rent; only a job has an employer.
  constraint classifieds_kind_fields check (
    case when kind = 'job'
      then housing_type is null and rent_cents is null and size_m2 is null
           and rooms is null and deposit_cents is null
      else employer is null and job_type is null and pay_cents is null
    end
  )
);

create index if not exists classifieds_open_idx
  on public.classifieds (kind, status, created_at desc);
create index if not exists classifieds_city_idx on public.classifieds (city);
create index if not exists classifieds_author_idx on public.classifieds (author_id);
create index if not exists classifieds_photos_gin
  on public.classifieds using gin (photos);

drop trigger if exists classifieds_set_updated_at on public.classifieds;
create trigger classifieds_set_updated_at before update on public.classifieds
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Reading the text the way a scam reads.
--
-- The phrases are the ones these adverts actually use, in the languages
-- this community writes in. Matching one is not proof of anything — it
-- sends the post to a human instead of straight to a newcomer.
-- ----------------------------------------------------------------------------
create or replace function public.classified_flags(p_title text, p_description text)
returns text[]
language plpgsql
immutable
set search_path = public
as $fn$
declare
  t text := lower(coalesce(p_title, '') || ' ' || coalesce(p_description, ''));
  out text[] := '{}';
begin
  -- Money before anyone has seen anything.
  if t ~ '(deposit|kaution|anzahlung|vorkasse|down ?payment|pay (first|in advance)|before (the )?(viewing|visit)|بيعة|عربون|پێشەکی)'
     and t ~ '(before|vorab|im voraus|first|advance|قبل|پێش)'
  then out := out || 'payment_before_viewing'::text; end if;

  -- The classic remote-landlord story.
  if t ~ '(western union|money ?gram|wire transfer|bank transfer only|überweisung nur|send (the )?money)'
  then out := out || 'wire_transfer'::text; end if;
  if t ~ '(bitcoin|btc|usdt|crypto|kripto)'
  then out := out || 'crypto'::text; end if;
  if t ~ '(i am (abroad|not in)|ich bin im ausland|send (the )?keys|schlüssel (per post|schicken)|keys by (post|mail)|courier)'
  then out := out || 'keys_by_post'::text; end if;

  -- Jobs that charge you to work.
  if t ~ '(registration fee|application fee|training fee|pay (a )?fee|gebühr (für|zur) (bewerbung|anmeldung)|رسوم التسجيل)'
  then out := out || 'fee_to_apply'::text; end if;

  -- Taking it off Cîhan before anything is known.
  if t ~ '(whatsapp only|nur über whatsapp|write me on whatsapp|telegram only|only by e-?mail)'
  then out := out || 'off_platform'::text; end if;

  return out;
end;
$fn$;

/** Flags that hold a post back; the rest only warn the reader. */
create or replace function public.classified_holding_flags()
returns text[] language sql immutable as $$
  select array['payment_before_viewing', 'wire_transfer', 'crypto',
               'keys_by_post', 'fee_to_apply']::text[];
$$;

-- ----------------------------------------------------------------------------
-- The guard: what a client sends is not what is stored.
-- ----------------------------------------------------------------------------
create or replace function public.classifieds_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_admin boolean := public.is_admin(auth.uid());
begin
  -- The database itself (SQL editor, service role) and administrators pass.
  if auth.uid() is null or v_admin then
    return new;
  end if;

  new.author_id := coalesce(old.author_id, auth.uid());
  new.flags := public.classified_flags(new.title, new.description);

  if new.flags && public.classified_holding_flags() then
    new.status := 'held';
  elsif tg_op = 'UPDATE' and old.status = 'held' then
    -- Only an administrator lifts a hold.
    new.status := 'held';
  end if;

  -- A post lives 30 days, whatever the client asks for.
  new.expires_at := least(
    coalesce(new.expires_at, now() + interval '30 days'),
    now() + interval '30 days'
  );
  return new;
end;
$fn$;

drop trigger if exists classifieds_guard_trigger on public.classifieds;
create trigger classifieds_guard_trigger
  before insert or update on public.classifieds
  for each row execute function public.classifieds_guard();

-- ----------------------------------------------------------------------------
-- RLS. Members-only, like the help board: a room advert carries an address
-- and a phone number.
-- ----------------------------------------------------------------------------
alter table public.classifieds enable row level security;

drop policy if exists "Members read open posts" on public.classifieds;
create policy "Members read open posts" on public.classifieds for select
  to authenticated using (
    (status = 'open' and expires_at > now())
    or author_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "Verified members post" on public.classifieds;
create policy "Verified members post" on public.classifieds for insert
  to authenticated with check (
    author_id = auth.uid() and public.is_verified(auth.uid())
  );

drop policy if exists "Authors edit their own posts" on public.classifieds;
create policy "Authors edit their own posts" on public.classifieds for update
  to authenticated using (author_id = auth.uid() or public.is_admin(auth.uid()))
  with check (author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Authors delete their own posts" on public.classifieds;
create policy "Authors delete their own posts" on public.classifieds for delete
  to authenticated using (author_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Reports take a post down while a human looks.
-- ----------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (
  target_type in ('listing', 'post', 'comment', 'review', 'profile', 'classified')
);

create or replace function public.classified_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer;
begin
  if new.target_type <> 'classified' then return new; end if;

  select count(distinct reporter_id) into v_count
    from reports
   where target_type = 'classified' and target_id = new.target_id;

  -- Three different members is enough to take it down until someone
  -- looks. The count itself is not kept on the post: an author must not be
  -- able to tidy it away, and administrators read it from the reports.
  if v_count >= 3 then
    update classifieds
       set status = 'held'
     where id = new.target_id and status = 'open';
  end if;

  return new;
end;
$fn$;

drop trigger if exists reports_classified_trigger on public.reports;
create trigger reports_classified_trigger
  after insert on public.reports
  for each row execute function public.classified_reported();

-- ----------------------------------------------------------------------------
-- Photos of a room. Private, like the help board's: a photo of a flat is a
-- photo of where somebody lives.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-photos',
  'board-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_see_board_photo(p_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.classifieds where photos @> array[p_name]
  );
$$;

revoke all on function public.can_see_board_photo(text) from public, anon;
grant execute on function public.can_see_board_photo(text) to authenticated;

drop policy if exists "Upload board photos to your own folder" on storage.objects;
create policy "Upload board photos to your own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'board-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "See board photos on posts you can see" on storage.objects;
create policy "See board photos on posts you can see" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'board-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_see_board_photo(name)
    )
  );

drop policy if exists "Delete your own board photos" on storage.objects;
create policy "Delete your own board photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'board-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
