/** Brand configuration. Working name — update when the customer confirms. */
export const BRAND = {
  name: "Cîhan",
} as const;

/**
 * Free-tier limits (brief §5). Enforced from Phase 4 onward; kept here so the
 * customer can tune monetization in one place.
 */
export const FREE_LIMITS = {
  profileRevealsPerDay: 5,
  newConversationsPerDay: 3,
  feedEventHorizonDays: 30,
} as const;
