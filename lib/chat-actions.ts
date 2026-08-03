"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { getEntitlements } from "./entitlements";
import { FREE_LIMITS } from "./constants";
import { isBlockedEitherWay } from "./blocks";
import { createNotification } from "./notifications";
import type { ChatMessage } from "@/types/chat";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; locked: true }
  | { ok: false; error: string };

/**
 * Get-or-create a 1:1 conversation. Existing conversations always open. New
 * conversations count against the free daily limit (premium = unlimited);
 * replying to existing threads is always free.
 */
export async function startConversation(
  otherUserId: string
): Promise<StartConversationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.id === otherUserId) return { ok: false, error: "Invalid recipient." };

  if (await isBlockedEitherWay(user.id, otherUserId)) {
    return { ok: false, error: "You can’t message this person." };
  }

  const { data: existing } = await supabase.rpc("find_direct_conversation", {
    other: otherUserId,
  });
  if (existing) return { ok: true, conversationId: String(existing) };

  const ent = await getEntitlements(user.id);
  if (!ent.features.unlimitedReveals) {
    const { data: todays } = await supabase
      .from("usage_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("feature", "new_conversation")
      .gte("created_at", startOfTodayISO());
    if ((todays?.length ?? 0) >= FREE_LIMITS.newConversationsPerDay) {
      return { ok: false, locked: true };
    }
  }

  const { data: created, error } = await supabase.rpc(
    "create_direct_conversation",
    { other: otherUserId }
  );
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not start conversation." };
  }

  await supabase
    .from("usage_events")
    .insert({ user_id: user.id, feature: "new_conversation", target_id: otherUserId });

  return { ok: true, conversationId: String(created) };
}

export type SendMessageResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<SendMessageResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Empty message." };
  if (text.length > 2000) return { ok: false, error: "Message too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: others } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id);
  for (const r of others ?? []) {
    if (await isBlockedEitherWay(user.id, String(r.user_id))) {
      return { ok: false, error: "You can’t message this person." };
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();
  if (error) return { ok: false, error: error.message };

  // Sending implies the sender has read up to now.
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  const { data: recipients } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id);
  for (const r of recipients ?? []) {
    await createNotification({
      userId: String(r.user_id),
      actorId: user.id,
      type: "message",
      entityId: conversationId,
      link: `/messages/${conversationId}`,
    });
  }

  revalidatePath("/messages");
  return { ok: true, message: data as ChatMessage };
}

export async function markRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  revalidatePath("/messages");
}
