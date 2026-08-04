import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import {
  LOOKING_TO_OFFERING,
  OFFERING_TO_LOOKING,
  type LookingFor,
  type Offering,
} from "./constants";
import { isMissingProfession, profileColumns } from "./profile-columns";
import { PROFILE_COLUMNS_BASE, type Profile } from "@/types/profile";

export type MatchReason = {
  looking: string;
  offering: string;
};

export type ProfileMatch = {
  profile: Profile;
  score: number;
  reasons: MatchReason[];
  mutual: boolean;
};

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function normalize(p: Profile): Profile {
  return {
    ...p,
    languages: asArray(p.languages),
    interests: asArray(p.interests),
    looking_for: asArray(p.looking_for),
    offering: asArray(p.offering),
    photos: asArray(p.photos),
    profession: p.profession ?? null,
    origin_region: p.origin_region ?? null,
    is_verified: Boolean(p.is_verified),
    is_banned: Boolean(p.is_banned),
  };
}

/**
 * Find public profiles whose offerings cover the viewer's looking_for
 * (and the reverse). Sorted by score.
 */
export async function getMatches(
  viewerId: string,
  limit = 40
): Promise<ProfileMatch[]> {
  try {
    const supabase = await createClient();
    const { data: meRow } = await supabase
      .from("profiles")
      .select("looking_for, offering, interests")
      .eq("user_id", viewerId)
      .maybeSingle();
    if (!meRow) return [];

    const myLooking = asArray(meRow.looking_for);
    const myOffering = asArray(meRow.offering);
    const myInterests = asArray(meRow.interests);
    if (myLooking.length === 0 && myOffering.length === 0) return [];

    const build = (cols: string) =>
      supabase
        .from("profiles")
        .select(cols)
        .eq("is_public", true)
        .neq("user_id", viewerId)
        .order("created_at", { ascending: false })
        .limit(200);

    let { data, error } = await build(profileColumns());
    if (isMissingProfession(error)) {
      ({ data, error } = await build(PROFILE_COLUMNS_BASE));
    }
    if (error || !data) return [];

    const hidden = await getHiddenAuthorIds(viewerId);
    const matches: ProfileMatch[] = [];

    for (const raw of data as unknown as Profile[]) {
      const profile = normalize(raw);
      if (hidden.has(profile.user_id) || profile.is_banned) continue;

      const reasons: MatchReason[] = [];
      let score = 0;
      let mutual = false;

      for (const need of myLooking) {
        const mapped =
          LOOKING_TO_OFFERING[need as LookingFor] ?? ([] as readonly string[]);
        for (const offer of mapped) {
          if (profile.offering.includes(offer)) {
            reasons.push({ looking: need, offering: offer });
            score += 2;
          }
        }
      }

      for (const offer of myOffering) {
        const needs =
          OFFERING_TO_LOOKING[offer as Offering] ?? ([] as readonly string[]);
        for (const need of needs) {
          if (profile.looking_for.includes(need)) {
            mutual = true;
            score += 1;
            if (
              !reasons.some((r) => r.looking === need && r.offering === offer)
            ) {
              reasons.push({ looking: need, offering: offer });
            }
          }
        }
      }

      const shared = profile.interests.filter((i) => myInterests.includes(i));
      score += shared.length;

      if (score > 0) {
        matches.push({ profile, score, reasons, mutual });
      }
    }

    matches.sort(
      (a, b) =>
        b.score - a.score || Number(b.mutual) - Number(a.mutual)
    );
    return matches.slice(0, limit);
  } catch {
    return [];
  }
}
