import { voiceFromRow, type VoiceNote } from "./voice";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** A voice note, sent alone or with words (migration 0028). */
  voice?: VoiceNote | null;
};

export type ChatPartner = {
  profileId: string | null;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ConversationSummary = {
  id: string;
  partner: ChatPartner | null;
  lastMessage: {
    body: string;
    created_at: string;
    sender_id: string;
    voice?: boolean;
  } | null;
  unread: number;
};

/** A row as the database or Realtime hands it over. */
export function toChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_id: String(row.sender_id),
    body: String(row.body ?? ""),
    created_at: String(row.created_at),
    voice: voiceFromRow(row),
  };
}
