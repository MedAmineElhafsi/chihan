/**
 * Apply a migration to the Supabase database.
 *
 *   node scripts/run-migration.mjs supabase/migrations/0023_private_groups_verification.sql
 *   node scripts/run-migration.mjs --pending
 *
 * Needs SUPABASE_DB_URL in .env.local — the URI connection string from
 * Supabase → Project Settings → Database → Connection string. It contains the
 * database password, so it stays in .env.local and never in the repository.
 *
 * Every file runs inside a transaction: a migration that fails halfway rolls
 * back rather than leaving the schema in a state nobody has ever tested.
 * Applied files are recorded in schema_migrations so re-running is safe.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i).trim(),
          l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      })
  );
}

const env = loadEnv();
const connectionString = env.SUPABASE_DB_URL ?? process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    [
      "SUPABASE_DB_URL is not set.",
      "",
      "Supabase dashboard -> Project Settings -> Database -> Connection string",
      "-> URI. Copy it (it already contains the password) and add this line to",
      ".env.local:",
      "",
      "  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres",
      "",
      "It is a secret: .env.local is gitignored, and it must stay that way.",
    ].join("\n")
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function ensureLedger() {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function applied() {
  const { rows } = await client.query(
    "select filename from public.schema_migrations"
  );
  return new Set(rows.map((r) => r.filename));
}

async function run(file) {
  const name = path.basename(file);
  const sql = fs.readFileSync(file, "utf8");
  process.stdout.write(`${name} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(
      "insert into public.schema_migrations (filename) values ($1) on conflict do nothing",
      [name]
    );
    await client.query("commit");
    console.log("applied");
    return true;
  } catch (err) {
    await client.query("rollback");
    console.log("FAILED (rolled back)");
    console.error(`  ${err.message}`);
    if (err.position) {
      const upto = sql.slice(0, Number(err.position));
      console.error(`  at line ${upto.split("\n").length}`);
    }
    return false;
  }
}

const args = process.argv.slice(2);
await client.connect();
await ensureLedger();

let files;
if (args[0] === "--pending" || args.length === 0) {
  const done = await applied();
  files = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !done.has(f))
    .map((f) => path.join(MIGRATIONS, f));
  if (files.length === 0) console.log("nothing pending");
} else {
  files = args.map((a) => path.resolve(ROOT, a));
}

let ok = true;
for (const f of files) {
  if (!(await run(f))) {
    ok = false;
    break;
  }
}

await client.end();
process.exit(ok ? 0 : 1);
