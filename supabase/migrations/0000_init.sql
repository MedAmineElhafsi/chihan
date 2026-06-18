-- 0000_init.sql — Cîhan base migration
-- Prepares the database to be RLS-ready with PostGIS enabled. No feature tables
-- are created here (profiles begin in Phase 1); this only sets up extensions and
-- a shared trigger function used by later migrations.

-- PostGIS: powers geography(Point, 4326) coordinates for profiles / listings /
-- events, used by the globe and "near me" discovery.
create extension if not exists postgis;

-- pgcrypto: gen_random_uuid() for primary keys.
create extension if not exists pgcrypto;

-- Reusable trigger function to maintain `updated_at` on row updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS CONVENTION — every table added from Phase 1 onward MUST follow this:
--
--   1. alter table <t> enable row level security;
--   2. Public-read tables get a `select` policy, gated where appropriate by a
--      visibility/consent flag (e.g. profiles.is_public = true).
--   3. Owner-write: insert / update / delete policies check
--      `auth.uid() = <owner column>`.
--   4. Relational reads (e.g. messages) are scoped to participants.
--   5. An RLS-enabled table with no policy denies all access by default —
--      never ship a table without explicit, reviewed policies.
-- ----------------------------------------------------------------------------
