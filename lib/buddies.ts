import "server-only";

import { createClient } from "./supabase/server";
import { isEnabled } from "./features";
import { buddiesReady } from "./schema-ready";
import { getBlockedEitherWayIds } from "./blocks";
import {
  BUDDY_COLUMNS,
  toBuddyProfile,
  type BuddyCandidate,
  type BuddyPair,
  type BuddyPerson,
  type BuddyProfile,
} from "@/types/buddy";

/** The buddy programme is switched on and migration 0033 has run. */
export async function buddiesEnabled(): Promise<boolean> {
  return isEnabled("buddies") && (await buddiesReady());
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadPeople(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, BuddyPerson>> {
  const out = new Map<string, BuddyPerson>();
  if (userIds.length === 0) return out;
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, user_id, display_name, avatar_url, city, languages, is_verified"
    )
    .in("user_id", userIds);
  for (const p of (data ?? []) as Array<Record<string, unknown>>) {
    out.set(String(p.user_id), {
      userId: String(p.user_id),
      profileId: String(p.id),
      displayName: (p.display_name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      city: (p.city as string | null) ?? null,
      languages: Array.isArray(p.languages) ? (p.languages as string[]) : [],
      verified: p.is_verified === true,
    });
  }
  return out;
}

export async function getMyBuddyProfile(
  userId: string
): Promise<BuddyProfile | null> {
  if (!(await buddiesReady())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("buddy_profiles")
      .select(BUDDY_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    return data ? toBuddyProfile(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Every buddyship this member is part of, newest first. */
export async function getMyPairs(userId: string): Promise<BuddyPair[]> {
  if (!(await buddiesReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("buddy_pairs")
      .select("id, newcomer_id, mentor_id, status, message, created_at")
      .or(`newcomer_id.eq.${userId},mentor_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const partnerIds = rows.map((r) =>
      String(r.newcomer_id) === userId
        ? String(r.mentor_id)
        : String(r.newcomer_id)
    );
    const [people, entries] = await Promise.all([
      loadPeople(supabase, [...new Set(partnerIds)]),
      supabase
        .from("buddy_profiles")
        .select("user_id, areas, about")
        .in("user_id", [...new Set(partnerIds)]),
    ]);
    const entryByUser = new Map(
      ((entries.data ?? []) as Array<Record<string, unknown>>).map((e) => [
        String(e.user_id),
        {
          areas: Array.isArray(e.areas) ? (e.areas as string[]) : [],
          about: (e.about as string | null) ?? null,
        },
      ])
    );
    return rows.map((r, i) => ({
      id: String(r.id),
      newcomer_id: String(r.newcomer_id),
      mentor_id: String(r.mentor_id),
      status: r.status as BuddyPair["status"],
      message: (r.message as string | null) ?? null,
      created_at: String(r.created_at),
      partner: people.get(partnerIds[i]) ?? null,
      partnerEntry: entryByUser.get(partnerIds[i]) ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Buddies a newcomer could ask: in their city, with room for one more,
 * the ones who share their language and what they need help with first.
 */
export async function getBuddyCandidates(
  userId: string,
  opts: { city: string | null; languages: string[]; areas: string[] }
): Promise<BuddyCandidate[]> {
  if (!(await buddiesReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("buddy_profiles")
      .select("user_id, areas, about, capacity")
      .eq("role", "mentor")
      .eq("active", true)
      .neq("user_id", userId)
      .limit(100);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];

    const ids = rows.map((r) => String(r.user_id));
    const [people, hidden] = await Promise.all([
      loadPeople(supabase, ids),
      getBlockedEitherWayIds(userId),
    ]);

    // Asked already? Those are shown as requests, not as candidates.
    const { data: mine } = await supabase
      .from("buddy_pairs")
      .select("mentor_id, status")
      .eq("newcomer_id", userId)
      .in("status", ["requested", "active"]);
    const asked = new Set(
      ((mine ?? []) as Array<{ mentor_id: string }>).map((r) =>
        String(r.mentor_id)
      )
    );

    const counts = await Promise.all(
      ids.map(async (id) => {
        const [active, helped] = await Promise.all([
          supabase.rpc("buddy_active_count", { p_mentor: id }),
          supabase.rpc("buddy_helped_count", { p_mentor: id }),
        ]);
        return {
          id,
          active: Number(active.data ?? 0),
          helped: Number(helped.data ?? 0),
        };
      })
    );
    const countById = new Map(counts.map((c) => [c.id, c]));

    const candidates = rows.flatMap((r) => {
      const id = String(r.user_id);
      const person = people.get(id);
      const count = countById.get(id);
      if (!person || !person.verified || hidden.has(id) || asked.has(id)) {
        return [];
      }
      const capacity = Number(r.capacity) || 1;
      const free = capacity - (count?.active ?? 0);
      if (free <= 0) return [];
      const areas = Array.isArray(r.areas) ? (r.areas as string[]) : [];
      return [
        {
          ...person,
          areas,
          about: (r.about as string | null) ?? null,
          helped: count?.helped ?? 0,
          freePlaces: free,
          sharedLanguages: person.languages.filter((l) =>
            opts.languages.includes(l)
          ),
          sharedAreas: areas.filter((a) => opts.areas.includes(a)),
        },
      ];
    });

    const sameCity = (c: BuddyCandidate) =>
      Boolean(
        opts.city &&
        c.city &&
        c.city.trim().toLocaleLowerCase() ===
          opts.city.trim().toLocaleLowerCase()
      );

    // The same city first, then a shared language, then a shared need.
    return candidates.sort(
      (a, b) =>
        Number(sameCity(b)) - Number(sameCity(a)) ||
        b.sharedLanguages.length - a.sharedLanguages.length ||
        b.sharedAreas.length - a.sharedAreas.length ||
        b.helped - a.helped
    );
  } catch {
    return [];
  }
}

/** How many newcomers this buddy is looking after, and how many ever. */
export async function getBuddyCounts(
  userId: string
): Promise<{ active: number; helped: number }> {
  if (!(await buddiesReady())) return { active: 0, helped: 0 };
  try {
    const supabase = await createClient();
    const [active, helped] = await Promise.all([
      supabase.rpc("buddy_active_count", { p_mentor: userId }),
      supabase.rpc("buddy_helped_count", { p_mentor: userId }),
    ]);
    return {
      active: Number(active.data ?? 0),
      helped: Number(helped.data ?? 0),
    };
  } catch {
    return { active: 0, helped: 0 };
  }
}
