"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { syncProfessionalListing } from "./professional-actions";

import { createClient } from "./supabase/server";
import { geocode } from "./geocode";
import {
  INTERESTS,
  KURDISH_DIALECTS,
  LOOKING_FOR,
  OFFERING,
  ORIGIN_REGIONS,
  PROFILE_PHOTOS_MAX,
  PROFESSIONS,
  SPOKEN_LANGUAGES,
} from "./constants";

const schema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(400).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  languages: z.array(z.string()).max(20).optional().default([]),
  dialect: z.string().trim().max(60).optional().default(""),
  profession: z.string().trim().max(40).optional().default(""),
  originRegion: z.string().trim().max(40).optional().default(""),
  interests: z.array(z.string()).max(20).optional().default([]),
  lookingFor: z.array(z.string()).max(20).optional().default([]),
  offering: z.array(z.string()).max(20).optional().default([]),
  photos: z.array(z.string().url()).max(8).optional().default([]),
  avatarUrl: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
});

export type SaveProfileInput = z.input<typeof schema>;
export type SaveProfileResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function pickKnown(values: string[], allowed: readonly string[]): string[] {
  return values.filter((v) => allowed.includes(v));
}

/**
 * Create or update the current user's profile. Geocodes city/country to
 * coordinates and records consent (`consent_at`/`is_public`) per brief §7 —
 * profiles are private until the user explicitly opts in.
 */
export async function saveProfile(
  input: SaveProfileInput
): Promise<SaveProfileResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Only persist values from the known sets (never trust the client).
  const languages = pickKnown(v.languages, SPOKEN_LANGUAGES);
  const dialect =
    v.dialect && (KURDISH_DIALECTS as readonly string[]).includes(v.dialect)
      ? v.dialect
      : null;
  const profession =
    v.profession && (PROFESSIONS as readonly string[]).includes(v.profession)
      ? v.profession
      : null;
  const originRegion =
    v.originRegion &&
    (ORIGIN_REGIONS as readonly string[]).includes(v.originRegion)
      ? v.originRegion
      : null;
  const interests = pickKnown(v.interests, INTERESTS);
  const lookingFor = pickKnown(v.lookingFor, LOOKING_FOR);
  const offering = pickKnown(v.offering, OFFERING);
  const photos = v.photos.slice(0, PROFILE_PHOTOS_MAX);

  const geo = await geocode(v.city, v.country);

  const row = {
    user_id: user.id,
    display_name: v.displayName,
    bio: v.bio || null,
    city: v.city || null,
    country: v.country || null,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    languages,
    dialect,
    profession,
    origin_region: originRegion,
    interests,
    looking_for: lookingFor,
    offering,
    photos,
    avatar_url: v.avatarUrl || null,
    is_public: v.isPublic,
    consent_at: v.isPublic ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // If they are listed as a professional, the listing describes them — keep it
  // in step rather than leaving it describing who they used to be.
  await syncProfessionalListing(user.id);

  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}
