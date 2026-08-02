import "server-only";

import { createClient } from "./supabase/server";
import type { InviteCandidate } from "@/types/group";

/** Public profiles that can be invited (not already in the group). */
export async function getInviteCandidates(
  groupId: string,
  limit = 40
): Promise<InviteCandidate[]> {
  try {
    const supabase = await createClient();
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    const memberIds = new Set(
      (members ?? []).map((m) => String(m.user_id))
    );

    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url, city, country")
      .eq("is_public", true)
      .not("user_id", "is", null)
      .order("display_name", { ascending: true })
      .limit(120);
    if (error || !data) return [];

    return data
      .filter((p) => p.user_id && !memberIds.has(String(p.user_id)))
      .slice(0, limit)
      .map((p) => ({
        user_id: String(p.user_id),
        profile_id: String(p.id),
        display_name: (p.display_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        city: (p.city as string | null) ?? null,
        country: (p.country as string | null) ?? null,
      }));
  } catch {
    return [];
  }
}
