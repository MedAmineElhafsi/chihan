import type { VoiceNote } from "./voice";

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
  /** A voice note, sent alone or with words (migration 0028). */
  voice?: VoiceNote | null;
};
