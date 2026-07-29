import "server-only";

import { createClient } from "./supabase/server";

export type GlobePoint = {
  id: string;
  kind: "person" | "listing";
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  avatarUrl: string | null;
  /** Listing category, or "person" for members. */
  category: string;
  /** For people: their profession (drives the marker colour). */
  profession: string | null;
};

/**
 * Globe points: public consented profiles (people) + all listings. RLS keeps
 * private profiles out. Returns [] on error / pre-migration so the page still
 * renders (people show even if the listings table doesn't exist yet).
 */
export async function getGlobePoints(): Promise<GlobePoint[]> {
  try {
    const supabase = await createClient();
    const PROFILE_PT = "id, display_name, city, country, lat, lng, avatar_url";
    const profileQuery = (cols: string) =>
      supabase
        .from("profiles")
        .select(cols)
        .eq("is_public", true)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(2000);

    const results = await Promise.all([
      profileQuery(`${PROFILE_PT}, profession`),
      supabase
        .from("listings")
        .select("id, name, category, city, country, lat, lng, photos")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(2000),
    ]);
    const listingsRes = results[1];

    // `profession` only exists after migration 0008 — retry without it if needed.
    const profilesRes = results[0].error
      ? await profileQuery(PROFILE_PT)
      : results[0];

    const profileRows = (profilesRes.data ?? []) as unknown as Array<
      Record<string, unknown>
    >;
    const points: GlobePoint[] = [];

    for (const p of profileRows) {
      if (p.lat == null || p.lng == null || !p.display_name) continue;
      points.push({
        id: String(p.id),
        kind: "person",
        name: String(p.display_name),
        city: (p.city as string | null) ?? null,
        country: (p.country as string | null) ?? null,
        lat: Number(p.lat),
        lng: Number(p.lng),
        avatarUrl: (p.avatar_url as string | null) ?? null,
        category: "person",
        profession: (p.profession as string | null) ?? null,
      });
    }

    for (const l of (listingsRes.data ?? []) as Array<Record<string, unknown>>) {
      if (l.lat == null || l.lng == null || !l.name) continue;
      const photos = Array.isArray(l.photos) ? (l.photos as string[]) : [];
      points.push({
        id: String(l.id),
        kind: "listing",
        name: String(l.name),
        city: (l.city as string | null) ?? null,
        country: (l.country as string | null) ?? null,
        lat: Number(l.lat),
        lng: Number(l.lng),
        avatarUrl: photos[0] ?? null,
        category: String(l.category),
        profession: null,
      });
    }

    return points;
  } catch {
    return [];
  }
}
