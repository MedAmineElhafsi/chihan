"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotification } from "./notifications";
import { startConversation, sendMessage } from "./chat-actions";

export async function inviteToGroup(
  groupId: string,
  inviteeUserId: string
): Promise<{ ok: true } | { ok: false; error: string; locked?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.id === inviteeUserId) {
    return { ok: false, error: "Cannot invite yourself." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Join the group to invite." };

  const { data: already } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", inviteeUserId)
    .maybeSingle();
  if (already) return { ok: false, error: "Already a member." };

  const { data: group } = await supabase
    .from("community_groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();
  const groupName = (group?.name as string | null) ?? "a group";

  await createNotification({
    userId: inviteeUserId,
    actorId: user.id,
    type: "message",
    entityId: groupId,
    link: `/groups/${groupId}?invite=1`,
  });

  const conv = await startConversation(inviteeUserId);
  if ("locked" in conv && conv.locked) {
    // Notification already sent — still useful.
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  }
  if (!conv.ok) {
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  }

  await sendMessage(
    conv.conversationId,
    `You're invited to join "${groupName}" on Cîhan: /groups/${groupId}`
  );

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}
