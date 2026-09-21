import type { ListingCategory } from "@/lib/constants";

export type Listing = {
  id: string;
  owner_user_id: string | null;
  name: string;
  category: ListingCategory;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  photos: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  /** "professional" means the listing is a person offering a service. */
  kind: "business" | "professional";
  /** The real trade, kept because `category` only has seven values. */
  profession: string | null;
};

/** Row shape of the `listings_with_stats` view. */
export type ListingWithStats = Listing & {
  review_count: number;
  rating_avg: number | null;
};

export type Review = {
  id: string;
  listing_id: string;
  author_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  /** The owner’s single public answer. Named reviews need a right of reply. */
  reply: string | null;
  replied_at: string | null;
};

export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** `null` for a day means closed; a missing day means not given. Times are
 *  "HH:MM", 24-hour; a close at or before the open runs past midnight. */
export type OpeningHours = Partial<
  Record<Weekday, { open: string; close: string } | null>
>;

/** Migration 0027. Read separately from the listing, only where shown. */
export type ListingDetails = {
  whatsapp: string | null;
  opening_hours: OpeningHours | null;
  /** IANA zone the hours are in, captured from the owner's device. */
  timezone: string | null;
  services: string[];
};

export const LISTING_STATS_COLUMNS =
  "id, owner_user_id, name, category, description, address, city, country, lat, lng, phone, email, website, photos, is_verified, created_at, updated_at, review_count, rating_avg, kind, profession";
