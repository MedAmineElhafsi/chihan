import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// In Next.js 16 the former `middleware.ts` is now `proxy.ts` (Node.js runtime).
// We compose two responsibilities here:
//   1. next-intl locale routing (may redirect `/` -> `/en`, rewrite, etc.)
//   2. Supabase auth session refresh (keeps the auth cookie fresh)

const intlProxy = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1) Resolve locale routing first; this owns the outgoing response.
  const response = intlProxy(request);

  // 2) Refresh the Supabase session onto that response.
  //    Gracefully skipped until Supabase env vars are provided, so the app
  //    runs locally before any keys exist.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    try {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Do not insert logic between client creation and getUser(): it refreshes
      // the session and writes any rotated cookies onto `response`.
      // Catch timeouts so a flaky network does not break every page.
      await supabase.auth.getUser();
    } catch {
      // Auth refresh failed (e.g. ETIMEDOUT to Supabase). Continue with
      // existing cookies — client components can still use the session.
    }
  }

  return response;
}

export const config = {
  // Run on everything except API + auth route handlers, Next internals, and files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
