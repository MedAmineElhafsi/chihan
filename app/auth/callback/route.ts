import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

/**
 * OAuth + email-confirmation callback. Exchanges the `code` for a session
 * (writes auth cookies) and redirects to `next`. Lives outside `[locale]`
 * so the proxy never rewrites it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code && supabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Failed or missing code — bounce to login (proxy localizes `/login`).
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
