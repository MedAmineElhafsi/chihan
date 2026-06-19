import "server-only";

import { createClient } from "./supabase/server";

export type GlobePoint = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  avatarUrl: string | null;
  category: "person";
};

/**
 * Public, consented, geocoded profiles as globe points. RLS only returns
 * `is_public` rows, so this is safe for anonymous visitors too. Returns an
 * empty array if the table doesn't exist yet (pre-migration) or on error.
 */
export async function getGlobePoints(): Promise<GlobePoint[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, city, country, lat, lng, avatar_url")
      .eq("is_public", true)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(2000);

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>)
      .filter((p) => p.lat != null && p.lng != null && p.display_name)
      .map((p) => ({
        id: String(p.id),
        name: String(p.display_name),
        city: (p.city as string | null) ?? null,
        country: (p.country as string | null) ?? null,
        lat: Number(p.lat),
        lng: Number(p.lng),
        avatarUrl: (p.avatar_url as string | null) ?? null,
        category: "person" as const,
      }));
  } catch {
    return [];
  }
}
