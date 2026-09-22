/** What a newcomer wants help with, and what a buddy offers. */
export const BUDDY_AREAS = [
  "paperwork",
  "language",
  "city",
  "work",
  "social",
  "family",
] as const;
export type BuddyArea = (typeof BUDDY_AREAS)[number];

export type BuddyRole = "newcomer" | "mentor";

export type BuddyProfile = {
  user_id: string;
  role: BuddyRole;
  areas: string[];
  about: string | null;
  capacity: number;
  active: boolean;
  agreed_at: string;
};

export type BuddyPerson = {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  languages: string[];
  verified: boolean;
};

export type BuddyPair = {
  id: string;
  newcomer_id: string;
  mentor_id: string;
  status: "requested" | "active" | "declined" | "ended";
  message: string | null;
  created_at: string;
  /** The other person in the pair, as far as the viewer may see them. */
  partner: BuddyPerson | null;
  /** Their buddy entry, when the viewer may read it. */
  partnerEntry: { areas: string[]; about: string | null } | null;
};

/** A buddy a newcomer could ask, with what makes them a good match. */
export type BuddyCandidate = BuddyPerson & {
  areas: string[];
  about: string | null;
  helped: number;
  freePlaces: number;
  sharedLanguages: string[];
  sharedAreas: string[];
};

export const BUDDY_COLUMNS =
  "user_id, role, areas, about, capacity, active, agreed_at";

export function toBuddyProfile(r: Record<string, unknown>): BuddyProfile {
  return {
    user_id: String(r.user_id),
    role: r.role === "mentor" ? "mentor" : "newcomer",
    areas: Array.isArray(r.areas) ? (r.areas as string[]) : [],
    about: (r.about as string | null) ?? null,
    capacity: Number(r.capacity) || 1,
    active: r.active !== false,
    agreed_at: String(r.agreed_at),
  };
}
