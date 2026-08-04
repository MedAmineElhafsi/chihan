import "server-only";
import type { User } from "@supabase/supabase-js";

import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

/**
 * Returns the authenticated user, or null. Safe to call before Supabase keys
 * exist (returns null instead of throwing).
 *
 * Falls back to the cookie session when the Auth API is unreachable
 * (common Windows/Node timeout to Cloudflare) so login is not a redirect loop.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) return user;
  } catch {
    // network / timeout — try local session below
  }

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  } catch {
    return null;
  }
}
