"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { getEntitlements } from "./entitlements";

/** Keep profiles.is_verified in sync with the Premium entitlement. */
export async function syncVerifiedBadge(userId: string): Promise<void> {
  try {
    const ent = await getEntitlements(userId);
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ is_verified: ent.features.verifiedBadge })
      .eq("user_id", userId);
  } catch {
    // Column / table missing — ignore.
  }
}

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

export async function refreshOwnVerifiedBadge(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await syncVerifiedBadge(user.id);
  revalidatePath("/profile");
}
