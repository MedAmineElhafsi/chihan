"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { getEntitlements } from "./entitlements";
import { FREE_LIMITS } from "./constants";
import { isBlockedEitherWay } from "./blocks";
import { createNotification } from "./notifications";
import { parseVoice, voiceColumns } from "./voice";
import { toChatMessage, type ChatMessage } from "@/types/chat";
import { VOICE_COLUMNS, type VoiceInput } from "@/types/voice";

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
 * Get-or-create a 1:1 conversation. Existing conversations always open, and
 * replying is always free.
 *
 * `reason: "help"` bypasses the daily cap entirely: reaching out about a help
 * request is the core loop of the product. A newcomer who hits "upgrade to
 * message" while asking for housing simply leaves, so helping is never
 * paywalled — premium sells reach, not access.
 */
export async function startConversation(
  otherUserId: string,
  reason?: "help"
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

  // Helping is never rate-limited.
  if (reason !== "help") {
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

/**
 * Words, a voice note, or both. A voice note arrives already uploaded to the
 * sender's own folder; this only records that it belongs to the message.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  voiceInput?: VoiceInput | null
): Promise<SendMessageResult> {
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
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
      ...voiceColumns(voice),
    })
    // Voice columns only when there is a note: a plain text message must
    // still send on a database that has not had migration 0028.
    .select(
      `id, conversation_id, sender_id, body, created_at${voice ? `, ${VOICE_COLUMNS}` : ""}`
    )
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not send." };
  }

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
  return {
    ok: true,
    message: toChatMessage(data as unknown as Record<string, unknown>),
  };
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
