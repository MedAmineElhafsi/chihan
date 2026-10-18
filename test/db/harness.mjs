/**
 * A real Postgres, dressed up as Supabase, in memory.
 *
 * Row-level security is the only thing standing between one member of Cîhan
 * and another's private messages, voice notes, identity documents and
 * telephone number. A policy that reads correctly can still be wrong, and
 * the only way to know is to run it — as somebody — and watch what comes
 * back. That is what this is for: every migration can be proven here, on a
 * laptop, in a second, before anyone is asked to paste SQL into the live
 * project.
 *
 * It is PGlite (Postgres 17 compiled to WASM) plus the small part of
 * Supabase that the migrations actually lean on:
 *
 *   - the roles `anon`, `authenticated` and `service_role`
 *   - `auth.uid()`, reading the signed-in member from a session setting
 *   - `auth.users`, enough of it for the foreign keys
 *   - `storage.buckets`, `storage.objects` and `storage.foldername()`
 *   - the `supabase_realtime` publication
 *
 * PostGIS is not available in WASM, so `adapt()` below rewrites the few
 * spatial bits into something ordinary. Nothing it rewrites is ever the
 * thing under test.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS = path.resolve(HERE, "../../supabase/migrations");

const PRELUDE = `
-- The three roles PostgREST connects as. Policies name them in their "to"
-- clause, so they have to exist before any migration runs.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- Who is asking. Supabase puts the signed-in member's id in a JWT claim and
-- reads it back out of the session; \`as()\` below sets the same setting.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant all on auth.users to anon, authenticated, service_role;

-- Storage, to the depth the policies touch it.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id) on delete cascade,
  name text,
  owner uuid,
  created_at timestamptz not null default now(),
  metadata jsonb
);
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects
  to anon, authenticated, service_role;

-- Supabase splits an object's path on "/" and hands back the folders.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$;

-- Realtime: several migrations add tables to this publication.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- PostGIS is not available in WASM. Only 0001's trigger calls these, and a
-- coordinate is never the thing under test.
create or replace function public.st_makepoint(a double precision, b double precision)
returns text language sql immutable as $$ select a::text || ',' || b::text $$;

create or replace function public.st_setsrid(g text, srid integer)
returns text language sql immutable as $$ select g $$;
`;

/**
 * The handful of rewrites that let the real migration files run here.
 * Spatial types become text, spatial indexes become ordinary ones, and the
 * two extensions are already present (gen_random_uuid is core in PG13+).
 */
export function adapt(sql) {
  return (
    sql
      .replace(/\r\n/g, "\n")
      // postgis / pgcrypto: one is unavailable, the other is built in.
      .replace(/^\s*create extension[^;]*;\s*$/gim, "")
      // geography(Point, 4326) -> text
      .replace(/\bgeography\s*\(\s*point\s*,\s*\d+\s*\)/gi, "text")
      .replace(/::\s*geography\b/gi, "::text")
      .replace(/\bgeography\b/gi, "text")
      // GiST needs a real spatial type; btree sorts text just fine.
      .replace(/using\s+gist\s*\(/gi, "using btree (")
  );
}

/** Every migration file, in order, optionally stopping at `upTo`. */
export function migrationFiles(upTo = "9999") {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && f.slice(0, 4) <= upTo)
    .sort();
}

/**
 * A database with every migration applied, ready to be acted on.
 *
 * `upTo` stops at a migration — pass "0025" for the state the live project
 * is actually in, so a pending migration can be tested as it will arrive.
 */
export async function freshDb({ upTo = "9999", log = false } = {}) {
  const db = new PGlite();
  await db.exec(PRELUDE);
  // Policies and functions routinely reference tables a later migration
  // creates; Postgres only resolves them when they run.
  await db.exec("set check_function_bodies = off;");

  for (const file of migrationFiles(upTo)) {
    const sql = adapt(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"));
    try {
      await db.exec(sql);
      if (log) console.log("  applied", file);
    } catch (err) {
      throw new Error(`${file}: ${err.message}`);
    }
  }

  await db.exec("set check_function_bodies = on;");
  return db;
}

/** Apply one migration file to an existing database. */
export async function applyMigration(db, file) {
  await db.exec("set check_function_bodies = off;");
  await db.exec(adapt(fs.readFileSync(path.join(MIGRATIONS, file), "utf8")));
  await db.exec("set check_function_bodies = on;");
}

/**
 * Run `fn` as a signed-in member — or, with `uid` null, as a stranger who
 * is not signed in at all. Row-level security applies exactly as it will
 * for a browser holding that session.
 */
export async function as(db, uid, fn) {
  // Session-level, not `set local`: each statement here is its own
  // transaction, so a transaction-local setting would be gone by the next
  // one and every policy would see a null auth.uid().
  await db.exec(
    uid
      ? `set role authenticated;
         select set_config('request.jwt.claim.sub', '${uid}', false);`
      : `set role anon;
         select set_config('request.jwt.claim.sub', '', false);`
  );
  try {
    return await fn();
  } finally {
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub', '', false);"
    );
  }
}

/** Run `fn` as the server does in a webhook: service role, no RLS. */
export async function asService(db, fn) {
  await db.exec("set role service_role;");
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
