import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off ESLint rules that conflict with Prettier formatting.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node debug/probe scripts — CommonJS, not part of the app bundle.
    "scripts/**",
    // Task worktrees hold their own checkout of this repo — linting them
    // reports the same files twice and picks up work in progress.
    ".claude/worktrees/**",
    // Service worker: plain browser JS, not linted as app source.
    "public/sw.js",
  ]),
]);

export default eslintConfig;
