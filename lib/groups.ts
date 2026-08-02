import "server-only";

import { createClient } from "./supabase/server";
import type { CommunityGroup, GroupMember } from "@/types/group";

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapGroup(row: Record<string, unknown>): CommunityGroup {
  return {
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    member_count: Number(row.member_count ?? 0),
  };
}

export async function getGroups(opts?: {
  country?: string;
  city?: string;
  nearLat?: number | null;
  nearLng?: number | null;
}): Promise<CommunityGroup[]> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from("community_groups_with_stats")
      .select(
        "id, name, description, city, country, lat, lng, created_by, created_at, updated_at, member_count"
      )
      .order("member_count", { ascending: false })
      .limit(200);

    if (opts?.country) q = q.ilike("country", opts.country);
    if (opts?.city) q = q.ilike("city", `%${opts.city}%`);

    const { data, error } = await q;
    if (error || !data) return [];

    let groups = data.map((r) => mapGroup(r as Record<string, unknown>));

    if (
      opts?.nearLat != null &&
      opts?.nearLng != null &&
      Number.isFinite(opts.nearLat) &&
      Number.isFinite(opts.nearLng)
    ) {
      groups = groups
        .map((g) => ({
          ...g,
          distance_km:
            g.lat != null && g.lng != null
              ? haversineKm(opts.nearLat!, opts.nearLng!, g.lat, g.lng)
              : null,
        }))
        .sort((a, b) => {
          if (a.distance_km == null && b.distance_km == null) return 0;
          if (a.distance_km == null) return 1;
          if (b.distance_km == null) return -1;
          return a.distance_km - b.distance_km;
        });
    }

    return groups;
  } catch {
    return [];
  }
}

export async function getGroup(id: string): Promise<CommunityGroup | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("community_groups_with_stats")
      .select(
        "id, name, description, city, country, lat, lng, created_by, created_at, updated_at, member_count"
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapGroup(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  try {
    const supabase = await createClient();
    const { data: members, error } = await supabase
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true })
      .limit(100);
    if (error || !members?.length) return [];

    const ids = members.map((m) => String(m.user_id));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url, city, country, is_public")
      .in("user_id", ids);

    const byUser = new Map(
      (profiles ?? []).map((p) => [String(p.user_id), p] as const)
    );

    return members.map((m) => {
      const p = byUser.get(String(m.user_id));
      return {
        user_id: String(m.user_id),
        profile_id: p?.is_public ? String(p.id) : null,
        role: m.role as GroupMember["role"],
        joined_at: String(m.joined_at),
        display_name: (p?.display_name as string | null) ?? null,
        avatar_url: (p?.avatar_url as string | null) ?? null,
        city: (p?.city as string | null) ?? null,
        country: (p?.country as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function getMembership(
  groupId: string,
  userId: string | null
): Promise<GroupMember["role"] | null> {
  if (!userId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as GroupMember["role"] | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getMyJoinedGroupIds(userId: string): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    return new Set((data ?? []).map((r) => String(r.group_id)));
  } catch {
    return new Set();
  }
}
