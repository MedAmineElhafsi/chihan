"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotifications } from "./notifications";
import type { GroupMessage } from "@/types/group-message";

export async function sendGroupMessage(
  groupId: string,
  body: string
): Promise<{ ok: true; message: GroupMessage } | { ok: false; error: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Empty message." };
  if (text.length > 2000) return { ok: false, error: "Message too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Join the group to chat." };

  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, sender_id: user.id, body: text })
    .select("id, group_id, sender_id, body, created_at")
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
  return {
    ok: true,
    message: {
      id: String(data.id),
      group_id: String(data.group_id),
      sender_id: String(data.sender_id),
      body: String(data.body),
      created_at: String(data.created_at),
      sender_name: (profile?.display_name as string | null) ?? null,
      sender_avatar: (profile?.avatar_url as string | null) ?? null,
    },
  };
}
