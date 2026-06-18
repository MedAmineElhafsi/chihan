# Progress

Building in phases (see the project brief). One phase at a time; stop for confirmation after each.

## ✅ Phase 0 — Scaffold & Auth (complete)

- Next.js 16 (App Router, Turbopack) + TypeScript strict + Tailwind v4.
- shadcn/ui-style primitives on Radix (button, input, label, card, dropdown-menu, avatar);
  `components.json` set so the shadcn CLI works going forward.
- Design system: "cosmic warmth" tokens (dark-first night-sky + golden-sun `#E1B12C`),
  Fraunces / Manrope / Vazirmatn fonts, glassmorphism + starfield backdrop.
- i18n via next-intl: `en, de, ku, ckb, ar` with a language switcher and **RTL** flip
  (verified `dir=rtl`, Vazirmatn, mirrored layout for `ar`/`ckb`).
- Theme: next-themes (dark default, light + system), verified in both modes.
- Supabase client layer (`@supabase/ssr`): browser, server, service-role clients +
  session refresh composed with next-intl routing in **`proxy.ts`** (Next 16).
- Auth: email/password **sign up + log in + log out**, "Continue with Google" + `/auth/callback`,
  auth-gated `/dashboard` (redirects to login when signed out). Runs gracefully before keys exist.
- App shell: glass header (brand, placeholder nav with "soon" badges, language switcher,
  theme toggle, user menu), responsive + mobile menu, footer. Cinematic landing with hero globe.
- DB: `supabase/migrations/0000_init.sql` enables **PostGIS** + pgcrypto, adds `set_updated_at()`
  and documents the **RLS convention** (no feature tables yet — those start in Phase 1).
- Tooling/docs: ESLint (flat) + Prettier, `.env.example`, README, DECISIONS, this file.

**Verification:** `tsc --noEmit` ✓ · `eslint` ✓ · `next build` ✓ (25 static pages across 5 locales).
Browser-checked: landing (dark + light), `/ar/login` RTL, no console errors. Live auth round-trip
is "ready, pending Supabase keys."

## ⏭️ Next: Phase 1 — Profiles & onboarding

`profiles` table + RLS; onboarding with consent + location geocoding + languages + avatar upload;
editable profile + public profile view. **Awaiting "go".**

## Backlog (per brief)

Phase 2 Globe · 3 Directory & reviews · 4 People discovery + entitlements · 5 Chat ·
6 Feed & events · 7 News · 8 Stripe billing · 9 Polish, moderation, deploy.
