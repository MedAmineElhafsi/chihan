"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { geocode } from "./geocode";
import { KURDISH_DIALECTS, SPOKEN_LANGUAGES } from "./constants";

const schema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(400).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  languages: z.array(z.string()).max(20).optional().default([]),
  dialect: z.string().trim().max(60).optional().default(""),
  avatarUrl: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
});

export type SaveProfileInput = z.input<typeof schema>;
export type SaveProfileResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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
  const languages = v.languages.filter((l) =>
    (SPOKEN_LANGUAGES as readonly string[]).includes(l)
  );
  const dialect =
    v.dialect && (KURDISH_DIALECTS as readonly string[]).includes(v.dialect)
      ? v.dialect
      : null;

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

  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}
