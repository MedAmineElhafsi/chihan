export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
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
  lastMessage: { body: string; created_at: string; sender_id: string } | null;
  unread: number;
};
