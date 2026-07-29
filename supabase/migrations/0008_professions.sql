-- 0008_professions.sql — Phase 10: profession on profiles
-- Lets the globe colour-code people by what they do (student, worker, doctor …)
-- instead of showing every person in one colour.

alter table public.profiles add column if not exists profession text;

create index if not exists profiles_profession_idx on public.profiles (profession);

-- Existing RLS on public.profiles already covers this column (owner-writes,
-- public-read-when-consented) — no policy changes needed.
