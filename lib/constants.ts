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

/** Languages a member might speak (onboarding multi-select). */
export const SPOKEN_LANGUAGES = [
  "Kurmancî",
  "Soranî",
  "Zazakî",
  "Hewramî",
  "Southern Kurdish",
  "Arabic",
  "Turkish",
  "Persian",
  "English",
  "German",
  "French",
  "Swedish",
  "Dutch",
] as const;

/** Kurdish dialects (onboarding single-select). */
export const KURDISH_DIALECTS = [
  "Kurmancî",
  "Soranî",
  "Zazakî (Kirmanckî)",
  "Hewramî (Gorani)",
  "Southern Kurdish (Kelhurî/Feylî)",
] as const;

/** Avatar upload constraints. */
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
export const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
