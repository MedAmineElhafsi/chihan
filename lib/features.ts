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
  help: true,
  directory: true,
  explore: true,
  news: true,
  messages: true,
  search: true,

  groups: false,
  feed: false,
  stories: false,
  people: false,
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
