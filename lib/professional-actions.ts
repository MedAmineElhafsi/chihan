"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";

/**
 * Turning on "I offer a professional service" gives a member a listing of
 * their own. Reviews already attach to listings, so a mechanic, a translator
 * and a restaurant all share one review system rather than three.
 *
 * Switching it off hides the listing but keeps the reviews — deleting the
 * listing would erase other people's writing, which is not ours to erase.
 */

/** Professions map onto the seven map categories; the trade itself is kept. */
const CATEGORY_FOR: Record<string, string> = {
  doctor: "doctor",
  nurse: "doctor",
  lawyer: "lawyer",
  chef: "restaurant",
  business: "other",
};

/**
 * Copy the profile onto the person's professional listing.
 *
 * Called when the switch goes on and again whenever the profile is saved —
 * otherwise changing your profession or moving city would leave the listing
 * describing who you used to be.
 */
export async function syncProfessionalListing(
  userId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, city, country, lat, lng, profession, avatar_url, offers_service")
    .eq("user_id", userId)
    .maybeSingle();

  const p = profile as Record<string, unknown> | null;
  if (!p || p.offers_service !== true || !p.display_name) return { ok: false };

  const profession = (p.profession as string | null) ?? "other";
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("kind", "professional")
    .maybeSingle();

  const row = {
    owner_user_id: userId,
    kind: "professional",
    profession,
    category: CATEGORY_FOR[profession] ?? "other",
    name: String(p.display_name),
    description: (p.bio as string | null) ?? null,
    city: (p.city as string | null) ?? null,
    country: (p.country as string | null) ?? null,
    lat: (p.lat as number | null) ?? null,
    lng: (p.lng as number | null) ?? null,
    photos: p.avatar_url ? [String(p.avatar_url)] : [],
  };

  const { error } = existing
    ? await supabase
        .from("listings")
        .update(row)
        .eq("id", String((existing as Record<string, unknown>).id))
    : await supabase.from("listings").insert(row);

  return { ok: !error };
}

export async function setOffersService(
  on: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, city, country, lat, lng, profession, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return { ok: false, error: "no_profile" };
  const p = profile as Record<string, unknown>;

  if (!p.display_name) return { ok: false, error: "needs_name" };

  const { error: flagError } = await supabase
    .from("profiles")
    .update({ offers_service: on })
    .eq("user_id", user.id);
  if (flagError) return { ok: false, error: flagError.message };

  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("kind", "professional")
    .maybeSingle();

  if (on) {
    const { ok } = await syncProfessionalListing(user.id);
    if (!ok) return { ok: false, error: "listing_sync_failed" };
  } else if (existing) {
    // Off means invisible, not erased: the reviews people wrote survive.
    const { error } = await supabase
      .from("listings")
      .update({ lat: null, lng: null })
      .eq("id", String((existing as Record<string, unknown>).id));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** The professional's single public answer to a review about them. */
export async function replyToReview(
  reviewId: string,
  body: string,
  listingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // The database proves ownership; this call cannot forge a reply.
  const { error } = await supabase.rpc("reply_to_review", {
    p_review: reviewId,
    p_body: body.slice(0, 1000),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/directory/${listingId}`);
  return { ok: true };
}
