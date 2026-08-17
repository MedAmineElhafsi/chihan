import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for genuinely public reads (globe points, directory,
 * news). These only ever select rows that RLS exposes to everyone, so binding
 * them to the visitor's session buys nothing — and costs a lot: when a session
 * expires, an authenticated client fails every query with "JWT expired" and the
 * page silently renders empty. Public data should never depend on login state.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
