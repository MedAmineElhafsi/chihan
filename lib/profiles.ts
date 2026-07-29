import "server-only";

import { createClient } from "./supabase/server";
import {
  isMissingProfession,
  profileColumns,
} from "./profile-columns";
import { PROFILE_COLUMNS_BASE, type Profile } from "@/types/profile";

/** The signed-in user's own profile (visible even while private), or null. */
export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const run = (cols: string) =>
    supabase.from("profiles").select(cols).eq("user_id", userId).maybeSingle();

  let { data, error } = await run(profileColumns());
  if (isMissingProfession(error)) ({ data, error } = await run(PROFILE_COLUMNS_BASE));
  return (data as Profile | null) ?? null;
}

/**
 * A profile by id. RLS ensures private profiles only return for their owner —
 * for everyone else this resolves to null (→ 404).
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const run = (cols: string) =>
    supabase.from("profiles").select(cols).eq("id", id).maybeSingle();

  let { data, error } = await run(profileColumns());
  if (isMissingProfession(error)) ({ data, error } = await run(PROFILE_COLUMNS_BASE));
  return (data as Profile | null) ?? null;
}
