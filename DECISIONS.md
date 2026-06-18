# Decisions

A running log of notable technical/product decisions and their rationale.

## Phase 0

- **Cloud Supabase (not local Docker).** No Docker on the dev machine; cloud is the fastest
  path to a working demo. Migrations are versioned SQL applied via the dashboard/CLI.
- **Google login built now, configured later.** The button + `/auth/callback` flow ships in
  Phase 0; Google activates once OAuth credentials are added in the Supabase dashboard.
  Email/password works immediately.
- **Next.js 16** (current latest from `create-next-app`). Required adapting to breaking changes:
  `middleware.ts` → **`proxy.ts`** (Node runtime), **async** `params`/`cookies()`/`headers()`,
  ESLint flat config, Turbopack by default, and **Tailwind v4** (CSS-first `@theme`).
- **proxy.ts composition order:** run next-intl routing first (it owns the response), then
  refresh the Supabase session onto that response. Skipped gracefully when Supabase env vars
  are absent, so the app runs before keys exist.
- **Auth route handlers live outside `[locale]`** (`/auth/callback`, `/auth/signout`) and are
  excluded from the proxy matcher to avoid locale-prefix rewrites.
- **npm** as the package manager (no pnpm/yarn present).
- **Design direction "cosmic warmth":** dark-first night-sky base with a single golden-sun
  accent (`#E1B12C`); Kurdish red/green used sparingly. Fonts: Fraunces (display) + Manrope
  (UI) + Vazirmatn (Arabic/RTL) — deliberately avoiding generic stacks (no Inter/Roboto).
- **Bespoke shadcn-style primitives.** Rather than run `shadcn init` against bleeding-edge
  Next 16 / Tailwind v4 (risk of mangling the custom theme), the primitives are hand-authored
  in shadcn conventions with a `components.json`, so the CLI can still add components later.
- **Placeholder nav** (Explore/Directory/People/Feed/News) shown with "Soon" badges instead of
  dead links — honest about the roadmap, no 404s.
- **Translations:** English is source-of-truth; German + Arabic are solid; Kurmancî/Soranî are
  best-effort for Phase 0 and flagged for native review.
- **`getEntitlements`/limits** stub placed in `lib/constants.ts` (`FREE_LIMITS`) now so monetization
  numbers live in one tunable place; enforcement arrives in Phase 4.
