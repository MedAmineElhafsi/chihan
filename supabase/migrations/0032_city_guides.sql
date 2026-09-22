-- ============================================================================
-- 0032 — City guides.
--
-- The same questions reach the help board again and again: how do I
-- register my address, which health insurance, how does school enrolment
-- work, what happens to my residence permit. A guide answers one of them
-- once, step by step, in the reader's language, and it stays answered.
--
-- Guides are public: they are the most useful thing Cîhan can show someone
-- who has not joined yet, and the thing most worth sharing into a WhatsApp
-- group. Only administrators write and publish them — this is official
-- procedure, and a wrong step costs someone an appointment or a fine.
-- Members can suggest one, including straight from a request that was
-- answered, so the board's answers become guides for the next person.
--
-- One guide in several languages is several rows sharing a slug: the page
-- shows the reader's language when it exists and says so when it does not.
-- ============================================================================

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  locale text not null check (locale in ('en', 'de', 'ku', 'ckb', 'ar')),
  topic text not null check (
    topic in (
      'registration', 'health_insurance', 'schools', 'residence', 'work',
      'housing', 'language', 'money', 'family', 'other'
    )
  ),
  country text not null default 'Germany'
    check (char_length(btrim(country)) between 2 and 60),
  -- Empty for a guide that holds for the whole country.
  city text check (city is null or char_length(city) <= 80),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  summary text check (summary is null or char_length(summary) <= 400),
  -- [{ "title": "...", "body": "..." }, ...]
  steps jsonb not null default '[]'::jsonb check (
    jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 30
  ),
  -- Official sources: [{ "label": "...", "url": "https://..." }, ...]
  links jsonb not null default '[]'::jsonb check (
    jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 12
  ),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  -- When someone last checked the steps against the real procedure. Shown
  -- to readers: an old date is a reason to double-check.
  reviewed_on date,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create index if not exists guides_published_idx
  on public.guides (status, locale);
create index if not exists guides_city_idx on public.guides (city);
create index if not exists guides_topic_idx on public.guides (topic);

drop trigger if exists guides_set_updated_at on public.guides;
create trigger guides_set_updated_at before update on public.guides
  for each row execute function public.set_updated_at();

alter table public.guides enable row level security;

drop policy if exists "Published guides are public" on public.guides;
create policy "Published guides are public" on public.guides for select
  using (status = 'published' or public.is_admin(auth.uid()));

drop policy if exists "Administrators write guides" on public.guides;
create policy "Administrators write guides" on public.guides for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Administrators edit guides" on public.guides;
create policy "Administrators edit guides" on public.guides for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Administrators delete guides" on public.guides;
create policy "Administrators delete guides" on public.guides for delete
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Suggestions from members, often from a request that was answered.
-- ----------------------------------------------------------------------------
create table if not exists public.guide_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references auth.users (id) on delete cascade,
  request_id uuid references public.help_requests (id) on delete set null,
  city text check (city is null or char_length(city) <= 80),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists guide_suggestions_open_idx
  on public.guide_suggestions (status, created_at desc);

-- The same request suggested twice by the same person is one suggestion.
create unique index if not exists guide_suggestions_one_per_request
  on public.guide_suggestions (request_id, suggested_by)
  where request_id is not null and status = 'open';

alter table public.guide_suggestions enable row level security;

drop policy if exists "Members suggest guides" on public.guide_suggestions;
create policy "Members suggest guides" on public.guide_suggestions for insert
  to authenticated with check (suggested_by = auth.uid());

drop policy if exists "See your own suggestions" on public.guide_suggestions;
create policy "See your own suggestions" on public.guide_suggestions for select
  using (suggested_by = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Administrators handle suggestions" on public.guide_suggestions;
create policy "Administrators handle suggestions" on public.guide_suggestions for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Administrators remove suggestions" on public.guide_suggestions;
create policy "Administrators remove suggestions" on public.guide_suggestions for delete
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Guides can be translated like posts (0029), and forgotten with them.
-- Guarded, so this runs even where 0029 has not.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.translations') is not null then
    alter table public.translations drop constraint if exists translations_kind_check;
    alter table public.translations add constraint translations_kind_check
      check (kind in ('post', 'help_request', 'help_offer', 'guide'));

    drop trigger if exists guides_forget_translations on public.guides;
    create trigger guides_forget_translations
      after delete on public.guides
      for each row execute function public.forget_translations('guide');
  end if;
end;
$$;
