/**
 * Push the environment variables Grêdan needs from `.env.local` into the
 * linked Vercel project.
 *
 *   npm run env:push -- --dry-run   # say what would be sent, send nothing
 *   npm run env:push                # actually send it
 *
 * The values are read from the file at the moment you run it and piped
 * straight into the Vercel CLI on stdin. They are never printed, never
 * passed as command arguments (where another process could read them off
 * the process list), and never leave the machine except to the Vercel
 * project this repository is linked to.
 *
 * The names are fixed in this file on purpose. A value can only go to the
 * name it belongs to, so a service-role key cannot end up in a
 * NEXT_PUBLIC_ variable by mistake — which would compile it into every
 * browser bundle and could not be taken back.
 *
 * It asks Vercel afterwards what is actually there. An earlier version
 * trusted the CLI's exit code and reported three variables sent when one
 * of them had silently not arrived, which is worse than failing.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const DRY = process.argv.includes("--dry-run");
const TARGETS = ["production", "preview"];

/**
 * What to push. `secret: true` is stored as a Vercel Secret, which cannot
 * be read back out of the dashboard; the NEXT_PUBLIC_ ones are compiled
 * into the browser bundle anyway, so hiding them would buy nothing and
 * cost the ability to check them by eye.
 */
const WANTED = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", secret: false, required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", secret: false, required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", secret: true, required: true },
  { name: "GOOGLE_TRANSLATE_API_KEY", secret: true, required: false },
  { name: "RESEND_API_KEY", secret: true, required: false },
  { name: "STRIPE_SECRET_KEY", secret: true, required: false },
  { name: "STRIPE_WEBHOOK_SECRET", secret: true, required: false },
  { name: "NEXT_PUBLIC_STRIPE_PRICE_MONTHLY", secret: false, required: false },
  { name: "NEXT_PUBLIC_STRIPE_PRICE_YEARLY", secret: false, required: false },
  { name: "NEXT_PUBLIC_STRIPE_PRICE_BUSINESS", secret: false, required: false },
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", secret: false, required: false },
  { name: "VAPID_PRIVATE_KEY", secret: true, required: false },
  { name: "VAPID_SUBJECT", secret: false, required: false },
];

// NEXT_PUBLIC_SITE_URL is deliberately NOT in that list. In .env.local it
// is http://localhost:3000, and pushing that to production would point
// every Stripe return link, share link and download link at the developer's
// own machine. It is set once, by hand, to the deployed address.

if (!fs.existsSync(ENV_FILE)) {
  console.error(`No .env.local at ${ENV_FILE}`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim(),
    ])
);

// `shell: true` is required on Windows for npx to resolve at all.
const vercel = (args, input) =>
  spawnSync("npx", ["vercel", ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    shell: true,
  });

/** What Vercel says it has, as a map of name to the targets it covers. */
function readRemote() {
  const res = vercel(["env", "ls"]);
  const found = new Map();
  for (const line of (res.stdout || "").split("\n")) {
    // " NAME  value  type  Production, Preview  2m ago"
    const m = line.match(
      /^\s+([A-Z0-9_]+)\s+\S.*?\s+(Config|Secret|Sensitive)\s+([A-Za-z, ]+?)\s{2,}/
    );
    if (!m) continue;
    const targets = m[3]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    found.set(m[1], new Set([...(found.get(m[1]) ?? []), ...targets]));
  }
  return found;
}

const planned = [];
for (const { name, secret, required } of WANTED) {
  const value = env[name];
  if (!value) {
    if (required) {
      console.log(`  MISSING  ${name}  — not in .env.local`);
      process.exitCode = 1;
    } else {
      console.log(`  skipped  ${name}`);
    }
    continue;
  }
  planned.push({ name, secret, value });
}

if (DRY) {
  for (const { name, secret } of planned) {
    // Never the value, not even its length.
    console.log(`  would send ${name}${secret ? "  (secret)" : ""}`);
  }
  console.log(`\ndry run: ${planned.length} would be sent, nothing changed`);
  process.exit(process.exitCode ?? 0);
}

for (const { name, secret, value } of planned) {
  // Remove first: --force covers an existing variable, but a name that
  // already exists on only one of the two targets confuses it.
  vercel(["env", "rm", name, "--environment", TARGETS.join(","), "--yes"]);
  const res = vercel(
    [
      "env",
      "add",
      name,
      "--environment",
      TARGETS.join(","),
      "--force",
      secret ? "--sensitive" : "--no-sensitive",
    ],
    value
  );
  if (res.status !== 0) {
    const why = (res.stderr || res.stdout || "").trim().split("\n").pop();
    console.log(`  FAILED   ${name} — ${why}`);
  }
}

// Ask Vercel what is actually there, rather than believing the exit codes.
const remote = readRemote();
let good = 0;
let bad = 0;
for (const { name, secret } of planned) {
  const targets = remote.get(name);
  const missing = TARGETS.filter((t) => !targets?.has(t));
  if (missing.length === 0) {
    console.log(`  ok       ${name}${secret ? "  (secret)" : ""}`);
    good++;
  } else {
    console.log(`  NOT SET  ${name}  — missing on ${missing.join(", ")}`);
    bad++;
  }
}

console.log(`\n${good} confirmed on Vercel, ${bad} not`);
if (bad === 0 && good > 0) {
  console.log(
    "\nNEXT_PUBLIC_* values are compiled in at build time, so redeploy:\n  npx vercel deploy --prod --yes"
  );
}
process.exit(bad > 0 ? 1 : (process.exitCode ?? 0));
