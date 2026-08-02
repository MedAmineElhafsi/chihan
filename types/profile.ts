/** A member profile (mirrors the `profiles` table; `location` is server-only). */
export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  languages: string[];
  dialect: string | null;
  profession: string | null;
  is_public: boolean;
  is_verified: boolean;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns selected for profile reads (excludes the raw geography column). */
export const PROFILE_COLUMNS =
  "id, user_id, display_name, bio, avatar_url, city, country, lat, lng, languages, dialect, profession, is_public, is_verified, consent_at, created_at, updated_at";

/** Column list before `profession` / `is_verified` — used as a fallback. */
export const PROFILE_COLUMNS_BASE =
  "id, user_id, display_name, bio, avatar_url, city, country, lat, lng, languages, dialect, is_public, consent_at, created_at, updated_at";

export type ProfileViewer = {
  viewer_user_id: string;
  profile_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  viewed_at: string;
};