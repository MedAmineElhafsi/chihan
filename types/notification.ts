export type NotificationType =
  | "message"
  | "group_message"
  | "like"
  | "help_match"
  | "comment"
  | "ad_approved"
  | "ad_rejected";

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  link: string;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar: string | null;
  /** Group name for `group_message`, listing name for `ad_*`, when available. */
  context_label: string | null;
};
