import "server-only";
import type { User } from "@supabase/supabase-js";

import { supabaseConfigured } from "./env";
import { createClient } from "./supabase/server";

/**
 * Returns the authenticated user, or null. Safe to call before Supabase keys
 * exist (returns null instead of throwing).
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
