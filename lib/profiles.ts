import "server-only";

import { createClient } from "./supabase/server";
import {
  isMissingProfession,
  profileColumns,
} from "./profile-columns";
import {
  PROFILE_COLUMNS_BASE,
  type Profile,
  type ProfileViewer,
} from "@/types/profile";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function normalizeProfile(data: Record<string, unknown> | null): Profile | null {
  if (!data) return null;
  return {
    ...(data as unknown as Profile),
    languages: asStringArray(data.languages),
    profession: (data.profession as string | null) ?? null,
    origin_region: (data.origin_region as string | null) ?? null,
    interests: asStringArray(data.interests),
    looking_for: asStringArray(data.looking_for),
    offering: asStringArray(data.offering),
    photos: asStringArray(data.photos),
    is_verified: Boolean(data.is_verified),
    is_banned: Boolean(data.is_banned),
  };
}

/** The signed-in user's own profile (visible even while private), or null. */
export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const run = (cols: string) =>
    supabase.from("profiles").select(cols).eq("user_id", userId).maybeSingle();

  let { data, error } = await run(profileColumns());
  if (isMissingProfession(error))
    ({ data, error } = await run(PROFILE_COLUMNS_BASE));
  return normalizeProfile((data as Record<string, unknown> | null) ?? null);
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
  if (isMissingProfession(error))
    ({ data, error } = await run(PROFILE_COLUMNS_BASE));
  return normalizeProfile((data as Record<string, unknown> | null) ?? null);
}

/** Record that `viewerUserId` opened `profileId` (no-op for self / missing auth). */
export async function recordProfileView(
  profileId: string,
  viewerUserId: string,
  profileOwnerUserId: string
): Promise<void> {
  if (viewerUserId === profileOwnerUserId) return;
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("profile_views").upsert(
      {
        profile_id: profileId,
        viewer_user_id: viewerUserId,
        created_at: now,
      },
      { onConflict: "profile_id,viewer_user_id" }
    );
    if (error) {
      // Table missing pre-migration — ignore.
    }
  } catch {
    // ignore
  }
}

/** Viewers of the owner's profile, newest first. */
export async function getProfileViewers(
  ownerUserId: string,
  limit = 50
): Promise<ProfileViewer[]> {
  try {
    const supabase = await createClient();
    const { data: own } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", ownerUserId)
      .maybeSingle();
    if (!own?.id) return [];

    const { data: views, error } = await supabase
      .from("profile_views")
      .select("viewer_user_id, created_at")
      .eq("profile_id", own.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !views?.length) return [];

    const ids = views.map((v) => String(v.viewer_user_id));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url, city, country, is_public")
      .in("user_id", ids);

    const byUser = new Map(
      (profiles ?? []).map((p) => [String(p.user_id), p] as const)
    );

    return views.map((v) => {
      const p = byUser.get(String(v.viewer_user_id));
      return {
        viewer_user_id: String(v.viewer_user_id),
        profile_id: p?.is_public ? String(p.id) : null,
        display_name: (p?.display_name as string | null) ?? null,
        avatar_url: (p?.avatar_url as string | null) ?? null,
        city: (p?.city as string | null) ?? null,
        country: (p?.country as string | null) ?? null,
        viewed_at: String(v.created_at),
      };
    });
  } catch {
    return [];
  }
}
