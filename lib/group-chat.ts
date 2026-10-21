import "server-only";

import { createClient } from "./supabase/server";
import { getHiddenAuthorIds } from "./blocks";
import { voiceReady } from "./schema-ready";
import { signVoiceNotes } from "./voice";
import type { GroupMessage } from "@/types/group-message";
import { VOICE_COLUMNS, voiceFromRow } from "@/types/voice";

/**
 * The room's messages, minus the people this member does not want to hear.
 *
 * A block cannot stop somebody posting to a group — that would hand every
 * member a mute button over every other, and 0037 deliberately leaves group
 * messages out of the policy for exactly that reason. In a group a block is
 * about what you are shown, which means it has to be done here.
 *
 * Hidden senders are dropped before their profiles are fetched and before
 * any voice note is signed, so nothing about them reaches the page at all.
 */
export async function getGroupMessages(
  groupId: string,
  viewerId?: string | null,
  limit = 100
): Promise<GroupMessage[]> {
  try {
    const supabase = await createClient();
    const withVoice = await voiceReady();
    const { data: rows, error } = await supabase
      .from("group_messages")
      .select(
        `id, group_id, sender_id, body, created_at${withVoice ? `, ${VOICE_COLUMNS}` : ""}`
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error || !rows?.length) return [];
    let data = rows as unknown as Array<Record<string, unknown>>;

    if (viewerId) {
      const hidden = await getHiddenAuthorIds(viewerId);
      if (hidden.size > 0) {
        data = data.filter((m) => !hidden.has(String(m.sender_id)));
      }
      if (data.length === 0) return [];
    }

    const senderIds = [...new Set(data.map((m) => String(m.sender_id)))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);
    const byUser = new Map(
      (profiles ?? []).map((p) => [String(p.user_id), p] as const)
    );

    const messages = data.map((m): GroupMessage => {
      const p = byUser.get(String(m.sender_id));
      return {
        id: String(m.id),
        group_id: String(m.group_id),
        sender_id: String(m.sender_id),
        body: String(m.body ?? ""),
        created_at: String(m.created_at),
        sender_name: (p?.display_name as string | null) ?? null,
        sender_avatar: (p?.avatar_url as string | null) ?? null,
        voice: voiceFromRow(m),
      };
    });
    await signVoiceNotes(
      supabase,
      messages.map((m) => m.voice)
    );
    return messages;
  } catch {
    return [];
  }
}
