/**
 * Push the environment variables Cîhan needs from `.env.local` into the
 * linked Vercel project.
 *
 *   npm run env:push -- --dry-run   # say what would be sent, send nothing
 *   npm run env:push                # actually send it
 *
 * The values are read from the file at the moment you run it and piped
 * straight into the Vercel CLI. They are never printed, never written
 * anywhere else, and never pass through anything but your own machine and
 * your own Vercel account.
 *
 * The names are fixed in this file on purpose. A secret can only go to the
 * name it belongs to, so there is no way to put a service-role key into a
 * NEXT_PUBLIC_ variable by mistake — which would compile it into every
 * browser bundle and could not be taken back.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const DRY = process.argv.includes("--dry-run");
const TARGETS = ["production", "preview"];

/** What to push, and whether it is a secret. Secrets are never echoed. */
const WANTED = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", secret: false, required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", secret: true, required: true },
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

function vercel(args, input) {
  return spawnSync("npx", ["vercel", ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

let sent = 0;
let skipped = 0;
let failed = 0;

for (const { name, secret, required } of WANTED) {
  const value = env[name];
  if (!value) {
    console.log(
      `  ${required ? "MISSING " : "skipped "} ${name}${required ? "  — not in .env.local" : ""}`
    );
    if (required) failed++;
    else skipped++;
    continue;
  }

  if (DRY) {
    // Never the value, not even its length.
    console.log(`  would send ${name}${secret ? "  (secret)" : ""}`);
    sent++;
    continue;
  }

  let ok = true;
  for (const target of TARGETS) {
    // Replace rather than add: `vercel env add` refuses a name that is
    // already there, and this script is meant to be safe to re-run.
    vercel(["env", "rm", name, target, "--yes"]);
    const res = vercel(["env", "add", name, target], value);
    if (res.status !== 0) {
      ok = false;
      const why = (res.stderr || res.stdout || "").trim().split("\n").pop();
      console.log(`  FAILED   ${name} (${target}) — ${why}`);
    }
  }
  if (ok) {
    console.log(`  sent     ${name}${secret ? "  (secret)" : ""}`);
    sent++;
  } else {
    failed++;
  }
}

console.log(
  `\n${DRY ? "dry run: " : ""}${sent} sent, ${skipped} not set locally, ${failed} failed`
);
if (!DRY && sent > 0) {
  console.log(
    "\nNEXT_PUBLIC_* values are compiled in at build time, so redeploy:\n  npx vercel deploy --prod --yes"
  );
}
process.exit(failed > 0 ? 1 : 0);
