import type { GlobePoint } from "./globe";

/**
 * What the globe adds up to.
 *
 * Shared by the landing hero and the panel beside the globe, so the two can
 * never show a visitor different numbers under the same word.
 *
 * Members, and where the members are. A restaurant is a place, not a person,
 * so counting its city would overstate how far the community itself reaches.
 * City by name alone would fold Berlin, Germany into Berlin, Maryland, which
 * is why the country goes into the key.
 */
export function globeTotals(points: GlobePoint[]) {
  const people = points.filter((p) => p.kind === "person");
  return {
    members: people.length,
    places: points.filter((p) => p.kind === "listing").length,
    cities: new Set(
      people.filter((p) => p.city).map((p) => `${p.city}, ${p.country}`)
    ).size,
    countries: new Set(people.map((p) => p.country).filter(Boolean)).size,
  };
}
