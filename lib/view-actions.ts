"use server";

import { createClient } from "./supabase/server";

// The verified badge is no longer synced from Premium here: it means an
// administrator checked an identity document (0023), and only
// decide_verification sets it. See migration 0031.

export async function markProfileViewed(
  profileId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile || String(profile.user_id) === user.id) return { ok: false };

  const now = new Date().toISOString();
  const { error } = await supabase.from("profile_views").upsert(
    {
      profile_id: profileId,
      viewer_user_id: user.id,
      created_at: now,
    },
    { onConflict: "profile_id,viewer_user_id" }
  );
  if (error) return { ok: false };
  return { ok: true };
}
