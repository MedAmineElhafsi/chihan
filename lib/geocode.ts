import "server-only";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

// Simple in-process cache so repeated saves of the same place don't re-hit
// Nominatim (which asks for <= 1 req/sec and a descriptive User-Agent).
const cache = new Map<string, GeocodeResult | null>();

/** Resolve "city, country" to coordinates via OpenStreetMap Nominatim. */
export async function geocode(
  city?: string | null,
  country?: string | null
): Promise<GeocodeResult | null> {
  const query = [city, country].filter(Boolean).join(", ").trim();
  if (!query) return null;

  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: {
        "User-Agent": `Cihan/0.1 (${
          process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
        })`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data.length) {
      cache.set(key, null);
      return null;
    }

    const result: GeocodeResult = {
      lat: Number.parseFloat(data[0].lat),
      lng: Number.parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}
