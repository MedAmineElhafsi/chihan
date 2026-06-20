import "server-only";

import { createClient } from "./supabase/server";
import type {
  ChatMessage,
  ChatPartner,
  ConversationSummary,
} from "@/types/chat";

async function loadPartners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  convIds: string[],
  meId: string
): Promise<Map<string, ChatPartner>> {
  const byConv = new Map<string, ChatPartner>();
  if (convIds.length === 0) return byConv;

  const { data: others } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", meId);
  const otherRows = (others ?? []) as Array<{
    conversation_id: string;
    user_id: string;
  }>;

  const userIds = [...new Set(otherRows.map((r) => r.user_id))];
  const profilesByUser = new Map<
    string,
    { id: string; display_name: string | null; avatar_url: string | null }
  >();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url")
      .in("user_id", userIds);
    for (const p of (profs ?? []) as Array<Record<string, unknown>>) {
      profilesByUser.set(String(p.user_id), {
        id: String(p.id),
        display_name: (p.display_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  for (const r of otherRows) {
    const prof = profilesByUser.get(r.user_id);
    byConv.set(r.conversation_id, {
      profileId: prof?.id ?? null,
      userId: r.user_id,
      displayName: prof?.display_name ?? null,
      avatarUrl: prof?.avatar_url ?? null,
    });
  }
  return byConv;
}

export async function getConversations(
  userId: string
): Promise<ConversationSummary[]> {
  try {
    const supabase = await createClient();
    const { data: mine } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);
    const myRows = (mine ?? []) as Array<{
      conversation_id: string;
      last_read_at: string | null;
    }>;
    if (myRows.length === 0) return [];

    const convIds = myRows.map((r) => r.conversation_id);
    const lastReadByConv = new Map(
      myRows.map((r) => [r.conversation_id, r.last_read_at])
    );

    const [partners, messagesRes] = await Promise.all([
      loadPartners(supabase, convIds, userId),
      supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true }),
    ]);
    const msgs = (messagesRes.data ?? []) as Array<{
      conversation_id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }>;

    const summaries: ConversationSummary[] = convIds.map((id) => {
      const convMsgs = msgs.filter((m) => m.conversation_id === id);
      const last = convMsgs[convMsgs.length - 1] ?? null;
      const lastRead = lastReadByConv.get(id) ?? null;
      const unread = convMsgs.filter(
        (m) =>
          m.sender_id !== userId &&
          (!lastRead || new Date(m.created_at) > new Date(lastRead))
      ).length;
      return {
        id,
        partner: partners.get(id) ?? null,
        lastMessage: last
          ? { body: last.body, created_at: last.created_at, sender_id: last.sender_id }
          : null,
        unread,
      };
    });

    summaries.sort((a, b) => {
      const at = a.lastMessage?.created_at ?? "";
      const bt = b.lastMessage?.created_at ?? "";
      return bt.localeCompare(at);
    });
    return summaries;
  } catch {
    return [];
  }
}

export async function getMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data ?? []) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function getConversationPartner(
  conversationId: string,
  userId: string
): Promise<{ partner: ChatPartner | null; otherLastReadAt: string | null }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("conversation_participants")
      .select("user_id, last_read_at")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)
      .maybeSingle();
    if (!data) return { partner: null, otherLastReadAt: null };
    const row = data as { user_id: string; last_read_at: string | null };

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const p = prof as Record<string, unknown> | null;

    return {
      partner: {
        profileId: p ? String(p.id) : null,
        userId: row.user_id,
        displayName: (p?.display_name as string | null) ?? null,
        avatarUrl: (p?.avatar_url as string | null) ?? null,
      },
      otherLastReadAt: row.last_read_at,
    };
  } catch {
    return { partner: null, otherLastReadAt: null };
  }
}
