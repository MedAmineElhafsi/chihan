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
  // Kurdish classes for children, German courses, tutors (migration 0027).
  "classes",
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

/**
 * The categorical palette: earthy mid-tones that sit in both themes — dark
 * enough to read as a dot on cream, light enough to read on night plum. Used
 * as fills; as text, pass the colour through `categoryText()`.
 */
const HUE = {
  terracotta: "#c8643b",
  saffron: "#d89a2b",
  olive: "#7e9a3f",
  sage: "#5e9a78",
  teal: "#3f8f94",
  slate: "#5b7db8",
  dusk: "#6f7fa6",
  plum: "#8e62a8",
  orchid: "#b5679a",
  rose: "#c25b7a",
  clay: "#b07a56",
  apricot: "#e08a4f",
  stone: "#8f8579",
} as const;

/**
 * A category colour made safe for text in either theme: mixed toward the
 * page's ink, so it darkens on the light page and lightens on the dark one,
 * keeping its hue and holding 4.5:1.
 */
export function categoryText(color: string) {
  return `color-mix(in oklab, ${color} 45%, var(--ink))`;
}

/** Colour + icon per profession (people). */
export const PROFESSION_STYLE: Record<string, { color: string; icon: string }> = {
  student: { color: HUE.slate, icon: "🎓" },
  worker: { color: HUE.apricot, icon: "🔧" },
  engineer: { color: HUE.plum, icon: "⚙️" },
  doctor: { color: HUE.sage, icon: "🩺" },
  nurse: { color: HUE.teal, icon: "💊" },
  teacher: { color: HUE.saffron, icon: "📚" },
  artist: { color: HUE.rose, icon: "🎨" },
  business: { color: HUE.clay, icon: "💼" },
  driver: { color: HUE.dusk, icon: "🚗" },
  chef: { color: HUE.terracotta, icon: "👨‍🍳" },
  lawyer: { color: HUE.orchid, icon: "⚖️" },
  other: { color: HUE.stone, icon: "👤" },
};

/** Colour + icon per business category (listings). */
export const CATEGORY_STYLE: Record<string, { color: string; icon: string }> = {
  restaurant: { color: HUE.terracotta, icon: "🍽️" },
  doctor: { color: HUE.sage, icon: "🏥" },
  grocery: { color: HUE.slate, icon: "🛒" },
  lawyer: { color: HUE.plum, icon: "🏛️" },
  hairdresser: { color: HUE.rose, icon: "✂️" },
  community: { color: HUE.teal, icon: "🤝" },
  classes: { color: HUE.olive, icon: "📚" },
  other: { color: HUE.stone, icon: "🏪" },
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
    return { color: HUE.saffron, icon: "📅" };
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
  // Can come along to an appointment and interpret; interpreter requests
  // reach these members first.
  "interpreting",
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
  interpreting: ["language_exchange"],
};

/** Max gallery photos on a profile. */
export const PROFILE_PHOTOS_MAX = 8;

/** The launch community. Used as the default filter on the help board. */
export const LAUNCH_CITY = "Berlin";

/** Its country: which country-wide guides a reader sees by default. */
export const LAUNCH_COUNTRY = "Germany";

/** What newcomers actually need help with (matches the DB CHECK). */
export const HELP_CATEGORIES = [
  "housing",
  "paperwork",
  "work",
  "language",
  // Migration 0030, like "items". Offered only once it has run, and each
  // behind its flag; placed beside what people look for it next to.
  "interpreting",
  "health",
  "education",
  "family",
  "items",
  "legal",
  "transport",
  "other",
] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

/** Who asks and who gives: only things are given away (migration 0030). */
export const HELP_KINDS = ["ask", "give"] as const;
export type HelpKind = (typeof HELP_KINDS)[number];

/** Where an interpreter is needed (matches the DB CHECK). */
export const INTERPRET_SETTINGS = [
  "medical",
  "authority",
  "school",
  "legal",
  "work",
  "other",
] as const;
export type InterpretSetting = (typeof INTERPRET_SETTINGS)[number];

/** How the interpreter joins (matches the DB CHECK). */
export const INTERPRET_MEETINGS = ["in_person", "phone", "video"] as const;
export type InterpretMeeting = (typeof INTERPRET_MEETINGS)[number];

/** Photos on a give, and their size before the browser shrinks them. */
export const HELP_PHOTOS_MAX = 4;
export const HELP_PHOTO_BUCKET = "help-photos";

export const HELP_CATEGORY_STYLE: Record<
  string,
  { color: string; icon: string }
> = {
  // `icon` names a lucide component, resolved by components/help/category-icon.
  // Emoji were replaced: they render differently on every platform, cannot
  // inherit colour or weight, and are the loudest "unconsidered product"
  // signal an interface can carry.
  housing: { color: HUE.teal, icon: "House" },
  paperwork: { color: HUE.saffron, icon: "FileText" },
  work: { color: HUE.olive, icon: "Briefcase" },
  language: { color: HUE.plum, icon: "MessagesSquare" },
  health: { color: HUE.rose, icon: "Stethoscope" },
  education: { color: HUE.slate, icon: "GraduationCap" },
  family: { color: HUE.apricot, icon: "Users" },
  legal: { color: HUE.dusk, icon: "Scale" },
  transport: { color: HUE.sage, icon: "Car" },
  other: { color: HUE.stone, icon: "Circle" },
  interpreting: { color: HUE.orchid, icon: "Languages" },
  items: { color: HUE.terracotta, icon: "Gift" },
};

export const HELP_URGENCIES = ["normal", "soon", "urgent"] as const;
export type HelpUrgency = (typeof HELP_URGENCIES)[number];

/** Illustrative pricing (real Stripe prices wired in Phase 8). */
export const PRICING = {
  monthly: "€5.99",
  yearly: "€49.99",
} as const;

/**
 * Reel limits, tuned for the Supabase free tier (1 GB of storage).
 *
 * At roughly 8 MB a clip these caps allow about 120 reels before the plan has
 * to grow. Raising them is a change here and nowhere else — but the database
 * also caps duration at 120s, so lift that constraint too if you go past it.
 */
export const REEL_MAX_SECONDS = 30;
export const REEL_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
export const REEL_ACCEPT = ["video/mp4", "video/quicktime", "video/webm"] as const;
