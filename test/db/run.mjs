/**
 * Runs every database test and says, in words, what each one proved.
 *
 *   npm run test:db              — all of them
 *   npm run test:db 0034         — only the files whose name matches
 *
 * A test file exports a title and a default function that is handed `t`:
 *
 *   export const title = "0034 — jobs and housing";
 *   export default async function (t) {
 *     t.section("who may post");
 *     t.ok("a verified member may", ...);
 *     await t.refuses("an unverified member may not", () => ..., /row-level/);
 *   }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TESTS = path.join(HERE, "tests");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const OFF = "\x1b[0m";

function reporter() {
  let passed = 0;
  const failures = [];

  return {
    passed: () => passed,
    failures,
    section(title) {
      console.log(`\n  ${DIM}${title}${OFF}`);
    },
    /** Assert, and say what was being asserted in a readable sentence. */
    ok(label, condition, detail = "") {
      if (condition) {
        passed++;
        console.log(`    ${GREEN}ok${OFF}   ${label}`);
      } else {
        failures.push(label);
        console.log(
          `    ${RED}FAIL${OFF} ${label}${detail ? ` ${DIM}— ${detail}${OFF}` : ""}`
        );
      }
    },
    /**
     * Assert that the database says no. The message is printed, because
     * which rule refused is as interesting as the refusal.
     */
    async refuses(label, fn, pattern) {
      try {
        await fn();
        failures.push(label);
        console.log(
          `    ${RED}FAIL${OFF} ${label} ${DIM}— it was allowed${OFF}`
        );
      } catch (err) {
        const message = String(err.message).replace(/\s+/g, " ").slice(0, 72);
        if (!pattern || pattern.test(err.message)) {
          passed++;
          console.log(
            `    ${GREEN}ok${OFF}   ${label} ${DIM}— ${message}${OFF}`
          );
        } else {
          failures.push(label);
          console.log(
            `    ${RED}FAIL${OFF} ${label} ${DIM}— wrong refusal: ${message}${OFF}`
          );
        }
      }
    },
  };
}

const filter = process.argv[2];
const files = fs
  .readdirSync(TESTS)
  .filter((f) => f.endsWith(".test.mjs"))
  .filter((f) => !filter || f.includes(filter))
  .sort();

if (files.length === 0) {
  console.error(`no test files${filter ? ` matching "${filter}"` : ""}`);
  process.exit(1);
}

const t = reporter();
const started = Date.now();

for (const file of files) {
  // On Windows an absolute path is not a valid ESM specifier.
  const mod = await import(pathToFileURL(path.join(TESTS, file)).href);
  console.log(`\n${BOLD}${mod.title ?? file}${OFF}`);
  try {
    await mod.default(t);
  } catch (err) {
    t.failures.push(`${file} threw`);
    console.log(`    ${RED}FAIL${OFF} the file itself threw — ${err.message}`);
  }
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log("");
if (t.failures.length === 0) {
  console.log(`${GREEN}${t.passed()} passed${OFF} in ${seconds}s`);
} else {
  console.log(
    `${RED}${t.failures.length} failed${OFF}, ${t.passed()} passed in ${seconds}s`
  );
  for (const f of t.failures) console.log(`  ${RED}·${OFF} ${f}`);
  process.exit(1);
}
