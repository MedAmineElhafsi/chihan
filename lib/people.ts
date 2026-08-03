import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import { isMissingProfession, profileColumns } from "./profile-columns";
import { PROFILE_COLUMNS_BASE, type Profile } from "@/types/profile";

export type PeopleFilters = {
  country?: string;
  city?: string;
  language?: string;
  dialect?: string;
  origin?: string;
  looking?: string;
};

/** Public, consented profiles for discovery (optionally filtered). */
export async function getPeople(
  filters: PeopleFilters,
  excludeUserId?: string
): Promise<Profile[]> {
  try {
    const supabase = await createClient();
    const build = (cols: string) => {
      let q = supabase
        .from("profiles")
        .select(cols)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters.country) q = q.ilike("country", `%${filters.country}%`);
      if (filters.city) q = q.ilike("city", `%${filters.city}%`);
      if (filters.language) q = q.contains("languages", [filters.language]);
      if (filters.dialect) q = q.eq("dialect", filters.dialect);
      if (filters.origin) q = q.eq("origin_region", filters.origin);
      if (filters.looking) q = q.contains("looking_for", [filters.looking]);
      return q;
    };

    let { data, error } = await build(profileColumns());
    if (isMissingProfession(error)) {
      ({ data, error } = await build(PROFILE_COLUMNS_BASE));
    }
    if (error || !data) return [];
    let people = (data as unknown as Profile[]).map((p) => ({
      ...p,
      languages: Array.isArray(p.languages) ? p.languages : [],
      profession: p.profession ?? null,
      origin_region: p.origin_region ?? null,
      interests: Array.isArray(p.interests) ? p.interests : [],
      looking_for: Array.isArray(p.looking_for) ? p.looking_for : [],
      offering: Array.isArray(p.offering) ? p.offering : [],
      is_verified: Boolean(p.is_verified),
    }));
    if (excludeUserId) {
      const hidden = await getHiddenAuthorIds(excludeUserId);
      people = people.filter(
        (p) => p.user_id !== excludeUserId && !hidden.has(p.user_id)
      );
    }
    return people;
  } catch {
    return [];
  }
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Which profiles this user has revealed today + how many distinct reveals. */
export async function getRevealState(
  userId: string
): Promise<{ revealedIds: string[]; used: number }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("usage_events")
      .select("target_id")
      .eq("user_id", userId)
      .eq("feature", "profile_reveal")
      .gte("created_at", startOfTodayISO());
    const ids = new Set(
      ((data ?? []) as Array<{ target_id: string | null }>)
        .map((r) => r.target_id)
        .filter((x): x is string => !!x)
    );
    return { revealedIds: [...ids], used: ids.size };
  } catch {
    return { revealedIds: [], used: 0 };
  }
}
