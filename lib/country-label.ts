/**
 * Countries are stored by their English name ("Germany"), as members type
 * them. Shown to a reader they read better in the reader's language —
 * "Deutschland", "ئەڵمانیا", "ألمانيا" — for the countries the diaspora
 * mostly lives in. Anything else is shown as stored.
 */
const ISO: Record<string, string> = {
  germany: "DE",
  sweden: "SE",
  netherlands: "NL",
  "the netherlands": "NL",
  austria: "AT",
  switzerland: "CH",
  france: "FR",
  belgium: "BE",
  denmark: "DK",
  norway: "NO",
  finland: "FI",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  italy: "IT",
  greece: "GR",
  iraq: "IQ",
  turkey: "TR",
  türkiye: "TR",
  syria: "SY",
  iran: "IR",
  "united states": "US",
  usa: "US",
  canada: "CA",
  australia: "AU",
};

const cache = new Map<string, Intl.DisplayNames | null>();

export function countryLabel(country: string, locale: string): string {
  const code = ISO[country.trim().toLocaleLowerCase("en")];
  if (!code) return country;
  if (!cache.has(locale)) {
    try {
      cache.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      cache.set(locale, null);
    }
  }
  const name = cache.get(locale)?.of(code);
  return name && name !== code ? name : country;
}
