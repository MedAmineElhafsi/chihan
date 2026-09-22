"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotifications } from "./notifications";
import { parseVoice, voiceColumns } from "./voice";
import type { GroupMessage } from "@/types/group-message";
import { VOICE_COLUMNS, voiceFromRow, type VoiceInput } from "@/types/voice";

export async function sendGroupMessage(
  groupId: string,
  body: string,
  voiceInput?: VoiceInput | null
): Promise<{ ok: true; message: GroupMessage } | { ok: false; error: string }> {
  const text = body.trim();
  if (text.length > 2000) return { ok: false, error: "Message too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsedVoice = parseVoice(voiceInput, user.id);
  if (!parsedVoice.ok) return { ok: false, error: parsedVoice.error };
  const voice = parsedVoice.voice;
  if (!text && !voice) return { ok: false, error: "Empty message." };

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Join the group to chat." };

  const { data, error } = await supabase
    .from("group_messages")
    .insert({
      group_id: groupId,
      sender_id: user.id,
      body: text,
      ...voiceColumns(voice),
    })
    .select(
      `id, group_id, sender_id, body, created_at${voice ? `, ${VOICE_COLUMNS}` : ""}`
    )
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not send." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  // Notify other members (same bell as DMs / likes).
  const { data: others } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", user.id)
    .limit(40);
  await createNotifications(
    (others ?? []).map((o) => ({
      userId: String(o.user_id),
      actorId: user.id,
      // Use `message` so existing DBs work before 0013; UI detects /groups/ links.
      type: "message" as const,
      entityId: groupId,
      link: `/groups/${groupId}`,
    }))
  );

  revalidatePath(`/groups/${groupId}`);
  const row = data as unknown as Record<string, unknown>;
  return {
    ok: true,
    message: {
      id: String(row.id),
      group_id: String(row.group_id),
      sender_id: String(row.sender_id),
      body: String(row.body ?? ""),
      created_at: String(row.created_at),
      sender_name: (profile?.display_name as string | null) ?? null,
      sender_avatar: (profile?.avatar_url as string | null) ?? null,
      voice: voiceFromRow(row),
    },
  };
}
