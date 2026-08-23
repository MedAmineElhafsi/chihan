/**
 * Which surfaces are live.
 *
 * Cîhan's job is helping newcomers settle. Everything that does not serve that
 * loop is switched off for launch rather than deleted: the code and database
 * tables stay untouched, so any of these can be restored by flipping a flag
 * once the community is dense enough to make them work.
 *
 * Cut for launch, and why:
 *  - groups  — dead rooms without density; duplicates chat and the feed
 *  - feed    — an empty feed reads as abandoned; the help board is the reason
 *              to come back
 *  - stories — a social-network habit with no connection to settling in
 *  - people  — browsing strangers is a dating pattern; here you post a need and
 *              help comes to you
 *  - match   — superseded by the help board
 *  - views   — "who viewed me" is uncomfortable for a safety-conscious audience
 *  - billing — with no users a paywall earns nothing and only adds friction
 */
export const FEATURES = {
  // The five tabs and what hangs off them.
  help: true,
  directory: true,
  explore: true,
  news: true,
  messages: true,
  search: true,
  feed: true,
  stories: true,
  groups: true,
  people: true,

  reels: true,

  // Deliberately off. Matches and who-viewed are engagement machinery that
  // works against a community built on helping; billing earns nothing at
  // zero users. All three are one flag away, with their data intact.
  match: false,
  views: false,
  billing: false,
} as const;

export type FeatureName = keyof typeof FEATURES;

export function isEnabled(name: FeatureName): boolean {
  return FEATURES[name];
}

/** Route segments that are switched off — used to 404 them. */
export const DISABLED_ROUTES = (
  ["groups", "feed", "people", "match", "views", "pricing"] as const
).filter((seg) => {
  if (seg === "pricing") return !FEATURES.billing;
  return !FEATURES[seg as FeatureName];
});
