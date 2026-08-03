import "server-only";

import { createClient } from "./supabase/server";
import type { BlockedUser } from "@/types/safety";

export type { BlockedUser };

/** User ids I have blocked. */
export async function getBlockedIds(userId: string): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", userId);
    if (error || !data) return new Set();
    return new Set(data.map((r) => String(r.blocked_id)));
  } catch {
    return new Set();
  }
}

/** User ids I have muted. */
export async function getMutedIds(userId: string): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_mutes")
      .select("muted_id")
      .eq("muter_id", userId);
    if (error || !data) return new Set();
    return new Set(data.map((r) => String(r.muted_id)));
  } catch {
    return new Set();
  }
}

/** True if either user has blocked the other. */
export async function isBlockedEitherWay(
  a: string,
  b: string
): Promise<boolean> {
  if (!a || !b || a === b) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocker_id")
      .or(
        `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
      )
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function getSafetyState(
  viewerId: string,
  otherUserId: string
): Promise<{ blocked: boolean; muted: boolean }> {
  try {
    const supabase = await createClient();
    const [blockRes, muteRes] = await Promise.all([
      supabase
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", viewerId)
        .eq("blocked_id", otherUserId)
        .maybeSingle(),
      supabase
        .from("user_mutes")
        .select("muter_id")
        .eq("muter_id", viewerId)
        .eq("muted_id", otherUserId)
        .maybeSingle(),
    ]);
    return {
      blocked: Boolean(blockRes.data),
      muted: Boolean(muteRes.data),
    };
  } catch {
    return { blocked: false, muted: false };
  }
}

/** People blocked either direction (no DMs / hide from lists). */
export async function getBlockedEitherWayIds(
  viewerId: string
): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const [outBlocks, inBlocks] = await Promise.all([
      supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", viewerId),
      supabase
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocked_id", viewerId),
    ]);
    const ids = new Set<string>();
    for (const r of outBlocks.data ?? []) ids.add(String(r.blocked_id));
    for (const r of inBlocks.data ?? []) ids.add(String(r.blocker_id));
    return ids;
  } catch {
    return new Set();
  }
}

/**
 * Authors whose content should be hidden from this viewer:
 * people blocked either way, plus people they muted.
 */
export async function getHiddenAuthorIds(viewerId: string): Promise<Set<string>> {
  const [blocked, muted] = await Promise.all([
    getBlockedEitherWayIds(viewerId),
    getMutedIds(viewerId),
  ]);
  for (const id of muted) blocked.add(id);
  return blocked;
}

/** Filter notification rows where recipient muted/blocked actor (or reverse block). */
export async function filterAllowedNotifications<
  T extends { userId: string; actorId: string },
>(inputs: T[]): Promise<T[]> {
  if (inputs.length === 0) return [];
  try {
    const supabase = await createClient();
    const userIds = [...new Set(inputs.map((p) => p.userId))];
    const actorIds = [...new Set(inputs.map((p) => p.actorId))];
    const allIds = [...new Set([...userIds, ...actorIds])];

    const [blocksOut, blocksIn, mutes] = await Promise.all([
      supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .in("blocker_id", allIds)
        .in("blocked_id", allIds),
      supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .in("blocker_id", actorIds)
        .in("blocked_id", userIds),
      supabase
        .from("user_mutes")
        .select("muter_id, muted_id")
        .in("muter_id", userIds)
        .in("muted_id", actorIds),
    ]);

    const blocked = new Set<string>();
    for (const r of [...(blocksOut.data ?? []), ...(blocksIn.data ?? [])]) {
      blocked.add(`${String(r.blocker_id)}>${String(r.blocked_id)}`);
    }
    const muted = new Set(
      (mutes.data ?? []).map(
        (r) => `${String(r.muter_id)}>${String(r.muted_id)}`
      )
    );

    return inputs.filter((i) => {
      if (blocked.has(`${i.userId}>${i.actorId}`)) return false;
      if (blocked.has(`${i.actorId}>${i.userId}`)) return false;
      if (muted.has(`${i.userId}>${i.actorId}`)) return false;
      return true;
    });
  } catch {
    return inputs;
  }
}

export async function listBlockedUsers(
  userId: string
): Promise<BlockedUser[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data?.length) return [];

    const ids = data.map((r) => String(r.blocked_id));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url")
      .in("user_id", ids);
    const byUser = new Map(
      (profiles ?? []).map((p) => [
        String(p.user_id),
        {
          profileId: String(p.id),
          displayName: (p.display_name as string | null) ?? null,
          avatarUrl: (p.avatar_url as string | null) ?? null,
        },
      ])
    );

    return data.map((r) => {
      const uid = String(r.blocked_id);
      const p = byUser.get(uid);
      return {
        userId: uid,
        profileId: p?.profileId ?? null,
        displayName: p?.displayName ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        blockedAt: String(r.created_at),
      };
    });
  } catch {
    return [];
  }
}
