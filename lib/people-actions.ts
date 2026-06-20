"use server";

import { createClient } from "./supabase/server";
import { getEntitlements } from "./entitlements";
import { FREE_LIMITS } from "./constants";

export type RevealResult =
  | { ok: true; remaining: number | null }
  | { ok: false; locked: true }
  | { ok: false; error: string };

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Reveal a profile's details. Premium → unlimited. Free → 5 distinct reveals
 * per day (re-revealing the same profile that day is free). Enforced here on the
 * server, not just in the UI.
 */
export async function revealProfile(
  profileId: string
): Promise<RevealResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const ent = await getEntitlements(user.id);
  if (ent.features.unlimitedReveals) return { ok: true, remaining: null };

  const since = startOfTodayISO();

  // Already revealed today? Then it's free and still counts as used.
  const { data: existing } = await supabase
    .from("usage_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("feature", "profile_reveal")
    .eq("target_id", profileId)
    .gte("created_at", since)
    .limit(1);

  const { data: todays } = await supabase
    .from("usage_events")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("feature", "profile_reveal")
    .gte("created_at", since);
  const used = new Set(
    ((todays ?? []) as Array<{ target_id: string | null }>)
      .map((r) => r.target_id)
      .filter((x): x is string => !!x)
  );

  if (existing && existing.length > 0) {
    return {
      ok: true,
      remaining: Math.max(0, FREE_LIMITS.profileRevealsPerDay - used.size),
    };
  }

  if (used.size >= FREE_LIMITS.profileRevealsPerDay) {
    return { ok: false, locked: true };
  }

  const { error } = await supabase
    .from("usage_events")
    .insert({ user_id: user.id, feature: "profile_reveal", target_id: profileId });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    remaining: Math.max(
      0,
      FREE_LIMITS.profileRevealsPerDay - (used.size + 1)
    ),
  };
}
