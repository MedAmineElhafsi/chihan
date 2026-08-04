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

/** Directory listing categories (matches the `listings.category` CHECK). */
export const LISTING_CATEGORIES = [
  "restaurant",
  "doctor",
  "grocery",
  "lawyer",
  "hairdresser",
  "community",
  "other",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

/** What a member does — colour-codes people on the globe. */
export const PROFESSIONS = [
  "student",
  "worker",
  "engineer",
  "doctor",
  "nurse",
  "teacher",
  "artist",
  "business",
  "driver",
  "chef",
  "lawyer",
  "other",
] as const;
export type Profession = (typeof PROFESSIONS)[number];

/** Colour + icon per profession (people). */
export const PROFESSION_STYLE: Record<string, { color: string; icon: string }> = {
  student: { color: "#38bdf8", icon: "🎓" },
  worker: { color: "#f97316", icon: "🔧" },
  engineer: { color: "#a78bfa", icon: "⚙️" },
  doctor: { color: "#34d399", icon: "🩺" },
  nurse: { color: "#2dd4bf", icon: "💊" },
  teacher: { color: "#facc15", icon: "📚" },
  artist: { color: "#f472b6", icon: "🎨" },
  business: { color: "#e1b12c", icon: "💼" },
  driver: { color: "#60a5fa", icon: "🚗" },
  chef: { color: "#fb7185", icon: "👨‍🍳" },
  lawyer: { color: "#818cf8", icon: "⚖️" },
  other: { color: "#cbd5e1", icon: "👤" },
};

/** Colour + icon per business category (listings). */
export const CATEGORY_STYLE: Record<string, { color: string; icon: string }> = {
  restaurant: { color: "#d6443b", icon: "🍽️" },
  doctor: { color: "#1fa36b", icon: "🏥" },
  grocery: { color: "#3b82f6", icon: "🛒" },
  lawyer: { color: "#a855f7", icon: "🏛️" },
  hairdresser: { color: "#ec4899", icon: "✂️" },
  community: { color: "#14b8a6", icon: "🤝" },
  other: { color: "#94a3b8", icon: "🏪" },
};

/** Back-compat colour map (person + categories) used by list UIs. */
export const CATEGORY_COLORS: Record<string, string> = {
  person: PROFESSION_STYLE.business.color,
  ...Object.fromEntries(
    Object.entries(CATEGORY_STYLE).map(([k, v]) => [k, v.color])
  ),
};

/** Resolve the marker style for any globe point. */
export function pointStyle(
  kind: "person" | "listing" | "event",
  key: string | null | undefined
): { color: string; icon: string } {
  if (kind === "event") {
    return { color: "#e1b12c", icon: "📅" };
  }
  const table = kind === "person" ? PROFESSION_STYLE : CATEGORY_STYLE;
  return table[key ?? "other"] ?? table.other;
}

export const LISTING_PHOTO_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/** Kurdish geographic / diaspora origin (onboarding single-select). */
export const ORIGIN_REGIONS = [
  "bakur",
  "bashur",
  "rojava",
  "rojhilat",
  "diaspora",
  "mixed",
] as const;
export type OriginRegion = (typeof ORIGIN_REGIONS)[number];

/** Community interests (onboarding multi-select). */
export const INTERESTS = [
  "culture",
  "music",
  "sports",
  "business",
  "education",
  "family",
  "tech",
  "art",
  "food",
  "volunteering",
  "politics",
  "faith",
] as const;
export type Interest = (typeof INTERESTS)[number];

/** What a member is looking for. */
export const LOOKING_FOR = [
  "friends",
  "housing",
  "work",
  "mentorship",
  "events",
  "language_exchange",
  "business_partners",
] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** What a member can offer others. */
export const OFFERING = [
  "friendship",
  "housing_help",
  "job_leads",
  "mentorship",
  "local_tips",
  "language_help",
  "business_help",
  "volunteering",
] as const;
export type Offering = (typeof OFFERING)[number];

/**
 * Maps a "looking for" need to the offering tags that satisfy it.
 * Used by reciprocal matching.
 */
export const LOOKING_TO_OFFERING: Record<LookingFor, readonly Offering[]> = {
  friends: ["friendship"],
  housing: ["housing_help"],
  work: ["job_leads"],
  mentorship: ["mentorship"],
  events: ["local_tips", "volunteering"],
  language_exchange: ["language_help"],
  business_partners: ["business_help"],
};

/** Reverse: which looking_for tags an offering can satisfy. */
export const OFFERING_TO_LOOKING: Record<Offering, readonly LookingFor[]> = {
  friendship: ["friends"],
  housing_help: ["housing"],
  job_leads: ["work"],
  mentorship: ["mentorship"],
  local_tips: ["events"],
  language_help: ["language_exchange"],
  business_help: ["business_partners"],
  volunteering: ["events"],
};

/** Max gallery photos on a profile. */
export const PROFILE_PHOTOS_MAX = 8;

/** Illustrative pricing (real Stripe prices wired in Phase 8). */
export const PRICING = {
  monthly: "€5.99",
  yearly: "€49.99",
} as const;
