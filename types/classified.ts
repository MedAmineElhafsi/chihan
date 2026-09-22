export const CLASSIFIED_KINDS = ["job", "housing"] as const;
export type ClassifiedKind = (typeof CLASSIFIED_KINDS)[number];

export const HOUSING_TYPES = [
  "room",
  "apartment",
  "shared",
  "temporary",
] as const;
export const JOB_TYPES = [
  "full_time",
  "part_time",
  "mini_job",
  "apprenticeship",
  "temporary",
] as const;
export const RENT_KINDS = ["warm", "cold"] as const;
export const PAY_UNITS = ["hour", "month"] as const;

/** Wording that holds a post for review, and wording that only warns. */
export const HOLDING_FLAGS = [
  "payment_before_viewing",
  "wire_transfer",
  "crypto",
  "keys_by_post",
  "fee_to_apply",
] as const;
export const WARNING_FLAGS = ["off_platform", "rent_far_below"] as const;

export const CLASSIFIED_PHOTOS_MAX = 6;
export const BOARD_PHOTO_BUCKET = "board-photos";

export type Classified = {
  id: string;
  author_id: string;
  kind: ClassifiedKind;
  title: string;
  description: string;
  city: string | null;
  district: string | null;
  housing_type: string | null;
  rent_cents: number | null;
  rent_kind: string | null;
  size_m2: number | null;
  rooms: number | null;
  available_from: string | null;
  deposit_cents: number | null;
  employer: string | null;
  job_type: string | null;
  pay_cents: number | null;
  pay_unit: string | null;
  languages: string[];
  photo_urls: string[];
  status: "open" | "held" | "filled" | "removed";
  flags: string[];
  expires_at: string;
  created_at: string;
  author: {
    userId: string;
    profileId: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    verified: boolean;
    memberSince: string | null;
  } | null;
};

export const CLASSIFIED_COLUMNS =
  "id, author_id, kind, title, description, city, district, housing_type, rent_cents, rent_kind, size_m2, rooms, available_from, deposit_cents, employer, job_type, pay_cents, pay_unit, languages, photos, status, flags, expires_at, created_at";

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (v == null ? null : Number(v));

export function photoPathsOf(r: Record<string, unknown>): string[] {
  return Array.isArray(r.photos)
    ? (r.photos as unknown[]).filter((p): p is string => typeof p === "string")
    : [];
}

export function toClassified(
  r: Record<string, unknown>,
  photoUrls: string[],
  author: Classified["author"]
): Classified {
  return {
    id: String(r.id),
    author_id: String(r.author_id),
    kind: r.kind === "job" ? "job" : "housing",
    title: String(r.title),
    description: String(r.description),
    city: str(r.city),
    district: str(r.district),
    housing_type: str(r.housing_type),
    rent_cents: num(r.rent_cents),
    rent_kind: str(r.rent_kind),
    size_m2: num(r.size_m2),
    rooms: num(r.rooms),
    available_from: str(r.available_from),
    deposit_cents: num(r.deposit_cents),
    employer: str(r.employer),
    job_type: str(r.job_type),
    pay_cents: num(r.pay_cents),
    pay_unit: str(r.pay_unit),
    languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    photo_urls: photoUrls,
    status: (r.status as Classified["status"]) ?? "open",
    flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
    expires_at: String(r.expires_at),
    created_at: String(r.created_at),
    author,
  };
}

/** "€450" from cents, in the reader's own number format. */
export function money(cents: number | null, locale: string): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * A rent far under what a square metre costs anywhere in this country is
 * the oldest bait there is. Not proof — a reason to look twice.
 */
export function rentFarBelow(c: Classified): boolean {
  if (c.kind !== "housing" || !c.rent_cents || !c.size_m2) return false;
  return c.rent_cents / 100 / c.size_m2 < 6;
}
