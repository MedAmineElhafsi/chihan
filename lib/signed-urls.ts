import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How long a link to a private file lasts. Long enough for a long visit; a
 * player that outlives its link asks for a new one.
 */
export const SIGNED_FOR_SECONDS = 6 * 60 * 60;

/**
 * Links to many private files in one request, made with the viewer's own
 * session — so the bucket's policy decides, and a file the viewer may not
 * read comes back without a link rather than with one.
 */
export async function signPaths(
  supabase: { storage: SupabaseClient["storage"] },
  bucket: string,
  paths: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(unique, SIGNED_FOR_SECONDS);
    if (error || !data) return out;
    for (const d of data) {
      if (d.path && d.signedUrl && !d.error) out.set(d.path, d.signedUrl);
    }
  } catch {
    // A missing link shows as "can't play"; the page itself still renders.
  }
  return out;
}
