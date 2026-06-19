import "server-only";

import { createClient } from "./supabase/server";
import { PROFILE_COLUMNS, type Profile } from "@/types/profile";

/** The signed-in user's own profile (visible even while private), or null. */
export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/**
 * A profile by id. RLS ensures private profiles only return for their owner —
 * for everyone else this resolves to null (→ 404).
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}
