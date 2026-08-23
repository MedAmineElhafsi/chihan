import "server-only";

import { createPublicClient } from "./supabase/public";

export type GlobePoint = {
  id: string;
  kind: "person" | "listing" | "event";
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  avatarUrl: string | null;
  /** Listing category, "person", or "event". */
  category: string;
  /** For people: their profession (drives the marker colour). */
  profession: string | null;
  /** Events only. */
  eventAt?: string | null;
};

/**
 * Globe points: public profiles + listings + upcoming geocoded events.
 */
export async function getGlobePoints(): Promise<GlobePoint[]> {
  try {
    // Public data only — deliberately not bound to the visitor's session.
    const supabase = createPublicClient();
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
      supabase
        .from("posts")
        .select(
          "id, event_title, event_at, event_location, event_lat, event_lng, group_id"
        )
        .eq("type", "event")
        .is("group_id", null)
        .not("event_lat", "is", null)
        .not("event_lng", "is", null)
        .gte("event_at", new Date().toISOString())
        .order("event_at", { ascending: true })
        .limit(500),
    ]);
    const listingsRes = results[1];
    const eventsRes = results[2];

    // Surface query failures. A blanket catch used to swallow these, which hid
    // an auth-only RLS failure that silently emptied the whole globe.
    for (const [name, res] of [
      ["profiles", results[0]],
      ["listings", listingsRes],
      ["events", eventsRes],
    ] as const) {
      if (res.error) {
        console.error(`[globe] ${name} query failed:`, res.error.message);
      }
    }

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

    for (const e of (eventsRes.data ?? []) as Array<Record<string, unknown>>) {
      if (e.event_lat == null || e.event_lng == null) continue;
      const title = (e.event_title as string | null) || "Event";
      points.push({
        id: String(e.id),
        kind: "event",
        name: title,
        city: (e.event_location as string | null) ?? null,
        country: null,
        lat: Number(e.event_lat),
        lng: Number(e.event_lng),
        avatarUrl: null,
        category: "event",
        profession: null,
        eventAt: (e.event_at as string | null) ?? null,
      });
    }

    return points;
  } catch (err) {
    console.error("[globe] getGlobePoints threw:", err);
    return [];
  }
}
