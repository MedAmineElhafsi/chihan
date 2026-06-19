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
  is_public: boolean;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns selected for profile reads (excludes the raw geography column). */
export const PROFILE_COLUMNS =
  "id, user_id, display_name, bio, avatar_url, city, country, lat, lng, languages, dialect, is_public, consent_at, created_at, updated_at";
